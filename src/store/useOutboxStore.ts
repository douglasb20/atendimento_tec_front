import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Fila de envio, deliberadamente fora da `useChatStore`.
 *
 * O envio não pode viver no componente: trocar de chat desmonta o
 * `SendMessageBox` e levaria junto o upload de um vídeo grande. Aqui ele
 * sobrevive à navegação - a tela apenas observa a fila.
 *
 * Também não pode viver na store de chat, que é zerada a cada troca de
 * conversa (`resetMessageStore`). Por isso é uma store própria.
 */

export type ItemFilaStatus = 'pendente' | 'enviando' | 'falhou';

export type ItemFila = {
  /** Id local, gerado no envio: o do provider só existe depois da confirmação. */
  id: string;
  supportChatId: string;
  chatId: string;
  /** Instante do envio - define a posição na conversa, não o momento da confirmação. */
  enviadoEm: string;
  status: ItemFilaStatus;
  tentativas: number;
  tipo: 'texto' | 'voz' | 'midia';
  conteudo: string;
  /** Nome do atendente, para a bolha já nascer com o prefixo que o backend aplica. */
  autor: string;
  quotedMessageId?: string;
  /** Mídia: chave no storage, preenchida quando o upload conclui. */
  mediaKey?: string;
  mediaType?: string;
  /** Nome original do arquivo - o WhatsApp o exibe em documentos. */
  fileName?: string;
  /** Mimetype real do arquivo (`video/mp4`), distinto do tipo do menu. */
  mimetype?: string;
  /** Progresso do upload em porcentagem, exibido enquanto o arquivo sobe. */
  progresso?: number;
  /**
   * URL local (`blob:`) para tocar/exibir enquanto o arquivo não está no
   * storage. Não sobrevive a recarregar a página - o blob morre com a sessão.
   */
  previewUrl?: string;
  /** Mensagem de erro da última tentativa, mostrada junto do botão de repetir. */
  erro?: string;
};

type OutboxStore = {
  itens: ItemFila[];
  enfileirar: (item: Omit<ItemFila, 'status' | 'tentativas'>) => void;
  atualizar: (id: string, dados: Partial<ItemFila>) => void;
  remover: (id: string) => void;
  /** Itens de uma conversa, para a tela renderizá-los junto das mensagens reais. */
  itensDoChat: (supportChatId: string) => ItemFila[];
};

export const useOutboxStore = create<OutboxStore>()(
  persist(
    (set, get) => ({
      itens: [],

      enfileirar: (item) =>
        set(({ itens }) => ({
          itens: [
            ...itens,
            {
              ...item,
              status: 'pendente',
              tentativas: 0,
              // Mídia já nasce com 0%: o indicador aparece junto com a bolha,
              // em vez de surgir quando o upload já está adiantado.
              ...(item.tipo !== 'texto' && { progresso: 0 }),
            },
          ],
        })),

      atualizar: (id, dados) =>
        set(({ itens }) => ({
          itens: itens.map((i) => (i.id === id ? { ...i, ...dados } : i)),
        })),

      remover: (id) => set(({ itens }) => ({ itens: itens.filter((i) => i.id !== id) })),

      itensDoChat: (supportChatId) =>
        get().itens.filter((i) => String(i.supportChatId) === String(supportChatId)),
    }),
    {
      name: 'chat-outbox',
      storage: createJSONStorage(() => localStorage),
      // `previewUrl` é um blob da sessão atual: guardá-lo devolveria uma URL
      // morta ao recarregar. Um item retomado exibe sem prévia.
      partialize: ({ itens }) => ({
        itens: itens.map(({ previewUrl: _previewUrl, ...resto }) => resto),
      }),

      /**
       * Nenhum envio sobrevive ao recarregar da página: o processador vive em
       * memória e o `File` nem chega a ser serializado. Um item que ficou como
       * `enviando` volta, portanto, como falha - em vez de exibir um spinner
       * eterno para algo que ninguém está enviando.
       */
      onRehydrateStorage: () => (estado) => {
        if (!estado) return;

        estado.itens = estado.itens.map((item) =>
          item.status === 'enviando' || item.status === 'pendente'
            ? {
                ...item,
                status: 'falhou' as const,
                erro: item.erro ?? 'Envio interrompido ao recarregar a página',
              }
            : item,
        );
      },
    },
  ),
);
