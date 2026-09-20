'use client';

import { useEffect, useMemo, useState } from 'react';
import { parseCookies } from 'nookies';

import { UserInfo } from '@/Interfaces';

/**
 * O que o usuário logado pode fazer.
 *
 * ⚠️ **Isto não é segurança.** O cookie `userInfo` não é `httpOnly` — precisa
 * ser legível para a interface montar o menu —, e portanto qualquer pessoa o
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
 * cliente um menu cheio — e o React derrubava a árvore inteira com erro de
 * hidratação.
 *
 * Lendo no `useEffect`, os dois primeiros renders são iguais (sem permissão) e
 * o segundo já traz o conteúdo. O custo é o menu aparecer um quadro depois; a
 * alternativa seria o layout virar componente de servidor, o que é refatoração
 * bem maior do que o problema pede.
 */
export const usePermissoes = () => {
  const [cru, setCru] = useState<string | null>(null);

  useEffect(() => {
    setCru(parseCookies()['userInfo'] ?? null);
  }, []);

  return useMemo(() => {
    let info: UserInfo | null = null;

    try {
      info = cru ? (JSON.parse(cru) as UserInfo) : null;
    } catch {
      // Cookie corrompido equivale a não ter permissão nenhuma: é o estado
      // seguro, e a próxima navegação passa pelo middleware, que o recria.
      info = null;
    }

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
      permissoes: nomes,
      /** `false` até o cookie ser lido — evita piscar o estado "sem acesso". */
      carregado: cru !== null,
    };
  }, [cru]);
};
