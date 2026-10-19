'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';

import TitleCards from '@/components/TitleCards';
import { FiltroRelatorio, IUsuariosResponse, LinhaRelatorioAtendimento } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta, duracaoEmHoras } from '@/service/Util';

import FiltrosHistorico, { ATALHO_PADRAO, periodoDoAtalho } from './FiltrosHistorico';
import ModalDetalheAtendimento from './ModalDetalheAtendimento';

type Props = {
  usuarios: IUsuariosResponse[];
};

/**
 * As situações possíveis, e a cor de cada uma - mesma paleta do relatório de
 * Atendimentos, que mostra a mesma situação.
 */
const SITUACOES = [
  { label: 'Aguardando', value: 1, cor: 'secondary' as const },
  { label: 'Em andamento', value: 2, cor: 'info' as const },
  { label: 'Em fila', value: 3, cor: 'secondary' as const },
  { label: 'Finalizado sem resposta', value: 4, cor: 'danger' as const },
  { label: 'Finalizado', value: 5, cor: 'success' as const },
  { label: 'Finalizado por inatividade', value: 6, cor: 'warning' as const },
];

/** `15/10/2026 23:04` - a data completa. */
const dataHora = (valor: string | null): string => {
  if (!valor) return '-';
  return new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

type RelatorioAtendimentoResponse = {
  linhas: LinhaRelatorioAtendimento[];
  totais: { total: number; finalizados: number; em_aberto: number };
};

/**
 * Tela de Histórico de Atendimentos: consulta rápida por protocolo, contato
 * ou cliente, sem exportação nem os filtros de setor/canal/situação do
 * relatório completo (`relatorios/atendimentos`) - aqui o objetivo é achar UM
 * atendimento e ver o que aconteceu nele, não auditar um recorte inteiro.
 *
 * Reaproveita o mesmo endpoint do relatório (`/reports/attendance`) para
 * listar; o detalhe abre num modal à parte, por cima da mesma tela.
 */
export default function HistoricoAtendimentosSection({ usuarios }: Props) {
  const { req } = useApi();

  const [dados, setDados] = useState<RelatorioAtendimentoResponse | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [chatIdDetalhe, setChatIdDetalhe] = useState<string | null>(null);

  const queryString = useCallback((f: FiltroRelatorio): string => {
    const params = new URLSearchParams();

    const dia = (data?: Date | null) => {
      if (!data) return undefined;
      const local = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 10);
    };

    const pares: [string, string | number | undefined][] = [
      ['de', dia(f.de)],
      ['ate', dia(f.ate)],
      ['user_id', f.user_id ?? undefined],
      ['busca', f.busca || undefined],
      ['ordenar_atendimentos_por', f.ordenar_atendimentos_por],
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

        const query = queryString(f);
        const { data } = await req.get<RelatorioAtendimentoResponse>(
          `/reports/attendance${query ? `?${query}` : ''}`,
        );

        setDados(data);
      } catch (err) {
        CatchAlerta(err, 'Erro ao carregar o histórico');
      } finally {
        setCarregando(false);
      }
    },
    [queryString, req],
  );

  // A primeira carga usa o período padrão, sem esperar clique em "Filtrar" -
  // mesma razão do relatório de atendimentos.
  useEffect(() => {
    buscar(periodoDoAtalho(ATALHO_PADRAO));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const corDaSituacao = useMemo(() => new Map(SITUACOES.map((s) => [s.label, s.cor])), []);

  return (
    <>
      <TitleCards title="Histórico de Atendimentos" />

      <div className="p-card-content">
        <FiltrosHistorico
          usuarios={usuarios}
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
          <Column
            header=""
            style={{ width: '4rem' }}
            body={(linha: LinhaRelatorioAtendimento) => (
              <Button
                icon="pi pi-eye"
                rounded
                text
                tooltip="Detalhar"
                tooltipOptions={{ position: 'left' }}
                onClick={() => setChatIdDetalhe(linha.id)}
              />
            )}
          />
        </DataTable>
      </div>

      <ModalDetalheAtendimento
        chatId={chatIdDetalhe}
        onHide={() => setChatIdDetalhe(null)}
      />
    </>
  );
}
