'use client';

import { useRef } from 'react';
import { Menu } from 'primereact/menu';
import { classNames } from 'primereact/utils';

import { SupportChatsResponse, SupportChatStatusId } from '@/Interfaces';

/** Grupos da lista lateral. `meus` entra quando houver filtro por atendente. */
export type GrupoAtendimento = 'todos' | 'fila' | 'andamento' | 'chatbot';

/**
 * Abas que ficam sempre visíveis como botão, mesmo quando outras entram no
 * dropdown "+N" - como o Whaticket faz com "Em atendimento"/"Em espera"/
 * "Adiados". As demais (hoje só "Todos") vão para o menu.
 */
const ABAS_FIXAS: GrupoAtendimento[] = ['andamento', 'fila', 'chatbot'];

type FiltroAtendimentosProps = {
  chats: SupportChatsResponse[];
  grupoAtivo: GrupoAtendimento;
  onSelecionar: (grupo: GrupoAtendimento) => void;
};

/**
 * A que grupo uma conversa pertence.
 *
 * Decide pelo id do status, não pela relação `supportChatStatus`: ela não vem
 * em todos os payloads (webhooks emitem a entidade crua), e um grupo errado
 * some com a conversa da lista.
 */
export const grupoDaConversa = (chat: SupportChatsResponse): Exclude<GrupoAtendimento, 'todos'> =>
  chat.support_chat_status_id === SupportChatStatusId.EM_ANDAMENTO ? 'andamento' : 'fila';

export const filtraPorGrupo = (chats: SupportChatsResponse[], grupo: GrupoAtendimento) =>
  grupo === 'todos' ? chats : chats.filter((c) => grupoDaConversa(c) === grupo);

const FiltroAtendimentos = ({ chats, grupoAtivo, onSelecionar }: FiltroAtendimentosProps) => {
  const menuMaisRef = useRef<Menu>(null);

  const abas: { id: GrupoAtendimento; rotulo: string; total: number }[] = [
    {
      id: 'andamento',
      rotulo: 'Em atendimento',
      total: chats.filter((c) => grupoDaConversa(c) === 'andamento').length,
    },
    {
      id: 'fila',
      rotulo: 'Espera',
      total: chats.filter((c) => grupoDaConversa(c) === 'fila').length,
    },
    // Atrás de `SHOW_CHATBOT_MENU`, como o resto da feature: a fila ainda não
    // é atribuída em `grupoDaConversa`, e a aba ficaria sempre zerada.
    ...(process.env.SHOW_CHATBOT_MENU === 'true'
      ? [
          {
            id: 'chatbot' as GrupoAtendimento,
            rotulo: 'Chatbot',
            total: chats.filter((c) => grupoDaConversa(c) === 'chatbot').length,
          },
        ]
      : []),
    { id: 'todos', rotulo: 'Todos', total: chats.length },
  ];

  // O dropdown só existe quando sobra aba: com 3 ou menos, tudo cabe como
  // botão, "Todos" incluso.
  const abasFixas = abas.length > 3 ? abas.filter((aba) => ABAS_FIXAS.includes(aba.id)) : abas;
  const abasNoMenu = abas.length > 3 ? abas.filter((aba) => !ABAS_FIXAS.includes(aba.id)) : [];

  // A aba ativa pode estar dentro do menu (ex.: "Todos" selecionado) - o botão
  // "+N" precisa marcar isso também, senão pareceria que nenhuma aba está
  // selecionada.
  const algumaNoMenuAtiva = abasNoMenu.some((aba) => aba.id === grupoAtivo);

  const itensMenu = abasNoMenu.map((aba) => ({
    label: `${aba.rotulo} (${aba.total})`,
    command: () => onSelecionar(aba.id),
  }));

  const botaoClasse = (ativa: boolean) =>
    classNames(
      {
        // `text-primary-contrast` e não `text-white`: nos modos escuros a
        // primária é clara, e o branco sobre ela não lê.
        'bg-primary-500 text-primary-contrast': ativa,
        'bg-transparent text-600 hover:surface-300 border-1 border-transparent hover:border-400':
          !ativa,
      },
      'flex cursor-pointer align-items-center gap-2 flex-none border-none border-round-3xl px-3 py-2 text-sm font-medium white-space-nowrap transition-colors transition-duration-150',
    );

  const contadorClasse = (ativa: boolean) =>
    classNames(
      // `surface-0` e não `bg-white`: o branco literal ficava um retângulo
      // claro na aba ativa sobre o fundo escuro. A superfície 0 é branca no
      // claro e escura no escuro.
      ativa ? 'surface-0 text-primary-600' : 'surface-200 text-900',
      'flex align-items-center justify-content-center flex-none border-circle text-xs font-bold line-height-1',
    );

  // Largura mínima igual à altura deixa o número numa circunferência exata;
  // com dois dígitos vira uma cápsula, sem cortar o conteúdo.
  const contadorStyle = {
    minWidth: '1.25rem',
    height: '1.25rem',
    padding: '0 0.25rem',
    fontVariantNumeric: 'tabular-nums' as const,
  };

  return (
    <div className="flex flex-1 align-items-center justify-content-between gap-1 overflow-x-auto px-2">
      {abasFixas.map(({ id, rotulo, total }) => {
        const ativa = id === grupoAtivo;

        return (
          <button key={id} type="button" onClick={() => onSelecionar(id)} className={botaoClasse(ativa)}>
            {rotulo}
            {/* O contador é o que o atendente varre com o olho para achar onde
                há trabalho: ganha fundo próprio, invertendo as cores conforme
                o da aba. */}
            <span className={contadorClasse(ativa)} style={contadorStyle}>
              {total}
            </span>
          </button>
        );
      })}

      {/* Como o Whaticket faz com "+N": as abas que não cabem entre as fixas
          ficam atrás de um botão único, que abre um menu. Com uma aba só no
          menu ela ainda assim entra ali - a lista de fixas é a decisão de
          negócio, não uma questão de espaço na tela. */}
      {abasNoMenu.length > 0 && (
        <>
          <Menu ref={menuMaisRef} model={itensMenu} popup style={{ width: 'auto' }} />
          <button
            type="button"
            onClick={(evento) => menuMaisRef.current?.toggle(evento)}
            className={botaoClasse(algumaNoMenuAtiva)}
          >
            {`+${abasNoMenu.length}`}
          </button>
        </>
      )}
    </div>
  );
};

export default FiltroAtendimentos;
