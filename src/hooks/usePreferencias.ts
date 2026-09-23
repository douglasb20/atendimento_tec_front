'use client';

import { useCallback, useEffect, useState } from 'react';

import { PreferenciaParaTela, PreferenciasUsuario } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { usePreferenciasStore } from '@/store/usePreferenciasStore';

/**
 * As preferências do usuário logado, para quem só precisa lê-las.
 *
 * Vêm da store, carregada uma vez por `useCarregarPreferencias` - **não** do
 * cookie `userInfo`. Ver o comentário da store para o porquê.
 */
export const usePreferencias = () => {
  const preferencias = usePreferenciasStore((s) => s.preferencias);
  const carregado = usePreferenciasStore((s) => s.carregado);

  return { preferencias, carregado };
};

/**
 * Carrega as preferências da API para a store.
 *
 * Montado **uma vez** no topo (`ChatInterno`): duas montagens fariam duas
 * chamadas por carga de página, sem nada a ganhar.
 */
export const useCarregarPreferencias = ({ ativo = true }: { ativo?: boolean } = {}) => {
  const { FetchReq } = useApi();
  const definir = usePreferenciasStore((s) => s.definir);

  const carregar = useCallback(async () => {
    try {
      const itens = await FetchReq<PreferenciaParaTela[]>('ListarPreferencias');

      definir(
        Object.fromEntries(
          itens.map((item) => [item.chave, item.valor]),
        ) as Partial<PreferenciasUsuario>,
      );
    } catch {
      // Os padrões da store valem. Um alerta aqui apareceria em toda carga de
      // página para quem estiver sem rede.
    }
  }, [FetchReq, definir]);

  useEffect(() => {
    if (!ativo) return;

    carregar();
    // Uma vez por montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo]);

  return { recarregar: carregar };
};

/**
 * As preferências com os rótulos, para montar a tela.
 *
 * Separado de `usePreferencias` porque é outro uso: aqui interessa a definição
 * de cada uma (rótulo, descrição, grupo), não só o valor.
 */
export const useCatalogoPreferencias = () => {
  const { FetchReq } = useApi();
  const definir = usePreferenciasStore((s) => s.definir);
  const [itens, setItens] = useState<PreferenciaParaTela[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);

      const resposta = await FetchReq<PreferenciaParaTela[]>('ListarPreferencias');
      setItens(resposta);

      // A store acompanha: sem isto, salvar no perfil mudaria a tela e não o
      // comportamento até a próxima carga de página.
      definir(
        Object.fromEntries(
          resposta.map((item) => [item.chave, item.valor]),
        ) as Partial<PreferenciasUsuario>,
      );
    } catch {
      // A aba mostra o vazio; o alerta ficaria por cima do modal aberto.
    } finally {
      setCarregando(false);
    }
  }, [FetchReq, definir]);

  useEffect(() => {
    carregar();
    // Uma vez por montagem do modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { itens, carregando, recarregar: carregar };
};
