'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { Calendar } from 'primereact/calendar';
import { ListBox } from 'primereact/listbox';
import { PrimeIcons } from 'primereact/api';

import ChipFiltro from '@/components/ChipFiltro';
import { FiltroRelatorio, IUsuariosResponse } from '@/Interfaces';
import { nomeCompleto } from '@/service/Util';

/**
 * O dropdown de ordenação - linha a linha, por isso as opções são sobre o
 * próprio atendimento (data, duração, espera), e não agregados como no
 * relatório por Cliente. Vale igual na tela e no endpoint que a lista
 * consome (`ordenar_atendimentos_por` no backend).
 */
const OPCOES_DE_ORDENACAO: { label: string; value: FiltroRelatorio['ordenar_atendimentos_por'] }[] = [
  { label: 'Mais recentes', value: 'mais_recentes' },
  { label: 'Mais antigos', value: 'mais_antigos' },
  { label: 'Maior duração', value: 'maior_duracao' },
  { label: 'Menor duração', value: 'menor_duracao' },
  { label: 'Maior espera', value: 'maior_espera' },
  { label: 'Menor espera', value: 'menor_espera' },
];

export const ORDENACAO_PADRAO = 'mais_recentes' as const;

/**
 * Os atalhos de período, em dias. `0` é "Personalizar", que libera as datas.
 *
 * Em vez de um padrão fixo imposto (mês atual, últimos 30 dias): o cliente
 * escolhe o recorte. Abre em 7 dias, que é o mais leve.
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

  // `dias - 1` porque hoje conta: "7 dias" é hoje mais os seis anteriores, e
  // não hoje mais sete (que seriam oito dias no filtro).
  de.setDate(de.getDate() - (dias - 1));
  de.setHours(0, 0, 0, 0);

  return { de, ate };
};

const dataCurta = (data?: Date | null) =>
  data ? data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';

type Props = {
  usuarios: IUsuariosResponse[];
  carregando: boolean;
  onFiltrar: (filtro: FiltroRelatorio) => void;
};

/**
 * Filtros da tela de Histórico - mesmo padrão visual do relatório de
 * Atendimentos (`relatorios/atendimentos/FiltrosRelatorio.tsx`), mas sem
 * Setor/Canal/Situação: aqui é consulta rápida por protocolo, não auditoria
 * segmentada, e menos chips deixa a busca em evidência.
 */
const FiltrosHistorico = ({ usuarios, carregando, onFiltrar }: Props) => {
  const [atalho, setAtalho] = useState<number>(ATALHO_PADRAO);
  const [periodo, setPeriodo] = useState(() => periodoDoAtalho(ATALHO_PADRAO));
  const [userId, setUserId] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const [ordenarPor, setOrdenarPor] =
    useState<FiltroRelatorio['ordenar_atendimentos_por']>(ORDENACAO_PADRAO);

  const personalizado = atalho === 0;

  const opcoesDeUsuario = [
    { label: 'Todos', value: null },
    ...usuarios.map((u) => ({ label: nomeCompleto(u), value: u.id })),
  ];

  /** O texto do chip de seleção única: o rótulo da opção escolhida, ou "Todos". */
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
    // O `ListBox` desmarca ao clicar no item já ativo; aqui isso deixaria a
    // tela sem período nenhum, então o clique repetido é ignorado.
    if (dias === null) return;

    setAtalho(dias);

    // "Personalizar" (0) mantém o painel aberto - ele revela os campos de
    // data, que sumiriam no mesmo clique que os mostrou - e não filtra
    // ainda: quem vai escolher datas não quer consulta a cada tecla.
    if (dias === 0) return;

    const novo = periodoDoAtalho(dias);
    setPeriodo(novo);
    fechar();
    filtrar(novo);
  };

  /**
   * Dispara o filtro com o estado atual, aceitando sobrescritas.
   *
   * As sobrescritas existem porque o `setState` do React não é síncrono: o
   * valor recém-escolhido ainda não está no estado quando o filtro sai, e sem
   * passá-lo à parte a primeira busca usaria o valor anterior.
   */
  const filtrar = (mudanca: Partial<FiltroRelatorio> = {}) => {
    onFiltrar({
      de: periodo.de,
      ate: periodo.ate,
      user_id: userId,
      busca: busca.trim() || undefined,
      ordenar_atendimentos_por: ordenarPor,
      ...mudanca,
    });
  };

  // No modo personalizado, filtra quando as **duas** datas estão preenchidas.
  // Com só uma, o período ficaria aberto de um lado e traria mais do que quem
  // está escolhendo pretende ver.
  //
  // A primeira montagem não dispara: a tela já carrega sozinha com o período
  // padrão, e filtrar aqui seria uma consulta repetida.
  const primeiraRenderizacao = useRef(true);

  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }

    if (personalizado && periodo.de && periodo.ate) filtrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo.de, periodo.ate]);

  /** A lista de seleção única dos chips: compacta, sem borda. */
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
        // Filtra na hora: o clique na opção **é** a ação, e pedir um
        // "Filtrar" depois seria um passo a mais para dizer o que já foi
        // dito. Ver em `filtrar` o porquê da sobrescrita.
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
              {/* Atalho fecha o painel; "Personalizar" (0) não - ele revela
                  os campos de data logo abaixo, que sumiriam no mesmo
                  clique que os mostrou. */}
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
                        // Início depois do fim empurra o fim junto, em vez de
                        // deixar um intervalo inválido só sinalizado por erro.
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

        <ChipFiltro
          rotulo="Atendente"
          valor={rotuloDe(opcoesDeUsuario, userId)}
          icone={PrimeIcons.USER}
          ativo={userId !== null}
        >
          {(fechar) => lista(opcoesDeUsuario, userId, setUserId, fechar, 'user_id')}
        </ChipFiltro>

        <ChipFiltro
          rotulo="Buscar"
          valor={busca.trim() || 'Nenhum'}
          icone="pi pi-search"
          ativo={Boolean(busca.trim())}
          larguraDoPainel="18rem"
        >
          {(fechar) => (
            <div className="flex gap-2 p-2">
              <span className="p-input-icon-right flex-1">
                {carregando && <i className="pi pi-spin pi-spinner" />}
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    filtrar();
                    fechar();
                  }}
                  placeholder="Protocolo, contato ou cliente"
                  className="p-inputtext p-inputtext-sm w-full"
                  autoFocus
                />
              </span>
            </div>
          )}
        </ChipFiltro>

        {/* Divider vertical do PrimeReact, não um "|" solto: é uma categoria
            diferente dos filtros de recorte acima - este decide a ordem das
            linhas, não o que entra ou sai delas. */}
        <span className="text-300 text-2xl mx-1">|</span>

        <ChipFiltro
          rotulo="Ordenar por"
          valor={OPCOES_DE_ORDENACAO.find((o) => o.value === ordenarPor)!.label}
          icone={PrimeIcons.SORT_AMOUNT_DOWN}
        >
          {(fechar) => (
            <ListBox
              value={ordenarPor}
              options={OPCOES_DE_ORDENACAO}
              onChange={(e) => {
                if (!e.value) return;
                setOrdenarPor(e.value);
                fechar();
                filtrar({ ordenar_atendimentos_por: e.value });
              }}
              className="w-full border-none"
              listStyle={{ maxHeight: '15rem' }}
            />
          )}
        </ChipFiltro>
      </div>
    </div>
  );
};

export default memo(FiltrosHistorico);
