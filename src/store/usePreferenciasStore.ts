import { create } from 'zustand';

import { ChavePreferencia, PreferenciasUsuario } from '@/Interfaces';

/**
 * Os padrões, para antes de a API responder.
 *
 * Duplicam `back/src/user-config/user-config.catalogo.ts`. Se divergirem, o
 * backend vence - é ele quem grava, e a carga substitui isto em seguida.
 */
export const PREFERENCIAS_PADRAO: PreferenciasUsuario = {
  tema: 'automatec',
  modo_tema: 'claro',
  notif_habilitadas: true,
  notif_fila: false,
  notif_mensagem_cliente: true,
  notif_chat_interno: true,
  notif_transferencia: true,
  notif_som: true,
  notif_alerta_tela: true,
  notif_navegador: true,
};

type PreferenciasStore = {
  preferencias: PreferenciasUsuario;
  /** `false` até a primeira carga da API. */
  carregado: boolean;
  definir: (valores: Partial<PreferenciasUsuario>) => void;
  definirUma: (chave: ChavePreferencia, valor: string | boolean) => void;
};

/**
 * As preferências em vigor, compartilhadas por toda a aplicação.
 *
 * ⚠️ **Store, e não um hook que lê o cookie.** O cookie `userInfo` é gravado no
 * login e só traz as preferências que existiam naquele momento - uma
 * preferência nova ficaria ausente até a pessoa sair e entrar de novo, caindo
 * no padrão do código em vez do que está no banco. Foi exatamente o que
 * aconteceu com uma opção nova: a tela a mostrava ligada (lia da API)
 * e o disparo a considerava desligada (lia do cookie).
 *
 * Com a store, quem carrega é o `ChatInterno` uma vez, e quem salva no perfil
 * atualiza aqui - a tela e o disparo passam a ver o mesmo valor na hora.
 */
export const usePreferenciasStore = create<PreferenciasStore>()((set) => ({
  preferencias: PREFERENCIAS_PADRAO,
  carregado: false,

  definir: (valores) =>
    set((estado) => ({
      preferencias: { ...estado.preferencias, ...valores },
      carregado: true,
    })),

  definirUma: (chave, valor) =>
    set((estado) => ({
      preferencias: { ...estado.preferencias, [chave]: valor },
    })),
}));
