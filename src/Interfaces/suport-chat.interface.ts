import { ContactResponse } from './contact.interface';
import { UserResponse } from './user.interface';

/** Espelha `support_chat_status` no banco; os dois últimos são finais. */
export enum SupportChatStatusId {
  AGUARDANDO = 1,
  EM_ANDAMENTO = 2,
  EM_FILA = 3,
  FINALIZADO_SEM_RESPOSTA = 4,
  FINALIZADO = 5,
}

/**
 * Atendimento encerrado, decidido pelo id do status.
 *
 * A relação `supportChatStatus` - que traz o `is_final` - não vem em todas as
 * respostas (a rota de mensagens não a carrega, e os webhooks emitem a entidade
 * crua), então depender dela deixaria a tela achando que um chat finalizado
 * ainda está aberto.
 */
export const ehAtendimentoFinalizado = (statusId?: number): boolean =>
  statusId === SupportChatStatusId.FINALIZADO ||
  statusId === SupportChatStatusId.FINALIZADO_SEM_RESPOSTA;

export interface SupportChatsResponse {
  id: string;
  /** Atendente que assumiu; nulo enquanto a conversa aguarda. */
  user_id: number | null;
  channel_id: number;
  contact_id: number;
  support_chat_status_id: number;
  protocol: string;
  unread_count: number;
  last_message: string;
  last_message_type: string;
  last_message_id: string;
  is_waiting: boolean;
  created_at: string;
  /** Instante em que o atendimento foi assumido - origem do cronômetro. */
  answered_at: string | null;
  finished_at: string | null;
  observation_user: string | null;
  updated_at: string | null;
  /** Ausente nos payloads de webhook, que emitem a entidade sem a relação. */
  supportChatStatus?: SupportChatStatus;
  contact?: ContactResponse;
  supportChatMessages?: SupportChatMessageResponse[];
  user?: UserResponse;
}

export interface SupportChatMessageResponse {
  id: string;
  support_chat_id: string;
  channel_id: number;
  message_id: string;
  datetime: string;
  ack: number;
  type: string;
  from_me: boolean;
  content: string;
  has_media: boolean;
  media_url: string;

  /**
   * Volta o tipo de mídia correta
   */
  media_type: string;
  media_size: null;
  has_quoted: boolean;
  quoted_msg_id: string;
  quoted_msg: string;

  from: string;
  to: string;
  device_type: string;
  is_deleted: boolean;

  /**
   * Mídia removida pela política de retenção - distinto de `is_deleted`, que é
   * revogação pelo autor. A mensagem permanece; só o arquivo deixou de existir.
   */
  media_expired?: boolean;

  /** Nome do arquivo, exibido quando não há prévia para mostrar. */
  file_name?: string;

  /** Progresso do upload (0–100) enquanto a mídia sobe; ausente após confirmar. */
  progresso?: number;
  is_edited: boolean;
  is_gif: boolean;
  has_reaction: boolean;
  reaction: string;
  raw_payload: string;
  created_at: string;
  updated_at: string;

  /**
   * Marca a mensagem exibida antes da confirmação do servidor (envio otimista).
   * Some quando a versão definitiva chega pelo webhook e substitui esta.
   */
  pending?: boolean;
}

export type SupportChatsWithMessagesResponse = SupportChatsResponse & {
  supportChatMessages: SupportChatMessageResponse;
};

export type SupportChatStatus = {
  id: number;
  name: string;
  is_final: boolean;
};

export type UnreadMessagesPayload = {
  chatId: string;
  unread_count: number;
};
