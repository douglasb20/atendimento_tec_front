/**
 * Chat interno: conversa direta entre usuários do portal.
 *
 * Espelha o backend em `back/src/internal-chats/`. Os nomes de campo ficam em
 * inglês, como nos demais tipos de resposta da API - eles copiam colunas.
 */

/** O que uma mensagem interna pode ser. */
export enum InternalMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  /** Arquivo de áudio anexado. */
  AUDIO = 'audio',
  /** Gravado na hora pelo microfone. */
  VOICE = 'voice',
}

/**
 * Como o colega aparece na lista.
 *
 * `ausente` é derivado do tempo sem mexer no mouse ou no teclado: a pessoa
 * continua conectada, mas mostrá-la como disponível faria esperar resposta que
 * não vem.
 */
export type EstadoPresenca = 'online' | 'ausente' | 'offline';

/** Um colega na lista, com o estado de presença. */
export type ColegaResponse = {
  id: number;
  name: string;
  last_name: string | null;
  /** Já vem como URL pública - o backend converte a key na saída. */
  avatar_url: string | null;
  /** Conectado, em qualquer estado. Mantido por compatibilidade. */
  online: boolean;
  estado: EstadoPresenca;
};

/** O autor de uma mensagem, como o backend o devolve. */
export type RemetenteInterno = {
  id: number;
  name: string;
  last_name?: string | null;
  avatar_url?: string | null;
};

export type InternalMessageResponse = {
  id: string;
  internal_chat_id: number | string;
  sender_id: number;
  type: InternalMessageType;
  content: string | null;
  has_media: boolean;
  /** URL pública, não a key - a conversão acontece no backend. */
  media_url: string | null;
  media_type: string | null;
  media_size: number | null;
  file_name: string | null;
  /**
   * A mídia foi apagada pela retenção.
   *
   * ⚠️ Diferente de mensagem apagada: a bolha continua, com o aviso de que o
   * arquivo expirou. Quando é `true`, `media_url` vem nulo.
   */
  media_expired: boolean;
  media_expired_at: string | null;
  /** Nulo enquanto o destinatário não abriu. */
  read_at: string | null;
  created_at: string;
  updated_at: string | null;
  sender?: RemetenteInterno;
};

/** Uma conversa na lista, com o resumo que a tela precisa. */
export type ConversaInternaResponse = {
  id: number | string;
  /** O outro lado - o backend já resolve qual dos dois é. */
  outro: ColegaResponse;
  last_message_at: string | null;
  ultima_mensagem: InternalMessageResponse | null;
  nao_lidas: number;
};

/** Corpo do envio. `media_key` é a key devolvida por `AssinarMidiaInterna`. */
export type EnviarMensagemInternaBody = {
  type: InternalMessageType;
  content?: string;
  media_key?: string;
  mimetype?: string;
  media_size?: number;
  file_name?: string;
};

/** Payload de `interno:lida`. */
export type LeituraInternaEvento = {
  chat_id: number | string;
  /** Quem leu. */
  por: number;
};

/** Payload de `presenca:mudou`. */
export type PresencaEvento = {
  user_id: number;
  estado: EstadoPresenca;
  /** Redundante com `estado`; mantido para quem ainda lê o campo antigo. */
  online: boolean;
};

/**
 * Payload de `presenca:atual`, enviado só a quem acabou de conectar.
 *
 * Só os conectados vêm no mapa - quem não aparece está offline, que é o padrão
 * da tela.
 */
export type PresencaAtualEvento = {
  estados: Record<number, EstadoPresenca>;
};
