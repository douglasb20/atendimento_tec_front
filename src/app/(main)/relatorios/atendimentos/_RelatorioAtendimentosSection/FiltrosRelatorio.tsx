'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { ListBox } from 'primereact/listbox';
import { PrimeIcons } from 'primereact/api';

import ChipFiltro from '@/components/ChipFiltro';
import {
  ChannelResponse,
  DepartmentResponse,
  FiltroRelatorio,
  IUsuariosResponse,
} from '@/Interfaces';
import { nomeCompleto } from '@/service/Util';

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
  setores: DepartmentResponse[];
  canais: ChannelResponse[];
  situacoes: { label: string; value: number }[];
  carregando: boolean;
  onFiltrar: (filtro: FiltroRelatorio) => void;
};

const FiltrosRelatorio = ({
  usuarios,
  setores,
  canais,
  situacoes,
  carregando,
  onFiltrar,
}: Props) => {
  const [atalho, setAtalho] = useState<number>(ATALHO_PADRAO);
  const [periodo, setPeriodo] = useState(() => periodoDoAtalho(ATALHO_PADRAO));
  const [userId, setUserId] = useState<number | null>(null);
  // Arrays, e não um valor só: Setor, Canal e Situação aceitam multiseleção -
  // vazio é "Todos", igual ao campo ausente nos demais filtros.
  const [departmentIds, setDepartmentIds] = useState<number[]>([]);
  const [channelIds, setChannelIds] = useState<number[]>([]);
  const [statusIds, setStatusIds] = useState<number[]>([]);
  const [busca, setBusca] = useState('');

  const personalizado = atalho === 0;

  const opcoesDeUsuario = [
    { label: 'Todos', value: null },
    ...usuarios.map((u) => ({ label: nomeCompleto(u), value: u.id })),
  ];
  const opcoesDeSetor = setores.map((s) => ({ label: s.name, value: s.id }));
  const opcoesDeCanal = canais.map((c) => ({ label: c.name, value: c.id }));

  /** O texto do chip de seleção única: o rótulo da opção escolhida, ou "Todos". */
  const rotuloDe = (
    opcoes: { label: string; value: number | null }[],
    valor: number | null,
  ): string => opcoes.find((o) => o.value === valor)?.label ?? 'Todos';

  /**
   * O texto do chip multiseleção: nada marcado é "Todos"/"Todas"; um ou dois
   * itens aparecem pelo nome; three ou mais viram "N selecionados" para o
   * chip não esticar a barra inteira.
   */
  const rotuloMultiplo = (
    opcoes: { label: string; value: number }[],
    selecionados: number[],
    padrao: string,
  ): string => {
    if (!selecionados.length) return padrao;
    if (selecionados.length <= 2) {
      return selecionados
        .map((id) => opcoes.find((o) => o.value === id)?.label ?? `#${id}`)
        .join(', ');
    }
    return `${selecionados.length} selecionados`;
  };

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
      department_id: departmentIds,
      channel_id: channelIds,
      support_chat_status_id: statusIds,
      busca: busca.trim() || undefined,
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

  /**
   * A lista multiseleção: `multiple` do próprio `ListBox` (não precisa do
   * `MultiSelect`, que abre como dropdown separado em vez de caber no mesmo
   * painel de chip dos outros filtros). Sem botão "Filtrar": cada clique já
   * atualiza e dispara a busca, igual à seleção única.
   *
   * Checkbox explícito em cada item (`itemTemplate`), em vez de só o
   * destaque de fundo que o `ListBox` já dá ao selecionado: o mesmo
   * componente é usado em seleção única noutros chips desta tela, e sem um
   * sinal visual diferente não fica claro que aqui dá para marcar mais de um.
   */
  const listaMultipla = (
    opcoes: { label: string; value: number }[],
    selecionados: number[],
    aoEscolher: (v: number[]) => void,
    campo: keyof FiltroRelatorio,
  ) => (
    <ListBox
      value={selecionados}
      options={opcoes}
      multiple
      onChange={(e) => {
        const escolhidos: number[] = e.value ?? [];
        aoEscolher(escolhidos);
        filtrar({ [campo]: escolhidos } as Partial<FiltroRelatorio>);
      }}
      itemTemplate={(opcao: { label: string; value: number }) => (
        <div className="flex align-items-center gap-2">
          <Checkbox
            checked={selecionados.includes(opcao.value)}
            // Só exibe o estado - o clique no item inteiro já é tratado pelo
            // `onChange` do `ListBox` acima; um `onChange` aqui duplicaria o
            // toggle (um do Checkbox, outro do ListBox).
            readOnly
          />
          <span>{opcao.label}</span>
        </div>
      )}
      filter={opcoes.length > 8}
      filterPlaceholder="Buscar"
      className="w-full border-none"
      listStyle={{ maxHeight: '15rem' }}
    />
  );

  return (
    <div className="mb-3">
      {/* Os filtros como chips, em vez de campos sempre abertos: mostram o
          estado de cada um numa linha só, e as opções aparecem ao clicar.
          Com cinco filtros, campos abertos tomariam a tela antes de a tabela
          começar. */}
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

              {/* As datas só em "Personalizar": nos atalhos seriam campos
              inertes, e o próprio atalho já diz o período. */}
              {personalizado && (
                <div className="flex flex-column gap-2 p-2 pt-0">
                  {/* Rótulo à esquerda, e não placeholder: com a data preenchida
                  o placeholder some, e os dois campos ficam indistinguíveis. */}
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

        {setores.length > 0 && (
          <ChipFiltro
            rotulo="Setor"
            valor={rotuloMultiplo(opcoesDeSetor, departmentIds, 'Todos')}
            icone={PrimeIcons.SITEMAP}
            ativo={departmentIds.length > 0}
          >
            {() => listaMultipla(opcoesDeSetor, departmentIds, setDepartmentIds, 'department_id')}
          </ChipFiltro>
        )}

        {canais.length > 0 && (
          <ChipFiltro
            rotulo="Canal"
            valor={rotuloMultiplo(opcoesDeCanal, channelIds, 'Todos')}
            icone={PrimeIcons.WHATSAPP}
            ativo={channelIds.length > 0}
          >
            {() => listaMultipla(opcoesDeCanal, channelIds, setChannelIds, 'channel_id')}
          </ChipFiltro>
        )}

        <ChipFiltro
          rotulo="Situação"
          valor={rotuloMultiplo(situacoes, statusIds, 'Todas')}
          icone={PrimeIcons.CHECK_CIRCLE}
          ativo={statusIds.length > 0}
          larguraDoPainel="16rem"
        >
          {() => listaMultipla(situacoes, statusIds, setStatusIds, 'support_chat_status_id')}
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
      </div>
    </div>
  );
};

export default memo(FiltrosRelatorio);
