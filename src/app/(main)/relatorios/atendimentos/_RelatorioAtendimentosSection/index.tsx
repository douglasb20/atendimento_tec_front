'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { CatchAlerta, duracaoEmHoras } from '@/service/Util';

import FiltrosRelatorio, { ATALHO_PADRAO, periodoDoAtalho } from './FiltrosRelatorio';

type Props = {
  usuarios: IUsuariosResponse[];
  setores: DepartmentResponse[];
  canais: ChannelResponse[];
};

/**
 * As situações possíveis, e a cor de cada uma.
 *
 * Fixas aqui, e não vindas da API: são os ids semeados em
 * `support_chat_status` (migration), estáveis desde a criação da tabela, e a
 * cor é decisão de interface - o backend não tem opinião sobre ela.
 */
const SITUACOES = [
  { label: 'Aguardando', value: 1, cor: 'secondary' as const },
  { label: 'Em andamento', value: 2, cor: 'info' as const },
  { label: 'Em fila', value: 3, cor: 'secondary' as const },
  { label: 'Finalizado sem resposta', value: 4, cor: 'danger' as const },
  { label: 'Finalizado', value: 5, cor: 'success' as const },
  { label: 'Finalizado por inatividade', value: 6, cor: 'warning' as const },
];

/** `15/10/2026 23:04` - a data completa, ao contrário do PDF, que abrevia. */
const dataHora = (valor: string | null): string => {
  if (!valor) return '-';
  return new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

export default function RelatorioAtendimentosSection({ usuarios, setores, canais }: Props) {
  // `req` (axios) e não `FetchReq`: este não monta query string nem baixa
  // blob, e as duas coisas são necessárias aqui.
  const { req } = useApi();

  const [dados, setDados] = useState<RelatorioAtendimentoResponse | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);
  const [filtro, setFiltro] = useState<FiltroRelatorio>(() => periodoDoAtalho(ATALHO_PADRAO));

  /**
   * Os filtros viram query string.
   *
   * Datas em `YYYY-MM-DD` (sem hora): o backend compara por **dia**, no fuso
   * de exibição. Mandar ISO completo faria o dia "até" terminar à meia-noite
   * e perder o próprio dia informado.
   */
  const queryString = useCallback((f: FiltroRelatorio): string => {
    const params = new URLSearchParams();

    const dia = (data?: Date | null) => {
      if (!data) return undefined;
      const local = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 10);
    };

    // Arrays (Setor/Canal/Situação, multiseleção) viram `1,2,3` - o backend
    // (`paraArrayDeInteiros`) já entende vírgula como separador.
    const valorDoParametro = (valor: number[] | number | null | undefined) => {
      if (Array.isArray(valor)) return valor.length ? valor.join(',') : undefined;
      return valor ?? undefined;
    };

    const pares: [string, string | number | undefined][] = [
      ['de', dia(f.de)],
      ['ate', dia(f.ate)],
      ['user_id', f.user_id ?? undefined],
      ['department_id', valorDoParametro(f.department_id)],
      ['channel_id', valorDoParametro(f.channel_id)],
      ['client_id', f.client_id ?? undefined],
      ['support_chat_status_id', valorDoParametro(f.support_chat_status_id)],
      ['busca', f.busca || undefined],
    ];

    for (const [chave, valor] of pares) {
      if (valor !== undefined && valor !== null && valor !== '') {
        params.set(chave, String(valor));
      }
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
          `/reports/attendance${query ? `?${query}` : ''}`,
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

  /**
   * Baixa o arquivo gerado pelo backend.
   *
   * `responseType: 'blob'` e download pelo navegador, em vez de abrir a URL
   * numa aba: a rota exige o cookie de sessão, e `window.open` não passa pelo
   * mesmo tratamento de renovação de token do cliente HTTP.
   */
  const exportar = async (formato: 'pdf' | 'excel') => {
    try {
      setExportando(formato);

      const query = queryString(filtro);
      const { data, headers } = await req.get(
        `/reports/attendance/${formato}${query ? `?${query}` : ''}`,
        { responseType: 'blob' },
      );

      // O nome vem do `Content-Disposition` montado pelo backend (que o lê do
      // template); o fallback cobre o caso de um proxy remover o cabeçalho.
      const nomeDoCabecalho = /filename="([^"]+)"/.exec(headers['content-disposition'] ?? '')?.[1];
      const nome = nomeDoCabecalho ?? `atendimentos.${formato === 'excel' ? 'xlsx' : 'pdf'}`;

      const url = URL.createObjectURL(data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nome;
      link.click();

      // Revogado em seguida: o `blob:` segura o arquivo inteiro em memória
      // até ser liberado, e um relatório grande custaria caro aí.
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

  const corDaSituacao = useMemo(() => new Map(SITUACOES.map((s) => [s.label, s.cor])), []);

  // A primeira carga usa o período padrão, sem esperar clique em "Filtrar":
  // tela de relatório que abre vazia faz todo mundo clicar uma vez só para
  // ver o que já poderia estar ali.
  useEffect(() => {
    buscar(periodoDoAtalho(ATALHO_PADRAO));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <TitleCards
        title="Relatório de Atendimentos"
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
        />

        <DataTable
          value={dados?.linhas ?? []}
          loading={carregando}
          paginator
          rows={25}
          rowsPerPageOptions={[25, 50, 100]}
          emptyMessage="Nenhum atendimento no período"
          size="small"
          stripedRows
          scrollable
          // O rodapé mostra os totais do **filtro inteiro**, não da página -
          // o backend os calcula sobre todas as linhas.
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
                  <strong>{duracaoEmHoras(dados.totais.espera_media_segundos)}</strong>
                </span>
                <span>
                  Duração média:{' '}
                  <strong>{duracaoEmHoras(dados.totais.duracao_media_segundos)}</strong>
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
              // Só o modal "Novo atendimento" grava setor; conversa que
              // chega por mensagem do contato nasce sem, e a maioria das
              // linhas cai neste caso.
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
            body={(linha: LinhaRelatorioAtendimento) => duracaoEmHoras(linha.espera_segundos)}
          />
          <Column
            header="Duração"
            align="right"
            style={{ minWidth: '6rem' }}
            body={(linha: LinhaRelatorioAtendimento) => duracaoEmHoras(linha.duracao_segundos)}
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
