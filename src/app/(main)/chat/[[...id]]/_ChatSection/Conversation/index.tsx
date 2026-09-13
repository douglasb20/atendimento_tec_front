'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format, isToday, parseISO } from 'date-fns';

import Interweave from '@/components/Interweave';
import { SupportChatsResponse } from '@/Interfaces';
import { useLayoutStore } from '@/layout/context/layoutcontext';
import useApi from '@/service/Api/ApiClient';
import { fixHeartEmoji } from '@/service/Util';
import { useChatStore } from '@/store/useChatStore';
import { Breadcrumb } from '@/types';
import { Badge } from 'primereact/badge';
import { classNames } from 'primereact/utils';

import FiltroAtendimentos, {
  filtraPorGrupo,
  grupoDaConversa,
  GrupoAtendimento,
} from './FiltroAtendimentos';

/**
 * Hora quando foi hoje, data quando foi antes — o mesmo critério dos
 * mensageiros: para o que é recente importa a hora, para o resto o dia.
 */
const horaDaConversa = (iso: string) => {
  const data = parseISO(iso);
  return isToday(data) ? format(data, 'HH:mm') : format(data, 'dd/MM/yy');
};

const ConversationSection = () => {
  const chats = useChatStore((s) => s.chats);
  const socket = useChatStore((s) => s.socket);
  const activeChat = useChatStore((s) => s.activeChat);
  const notificationSound = useChatStore((s) => s.notificationSound);
  const updateChat = useChatStore((s) => s.updateChat);
  const addMessages = useChatStore((s) => s.addMessages);
  const setUnreadCount = useChatStore((s) => s.setUnreadCount);
  const setLoadMessages = useChatStore((s) => s.setLoadMessages);
  const setChatNotFound = useChatStore((s) => s.setChatNotFound);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const setQuotedMessage = useChatStore((s) => s.setQuotedMessage);
  const fecharConversa = useChatStore((s) => s.fecharConversa);
  const { setBreadcrumbs } = useLayoutStore();
  const { FetchReq } = useApi();
  const [grupoAtivo, setGrupoAtivo] = useState<GrupoAtendimento>('todos');
  const windowFocusedRef = useRef(true);
  const activeChatRef = useRef(activeChat);

  // Refiltra só quando a lista ou o grupo mudam; sem isto, cada mensagem nova
  // recriaria o array e re-renderizaria todos os itens.
  /**
   * Conversas do grupo escolhido, da mais recente para a mais antiga.
   *
   * A ordenação precisa acontecer aqui, e não só no backend: a listagem inicial
   * vem ordenada, mas o socket adiciona e atualiza conversas ao longo do tempo,
   * e sem reordenar uma mensagem nova fica onde o item já estava.
   */
  const chatsVisiveis = useMemo(
    () =>
      filtraPorGrupo(chats, grupoAtivo).sort((a, b) => {
        const quando = (c: SupportChatsResponse) =>
          new Date(c.updated_at ?? c.created_at).getTime() || 0;

        return quando(b) - quando(a);
      }),
    [chats, grupoAtivo],
  );

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;

      // Um diálogo aberto trata o próprio Esc: fechar a conversa por baixo dele
      // deixaria o modal órfão, apontando para um chat que não existe mais.
      if (document.querySelector('.p-dialog-mask, .swal2-container')) return;

      // Digitando, o Esc é do campo (cancelar edição, fechar sugestão).
      const alvo = evento.target as HTMLElement | null;
      if (alvo?.closest('input, textarea, [contenteditable="true"]')) return;

      if (!activeChatRef.current) return;

      fecharConversa();
    };

    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  const changeWindowFocus = (focused: boolean) => {
    windowFocusedRef.current = focused;
  };

  const onChangeBreadcrumbs = (chatId: number) => {
    let breadcrumbs: Breadcrumb[] = [
      { labels: ['Dashboard', 'Atendimentos', 'Chat'], to: `/chat/${chatId}` },
    ];
    setBreadcrumbs((prev) => [...prev, ...breadcrumbs]);
  };

  const getChatMessages = async (chatId: number) => {
    try {
      const data = await FetchReq<SupportChatsResponse>('ListarMensagensPorAtendimentoId', [
        chatId,
      ]);
      addMessages(data.supportChatMessages);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const loadConversationMessage = async (supportChatId: number) => {
    if (String(activeChatRef.current?.id) === String(supportChatId)) return;

    try {
      setLoadMessages(true);
      setQuotedMessage(null, null);
      const chatData = await getChatMessages(supportChatId);
      setActiveChat(chatData);
      window.history.replaceState(null, '', `/chat/${supportChatId}`);
      onChangeBreadcrumbs(supportChatId);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setActiveChat(null);
        setChatNotFound(true);
      }
      console.log(err.response, err.response.status);
    } finally {
      setLoadMessages(false);
    }
  };

  useEffect(() => {
    if (socket === null) return;

    socket.off('whatsapp:unread_count');
    socket.on('whatsapp:unread_count', (payload) => {
      const { chatId, unreadCount } = payload;
      setUnreadCount(chatId, unreadCount);
    });

    socket.off('whatsapp:chat_state');
    socket.on('whatsapp:chat_state', async (payload: SupportChatsResponse) => {
      updateChat(payload);
      if (!windowFocusedRef.current) {
        await notificationSound?.play();
      }
    });

    window.addEventListener('blur', () => changeWindowFocus(false));
    window.addEventListener('focus', () => changeWindowFocus(true));
    return () => {
      socket.off('whatsapp:unread_count');
      window.removeEventListener('blur', () => changeWindowFocus(false));
      window.removeEventListener('focus', () => changeWindowFocus(true));
    };
  }, [socket]);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  return (
    <div className="card flex flex-column shadow-1 h-full px-2 pt-2">
      <FiltroAtendimentos
        chats={chats}
        grupoAtivo={grupoAtivo}
        onSelecionar={setGrupoAtivo}
      />

      <ul className="list-none flex-1 m-0 p-0 overflow-auto">
        {chatsVisiveis.length === 0 ? (
          // Ternário, não `&&` seguido do map: como irmãos, o React trata os
          // dois como uma lista e cobra `key` do primeiro.
          <li className="flex flex-column align-items-center gap-2 py-6 text-center text-500">
            <i className="fa-regular fa-inbox text-3xl text-300" />
            <span className="text-sm">
              {grupoAtivo === 'fila'
                ? 'Nenhum atendimento aguardando'
                : grupoAtivo === 'andamento'
                  ? 'Nenhum atendimento em andamento'
                  : 'Nenhuma conversa por aqui'}
            </span>
          </li>
        ) : (
          chatsVisiveis.map((conversation) => (
            <li
              key={conversation?.id}
              className={classNames(
                {
                  'surface-50 border-200 hover:surface-100':
                    activeChat?.id !== String(conversation?.id),
                  'bg-primary-50 border-primary-200': activeChat?.id === String(conversation?.id),
                },
                // Cada conversa é um cartão: borda e fundo próprio dão a
                // separação que só o espaçamento não dava — sem eles os itens
                // liam como texto corrido numa coluna.
                'flex cursor-pointer align-items-center gap-3 border-1 border-round-lg p-2 mb-2 overflow-hidden transition-colors transition-duration-150',
              )}
              style={{
                // A faixa à esquerda reforça a seleção sem trocar a espessura
                // da borda, o que faria o cartão "pular" ao ser escolhido.
                boxShadow:
                  activeChat?.id === String(conversation?.id)
                    ? 'inset 3px 0 0 0 var(--primary-color)'
                    : undefined,
              }}
              onClick={() => {
                loadConversationMessage(Number(conversation?.id));
              }}
            >
              <div className="relative flex flex-none">
                <img
                  src={conversation?.contact?.avatar_url || '/images/avatar/avatar-noprofile.png'}
                  width={48}
                  height={48}
                  alt={conversation?.contact?.name}
                  className="border-circle"
                  style={{ objectFit: 'cover' }}
                />
                {/* Sobre o avatar, o estado deixa de disputar espaço com o nome
                    e fica onde o olho já está. */}
                <span
                  className={classNames(
                    grupoDaConversa(conversation) === 'fila' ? 'bg-orange-400' : 'bg-green-500',
                    'absolute border-circle',
                  )}
                  style={{
                    width: '0.75rem',
                    height: '0.75rem',
                    right: 0,
                    bottom: 0,
                    boxShadow: '0 0 0 2px var(--surface-0)',
                  }}
                  title={grupoDaConversa(conversation) === 'fila' ? 'Aguardando' : 'Em atendimento'}
                />
              </div>
              <div className="flex flex-1 flex-column min-w-0">
                <div className="flex align-items-baseline gap-2 min-w-0">
                  <span className="flex-1 text-base font-semibold text-900 white-space-nowrap overflow-hidden text-overflow-ellipsis">
                    {conversation?.contact?.client?.nome ?? conversation?.contact?.name}
                  </span>

                  {/* A hora fica alinhada à direita, como em qualquer
                      mensageiro: é por ela que se varre a lista. */}
                  {conversation?.updated_at && (
                    <span className="flex-none text-xs text-500">
                      {horaDaConversa(conversation.updated_at)}
                    </span>
                  )}
                </div>

                {/* O contato só aparece quando há cliente: sem ele, o nome do
                    contato já está no título e repetir seria ruído. */}
                {conversation?.contact?.client?.nome && (
                  <span
                    className="text-xs font-semibold text-500 white-space-nowrap overflow-hidden text-overflow-ellipsis"
                    // Encostado no título: os dois nomeiam a mesma conversa e
                    // devem ler como um bloco só, separados da prévia abaixo.
                    style={{ marginTop: '-0.15rem' }}
                  >
                    {conversation?.contact?.name}
                  </span>
                )}
                <div className="flex align-items-center gap-2 mt-1 min-w-0">
                  <div className="flex-1 text-sm text-600 text-overflow-ellipsis white-space-nowrap overflow-hidden lastMessagePreview">
                    {conversation?.last_message_type === 'revoked' ? (
                      <span className="font-italic text-600">
                        <i className="fa-regular fa-ban mr-1" />
                        Mensagem apagada
                      </span>
                    ) : (
                      <Interweave
                        content={fixHeartEmoji(conversation?.last_message?.replace(/\n/g, ' '))}
                      />
                    )}
                  </div>

                  {/* Junto da prévia, não numa coluna própria: o espaço só é
                      ocupado quando há o que contar. */}
                  {Number(conversation?.unread_count) > 0 && (
                    <Badge
                      className="flex-none bg-primary-500"
                      value={conversation?.unread_count}
                    />
                  )}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default React.memo(ConversationSection);
