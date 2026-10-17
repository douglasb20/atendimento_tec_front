'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { Calendar } from 'primereact/calendar';
import { ListBox } from 'primereact/listbox';
import { PrimeIcons } from 'primereact/api';

import ChipFiltro from '@/components/ChipFiltro';
import {
  ChannelResponse,
  DepartmentResponse,
  FiltroRelatorio,
  IUsuariosResponse,
  ResultadoBuscaCliente,
} from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta, nomeCompleto } from '@/service/Util';

import BuscaCliente from './BuscaCliente';

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
  usuarios: IUsuariosResponse[];
  setores: DepartmentResponse[];
  canais: ChannelResponse[];
  situacoes: { label: string; value: number }[];
  carregando: boolean;
  /**
   * Chamado sempre que o filtro muda **e** já há um cliente/contato
   * escolhido - sem ele, não há o que consultar, e o relatório fica vazio de
   * propósito (ver `index.tsx`).
   */
  onFiltrar: (filtro: FiltroRelatorio) => void;
  /** Preenchidos quando a tela chega de uma linha do relatório por Cliente. */
  clientIdInicial?: number;
  contactIdInicial?: number;
};

/**
 * Os filtros do relatório analítico por cliente/contato.
 *
 * A busca (`BuscaCliente`) substitui o campo de texto livre do relatório de
 * atendimentos - aqui ela é o filtro central, não um complemento, e por isso
 * fica em destaque antes dos chips, não ao lado deles.
 */
const FiltrosRelatorio = ({
  usuarios,
  setores,
  canais,
  situacoes,
  carregando,
  onFiltrar,
  clientIdInicial,
  contactIdInicial,
}: Props) => {
  const { req } = useApi();
  const [atalho, setAtalho] = useState<number>(ATALHO_PADRAO);
  const [periodo, setPeriodo] = useState(() => periodoDoAtalho(ATALHO_PADRAO));
  const [clienteOuContato, setClienteOuContato] = useState<ResultadoBuscaCliente | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [channelId, setChannelId] = useState<number | null>(null);
  const [statusId, setStatusId] = useState<number | null>(null);

  const personalizado = atalho === 0;

  const opcoesDeUsuario = [
    TODOS,
    ...usuarios.map((u) => ({ label: nomeCompleto(u), value: u.id })),
  ];
  const opcoesDeSetor = [TODOS, ...setores.map((s) => ({ label: s.name, value: s.id }))];
  const opcoesDeCanal = [TODOS, ...canais.map((c) => ({ label: c.name, value: c.id }))];
  const opcoesDeSituacao = [{ label: 'Todas', value: null }, ...situacoes];

  const rotuloDe = (
    opcoes: { label: string; value: number | null }[],
    valor: number | null,
    padrao = 'Todos',
  ): string => opcoes.find((o) => o.value === valor)?.label ?? padrao;

  const rotuloDoPeriodo = (): string => {
    if (!personalizado) return ATALHOS.find((a) => a.value === atalho)!.label.toLowerCase();
    if (periodo.de && periodo.ate) return `${dataCurta(periodo.de)} a ${dataCurta(periodo.ate)}`;
    return 'personalizado';
  };

  /**
   * Dispara o filtro, mas só quando há cliente/contato escolhido - sem isto,
   * trocar o período antes de escolher alguém faria uma consulta que o
   * backend recusaria (ou, pior, devolveria a base inteira sem recorte).
   */
  const filtrar = (mudanca: Partial<FiltroRelatorio> = {}) => {
    if (!clienteOuContato) return;

    onFiltrar({
      de: periodo.de,
      ate: periodo.ate,
      client_id: clienteOuContato.tipo === 'client' ? clienteOuContato.id : undefined,
      contact_id: clienteOuContato.tipo === 'contact' ? clienteOuContato.id : undefined,
      user_id: userId,
      department_id: departmentId,
      channel_id: channelId,
      support_chat_status_id: statusId,
      ...mudanca,
    });
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

  const escolherClienteOuContato = (resultado: ResultadoBuscaCliente | null) => {
    setClienteOuContato(resultado);

    if (!resultado) return;

    onFiltrar({
      de: periodo.de,
      ate: periodo.ate,
      client_id: resultado.tipo === 'client' ? resultado.id : undefined,
      contact_id: resultado.tipo === 'contact' ? resultado.id : undefined,
      user_id: userId,
      department_id: departmentId,
      channel_id: channelId,
      support_chat_status_id: statusId,
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

  /**
   * Chega de uma linha do relatório por Cliente (`?client_id=`/`?contact_id=`
   * na URL) - resolve o nome e já dispara a primeira busca, em vez de abrir
   * a tela vazia esperando a pessoa digitar de novo o que já escolheu antes.
   */
  useEffect(() => {
    const id = clientIdInicial ?? contactIdInicial;
    const tipo = clientIdInicial ? 'client' : 'contact';
    if (!id) return;

    (async () => {
      try {
        const { data } = await req.get<ResultadoBuscaCliente | null>(
          `/reports/client-detail/resolve?id=${id}&tipo=${tipo}`,
        );
        if (data) escolherClienteOuContato(data);
      } catch (err) {
        CatchAlerta(err, 'Erro ao carregar o cliente/contato selecionado');
      }
    })();
    // Só na montagem: os ids iniciais vêm da URL e não mudam depois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <BuscaCliente
          valor={clienteOuContato}
          onEscolher={escolherClienteOuContato}
        />

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

        <ChipFiltro
          rotulo="Situação"
          valor={rotuloDe(opcoesDeSituacao, statusId, 'Todas')}
          icone={PrimeIcons.CHECK_CIRCLE}
          ativo={statusId !== null}
          larguraDoPainel="16rem"
        >
          {(fechar) =>
            lista(opcoesDeSituacao, statusId, setStatusId, fechar, 'support_chat_status_id')
          }
        </ChipFiltro>

        {carregando && <i className="pi pi-spin pi-spinner text-color-secondary" />}
      </div>
    </div>
  );
};

export default memo(FiltrosRelatorio);
