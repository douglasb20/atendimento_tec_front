import { SupportChatMessageResponse, SupportChatsResponse } from '@/Interfaces';
import { Socket } from 'socket.io-client';

export type SocketSlice = {
  socket: Socket | null;
  connect: () => void;
  disconnect: () => void;
};

export enum ModeQuoted {
  REPLY = 'reply',
  EDIT = 'edit',
}

/** Um atendimento anterior já carregado na conversa. */
export type ProtocoloAnterior = {
  id: number;
  protocol: string;
  /** Quando o atendimento foi encerrado, para o separador. */
  encerrado_em: string | null;
  mensagens: SupportChatMessageResponse[];
};

export type MessageSlice = {
  messages: SupportChatMessageResponse[];
  loadMessages: boolean;
  doSmoothScroll: boolean;
  /**
   * Atendimentos anteriores do mesmo contato, do mais antigo para o mais novo.
   *
   * Separados de `messages` de propósito: o separador com o protocolo precisa
   * aparecer entre os blocos, e uma lista única exigiria descobrir a fronteira
   * comparando o `support_chat_id` de cada mensagem.
   */
  anteriores: ProtocoloAnterior[];
  /** Quantos ainda existem para carregar. Zero esconde o botão. */
  totalAnteriores: number;
  carregandoAnterior: boolean;
  reactionState: {
    open: boolean;
    anchorEl: HTMLElement | null;
    message: SupportChatMessageResponse | null;
  };
  quoted: {
    mode: ModeQuoted | null;
    message: SupportChatMessageResponse | null;
  };
  videoPreview: {
    source: string;
    mime_type?: string;
  };
  setTotalAnteriores: (total: number) => void;
  setCarregandoAnterior: (carregando: boolean) => void;
  /** Acrescenta um atendimento anterior no topo da conversa. */
  adicionaAnterior: (protocolo: ProtocoloAnterior) => void;
  setVideoPreview: (source: string, mime_type?: string) => void;
  setQuotedMessage: (mode: ModeQuoted, message: SupportChatMessageResponse | null) => void;
  setReactionState: (state: {
    open: boolean;
    anchorEl: HTMLElement | null;
    message: SupportChatMessageResponse | null;
  }) => void;
  setLoadMessages: (load: boolean) => void;
  setSmoothScroll: (smooth: boolean) => void;
  updateMessage: (msg: SupportChatMessageResponse) => void;
  addMessages: (messages: SupportChatMessageResponse[]) => void;
  resetMessageStore: () => void;
};

export type ChatSlice = {
  chats: SupportChatsResponse[];
  activeChat: SupportChatsResponse | null;
  chatNotFound: boolean;
  notificationSound: HTMLAudioElement | null;

  setChatNotFound: (notFound: boolean) => void;
  addChats: (newChats: SupportChatsResponse[]) => void;
  updateChat: (chat: SupportChatsResponse) => void;
  setUnreadCount: (chatId: string, count: number) => void;
  setActiveChat: (chat: SupportChatsResponse | null) => void;
  /** Aplica um patch na conversa aberta, sem esperar o eco do socket. */
  patchActiveChat: (patch: Partial<SupportChatsResponse>) => void;
  /** Volta à tela sem conversa selecionada, limpando mensagens e URL. */
  fecharConversa: () => void;
  resetChatStore: () => void;
};

export type ChatStore = SocketSlice & MessageSlice & ChatSlice;
