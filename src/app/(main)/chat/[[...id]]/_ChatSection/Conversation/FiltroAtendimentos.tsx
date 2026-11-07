'use client';

import { Button } from 'primereact/button';
import { classNames } from 'primereact/utils';

import { SupportChatsResponse, SupportChatStatusId } from '@/Interfaces';
import { useAjustesAtendimento } from '@/hooks/useAjustesAtendimento';

/** Grupos da lista lateral, com ícones e contadores sempre visíveis. */
export type GrupoAtendimento = 'todos' | 'fila' | 'andamento' | 'pausas' | 'chatbot';

type FiltroAtendimentosProps = {
  chats: SupportChatsResponse[];
  grupoAtivo: GrupoAtendimento;
  onSelecionar: (grupo: GrupoAtendimento) => void;
  desabilitado?: boolean;
};

/**
 * A que grupo uma conversa pertence.
 *
 * Decide pelo id do status, não pela relação `supportChatStatus`: ela não vem
 * em todos os payloads (webhooks emitem a entidade crua), e um grupo errado
 * some com a conversa da lista.
 */
export const grupoDaConversa = (chat: SupportChatsResponse): Exclude<GrupoAtendimento, 'todos'> => {
  if (chat.pos_atendimento_ativo) return 'chatbot';
  if (chat.support_chat_status_id === SupportChatStatusId.EM_ANDAMENTO) {
    // Pausar preserva status e dono no servidor; só muda o grupo visual.
    return chat.paused_at ? 'pausas' : 'andamento';
  }
  return chat.support_chat_status_id === SupportChatStatusId.EM_FILA ? 'chatbot' : 'fila';
};

export const filtraPorGrupo = (chats: SupportChatsResponse[], grupo: GrupoAtendimento) =>
  grupo === 'todos' ? chats : chats.filter((c) => grupoDaConversa(c) === grupo);

const FiltroAtendimentos = ({ chats, grupoAtivo, onSelecionar, desabilitado }: FiltroAtendimentosProps) => {
  const { ajustes } = useAjustesAtendimento();

  const abas: { id: GrupoAtendimento; rotulo: string; icone: string; total: number }[] = [
    {
      id: 'andamento',
      rotulo: 'Em atendimento',
      icone: 'fa-solid fa-headset',
      total: chats.filter((c) => grupoDaConversa(c) === 'andamento').length,
    },
    {
      id: 'pausas',
      rotulo: 'Em pausas',
      icone: 'pi pi-pause',
      total: chats.filter((c) => grupoDaConversa(c) === 'pausas').length,
    },
    {
      id: 'fila',
      rotulo: 'Espera',
      icone: 'pi pi-clock',
      total: chats.filter((c) => grupoDaConversa(c) === 'fila').length,
    },
    ...(ajustes.chatbot_habilitado
      ? [
          {
            id: 'chatbot' as GrupoAtendimento,
            rotulo: 'Chatbot',
            icone: 'fa-solid fa-robot',
            total: chats.filter((c) => grupoDaConversa(c) === 'chatbot').length,
          },
        ]
      : []),
    { id: 'todos', rotulo: 'Todos', icone: 'pi pi-list', total: chats.length },
  ];

  return (
    <div className="flex flex-1 align-items-center justify-content-between gap-2 px-2">
      {abas.map(({ id, rotulo, icone, total }) => {
        const ativa = id === grupoAtivo;

        return (
          <Button key={id} type="button" onClick={() => onSelecionar(id)}
            disabled={desabilitado}
            className={classNames('filtro-atendimento', { 'filtro-atendimento--ativo': ativa })}
            aria-label={`${rotulo}: ${total}`} aria-pressed={ativa}
            tooltip={rotulo} tooltipOptions={{ position: 'top' }}>
            <i className={icone} aria-hidden="true" />
            <span className="filtro-atendimento__contador" aria-hidden="true">{total}</span>
          </Button>
        );
      })}

    </div>
  );
};

export default FiltroAtendimentos;
