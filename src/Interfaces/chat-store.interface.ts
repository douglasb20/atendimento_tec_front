import { SupportChatMessageResponse, SupportChatsResponse } from '@/Interfaces';
import { Socket } from 'socket.io-client';

export type SocketSlice = {
  socket: Socket | null;
  connect: () => void;
  disconnect: () => void;
};

export type MessageSlice = {
  messages: SupportChatMessageResponse[];
  loadMessages: boolean;
  doSmoothScroll: boolean;
  reactionState: {
    open: boolean;
    anchorEl: HTMLElement | null;
    message: SupportChatMessageResponse | null;
  };
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
  resetChatStore: () => void;
};

export type ChatStore = SocketSlice & MessageSlice & ChatSlice;
