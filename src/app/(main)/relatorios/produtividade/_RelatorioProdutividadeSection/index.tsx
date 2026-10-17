'use client';

import { useCallback, useEffect, useState } from 'react';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { PrimeIcons } from 'primereact/api';

import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import {
  ChannelResponse,
  DepartmentResponse,
  FiltroRelatorio,
  LinhaRelatorioProdutividade,
  RelatorioProdutividadeResponse,
} from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta, duracaoCompacta } from '@/service/Util';

import FiltrosRelatorio, { ATALHO_PADRAO, periodoDoAtalho } from './FiltrosRelatorio';

type Props = {
  setores: DepartmentResponse[];
  canais: ChannelResponse[];
};

/**
 * Relatório de produtividade por atendente.
 *
 * Mesmo desenho de `relatorios/atendimentos` (chips de filtro, exportação em
 * PDF/Excel), com uma diferença de fundo: aqui cada linha é um **atendente**,
 * não um atendimento - por isso não há filtro nem coluna de Atendente, e as
 * médias do rodapé são a média das médias das linhas, calculada no backend.
 */
export default function RelatorioProdutividadeSection({ setores, canais }: Props) {
  const { req } = useApi();

  const [dados, setDados] = useState<RelatorioProdutividadeResponse | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);
  const [filtro, setFiltro] = useState<FiltroRelatorio>(() => periodoDoAtalho(ATALHO_PADRAO));

  const queryString = useCallback((f: FiltroRelatorio): string => {
    const params = new URLSearchParams();

    const dia = (data?: Date | null) => {
      if (!data) return undefined;
      const local = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 10);
    };

    const pares: [string, string | number | number[] | undefined][] = [
      ['de', dia(f.de)],
      ['ate', dia(f.ate)],
      ['department_id', f.department_id ?? undefined],
      ['channel_id', f.channel_id ?? undefined],
    ];

    for (const [chave, valor] of pares) {
      if (valor === undefined || valor === null || valor === '') continue;
      // Array vira `1,2,3` - `Array.prototype.toString` já faz isso sozinho,
      // mas explícito é mais claro do que depender do comportamento padrão.
      params.set(chave, Array.isArray(valor) ? valor.join(',') : String(valor));
    }

    return params.toString();
  }, []);

  const buscar = useCallback(
    async (f: FiltroRelatorio) => {
      try {
        setCarregando(true);
        setFiltro(f);

        const query = queryString(f);
        const { data } = await req.get<RelatorioProdutividadeResponse>(
          `/reports/productivity${query ? `?${query}` : ''}`,
        );

        setDados(data);
      } catch (err) {
        CatchAlerta(err, 'Erro ao gerar o relatório');
      } finally {
        setCarregando(false);
      }
    },
    [queryString, req],
  );

  const exportar = async (formato: 'pdf' | 'excel') => {
    try {
      setExportando(formato);

      const query = queryString(filtro);
      const { data, headers } = await req.get(
        `/reports/productivity/${formato}${query ? `?${query}` : ''}`,
        { responseType: 'blob' },
      );

      const nomeDoCabecalho = /filename="([^"]+)"/.exec(headers['content-disposition'] ?? '')?.[1];
      const nome = nomeDoCabecalho ?? `produtividade.${formato === 'excel' ? 'xlsx' : 'pdf'}`;

      const url = URL.createObjectURL(data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nome;
      link.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      CatchAlerta(err, `Erro ao exportar em ${formato === 'excel' ? 'Excel' : 'PDF'}`);
    } finally {
      setExportando(null);
    }
  };

  const semLinhas = !dados?.linhas.length;

  const botoes: IButtonsOthers[] = [
    {
      label: 'Excel',
      icon: PrimeIcons.FILE_EXCEL,
      action: () => exportar('excel'),
      bgColor: 'success p-button-outlined',
      disabled: semLinhas || Boolean(exportando),
      tooltip: semLinhas ? 'Nada a exportar' : undefined,
    },
    {
      label: 'PDF',
      icon: PrimeIcons.FILE_PDF,
      action: () => exportar('pdf'),
      bgColor: 'danger p-button-outlined',
      disabled: semLinhas || Boolean(exportando),
      tooltip: semLinhas ? 'Nada a exportar' : undefined,
    },
  ];

  // A primeira carga usa o período padrão, sem esperar clique em "Filtrar" -
  // mesma razão do relatório de atendimentos.
  useEffect(() => {
    buscar(periodoDoAtalho(ATALHO_PADRAO));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <TitleCards
        title="Relatório de Produtividade"
        buttons={botoes}
      />

      <div className="p-card-content">
        <FiltrosRelatorio
          setores={setores}
          canais={canais}
          carregando={carregando}
          onFiltrar={buscar}
        />

        <DataTable
          value={dados?.linhas ?? []}
          loading={carregando}
          paginator
          rows={25}
          rowsPerPageOptions={[25, 50, 100]}
          emptyMessage="Nenhum atendente com atendimento no período"
          size="small"
          stripedRows
          scrollable
          // Mesma régua do relatório de atendimentos: o rodapé mostra os
          // totais do filtro inteiro, somando as linhas já na tela - sem
          // paginação no backend, "o filtro inteiro" e "todas as linhas"
          // são a mesma coisa.
          footer={
            dados ? (
              <div className="flex flex-wrap gap-4 text-sm">
                <span>
                  <strong>{dados.totais.total}</strong>{' '}
                  {dados.totais.total === 1 ? 'atendimento' : 'atendimentos'}
                </span>
                <span className="text-color-secondary">
                  {dados.totais.finalizados} finalizados · {dados.totais.em_aberto} em aberto
                </span>
                <span>
                  <strong>{dados.totais.mensagens_enviadas}</strong> mensagens enviadas
                </span>
                <span>
                  Tempo total:{' '}
                  <strong>{duracaoCompacta(dados.totais.duracao_total_segundos)}</strong>
                </span>
                <span>
                  Espera média:{' '}
                  <strong>{duracaoCompacta(dados.totais.espera_media_segundos)}</strong>
                </span>
                <span>
                  Duração média:{' '}
                  <strong>{duracaoCompacta(dados.totais.duracao_media_segundos)}</strong>
                </span>
              </div>
            ) : null
          }
        >
          <Column
            field="atendente"
            header="Atendente"
            style={{ minWidth: '14rem' }}
          />
          <Column
            field="total"
            header="Total"
            align="right"
            style={{ minWidth: '6rem' }}
          />
          <Column
            field="finalizados"
            header="Finalizados"
            align="right"
            style={{ minWidth: '7rem' }}
          />
          <Column
            field="em_aberto"
            header="Em aberto"
            align="right"
            style={{ minWidth: '7rem' }}
          />
          <Column
            field="mensagens_enviadas"
            header="Mensagens"
            align="right"
            style={{ minWidth: '7rem' }}
          />
          <Column
            header="Tempo total"
            align="right"
            style={{ minWidth: '8rem' }}
            body={(linha: LinhaRelatorioProdutividade) =>
              duracaoCompacta(linha.duracao_total_segundos)
            }
          />
          <Column
            header="Espera média"
            align="right"
            style={{ minWidth: '8rem' }}
            body={(linha: LinhaRelatorioProdutividade) =>
              duracaoCompacta(linha.espera_media_segundos)
            }
          />
          <Column
            header="Duração média"
            align="right"
            style={{ minWidth: '8rem' }}
            body={(linha: LinhaRelatorioProdutividade) =>
              duracaoCompacta(linha.duracao_media_segundos)
            }
          />
        </DataTable>
      </div>
    </>
  );
}
