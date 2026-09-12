import { ChatSlice, ehAtendimentoFinalizado, SupportChatsResponse } from '@/Interfaces';
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

  /**
   * Aplica uma atualização de conversa na lista e, quando for a conversa
   * aberta, também no `activeChat`.
   *
   * Antes só a lista era tocada, e o header ficava congelado no estado do
   * momento em que a conversa foi aberta - mudanças de status vindas do socket
   * não chegavam à tela.
   *
   * O merge é parcial de propósito: o payload do socket é a entidade crua,
   * enquanto o `activeChat` carrega mensagens e o contato com o cliente, que
   * vieram da rota de mensagens. Substituir apagaria o que só existe aqui.
   */
  updateChat: (chat) => {
    set(({ chats, activeChat }) => {
      const mesmoId = (a: unknown, b: unknown) => String(a) === String(b);
      const encerrado = ehAtendimentoFinalizado(chat.support_chat_status_id);
      const existe = chats.some((c) => mesmoId(c.id, chat.id));

      const novosChats = encerrado
        ? // Finalizada sai da lista, como já acontece ao recarregar: a
          // listagem do backend filtra por `is_final = false`.
          chats.filter((c) => !mesmoId(c.id, chat.id))
        : existe
          ? chats.map((c) => (mesmoId(c.id, chat.id) ? { ...c, ...chat } : c))
          : [...chats, chat];

      const ehAConversaAberta = activeChat && mesmoId(activeChat.id, chat.id);

      return {
        chats: novosChats,
        // Mesmo encerrada, continua sendo a conversa aberta: o atendente ainda
        // está na tela, e o header precisa mostrar o estado final.
        activeChat: ehAConversaAberta
          ? {
              ...activeChat,
              ...chat,
              contact: chat.contact ?? activeChat.contact,
              supportChatStatus: chat.supportChatStatus ?? activeChat.supportChatStatus,
              // O webhook às vezes traz uma mensagem só neste campo.
              supportChatMessages: activeChat.supportChatMessages,
            }
          : activeChat,
      };
    });
  },

  /**
   * Atualização direta da conversa aberta, para o retorno de uma ação do
   * próprio atendente - a tela reage na hora, sem esperar o socket dar a volta.
   */
  patchActiveChat: (patch) => {
    set(({ activeChat, chats }) => {
      if (!activeChat) return {};

      return {
        activeChat: { ...activeChat, ...patch },
        chats: chats.map((c) => (String(c.id) === String(activeChat.id) ? { ...c, ...patch } : c)),
      };
    });
  },

  addChats: (newChats: SupportChatsResponse[]) =>
    set(({ chats }) => ({
      chats: [
        ...chats,
        ...newChats.filter((nc) => !chats.some((c) => String(c.id) === String(nc.id))),
      ],
    })),

  setUnreadCount: (chatId, unread_count) => {
    set(({ chats }) => ({
      chats: chats.map((c) =>
        String(c.id) === String(chatId) ? { ...c, unread_count: unread_count } : c,
      ),
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
