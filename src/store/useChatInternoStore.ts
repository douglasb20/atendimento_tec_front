import { create } from 'zustand';

import {
  ColegaResponse,
  ConversaInternaResponse,
  EstadoPresenca,
  InternalMessageResponse,
} from '@/Interfaces';

/**
 * Ids chegam ora número (socket), ora string (JSON de bigint). Comparar sem
 * normalizar é a causa mais provável de "a tela não reage" - o mesmo cuidado
 * que o `chatSlice` do atendimento tem com `mesmoId`.
 */
const mesmoId = (a: number | string, b: number | string) => String(a) === String(b);

type ChatInternoStore = {
  /** Todos os colegas, com ou sem conversa iniciada. */
  colegas: ColegaResponse[];
  /**
   * O estado de cada um, por id.
   *
   * Só os conectados aparecem - quem não está no mapa é `offline`, que é o
   * padrão. Um `Record`, e não `Map`, para o Zustand comparar por referência
   * sem surpresa ao substituí-lo inteiro.
   */
  presencas: Record<number, EstadoPresenca>;
  conversas: ConversaInternaResponse[];
  /** O colega com quem se está conversando; `null` fecha a janela. */
  ativo: ColegaResponse | null;
  mensagens: InternalMessageResponse[];
  carregandoMensagens: boolean;
  /**
   * Onde a conversa aparece.
   *
   * `painel` é o padrão: ocupa o lado direito da tela de chat, no lugar da
   * conversa de atendimento. `popup` é a janela destacada no canto, para quem
   * quer atender e conversar ao mesmo tempo - e só acontece quando a pessoa
   * pede, pelo botão de destacar.
   */
  modo: 'painel' | 'popup';
  /** Recolhida à barra de título. Só faz sentido no popup. */
  minimizado: boolean;

  setColegas: (colegas: ColegaResponse[]) => void;
  setPresencas: (estados: Record<number, EstadoPresenca>) => void;
  marcarPresenca: (userId: number, estado: EstadoPresenca) => void;
  /** O estado de um colega; `offline` quando não há registro. */
  estadoDe: (userId: number) => EstadoPresenca;
  setConversas: (conversas: ConversaInternaResponse[]) => void;
  abrirCom: (colega: ColegaResponse) => void;
  /** Destaca a conversa aberta numa janela flutuante. */
  destacar: (colega?: ColegaResponse) => void;
  /** Traz a janela flutuante de volta para o painel. */
  encaixar: () => void;
  fechar: () => void;
  alternarMinimizado: () => void;
  setMensagens: (mensagens: InternalMessageResponse[]) => void;
  setCarregandoMensagens: (carregando: boolean) => void;
  /**
   * Acrescenta uma mensagem à tela e à lista.
   *
   * `usuarioId` é quem está logado - sem ele não dá para saber se a própria
   * mensagem pertence à conversa aberta.
   */
  acrescentarMensagem: (mensagem: InternalMessageResponse, usuarioId?: number | null) => void;
  zerarNaoLidas: (chatId: number | string) => void;
  marcarLidasNaTela: (chatId: number | string) => void;
  resetChatInterno: () => void;

  /** Total de não lidas, para o badge da aba. */
  totalNaoLidas: () => number;
};

