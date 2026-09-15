'use client';

import { useCallback, useEffect, useState } from 'react';

import { ChannelResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { useCanaisRevalidacao } from '@/store/useCanaisRevalidacao';
import { useChatStore } from '@/store/useChatStore';

/** Espelha `channel_status` no banco (seed da migration). */
export enum ChannelStatusId {
  DESCONECTADO = 1,
  CONECTANDO = 2,
  CONECTADO = 3,
  SESSAO_EXPIRADA = 4,
  EXCLUIDO = 5,
}

export type ResumoCanais = {
  canais: ChannelResponse[];
  /** Canais que não estão excluídos — os que o atendente de fato usa. */
  ativos: ChannelResponse[];
  conectados: number;
  /** true quando todo canal ativo está conectado. */
  tudoConectado: boolean;
  carregando: boolean;
};

const estaConectado = (canal: ChannelResponse) =>
  canal.channel_status_id === ChannelStatusId.CONECTADO;

const estaExcluido = (canal: ChannelResponse) =>
  canal.channel_status_id === ChannelStatusId.EXCLUIDO;

/**
 * Mantém o status dos canais de WhatsApp para exibição no topbar.
 *
 * Recarrega por HTTP a cada `whatsapp:channel_status`, porque o evento traz
 * apenas o `channel_id` — não o estado novo. É o mesmo caminho que a tela de
 * canais usa.
 */
export function useStatusCanais(): ResumoCanais {
  const { FetchReq } = useApi();
  const socket = useChatStore((s) => s.socket);
  const versao = useCanaisRevalidacao((s) => s.versao);

  const [canais, setCanais] = useState<ChannelResponse[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    try {
      const dados = await FetchReq<ChannelResponse[]>('ListarCanais');
      setCanais(dados ?? []);
    } catch {
      // Silencioso de propósito: um badge de status não deve abrir alerta de
      // erro por cima do trabalho do atendente. Sem dados, ele não aparece.
    } finally {
      setCarregando(false);
    }
  }, [FetchReq]);

  // Roda na montagem e sempre que a tela de canais avisa que a lista mudou.
  useEffect(() => {
    carregar();
    // `carregar` muda a cada render (o FetchReq vem de um hook não memoizado),
    // e incluí-lo aqui faria a busca rodar em loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versao]);

  useEffect(() => {
    if (!socket) return;

    const aoMudarStatus = () => carregar();

    socket.off('whatsapp:channel_status', aoMudarStatus);
    socket.on('whatsapp:channel_status', aoMudarStatus);

    return () => {
      socket.off('whatsapp:channel_status', aoMudarStatus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // O socket só existe dentro de `/chat` — o layout do chat o conecta ao montar
  // e o desconecta ao sair. Como o topbar é global, nas demais telas o badge
  // ficaria congelado; o polling cobre esse intervalo e para assim que há
  // socket, para não duplicar requisição.
  useEffect(() => {
    if (socket) return;

    const id = setInterval(carregar, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const ativos = canais.filter((c) => !estaExcluido(c));
  const conectados = ativos.filter(estaConectado).length;

  return {
    canais,
    ativos,
    conectados,
    tudoConectado: ativos.length > 0 && conectados === ativos.length,
    carregando,
  };
}
