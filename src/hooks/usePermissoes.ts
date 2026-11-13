'use client';

import { useMemo } from 'react';
import { useUsuarioLogado } from './useUsuarioLogado';

/**
 * O que o usuário logado pode fazer.
 *
 * ⚠️ **Isto não é segurança.** O cookie `userInfo` não é `httpOnly` - precisa
 * ser legível para a interface montar o menu -, e portanto qualquer pessoa o
 * edita pelo navegador. Quem fizer isso consegue fazer botões aparecerem, e
 * nada além: o backend confere a permissão de novo em toda chamada, pelo papel
 * gravado no banco, e recusa o que não for permitido.
 *
 * O propósito aqui é outro: não oferecer ao atendente uma ação que vai falhar.
 *
 * Por isso **toda tela escondida precisa ter o endpoint protegido do outro
 * lado**. Esconder sem proteger é só disfarce.
 *
 * ## Por que o cookie só é lido depois da montagem
 *
 * O `parseCookies()` sem contexto não enxerga nada no servidor, e enxerga tudo
 * no cliente. Lendo direto no render, o servidor produzia um menu vazio e o
 * cliente um menu cheio - e o React derrubava a árvore inteira com erro de
 * hidratação.
 *
 * A leitura inicial fica no efeito de `useUsuarioLogado`. Identidade e
 * permissões compartilham uma store em memória; quando o cookie vence,
 * a rota autenticada recupera os dados sem exigir reload ou nova navegação.
 */
export const usePermissoes = () => {
  const { usuario: info, carregado } = useUsuarioLogado();

  return useMemo(() => {
    // `Set` porque a verificação roda em todo botão renderizado; a lista tem
    // dezenas de itens e a busca linear apareceria numa tabela grande.
    const nomes = new Set((info?.permissions ?? []).filter(Boolean));

    /**
     * Superusuário passa por tudo, espelhando o desvio do guard no backend.
     * Sem isso a interface esconderia telas que a API deixaria ele usar.
     */
    const ehSuperusuario = Boolean((info as { is_superuser?: number })?.is_superuser);

    const pode = (permissao: string): boolean => ehSuperusuario || nomes.has(permissao);

    /** Semântica OU, a mesma do guard: basta ter uma das permissões. */
    const podeAlguma = (permissoes: string[]): boolean =>
      ehSuperusuario || permissoes.some((p) => nomes.has(p));

    return {
      pode,
      podeAlguma,
      ehSuperusuario,
      /** Quem está logado. Serve para distinguir auto-edição de editar outro. */
      usuarioId: info?.id ?? null,
      permissoes: nomes,
      carregado,
    };
  }, [info, carregado]);
};