export const useChatInternoStore = create<ChatInternoStore>()((set, get) => ({
  colegas: [],
  presencas: {},
  conversas: [],
  ativo: null,
  mensagens: [],
  carregandoMensagens: false,
  modo: 'painel',
  minimizado: false,

  setColegas: (colegas) => set({ colegas }),

  setPresencas: (estados) => set({ presencas: estados }),

  /**
   * Um colega mudou de estado.
   *
   * O objeto é recriado, e não mutado: Zustand compara por referência, e mexer
   * no existente não dispararia render nenhum.
   *
   * Offline **sai** do mapa em vez de ficar com o valor: assim o padrão de
   * quem nunca apareceu e o de quem saiu são o mesmo caminho.
   */
  marcarPresenca: (userId, estadoNovo) =>
    set((estado) => {
      const presencas = { ...estado.presencas };

      if (estadoNovo === 'offline') delete presencas[userId];
      else presencas[userId] = estadoNovo;

      return { presencas };
    }),

  estadoDe: (userId) => get().presencas[userId] ?? 'offline',

  setConversas: (conversas) => set({ conversas }),

  /**
   * Abre a conversa com um colega, no painel.
   *
   * O modo **não** é alterado aqui: quem já destacou a janela e clica em outro
   * colega na lista espera que ela troque de conversa, não que volte para o
   * painel.
   */
  abrirCom: (colega) =>
    set((estado) => ({
      ativo: colega,
      mensagens: [],
      minimizado: false,
      modo: estado.modo,
    })),

  /** Destaca em janela flutuante - opcionalmente já num colega. */
  destacar: (colega) =>
    set((estado) => ({
      modo: 'popup',
      minimizado: false,
      ...(colega && colega.id !== estado.ativo?.id && { ativo: colega, mensagens: [] }),
    })),

  encaixar: () => set({ modo: 'painel', minimizado: false }),

  // Fechar volta ao painel: deixar o modo em `popup` faria a próxima conversa
  // abrir destacada sem ninguém ter pedido.
  fechar: () => set({ ativo: null, modo: 'painel', minimizado: false, mensagens: [] }),

  alternarMinimizado: () => set((estado) => ({ minimizado: !estado.minimizado })),

  setMensagens: (mensagens) => set({ mensagens }),

  setCarregandoMensagens: (carregandoMensagens) => set({ carregandoMensagens }),

  /**
   * Acrescenta uma mensagem vinda do socket.
   *
   * Duas coisas acontecem aqui, e as duas precisam da mesma chamada: a bolha
   * aparece (se a conversa estiver aberta) e a lista lateral é atualizada -
   * última mensagem, ordem e contador.
   */
  acrescentarMensagem: (mensagem, usuarioId) =>
    set((estado) => {
      /**
       * A mensagem pertence à conversa aberta?
       *
       * Numa conversa de dois, isso é: ou o colega aberto mandou, ou fui eu.
       *
       * ⚠️ Não dá para decidir procurando `internal_chat_id` na lista de
       * conversas: a **primeira** mensagem nasce junto com a conversa, no
       * backend, e ela ainda não está na lista local. Era exatamente o que
       * fazia a primeira bolha não aparecer, enquanto as seguintes apareciam.
       */
      const conversaConhecida = estado.conversas.find((c) =>
        mesmoId(c.id, mensagem.internal_chat_id),
      );

      const daConversaAberta =
        Boolean(estado.ativo) &&
        // Do colega aberto, ou minha numa conversa que é a dele. A segunda
        // metade cobre o envio: a conversa pode não estar na lista ainda (é a
        // primeira mensagem), e aí `conversaConhecida` é `undefined` - o que
        // só acontece quando acabei de criá-la com quem está aberto.
        (mesmoId(mensagem.sender_id, estado.ativo!.id) ||
          (usuarioId != null &&
            mesmoId(mensagem.sender_id, usuarioId) &&
            (!conversaConhecida || mesmoId(conversaConhecida.outro.id, estado.ativo!.id))));

      // O socket entrega aos dois lados, e o remetente pode ter várias abas:
      // sem o guard de id, a própria mensagem duplicaria na tela.
      const jaEstaNaTela = estado.mensagens.some((m) => m.id === mensagem.id);

      const mensagens =
        daConversaAberta && !jaEstaNaTela ? [mensagem, ...estado.mensagens] : estado.mensagens;

      let conversas = estado.conversas.map((conversa) =>
        mesmoId(conversa.id, mensagem.internal_chat_id)
          ? {
              ...conversa,
              ultima_mensagem: mensagem,
              last_message_at: mensagem.created_at,
              // Com a conversa aberta, a mensagem já está sendo lida - marcar
              // como não lida faria o badge piscar e sumir.
              nao_lidas: daConversaAberta ? 0 : conversa.nao_lidas + 1,
            }
          : conversa,
      );

      // Conversa que nasceu agora entra na lista aqui mesmo. Sem isto ela só
      // apareceria no próximo `carregarConversas`, e até lá a prévia e o
      // horário ficariam de fora da lateral.
      if (!conversaConhecida && daConversaAberta && estado.ativo) {
        conversas = [
          {
            id: mensagem.internal_chat_id,
            outro: estado.ativo,
            last_message_at: mensagem.created_at,
            ultima_mensagem: mensagem,
            nao_lidas: 0,
          },
          ...conversas,
        ];
      }

      // Mais recente no topo, como a lista de atendimentos.
      conversas.sort((a, b) => {
        const qa = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const qb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return qb - qa;
      });

      return { mensagens, conversas };
    }),

  zerarNaoLidas: (chatId) =>
    set((estado) => ({
      conversas: estado.conversas.map((conversa) =>
        mesmoId(conversa.id, chatId) ? { ...conversa, nao_lidas: 0 } : conversa,
      ),
    })),

  /** Marca as bolhas como lidas quando o outro lado abriu a conversa. */
  marcarLidasNaTela: (chatId) =>
    set((estado) => ({
      mensagens: estado.mensagens.map((mensagem) =>
        mesmoId(mensagem.internal_chat_id, chatId) && !mensagem.read_at
          ? { ...mensagem, read_at: new Date().toISOString() }
          : mensagem,
      ),
    })),

  resetChatInterno: () =>
    set({
      colegas: [],
      presencas: {},
      conversas: [],
      ativo: null,
      mensagens: [],
      modo: 'painel',
      minimizado: false,
    }),

  totalNaoLidas: () => get().conversas.reduce((soma, conversa) => soma + conversa.nao_lidas, 0),
}));
