import { ChatSlice, SupportChatsResponse } from '@/Interfaces';
import type { StateCreator } from 'zustand';

export const createChatSlice: StateCreator<ChatSlice, [], [], ChatSlice> = (set) => ({
  chats: [],
  activeChatId: null,

  updateChat: (chat) => {
    set(({ chats }) => ({
      chats: chats.map((c) => (c.id === chat.id ? { ...c, ...chat } : c)),
    }));
  },

  addChats: (newChats: SupportChatsResponse[]) =>
    set(({ chats }) => ({
      chats: [
        ...chats,
        ...newChats.filter(nc => !chats.some(c => c.id === nc.id))
      ]
    })),

  setUnreadCount: (chatId, unread_count) => {
    set(({ chats }) => ({
      chats: chats.map((c) => (c.id === chatId ? { ...c, unread_count: unread_count } : c)),
    }));
  },

  setActiveChatId: (chatId) => {
    set(() => ({
      activeChatId: chatId,
    }));
  }


});
