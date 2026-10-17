'use client';

import { useCallback, useMemo, useState } from 'react';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { PrimeIcons } from 'primereact/api';
import { Tag } from 'primereact/tag';

import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import {
  ChannelResponse,
  DepartmentResponse,
  FiltroRelatorio,
  IUsuariosResponse,
  LinhaRelatorioAtendimento,
  RelatorioAtendimentoResponse,
} from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta, duracaoCompacta } from '@/service/Util';

import FiltrosRelatorio from './FiltrosRelatorio';

type Props = {
  usuarios: IUsuariosResponse[];
  setores: DepartmentResponse[];
  canais: ChannelResponse[];
  /** Preenchidos quando a tela chega de uma linha do relatório por Cliente - ver `page.tsx`. */
  clientIdInicial?: number;
  contactIdInicial?: number;
};

/** Mesma paleta do relatório de atendimentos - as duas telas mostram a mesma situação. */
const SITUACOES = [
  { label: 'Aguardando', value: 1, cor: 'secondary' as const },
  { label: 'Em andamento', value: 2, cor: 'info' as const },
  { label: 'Em fila', value: 3, cor: 'secondary' as const },
  { label: 'Finalizado sem resposta', value: 4, cor: 'danger' as const },
  { label: 'Finalizado', value: 5, cor: 'success' as const },
  { label: 'Finalizado por inatividade', value: 6, cor: 'warning' as const },
];

const dataHora = (valor: string | null): string => {
  if (!valor) return '-';
  return new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

/**
 * Relatório analítico por cliente/contato.
 *
 * Mesma tabela do relatório de Atendimentos (mesmo endpoint de dados no
 * backend, `reports.service.ts: atendimentos()`), mas sem a busca automática
 * na montagem: aqui o relatório só existe depois que alguém é escolhido na
 * busca, então a tela abre vazia de propósito - diferente dos outros, que
 * mostram o período padrão sem interação nenhuma.
 */
export default function RelatorioAnaliticoClienteSection({
  usuarios,
  setores,
  canais,
  clientIdInicial,
  contactIdInicial,
}: Props) {
  const { req } = useApi();

  const [dados, setDados] = useState<RelatorioAtendimentoResponse | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);
  const [filtro, setFiltro] = useState<FiltroRelatorio | null>(null);

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
      ['client_id', f.client_id ?? undefined],
      ['contact_id', f.contact_id ?? undefined],
      ['user_id', f.user_id ?? undefined],
      ['department_id', f.department_id ?? undefined],
      ['channel_id', f.channel_id ?? undefined],
      ['support_chat_status_id', f.support_chat_status_id ?? undefined],
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
        const { data } = await req.get<RelatorioAtendimentoResponse>(
          `/reports/client-detail${query ? `?${query}` : ''}`,
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
    if (!filtro) return;

    try {
      setExportando(formato);

      const query = queryString(filtro);
      const { data, headers } = await req.get(
        `/reports/client-detail/${formato}${query ? `?${query}` : ''}`,
        { responseType: 'blob' },
      );

      const nomeDoCabecalho = /filename="([^"]+)"/.exec(headers['content-disposition'] ?? '')?.[1];
      const nome = nomeDoCabecalho ?? `analitico_cliente.${formato === 'excel' ? 'xlsx' : 'pdf'}`;

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

  // Sem cliente/contato escolhido ainda não há nada a exportar - diferente
  // dos outros relatórios, onde "nada a exportar" só acontece com 0 linhas.
  const semLinhas = !filtro || !dados?.linhas.length;

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

  const corDaSituacao = useMemo(() => new Map(SITUACOES.map((s) => [s.label, s.cor])), []);

  return (
    <>
      <TitleCards
        title="Relatório Analítico por Cliente"
        buttons={botoes}
      />

      <div className="p-card-content">
        <FiltrosRelatorio
          usuarios={usuarios}
          setores={setores}
          canais={canais}
          situacoes={SITUACOES.map(({ label, value }) => ({ label, value }))}
          carregando={carregando}
          onFiltrar={buscar}
          clientIdInicial={clientIdInicial}
          contactIdInicial={contactIdInicial}
        />

        <DataTable
          value={dados?.linhas ?? []}
          loading={carregando}
          paginator
          rows={25}
          rowsPerPageOptions={[25, 50, 100]}
          // Mensagem diferente antes de escolher alguém: "nenhum atendimento"
          // sugeriria que a busca rodou e não achou nada, quando na verdade
          // ela nem rodou ainda.
          emptyMessage={
            filtro ? 'Nenhum atendimento no período' : 'Busque um cliente ou contato para começar'
          }
          size="small"
          stripedRows
          scrollable
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
            field="protocolo"
            header="Protocolo"
            style={{ minWidth: '9rem' }}
          />
          <Column
            field="contato"
            header="Contato"
            style={{ minWidth: '12rem' }}
          />
          <Column
            header="Cliente"
            style={{ minWidth: '11rem' }}
            body={(linha: LinhaRelatorioAtendimento) =>
              linha.cliente ?? <span className="text-color-secondary font-italic">Sem cliente</span>
            }
          />
          <Column
            header="Atendente"
            style={{ minWidth: '11rem' }}
            body={(linha: LinhaRelatorioAtendimento) =>
              linha.atendente ?? (
                <span className="text-color-secondary font-italic">Não assumido</span>
              )
            }
          />
          <Column
            header="Setor"
            style={{ minWidth: '9rem' }}
            body={(linha: LinhaRelatorioAtendimento) =>
              linha.setor ?? <span className="text-color-secondary font-italic">Sem setor</span>
            }
          />
          <Column
            field="canal"
            header="Canal"
            style={{ minWidth: '9rem' }}
          />
          <Column
            header="Abertura"
            style={{ minWidth: '10rem' }}
            body={(linha: LinhaRelatorioAtendimento) => dataHora(linha.aberto_em)}
          />
          <Column
            header="Espera"
            align="right"
            style={{ minWidth: '6rem' }}
            body={(linha: LinhaRelatorioAtendimento) => duracaoCompacta(linha.espera_segundos)}
          />
          <Column
            header="Duração"
            align="right"
            style={{ minWidth: '6rem' }}
            body={(linha: LinhaRelatorioAtendimento) => duracaoCompacta(linha.duracao_segundos)}
          />
          <Column
            header="Situação"
            style={{ minWidth: '12rem' }}
            body={(linha: LinhaRelatorioAtendimento) => (
              <Tag
                value={linha.situacao}
                severity={corDaSituacao.get(linha.situacao) ?? 'secondary'}
              />
            )}
          />
        </DataTable>
      </div>
    </>
  );
}
