'use client';

import { useEffect } from 'react';

import { useUsuarioLogadoStore } from '@/store/useUsuarioLogadoStore';

/** Identidade compartilhada, recuperável pela API se o cookie já venceu. */
export const useUsuarioLogado = () => {
  const usuario = useUsuarioLogadoStore(s => s.usuario);
  const carregado = useUsuarioLogadoStore(s => s.carregado);
  const carregar = useUsuarioLogadoStore(s => s.carregar);

  // A leitura continua após a montagem para preservar a hidratação.
  useEffect(() => { void carregar(); }, [carregar]);

  return { usuario, usuarioId: usuario?.id ?? null, carregado };
};
