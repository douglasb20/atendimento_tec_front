'use client';

import { classNames } from 'primereact/utils';

import { SupportChatsResponse, SupportChatStatusId } from '@/Interfaces';

/** Grupos da lista lateral. `meus` entra quando houver filtro por atendente. */
export type GrupoAtendimento = 'todos' | 'fila' | 'andamento';

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
    { id: 'todos', rotulo: 'Todos', total: chats.length },
  ];

  return (
    <div className="flex align-items-center justify-content-between gap-1 border-bottom-1 surface-border overflow-x-auto px-2 py-3 mb-2">
      {abas.map(({ id, rotulo, total }) => {
        const ativa = id === grupoAtivo;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelecionar(id)}
            className={classNames(
              {
                'bg-primary-500 text-white': ativa,
                'bg-transparent text-600 hover:surface-300 border-1 border-transparent hover:border-400': !ativa,
              },
              'flex cursor-pointer align-items-center gap-2 flex-none border-none border-round-3xl px-3 py-2 text-sm font-medium white-space-nowrap transition-colors transition-duration-150',
            )}
          >
            {rotulo}
            {/* O contador é o que o atendente varre com o olho para achar onde
                há trabalho: ganha fundo próprio, invertendo as cores conforme
                o da aba. */}
            <span
              className={classNames(
                ativa ? 'bg-white text-primary-600' : 'surface-200 text-900',
                'flex align-items-center justify-content-center flex-none border-circle text-xs font-bold line-height-1',
              )}
              // Largura mínima igual à altura deixa o número numa circunferência
              // exata; com dois dígitos vira uma cápsula, sem cortar o conteúdo.
              style={{
                minWidth: '1.25rem',
                height: '1.25rem',
                padding: '0 0.25rem',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {total}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default FiltroAtendimentos;
