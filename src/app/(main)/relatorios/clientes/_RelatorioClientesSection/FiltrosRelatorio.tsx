'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { Calendar } from 'primereact/calendar';
import { InputSwitch } from 'primereact/inputswitch';
import { ListBox } from 'primereact/listbox';
import { PrimeIcons } from 'primereact/api';

import ChipFiltro from '@/components/ChipFiltro';
import {
  AgrupamentoRelatorioCliente,
  ChannelResponse,
  DepartmentResponse,
  FiltroRelatorio,
  IUsuariosResponse,
  OrdenacaoRelatorioCliente,
} from '@/Interfaces';
import { nomeCompleto } from '@/service/Util';

/**
 * Os atalhos de período, em dias. `0` é "Personalizar", que libera as datas.
 *
 * Mesma escolha dos demais relatórios: o cliente escolhe o recorte, sem um
 * padrão fixo imposto.
 */
const ATALHOS = [
  { label: 'Últimos 7 dias', value: 7 },
  { label: 'Últimos 15 dias', value: 15 },
  { label: 'Últimos 30 dias', value: 30 },
  { label: 'Personalizar', value: 0 },
];

export const ATALHO_PADRAO = 7;
export const AGRUPAMENTO_PADRAO: AgrupamentoRelatorioCliente = 'client';
export const ORDENACAO_PADRAO: OrdenacaoRelatorioCliente = 'mais_atendimentos';

/** `de`/`ate` a partir de um atalho: hoje para trás, incluindo hoje. */
export const periodoDoAtalho = (dias: number): { de: Date; ate: Date } => {
  const ate = new Date();
  const de = new Date();

  de.setDate(de.getDate() - (dias - 1));
  de.setHours(0, 0, 0, 0);

  return { de, ate };
};

const TODOS = { label: 'Todos', value: null };

const OPCOES_DE_AGRUPAMENTO: { label: string; value: AgrupamentoRelatorioCliente }[] = [
  { label: 'Cliente', value: 'client' },
  { label: 'Contato', value: 'contact' },
];

/**
 * O dropdown de ordenação - um rótulo por combinação, em vez de cabeçalho
 * clicável: o relatório tem poucas colunas, e nomear a pergunta ("Mais
 * finalizados") é mais direto do que o par coluna+direção de uma tabela
 * comum. A ordenação vale igual na tela e nas duas exportações (o backend
 * aplica no `ORDER BY` da mesma consulta).
 */
const OPCOES_DE_ORDENACAO: { label: string; value: OrdenacaoRelatorioCliente }[] = [
  { label: 'Mais atendimentos', value: 'mais_atendimentos' },
  { label: 'Menos atendimentos', value: 'menos_atendimentos' },
  { label: 'Mais finalizados', value: 'mais_finalizados' },
  { label: 'Menos finalizados', value: 'menos_finalizados' },
  { label: 'Mais em aberto', value: 'mais_em_aberto' },
  { label: 'Menos em aberto', value: 'menos_em_aberto' },
  { label: 'Mais tempo total', value: 'mais_tempo_total' },
  { label: 'Menos tempo total', value: 'menos_tempo_total' },
  { label: 'Maior espera média', value: 'mais_espera_media' },
  { label: 'Menor espera média', value: 'menos_espera_media' },
];

const dataCurta = (data?: Date | null) =>
  data ? data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';

type Props = {
  usuarios: IUsuariosResponse[];
  setores: DepartmentResponse[];
  canais: ChannelResponse[];
  carregando: boolean;
  onFiltrar: (filtro: FiltroRelatorio) => void;
};

/**
 * Os filtros do relatório por cliente/contato.
 *
 * O chip de Agrupamento é o que diferencia este relatório dos demais: decide
 * se cada linha é uma conta (`client`, pode reunir vários contatos) ou um
 * número de WhatsApp (`contact`). O switch "Ignorar sem cliente" só faz
 * sentido agrupado por cliente - contato nunca é nulo, é o próprio
 * atendimento - por isso ele desaparece no modo `contact`.
 */
