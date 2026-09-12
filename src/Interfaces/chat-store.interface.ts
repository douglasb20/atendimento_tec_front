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

export type MessageSlice = {
  messages: SupportChatMessageResponse[];
  loadMessages: boolean;
  doSmoothScroll: boolean;
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
  },
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
  resetChatStore: () => void;
};

export type ChatStore = SocketSlice & MessageSlice & ChatSlice;
