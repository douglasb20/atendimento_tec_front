import { create } from 'zustand';

/**
 * Os padrões, para antes de a API responder.
 *
 * Duplicam `back/src/attendance-settings/attendance-settings.catalogo.ts`. Se
 * divergirem, o backend vence - é ele quem grava, e a carga substitui isto em
 * seguida.
 */
export const AJUSTES_ATENDIMENTO_PADRAO = {
  assinatura_nome_completo: false,
  atalho_mensagem_automatico: true,
  ordenar_atendimento_por_ultima_mensagem: false,
  notificar_mensagem_chatbot: true,
  carregar_mensagens_anteriores: false,
};

export type AjustesAtendimento = typeof AJUSTES_ATENDIMENTO_PADRAO;

type AjustesAtendimentoStore = {
  ajustes: AjustesAtendimento;
  /** `false` até a primeira carga da API. */
  carregado: boolean;
  definir: (valores: Partial<AjustesAtendimento>) => void;
};

/**
 * Os ajustes de atendimento em vigor, compartilhados por toda a aplicação.
 *
 * Ajuste global (não por usuário, ao contrário de `usePreferenciasStore`):
 * quem carrega é o `ChatInterno` uma vez, e a tela de configurações atualiza
 * aqui ao salvar - o resto do portal passa a ver o valor novo na hora, sem
 * esperar reload.
 */
export const useAjustesAtendimentoStore = create<AjustesAtendimentoStore>()((set) => ({
  ajustes: AJUSTES_ATENDIMENTO_PADRAO,
  carregado: false,

  definir: (valores) =>
    set((estado) => ({
      ajustes: { ...estado.ajustes, ...valores },
      carregado: true,
    })),
}));
