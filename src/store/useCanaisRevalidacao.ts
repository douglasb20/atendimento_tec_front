import { create } from 'zustand';

type CanaisRevalidacao = {
  /** Incrementado a cada criação/exclusão de canal. */
  versao: number;
  /** Avisa quem observa que a lista de canais mudou. */
  invalidarCanais: () => void;
};

/**
 * Ponte entre a tela de canais e o badge de status do topbar.
 *
 * O evento `whatsapp:channel_status` cobre mudanças de *conexão*, mas criar e
 * excluir canal são operações HTTP locais - não passam pelo socket, e sem isso
 * o badge continuaria contando um canal que já não existe.
 */
export const useCanaisRevalidacao = create<CanaisRevalidacao>()((set) => ({
  versao: 0,
  invalidarCanais: () => set((s) => ({ versao: s.versao + 1 })),
}));
