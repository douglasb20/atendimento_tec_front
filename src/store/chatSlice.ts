import { ChatSlice, SupportChatsResponse } from '@/Interfaces';
import type { StateCreator } from 'zustand';

export const createChatSlice: StateCreator<ChatSlice, [], [], ChatSlice> = (set) => ({
  chats: [],
  activeChat: null,
  chatNotFound: false,
  notificationSound: null,

  setChatNotFound: (notFound) => {
    set(() => ({
      chatNotFound: notFound,
    }));
  },

  updateChat: (chat) => {
    set(({ chats }) => {
      const exists = chats.some((c) => c.id === chat.id);

      return {
        chats: exists
          ? chats.map((c) => (c.id === chat.id ? { ...c, ...chat } : c))
          : [...chats, chat],
      };
    });
  },

  addChats: (newChats: SupportChatsResponse[]) =>
    set(({ chats }) => ({
      chats: [...chats, ...newChats.filter((nc) => !chats.some((c) => c.id === nc.id))],
    })),

  setUnreadCount: (chatId, unread_count) => {
    set(({ chats }) => ({
      chats: chats.map((c) => (c.id === chatId ? { ...c, unread_count: unread_count } : c)),
    }));
  },

  setActiveChat: (chat) => {
    set(() => ({
      activeChat: chat,
    }));
  },

  resetChatStore: () => {
    set(() => ({
      chats: [],
      activeChat: null,
      chatNotFound: false,
    }));
  },
});
