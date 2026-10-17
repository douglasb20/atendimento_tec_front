'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { Calendar } from 'primereact/calendar';
import { ListBox } from 'primereact/listbox';
import { PrimeIcons } from 'primereact/api';

import ChipFiltro from '@/components/ChipFiltro';
import { ChannelResponse, DepartmentResponse, FiltroRelatorio } from '@/Interfaces';

/**
 * Os atalhos de período, em dias. `0` é "Personalizar", que libera as datas.
 *
 * Mesma escolha do relatório de atendimentos (`relatorios/atendimentos`): o
 * cliente escolhe o recorte, sem um padrão fixo imposto.
 */
const ATALHOS = [
  { label: 'Últimos 7 dias', value: 7 },
  { label: 'Últimos 15 dias', value: 15 },
  { label: 'Últimos 30 dias', value: 30 },
  { label: 'Personalizar', value: 0 },
];

export const ATALHO_PADRAO = 7;

/** `de`/`ate` a partir de um atalho: hoje para trás, incluindo hoje. */
export const periodoDoAtalho = (dias: number): { de: Date; ate: Date } => {
  const ate = new Date();
  const de = new Date();

  de.setDate(de.getDate() - (dias - 1));
  de.setHours(0, 0, 0, 0);

  return { de, ate };
};

const TODOS = { label: 'Todos', value: null };

const dataCurta = (data?: Date | null) =>
  data ? data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';

type Props = {
  setores: DepartmentResponse[];
  canais: ChannelResponse[];
  carregando: boolean;
  onFiltrar: (filtro: FiltroRelatorio) => void;
};

/**
 * Os filtros do relatório de produtividade.
 *
 * Sem o chip de Atendente (a linha do relatório **é** o atendente - filtrar
 * por um só devolveria uma tabela de uma linha) e sem Situação/Busca (o
 * relatório agrupa, essas duas são filtros de conversa individual). Fora
 * isso, mesmo desenho de `relatorios/atendimentos/FiltrosRelatorio`.
 */
const FiltrosRelatorio = ({ setores, canais, carregando, onFiltrar }: Props) => {
  const [atalho, setAtalho] = useState<number>(ATALHO_PADRAO);
  const [periodo, setPeriodo] = useState(() => periodoDoAtalho(ATALHO_PADRAO));
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [channelId, setChannelId] = useState<number | null>(null);

  const personalizado = atalho === 0;

  const opcoesDeSetor = [TODOS, ...setores.map((s) => ({ label: s.name, value: s.id }))];
  const opcoesDeCanal = [TODOS, ...canais.map((c) => ({ label: c.name, value: c.id }))];

  const rotuloDe = (
    opcoes: { label: string; value: number | null }[],
    valor: number | null,
  ): string => opcoes.find((o) => o.value === valor)?.label ?? 'Todos';

  const rotuloDoPeriodo = (): string => {
    if (!personalizado) return ATALHOS.find((a) => a.value === atalho)!.label.toLowerCase();
    if (periodo.de && periodo.ate) return `${dataCurta(periodo.de)} a ${dataCurta(periodo.ate)}`;
    return 'personalizado';
  };

  const trocarAtalho = (dias: number | null, fechar: () => void) => {
    if (dias === null) return;

    setAtalho(dias);
    if (dias === 0) return;

    const novo = periodoDoAtalho(dias);
    setPeriodo(novo);
    fechar();
    filtrar(novo);
  };

  const filtrar = (mudanca: Partial<FiltroRelatorio> = {}) => {
    onFiltrar({
      de: periodo.de,
      ate: periodo.ate,
      department_id: departmentId,
      channel_id: channelId,
      ...mudanca,
    });
  };

  const primeiraRenderizacao = useRef(true);

  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }

    if (personalizado && periodo.de && periodo.ate) filtrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo.de, periodo.ate]);

  const lista = (
    opcoes: { label: string; value: number | null }[],
    valor: number | null,
    aoEscolher: (v: number | null) => void,
    fechar: () => void,
    campo: keyof FiltroRelatorio,
  ) => (
    <ListBox
      value={valor}
      options={opcoes}
      onChange={(e) => {
        const escolhido = e.value ?? null;
        aoEscolher(escolhido);
        fechar();
        filtrar({ [campo]: escolhido } as Partial<FiltroRelatorio>);
      }}
      filter={opcoes.length > 8}
      filterPlaceholder="Buscar"
      className="w-full border-none"
      listStyle={{ maxHeight: '15rem' }}
    />
  );

  return (
    <div className="mb-3">
      <div className="flex flex-wrap align-items-center gap-2">
        <ChipFiltro
          rotulo="Período"
          valor={rotuloDoPeriodo()}
          icone={PrimeIcons.CALENDAR}
          larguraDoPainel="17rem"
        >
          {(fechar) => (
            <>
              <ListBox
                value={atalho}
                options={ATALHOS}
                onChange={(e) => trocarAtalho(e.value ?? null, fechar)}
                className="w-full border-none"
              />

              {personalizado && (
                <div className="flex flex-column gap-2 p-2 pt-0">
                  <div className="flex align-items-center gap-2">
                    <label
                      htmlFor="periodo-de"
                      className="text-sm text-color-secondary w-2rem"
                    >
                      De
                    </label>
                    <Calendar
                      inputId="periodo-de"
                      value={periodo.de}
                      onChange={(e) => {
                        const de = e.value as Date;
                        setPeriodo((atual) => ({
                          de,
                          ate: atual.ate && atual.ate < de ? de : atual.ate,
                        }));
                      }}
                      dateFormat="dd/mm/yy"
                      mask="99/99/9999"
                      showIcon
                      className="p-inputtext-sm flex-1"
                    />
                  </div>

                  <div className="flex align-items-center gap-2">
                    <label
                      htmlFor="periodo-ate"
                      className="text-sm text-color-secondary w-2rem"
                    >
                      Até
                    </label>
                    <Calendar
                      inputId="periodo-ate"
                      value={periodo.ate}
                      onChange={(e) => setPeriodo((atual) => ({ ...atual, ate: e.value as Date }))}
                      dateFormat="dd/mm/yy"
                      mask="99/99/9999"
                      minDate={periodo.de}
                      showIcon
                      className="p-inputtext-sm flex-1"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </ChipFiltro>

        {setores.length > 0 && (
          <ChipFiltro
            rotulo="Setor"
            valor={rotuloDe(opcoesDeSetor, departmentId)}
            icone={PrimeIcons.SITEMAP}
            ativo={departmentId !== null}
          >
            {(fechar) =>
              lista(opcoesDeSetor, departmentId, setDepartmentId, fechar, 'department_id')
            }
          </ChipFiltro>
        )}

        {canais.length > 0 && (
          <ChipFiltro
            rotulo="Canal"
            valor={rotuloDe(opcoesDeCanal, channelId)}
            icone={PrimeIcons.WHATSAPP}
            ativo={channelId !== null}
          >
            {(fechar) => lista(opcoesDeCanal, channelId, setChannelId, fechar, 'channel_id')}
          </ChipFiltro>
        )}

        {carregando && <i className="pi pi-spin pi-spinner text-color-secondary" />}
      </div>
    </div>
  );
};

export default memo(FiltrosRelatorio);
