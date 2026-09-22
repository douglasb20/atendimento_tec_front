import { create } from 'zustand';

type SelecaoMensagens = {
  /** Fora do modo de seleção a lista se comporta normalmente. */
  ativo: boolean;
  /** `message_id` das mensagens marcadas. */
  selecionadas: string[];
  entrarModoSelecao: (messageId?: string) => void;
  sairModoSelecao: () => void;
  alternar: (messageId: string) => void;
  estaSelecionada: (messageId: string) => boolean;
};

/**
 * Modo de seleção múltipla de mensagens, no padrão do WhatsApp.
 *
 * Vive fora do componente porque três lugares distantes participam: o menu da
 * bolha (que entra no modo), a própria bolha (que marca) e a barra de ações no
 * rodapé (que apaga). Passar isso por prop atravessaria a árvore inteira.
 */
export const useSelecaoMensagens = create<SelecaoMensagens>()((set, get) => ({
  ativo: false,
  selecionadas: [],

  // Entrar pelo menu de uma mensagem já a marca - foi ela que o atendente
  // tinha em mãos ao escolher "Selecionar".
  entrarModoSelecao: (messageId) =>
    set({ ativo: true, selecionadas: messageId ? [messageId] : [] }),

  sairModoSelecao: () => set({ ativo: false, selecionadas: [] }),

  alternar: (messageId) =>
    set((estado) => ({
      selecionadas: estado.selecionadas.includes(messageId)
        ? estado.selecionadas.filter((id) => id !== messageId)
        : [...estado.selecionadas, messageId],
    })),

  estaSelecionada: (messageId) => get().selecionadas.includes(messageId),
}));
