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
  setLoadMessages: (load: boolean) => void;
  setSmoothScroll: (smooth: boolean) => void;
  updateMessage: (msg: SupportChatMessageResponse) => void;
  addMessages: (messages: SupportChatMessageResponse[]) => void;
};

export type ChatSlice = {
  chats: SupportChatsResponse[];
  activeChatId: string | null;
  addChats: (newChats: SupportChatsResponse[]) => void;
  updateChat: (chat: SupportChatsResponse) => void;
  setUnreadCount: (chatId: string, count: number) => void;
  setActiveChatId: (chatId: string | null) => void;
};

export type ChatStore = SocketSlice & MessageSlice & ChatSlice;
