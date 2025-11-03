import type { StateCreator } from 'zustand';
import { MessageSlice, SocketSlice } from '../../types';

export const createMessageSlice: StateCreator<SocketSlice & MessageSlice, [], [], MessageSlice> = (
  set,
) => ({
  messages: [],
  unreadMessages: [],

  addMessage: (msg) => {
    set((state) => ({
      messages: [...state.messages, msg],
      // unreadMessages: msg.read ? state.unreadMessages : [...state.unreadMessages, msg],
    }));
  },

  markAsRead: (messageId) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.data.message.id === messageId ? { ...m, read: true } : m,
      ),
      unreadMessages: state.unreadMessages.filter((m) => m.data.message.id !== messageId),
    }));
  },
});
