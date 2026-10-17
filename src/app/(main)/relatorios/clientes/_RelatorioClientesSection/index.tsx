'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { PrimeIcons } from 'primereact/api';

import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import {
  ChannelResponse,
  DepartmentResponse,
  FiltroRelatorio,
  IUsuariosResponse,
  LinhaRelatorioCliente,
  RelatorioClienteResponse,
} from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta, duracaoCompacta } from '@/service/Util';

import FiltrosRelatorio, {
  AGRUPAMENTO_PADRAO,
  ATALHO_PADRAO,
  ORDENACAO_PADRAO,
  periodoDoAtalho,
} from './FiltrosRelatorio';

type Props = {
  usuarios: IUsuariosResponse[];
  setores: DepartmentResponse[];
  canais: ChannelResponse[];
};

/**
 * Relatório por cliente/contato.
 *
 * Mesmo desenho de `relatorios/produtividade` (agrupado, chips de filtro,
 * exportação em PDF/Excel), trocando "quem atendeu" por "quem foi atendido" -
 * o rótulo da primeira coluna muda conforme `agrupar_por` ("Cliente" ou
 * "Contato"), mas o resto da tabela e das métricas é idêntico.
 */
export default function RelatorioClientesSection({ usuarios, setores, canais }: Props) {
  const { req } = useApi();
  const router = useRouter();

  const [dados, setDados] = useState<RelatorioClienteResponse | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);
  const [filtro, setFiltro] = useState<FiltroRelatorio>(() => ({
    ...periodoDoAtalho(ATALHO_PADRAO),
    agrupar_por: AGRUPAMENTO_PADRAO,
    ordenar_por: ORDENACAO_PADRAO,
  }));

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
      ['user_id', f.user_id ?? undefined],
      ['department_id', f.department_id ?? undefined],
      ['channel_id', f.channel_id ?? undefined],
      ['agrupar_por', f.agrupar_por ?? undefined],
      ['ignorar_sem_cliente', f.ignorar_sem_cliente ? 'true' : undefined],
      ['ordenar_por', f.ordenar_por ?? undefined],
    ];

    for (const [chave, valor] of pares) {
      if (valor === undefined || valor === null || valor === '') continue;
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
        const { data } = await req.get<RelatorioClienteResponse>(
          `/reports/client${query ? `?${query}` : ''}`,
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
        `/reports/client/${formato}${query ? `?${query}` : ''}`,
        { responseType: 'blob' },
      );

      const nomeDoCabecalho = /filename="([^"]+)"/.exec(headers['content-disposition'] ?? '')?.[1];
      const nome = nomeDoCabecalho ?? `clientes.${formato === 'excel' ? 'xlsx' : 'pdf'}`;

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

  // Rótulo da primeira coluna conforme o agrupamento atual - "Cliente" ou
  // "Contato", igual ao chip de filtro.
  const colunaPrincipal = filtro.agrupar_por === 'contact' ? 'Contato' : 'Cliente';

  /**
   * Abre o relatório analítico já filtrado para a linha clicada - fluxo
   * natural de "vi que esse cliente teve muito atendimento, quero ver
   * quais". A linha "Sem cliente" (`id: null`) não navega: não há um único
   * cliente para abrir, e o analítico não tem equivalente a "sem cliente"
   * (ele busca um registro específico, não um agrupamento negativo).
   */
  const abrirAnalitico = (linha: LinhaRelatorioCliente) => {
    if (linha.id === null) return;

    const campo = filtro.agrupar_por === 'contact' ? 'contact_id' : 'client_id';
    router.push(`/relatorios/analitico-cliente?${campo}=${linha.id}`);
  };

  // A primeira carga usa o período padrão, sem esperar clique em "Filtrar" -
  // mesma razão dos demais relatórios.
  useEffect(() => {
    buscar({
      ...periodoDoAtalho(ATALHO_PADRAO),
      agrupar_por: AGRUPAMENTO_PADRAO,
      ordenar_por: ORDENACAO_PADRAO,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <TitleCards
        title="Relatório por Cliente"
        buttons={botoes}
      />

      <div className="p-card-content">
        <FiltrosRelatorio
          usuarios={usuarios}
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
          emptyMessage="Nenhum cliente com atendimento no período"
          size="small"
          stripedRows
          scrollable
          onRowClick={(e) => abrirAnalitico(e.data as LinhaRelatorioCliente)}
          rowClassName={(linha: LinhaRelatorioCliente) =>
            linha.id !== null ? 'cursor-pointer' : ''
          }
          // Mesma régua dos demais relatórios: o rodapé mostra os totais do
          // filtro inteiro, somando as linhas já na tela.
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
            field="nome"
            header={colunaPrincipal}
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
            header="Tempo total"
            align="right"
            style={{ minWidth: '8rem' }}
            body={(linha: LinhaRelatorioCliente) => duracaoCompacta(linha.duracao_total_segundos)}
          />
          <Column
            header="Espera média"
            align="right"
            style={{ minWidth: '8rem' }}
            body={(linha: LinhaRelatorioCliente) => duracaoCompacta(linha.espera_media_segundos)}
          />
          <Column
            header="Duração média"
            align="right"
            style={{ minWidth: '8rem' }}
            body={(linha: LinhaRelatorioCliente) => duracaoCompacta(linha.duracao_media_segundos)}
          />
        </DataTable>
      </div>
    </>
  );
}
