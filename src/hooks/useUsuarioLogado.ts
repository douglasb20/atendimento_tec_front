'use client';

import { useEffect, useMemo, useState } from 'react';
import { parseCookies } from 'nookies';

import { UserInfo } from '@/Interfaces';

/**
 * Quem está usando o portal.
 *
 * Mesma fonte e mesmas ressalvas do `usePermissoes`: o cookie `userInfo` não é
 * `httpOnly`, logo **não é segurança** - serve para a tela não oferecer uma
 * ação que o backend vai recusar. Quem editar o cookie consegue fazer botões
 * aparecerem, e nada além.
 *
 * O cookie só é lido depois da montagem pelo mesmo motivo explicado lá: o
 * `parseCookies()` devolve vazio no servidor e cheio no cliente, e ler no
 * render quebrava a hidratação.
 *
 * ⚠️ `carregado` distingue "ainda não li o cookie" de "não há usuário". Sem
 * essa diferença, o primeiro render trataria o dono da conversa como se fosse
 * outra pessoa, e os controles piscariam bloqueados antes de aparecer.
 */
export const useUsuarioLogado = () => {
  const [cru, setCru] = useState<string | null>(null);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    setCru(parseCookies()['userInfo'] ?? null);
    setCarregado(true);
  }, []);

  return useMemo(() => {
    let info: UserInfo | null = null;

    try {
      info = cru ? (JSON.parse(cru) as UserInfo) : null;
    } catch {
      // Cookie corrompido equivale a não ter usuário: é o estado seguro, e a
      // próxima navegação passa pelo middleware, que o recria.
      info = null;
    }

    return {
      usuario: info,
      /** `null` enquanto o cookie não foi lido ou não há sessão. */
      usuarioId: info?.id ?? null,
      carregado,
    };
  }, [cru, carregado]);
};
