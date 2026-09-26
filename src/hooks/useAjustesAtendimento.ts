'use client';

import { useCallback, useEffect } from 'react';

import useApi from '@/service/Api/ApiClient';
import { AjustesAtendimento, useAjustesAtendimentoStore } from '@/store/useAjustesAtendimentoStore';

/**
 * Os ajustes de atendimento em vigor, para quem só precisa lê-los.
 *
 * Vêm da store, carregada uma vez por `useCarregarAjustesAtendimento` - mesmo
 * padrão de `usePreferencias`.
 */
export const useAjustesAtendimento = () => {
  const ajustes = useAjustesAtendimentoStore((s) => s.ajustes);
  const carregado = useAjustesAtendimentoStore((s) => s.carregado);

  return { ajustes, carregado };
};

/**
 * Carrega os ajustes de atendimento da API para a store.
 *
 * Montado **uma vez** no topo (`ChatInterno`, junto de
 * `useCarregarPreferencias`): duas montagens fariam duas chamadas por carga
 * de página, sem nada a ganhar.
 */
export const useCarregarAjustesAtendimento = () => {
  const { FetchReq } = useApi();
  const definir = useAjustesAtendimentoStore((s) => s.definir);

  const carregar = useCallback(async () => {
    try {
      const valores = await FetchReq<Partial<AjustesAtendimento>>('AjustesAtendimentoVigentes');
      definir(valores);
    } catch {
      // Os padrões da store valem. Um alerta aqui apareceria em toda carga de
      // página por um problema de rede.
    }
  }, [FetchReq, definir]);

  useEffect(() => {
    carregar();
    // Uma vez por montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { recarregar: carregar };
};
