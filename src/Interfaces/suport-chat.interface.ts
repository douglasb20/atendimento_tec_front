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

/**
 * Se a conversa aceita ação do atendente - responder, reagir, citar, apagar.
 *
 * Só quando alguém a assumiu: antes disso o atendimento não tem dono nem
 * `answered_at`, e depois de finalizado é histórico. Vale para tudo que
 * escreve, não só para a caixa de mensagem - reagir também chega ao WhatsApp
 * do cliente.
 */
export const ehAtendimentoAtivo = (statusId?: number): boolean =>
  statusId === SupportChatStatusId.EM_ANDAMENTO;

/**
 * Se **este** atendente pode agir na conversa.
 *
 * Estar em andamento não basta: a conversa pode estar com outro atendente, e aí
 * ela é só leitura - responder ali faria o cliente ouvir duas vozes no mesmo
 * atendimento, e a mensagem sairia assinada por quem não o conduz.
 *
 * `String()` na comparação porque os ids chegam ora number, ora string,
 * conforme o caminho (cookie, socket, resposta HTTP).
 *
 * ⚠️ Prefira este a `ehAtendimentoAtivo` em qualquer coisa que escreva. O outro
 * segue existindo para o que depende só do estado da conversa.
 */
export const podeAgirNoAtendimento = (
  chat?: Pick<SupportChatsResponse, 'support_chat_status_id' | 'user_id'> | null,
  usuarioLogadoId?: number | null,
): boolean => {
  if (!chat || !ehAtendimentoAtivo(chat.support_chat_status_id)) return false;
  if (chat.user_id === null || usuarioLogadoId === null || usuarioLogadoId === undefined) {
    return false;
  }

  return String(chat.user_id) === String(usuarioLogadoId);
};

export interface SupportChatsResponse {
  id: string;
  /** Atendente que assumiu; nulo enquanto a conversa aguarda. */
  user_id: number | null;
  channel_id: number;
  contact_id: number;
  support_chat_status_id: number;
  protocol: string;
  unread_count: number;
  /** "Marcar como não lida" (ação manual do atendente) - distinto de
   * `unread_count`, que é mensagem real do contato ainda não vista. A lista
   * mostra os dois de formas diferentes: número para `unread_count`,
   * bolinha simples para este campo (como o WhatsApp Web). */
  marked_unread?: boolean;
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
  /** Só na rota que abre a conversa; os payloads de socket não os trazem. */
  supportChatEvents?: SupportChatEventResponse[];
}

/**
 * O que aconteceu com a conversa, fora as mensagens.
 *
 * Vem da tabela `support_chat_events`, separada de `support_chat_messages`
 * porque aquela espelha o WhatsApp e um evento interno não tem remetente.
 */
export interface SupportChatEventResponse {
  id: string;
  support_chat_id: string;
  tipo: 'transferencia';
  motivo: string | null;
  created_at: string;
  userOrigem: UserResponse | null;
  /** ⚠️ Nulo significa **devolvido para a espera**, não ausência de dado. */
  userDestino: UserResponse | null;
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
   * Quando a mensagem foi removida do portal ("apagar para mim").
   *
   * Distinta de `is_deleted`, que é a revogação no WhatsApp: aqui a mensagem
   * segue no aparelho do contato, e aparece como marcador na conversa.
   */
  hidden_at: string | null;

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
  /**
   * Um emoji por pessoa: `{ "<jid de quem reagiu>": "<emoji>" }`.
   *
   * O mapa por autor é o que permite a mesma mensagem ter reações de várias
   * pessoas, e cada uma trocar ou remover a sua.
   */
  reaction: Record<string, string>;
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
