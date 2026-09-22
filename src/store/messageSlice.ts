import type { StateCreator } from 'zustand';
import { ChatSlice, MessageSlice } from '@/Interfaces';

export const createMessageSlice: StateCreator<MessageSlice & ChatSlice, [], [], MessageSlice> = (
  set,
) => ({
  messages: [],
  loadMessages: false,
  doSmoothScroll: false,
  anteriores: [],
  totalAnteriores: 0,
  carregandoAnterior: false,
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

  setTotalAnteriores: (total) => set({ totalAnteriores: total }),
  setCarregandoAnterior: (carregando) => set({ carregandoAnterior: carregando }),

  adicionaAnterior: (protocolo) =>
    set(({ anteriores, totalAnteriores }) => {
      // Guarda contra o clique duplo: dois pedidos em voo trariam o mesmo
      // protocolo duas vezes, e ele apareceria repetido na tela.
      if (anteriores.some((a) => a.id === protocolo.id)) {
        return { anteriores, totalAnteriores };
      }

      return {
        // No início: os anteriores ficam acima, e o mais antigo no topo de
        // todos - a mesma ordem cronológica das mensagens abaixo.
        anteriores: [protocolo, ...anteriores],
        totalAnteriores: Math.max(0, totalAnteriores - 1),
      };
    }),

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
      // Zerados ao trocar de conversa: sem isto o histórico do contato
      // anterior apareceria na conversa seguinte.
      anteriores: [],
      totalAnteriores: 0,
      carregandoAnterior: false,
    }));
  },
});
