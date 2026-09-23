'use client';

import { useCallback, useEffect, useRef } from 'react';

import {
  ColegaResponse,
  ConversaInternaResponse,
  InternalMessageResponse,
  LeituraInternaEvento,
  PresencaAtualEvento,
  PresencaEvento,
} from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta } from '@/service/Util';
import { useChatInternoStore } from '@/store/useChatInternoStore';
import { useChatStore } from '@/store/useChatStore';
import { useAvisarEvento } from './useAvisarEvento';
import { useUsuarioLogado } from './useUsuarioLogado';

/** Quantas mensagens o histórico carrega de uma vez. */
const LIMITE_MENSAGENS = 50;

/** O texto da notificação: mídia vira rótulo, texto aparece cortado. */
const previaDaMensagem = (mensagem: InternalMessageResponse): string => {
  if (mensagem.type === 'text') return (mensagem.content ?? '').slice(0, 120);

  const rotulos: Record<string, string> = {
    image: '📷 Foto',
    video: '🎥 Vídeo',
    document: '📎 Documento',
    audio: '🎵 Áudio',
    voice: '🎤 Mensagem de voz',
  };

  return mensagem.content?.trim().slice(0, 120) || rotulos[mensagem.type] || 'Anexo';
};

/**
 * Liga o chat interno ao backend e ao socket.
 *
 * Um hook só, montado uma única vez no topo (`ChatInterno`), em vez de cada
 * componente assinar o que precisa: dois assinantes do mesmo evento fariam a
 * mensagem entrar duas vezes na store.
 */
