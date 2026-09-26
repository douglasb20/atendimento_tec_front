import { ChatSlice, ContactResponse, ehAtendimentoFinalizado, SupportChatsResponse } from '@/Interfaces';
import type { StateCreator } from 'zustand';

/**
 * Quando cada conversa teve o contato atualizado localmente pela última vez
 * (`patchActiveChat`), por id de chat.
 *
 * `updateChat` (disparado por `whatsapp:chat_state`) pode chegar com um
 * snapshot do contato montado pelo backend um instante antes de um PATCH já
 * commitado alhures - sem essa proteção, o evento "atrasado" apagava um
 * avatar/cadastro recém-salvo (a tela mostrava o dado certo até fechar o
 * modal, e voltava ao anterior assim que o evento chegava).
 *
 * `updated_at` não serve para essa comparação: várias entidades do projeto
 * (`Contacts` inclusive) usam `onUpdate: 'CURRENT_TIMESTAMP'` do TypeORM, que
 * só tem efeito no MySQL - no Postgres (o banco daqui) o campo nunca é
 * preenchido de verdade. Por isso o carimbo é local, só em memória: não
 * precisa sobreviver a um reload (a API já devolve o dado fresco nesse caso).
 */
const patchLocalEm = new Map<string, number>();

/** Curta o bastante para cobrir só a corrida real (evento chegando enquanto
 * o patch local ainda está "fresco"), longa o bastante para qualquer round
 * trip de rede plausível. */
const JANELA_PATCH_LOCAL_MS = 5000;

const contatoRespeitandoPatchLocal = (
  chatId: string | number,
  candidato: ContactResponse | undefined,
  atual: ContactResponse | undefined,
): ContactResponse | undefined => {
  if (!candidato) return atual;

  const marcadoEm = patchLocalEm.get(String(chatId));
  const dentroDaJanela = marcadoEm != null && Date.now() - marcadoEm < JANELA_PATCH_LOCAL_MS;

  return dentroDaJanela ? atual : candidato;
};

/**
 * Chame antes de `updateChat`/`patchActiveChat` quando o contato que está
 * sendo escrito vem de uma ação local de verdade (o atendente acabou de
 * salvar o cadastro) - não de um evento de socket. É o que dá a
 * `contatoRespeitandoPatchLocal` a base para recusar um `chat_state`
 * atrasado que tentaria reverter essa escrita.
 */
export const marcarContatoAtualizadoLocalmente = (chatId: string | number) => {
  patchLocalEm.set(String(chatId), Date.now());
};

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

      // O contador tem evento próprio (`whatsapp:unread_count`) e não deve vir
      // daqui: os handlers de edição e revogação emitem a conversa como a
      // carregaram, com o valor anterior ao incremento - e uma mensagem nova
      // dispara os dois eventos, com o `chat_state` chegando por último e
      // zerando o que o outro acabou de somar.
      const mesclar = (atual: SupportChatsResponse) => {
        const { unread_count: _ignorado, ...semContador } = chat;
        return {
          ...atual,
          ...semContador,
          contact: contatoRespeitandoPatchLocal(chat.id, chat.contact, atual.contact),
        };
      };

      const novosChats = encerrado
        ? // Finalizada sai da lista, como já acontece ao recarregar: a
          // listagem do backend filtra por `is_final = false`.
          chats.filter((c) => !mesmoId(c.id, chat.id))
        : existe
          ? chats.map((c) => (mesmoId(c.id, chat.id) ? mesclar(c) : c))
          : [...chats, chat];

      const ehAConversaAberta = activeChat && mesmoId(activeChat.id, chat.id);

      // ⚠️ **Encerrada, a conversa sai da tela**, não só da lista.
      //
      // Antes ela continuava como `activeChat` para o header mostrar o estado
      // final - mas o painel aberto em somente leitura sugere que ainda há o
      // que fazer ali. Pior: o `fecharConversa` da finalização era desfeito
      // por este `updateChat`, que chega pelo socket logo depois e repunha a
      // conversa na tela.
      //
      // O histórico continua acessível pela URL.
      if (ehAConversaAberta && encerrado) {
        // A URL volta junto: sem isto um F5 reabriria a conversa encerrada,
        // que é o estado de onde acabamos de sair. `replaceState` como no
        // `fecharConversa`, para não encher o histórico do navegador.
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', '/chat');
        }

        return {
          chats: novosChats,
          activeChat: null,
          messages: [],
          quoted: { message: null, mode: null },
        };
      }

      return {
        chats: novosChats,
        activeChat: ehAConversaAberta
          ? {
              ...mesclar(activeChat),
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

      // Carimbo só quando o patch mexe no contato - é o único campo que
      // `updateChat` também escreve, e é aí que existe a corrida a evitar.
      if (patch.contact) {
        marcarContatoAtualizadoLocalmente(activeChat.id);
      }

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

  /**
   * Volta à tela sem conversa selecionada.
   *
   * Desfaz o que a seleção fez: a conversa ativa, as mensagens e a URL - que é
   * trocada por `replaceState` ao abrir, e volta pela mesma via para não encher
   * o histórico do navegador. Vive no store porque tanto o Esc quanto a
   * finalização do atendimento precisam dela.
   */
  fecharConversa: () => {
    set(() => ({
      activeChat: null,
      chatNotFound: false,
      messages: [],
      loadMessages: false,
      doSmoothScroll: false,
      quoted: { message: null, mode: null },
    }));

    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/chat');
    }
  },

  resetChatStore: () => {
    set(() => ({
      chats: [],
      activeChat: null,
      chatNotFound: false,
    }));
  },
});
