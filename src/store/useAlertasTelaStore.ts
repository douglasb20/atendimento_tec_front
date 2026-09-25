import { create } from 'zustand';

export type AlertaTela = {
  id: string;
  titulo: string;
  corpo: string;
  icone?: string | null;
  /**
   * Agrupa alertas da mesma origem: um novo com a mesma `tag` substitui o
   * anterior em vez de empilhar - dez mensagens seguidas do mesmo contato
   * viram um alerta só, com a mais recente.
   */
  tag?: string;
  aoClicar?: () => void;
};

/** Quantos cabem na tela ao mesmo tempo. O mais antigo sai quando passa disso. */
const MAXIMO = 4;

type AlertasTelaStore = {
  alertas: AlertaTela[];
  mostrar: (alerta: Omit<AlertaTela, 'id'>) => void;
  remover: (id: string) => void;
};

/**
 * Os avisos que aparecem dentro do portal, quando ele está aberto na frente.
 *
 * Complementam a notificação do navegador, que cobre o caso oposto (aba em
 * segundo plano). Os dois se revezam - ver `useAvisarEvento`.
 */
export const useAlertasTelaStore = create<AlertasTelaStore>()((set) => ({
  alertas: [],

  mostrar: (alerta) =>
    set((estado) => {
      const id = `alerta-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const semAMesmaTag = alerta.tag
        ? estado.alertas.filter((a) => a.tag !== alerta.tag)
        : estado.alertas;

      return { alertas: [...semAMesmaTag, { ...alerta, id }].slice(-MAXIMO) };
    }),

  remover: (id) => set((estado) => ({ alertas: estado.alertas.filter((a) => a.id !== id) })),
}));
