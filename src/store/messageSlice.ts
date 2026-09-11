import type { StateCreator } from 'zustand';
import { ChatSlice, MessageSlice } from '@/Interfaces';

export const createMessageSlice: StateCreator<MessageSlice & ChatSlice, [], [], MessageSlice> = (
  set,
) => ({
  messages: [],
  loadMessages: false,
  doSmoothScroll: false,
  reactionState: {
    open: false,
    anchorEl: null,
    message: null,
  },
  quoted: {
    mode: null,
    message: null,
  },
  videoPreview: {
    source: '',
    mime_type: '',
  },

  setVideoPreview: (source, mime_type = '') => set({ videoPreview: { source, mime_type } }),
  setReactionState: (state) => set({ reactionState: state }),
  setLoadMessages: (load) => set({ loadMessages: load }),
  setSmoothScroll: (smooth) => set({ doSmoothScroll: smooth }),
  setQuotedMessage: (mode, message) => set({ quoted: { mode, message } }),
  addMessages: (newMessages) => set({ messages: newMessages }),

  updateMessage: (message) => {
    set(({ messages }) => {
      const exists = messages.some((m) => m.message_id === message.message_id);

      return {
        messages: exists
          ? messages.map((m) => (m.message_id === message.message_id ? { ...m, ...message } : m))
          : [...messages, message],
      };
    });
  },

  resetMessageStore: () => {
    set(() => ({
      messages: [],
      loadMessages: false,
      doSmoothScroll: false,
    }));
  },
});