const FiltrosRelatorio = ({ usuarios, setores, canais, carregando, onFiltrar }: Props) => {
  const [atalho, setAtalho] = useState<number>(ATALHO_PADRAO);
  const [periodo, setPeriodo] = useState(() => periodoDoAtalho(ATALHO_PADRAO));
  const [userId, setUserId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [channelId, setChannelId] = useState<number | null>(null);
  const [agruparPor, setAgruparPor] = useState<AgrupamentoRelatorioCliente>(AGRUPAMENTO_PADRAO);
  const [ignorarSemCliente, setIgnorarSemCliente] = useState(false);
  const [ordenarPor, setOrdenarPor] = useState<OrdenacaoRelatorioCliente>(ORDENACAO_PADRAO);

  const personalizado = atalho === 0;
  const porCliente = agruparPor === 'client';

  const opcoesDeUsuario = [
    TODOS,
    ...usuarios.map((u) => ({ label: nomeCompleto(u), value: u.id })),
  ];
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
      user_id: userId,
      department_id: departmentId,
      channel_id: channelId,
      agrupar_por: agruparPor,
      // Só manda o filtro quando agrupado por cliente: por contato ele não
      // tem efeito nenhum, e não precisa poluir a URL com um parâmetro inerte.
      ignorar_sem_cliente: porCliente ? ignorarSemCliente : undefined,
      ordenar_por: ordenarPor,
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

        <ChipFiltro
          rotulo="Agrupado por"
          valor={OPCOES_DE_AGRUPAMENTO.find((o) => o.value === agruparPor)!.label}
          icone={PrimeIcons.SITEMAP}
        >
          {(fechar) => (
            <>
              <ListBox
                value={agruparPor}
                options={OPCOES_DE_AGRUPAMENTO}
                onChange={(e) => {
                  if (!e.value) return;
                  setAgruparPor(e.value);
                  // Sem `fechar()` aqui: trocar para "Cliente" revela o
                  // switch abaixo, que sumiria no mesmo clique que o mostrou -
                  // mesma razão do atalho "Personalizar" no chip de Período.
                  filtrar({
                    agrupar_por: e.value,
                    // Trocar para "Contato" tira o filtro de sem-cliente da
                    // requisição - ele não existe nesse agrupamento.
                    ignorar_sem_cliente: e.value === 'client' ? ignorarSemCliente : undefined,
                  });
                }}
                className="w-full border-none"
              />

              {/* Só visível agrupado por cliente: por contato não existe
                  "sem contato" - o contato é o próprio atendimento, nunca
                  nulo. Vive aqui dentro, e não solto na barra de filtros,
                  porque só faz sentido junto da escolha de agrupamento. */}
              {agruparPor === 'client' && (
                <div className="flex align-items-center gap-2 p-2 pt-0">
                  <InputSwitch
                    inputId="ignorar-sem-cliente"
                    checked={ignorarSemCliente}
                    onChange={(e) => {
                      const valor = Boolean(e.value);
                      setIgnorarSemCliente(valor);
                      filtrar({ ignorar_sem_cliente: valor });
                    }}
                  />
                  <label
                    htmlFor="ignorar-sem-cliente"
                    className="text-sm text-color-secondary cursor-pointer"
                  >
                    Ignorar sem cliente
                  </label>
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

        {/* Separador antes de "Ordenar por": é uma categoria diferente dos
            filtros de recorte acima (período, agrupamento, atendente...) -
            este decide a ordem das linhas, não o que entra ou sai delas. */}
        <span className="text-color-secondary">|</span>

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
                filtrar({ ordenar_por: e.value });
              }}
              className="w-full border-none"
              listStyle={{ maxHeight: '18rem' }}
            />
          )}
        </ChipFiltro>

        {carregando && <i className="pi pi-spin pi-spinner text-color-secondary" />}
      </div>
    </div>
  );
};

export default memo(FiltrosRelatorio);
