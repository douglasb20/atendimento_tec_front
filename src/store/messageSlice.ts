import type { StateCreator } from 'zustand';
import { ChatSlice, MessageSlice } from '@/Interfaces';

export const createMessageSlice: StateCreator<MessageSlice & ChatSlice, [], [], MessageSlice> = (
  set,
) => ({
  messages: [],
  loadMessages: false,
  doSmoothScroll: false,

  setLoadMessages: (load) => set({ loadMessages: load }),
  setSmoothScroll: (smooth) => set({ doSmoothScroll: smooth }),

  updateMessage: (message) =>
    set(({ messages }) => {
      const exists = messages.some((m) => m.message_id === message.message_id);

      return {
        messages: exists
          ? messages.map((m) => (m.message_id === message.message_id ? { ...m, ...message } : m))
          : [...messages, message],
      };
    }),

  addMessages: (newMessages) => {
    set({ messages: newMessages });
  },

  resetMessageStore: () => {
    set(() => ({
      messages: [],
      loadMessages: false,
      doSmoothScroll: false,
    }));
  },
});
