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

/**
 * Mesma ideia de `patchLocalEm`, mas para os campos que decidem se o
 * atendente pode responder (`user_id`, `support_chat_status_id`,
 * `paused_at`) - ver `podeAgirNoAtendimento`/`ehDonoDoAtendimento` em
 * `Interfaces/suport-chat.interface.ts`.
 *
 * Bug real relatado em produção (24/10/2026): o atendimento ficava "somente
 * leitura" do nada, mesmo sendo dele, e às vezes persistia até trocar de
 * conversa e voltar (o que força um GET fresco em `loadConversationMessage`,
 * substituindo `activeChat` inteiro) ou dar F5. Como o banco estava sempre
 * correto nesse momento, a causa não era dado errado no servidor: é
 * `whatsappChatStateEmit` (back) não ter uma ordem garantida entre emissões
 * concorrentes da mesma conversa (algumas rodam dentro de transação, outras
 * depois do commit, ver `support-chats.service.ts`), e `updateChat` aplicar
 * cegamente qualquer `chat_state` que chegue, sem checar se é mais velho que
 * o que a tela já tem. Um evento atrasado "grudava" um `user_id`/status de um
 * instante anterior e só saía com uma releitura forçada.
 *
 * A mesma janela de `contact` serve aqui: ações que mudam esses três campos
 * só acontecem por ação explícita do próprio atendente (iniciar, pausar,
 * retomar, finalizar, transferir), então um `chat_state` que reverteria isso
 * logo em seguida só pode ser o evento atrasado da própria ação, nunca uma
 * atualização legítima mais nova.
 */
const patchStatusLocalEm = new Map<string, number>();

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

/** Dentro da janela de um patch local recente, mantém os três campos como já
 * estão em `atual` - um `chat_state` chegando agora só pode ser o eco
 * atrasado da própria ação que gerou o patch. */
const statusRespeitandoPatchLocal = (
  chatId: string | number,
  candidato: SupportChatsResponse,
  atual: SupportChatsResponse,
): Pick<SupportChatsResponse, 'user_id' | 'support_chat_status_id' | 'paused_at'> => {
  const marcadoEm = patchStatusLocalEm.get(String(chatId));
  const dentroDaJanela = marcadoEm != null && Date.now() - marcadoEm < JANELA_PATCH_LOCAL_MS;

  if (!dentroDaJanela) {
    return {
      user_id: candidato.user_id,
      support_chat_status_id: candidato.support_chat_status_id,
      paused_at: candidato.paused_at,
    };
  }

  return {
    user_id: atual.user_id,
    support_chat_status_id: atual.support_chat_status_id,
    paused_at: atual.paused_at,
  };
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

/**
 * Mesmo padrão de `marcarContatoAtualizadoLocalmente`, para iniciar, pausar,
 * retomar, finalizar ou transferir um atendimento - qualquer ação local que
 * mude `user_id`/`support_chat_status_id`/`paused_at`.
 */
export const marcarStatusAtualizadoLocalmente = (chatId: string | number) => {
  patchStatusLocalEm.set(String(chatId), Date.now());
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
          ...statusRespeitandoPatchLocal(chat.id, chat, atual),
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
              // Eventos (chamada, pausa, transferência) só vêm quando o
              // backend acabou de gravar um - fora isso o `chat_state` não os
              // carrega, e mantê-los do estado atual evita que a linha já
              // exibida suma a cada evento de socket.
              supportChatEvents: chat.supportChatEvents ?? activeChat.supportChatEvents,
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

      // Carimbo só quando o patch mexe em campos que `updateChat` também
      // escreve - é aí que existe a corrida a evitar.
      if (patch.contact) {
        marcarContatoAtualizadoLocalmente(activeChat.id);
      }

      if ('user_id' in patch || 'support_chat_status_id' in patch || 'paused_at' in patch) {
        marcarStatusAtualizadoLocalmente(activeChat.id);
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

  /**
   * Tira uma conversa da lista porque o atendente perdeu o direito de vê-la
   * (outro assumiu e ele não tem `support.chat:view_others`) - não porque ela
   * foi finalizada. Mesmo tratamento de `updateChat` quando é a conversa
   * aberta: sai da tela e desfaz a URL, senão o painel ficaria mostrando uma
   * conversa que a lista já não tem mais.
   */
  removeChat: (chatId) => {
    set(({ chats, activeChat }) => {
      const mesmoId = (a: unknown, b: unknown) => String(a) === String(b);
      const novosChats = chats.filter((c) => !mesmoId(c.id, chatId));

      if (activeChat && mesmoId(activeChat.id, chatId)) {
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

      return { chats: novosChats };
    });
  },

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