export const useChatInterno = ({ ativo = true }: { ativo?: boolean } = {}) => {
  const { FetchReq } = useApi();
  const socket = useChatStore((s) => s.socket);
  const notificationSound = useChatStore((s) => s.notificationSound);

  const setColegas = useChatInternoStore((s) => s.setColegas);
  const setPresencas = useChatInternoStore((s) => s.setPresencas);
  const marcarPresenca = useChatInternoStore((s) => s.marcarPresenca);
  const setConversas = useChatInternoStore((s) => s.setConversas);
  const acrescentarMensagem = useChatInternoStore((s) => s.acrescentarMensagem);
  const marcarLidasNaTela = useChatInternoStore((s) => s.marcarLidasNaTela);
  const zerarNaoLidas = useChatInternoStore((s) => s.zerarNaoLidas);
  const setMensagens = useChatInternoStore((s) => s.setMensagens);
  const setCarregandoMensagens = useChatInternoStore((s) => s.setCarregandoMensagens);
  const abrirCom = useChatInternoStore((s) => s.abrirCom);

  const { avisar } = useAvisarEvento();

  /**
   * Espelha o colega aberto.
   *
   * Os handlers de socket são registrados com `[socket]` como dependência e
   * capturariam um valor obsoleto - o mesmo motivo do `activeChatRef` na tela
   * de atendimento.
   */
  const ativoRef = useRef<ColegaResponse | null>(null);
  const ativoNaStore = useChatInternoStore((s) => s.ativo);

  useEffect(() => {
    ativoRef.current = ativoNaStore;
  }, [ativoNaStore]);

  // Pelo mesmo motivo: o handler precisa saber quem sou eu para distinguir a
  // própria mensagem, que volta pelo socket, da que chegou de um colega.
  const { usuarioId } = useUsuarioLogado();
  const usuarioIdRef = useRef<number | null>(null);

  useEffect(() => {
    usuarioIdRef.current = usuarioId;
  }, [usuarioId]);

  const carregarColegas = useCallback(async () => {
    try {
      const colegas = await FetchReq<ColegaResponse[]>('ListarColegas');
      setColegas(colegas);

      // O estado vem junto de cada colega; os offline ficam de fora do mapa.
      setPresencas(
        Object.fromEntries(
          colegas
            .filter((colega) => colega.estado && colega.estado !== 'offline')
            .map((colega) => [colega.id, colega.estado]),
        ),
      );
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível carregar os colegas');
    }
  }, [FetchReq, setColegas, setPresencas]);

  const carregarConversas = useCallback(async () => {
    try {
      setConversas(await FetchReq<ConversaInternaResponse[]>('ListarConversasInternas'));
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível carregar as conversas');
    }
  }, [FetchReq, setConversas]);

  /** Histórico de uma conversa, marcando-a como lida em seguida. */
  const carregarMensagens = useCallback(
    async (chatId: number | string) => {
      try {
        setCarregandoMensagens(true);

        const mensagens = await FetchReq<InternalMessageResponse[]>({
          endpoint: 'ListarMensagensInternas',
          variables: [chatId, LIMITE_MENSAGENS],
        });

        setMensagens(mensagens);

        // Abrir é ler: o badge zera na hora, e o outro lado recebe o aviso.
        await FetchReq({ endpoint: 'MarcarConversaInternaLida', variables: [chatId] });
        zerarNaoLidas(chatId);
      } catch (erro) {
        CatchAlerta(erro, 'Não foi possível carregar as mensagens');
      } finally {
        setCarregandoMensagens(false);
      }
    },
    [FetchReq, setMensagens, setCarregandoMensagens, zerarNaoLidas],
  );

  // Carga inicial.
  useEffect(() => {
    if (!ativo) return;

    carregarColegas();
    carregarConversas();
    // Uma vez só: recarregar a cada render faria uma chamada por tecla digitada
    // em qualquer lugar da tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo]);

  // Eventos do socket.
  useEffect(() => {
    if (!ativo || socket == null) return;

    const aoReceberMensagem = (mensagem: InternalMessageResponse) => {
      acrescentarMensagem(mensagem, usuarioIdRef.current);

      // A conversa ainda não existia quando a lista carregou: sem recarregar,
      // a primeira mensagem de um colega novo não apareceria em lugar nenhum.
      const conversas = useChatInternoStore.getState().conversas;
      const conhecida = conversas.some(
        (conversa) => String(conversa.id) === String(mensagem.internal_chat_id),
      );

      if (!conhecida) carregarConversas();

      // O socket entrega aos dois lados: sem esta checagem, o eco da própria
      // mensagem tocaria o som a cada envio.
      const deOutraPessoa = mensagem.sender_id !== usuarioIdRef.current;
      const naConversaAberta = ativoRef.current?.id === mensagem.sender_id;

      if (deOutraPessoa && !naConversaAberta) {
        notificationSound?.play().catch(() => {
          // O navegador bloqueia áudio antes da primeira interação na página.
          // Silêncio é melhor que um erro no console a cada mensagem.
        });
      }

      if (!deOutraPessoa) return;

      const remetente = useChatInternoStore
        .getState()
        .colegas.find((colega) => colega.id === mensagem.sender_id);

      const nome = remetente
        ? [remetente.name, remetente.last_name].filter(Boolean).join(' ')
        : 'Mensagem interna';

      avisar({
        preferencia: 'notif_chat_interno',
        titulo: nome,
        corpo: previaDaMensagem(mensagem),
        icone: remetente?.avatar_url,
        // Uma notificação por colega: dez mensagens seguidas substituem a
        // anterior em vez de empilhar dez avisos.
        tag: `interno-${mensagem.sender_id}`,
        // O chat interno não tem rota própria: a conversa abre pela store,
        // e por isso a URL leva só ao /chat.
        url: '/chat',
        conversaAberta: naConversaAberta,
        aoClicar: () => {
          if (remetente) abrirCom(remetente);
        },
      });
    };

    const aoMarcarLida = (evento: LeituraInternaEvento) => marcarLidasNaTela(evento.chat_id);

    const aoMudarPresenca = (evento: PresencaEvento) =>
      // `estado` é o campo novo; o `online` booleano sobrevive para clientes
      // que ainda não recarregaram depois do deploy.
      marcarPresenca(evento.user_id, evento.estado ?? (evento.online ? 'online' : 'offline'));

    const aoReceberPresencaAtual = (evento: PresencaAtualEvento) =>
      setPresencas(evento.estados ?? {});

    // `off` antes de `on`: o efeito roda de novo a cada reconexão, e sem isso
    // os handlers empilhariam.
    socket.off('interno:mensagem').on('interno:mensagem', aoReceberMensagem);
    socket.off('interno:lida').on('interno:lida', aoMarcarLida);
    socket.off('presenca:mudou').on('presenca:mudou', aoMudarPresenca);
    socket.off('presenca:atual').on('presenca:atual', aoReceberPresencaAtual);

    return () => {
      socket.off('interno:mensagem', aoReceberMensagem);
      socket.off('interno:lida', aoMarcarLida);
      socket.off('presenca:mudou', aoMudarPresenca);
      socket.off('presenca:atual', aoReceberPresencaAtual);
    };
  }, [
    ativo,
    socket,
    acrescentarMensagem,
    marcarLidasNaTela,
    marcarPresenca,
    setPresencas,
    carregarConversas,
    notificationSound,
    avisar,
    abrirCom,
  ]);

  return { carregarColegas, carregarConversas, carregarMensagens };
};
