'use client';
import React, { useEffect, useRef } from 'react';
import Interweave from '@/components/Interweave';
import { SupportChatsResponse } from '@/Interfaces';
import { useLayoutStore } from '@/layout/context/layoutcontext';
import useApi from '@/service/Api/ApiClient';
import { fixHeartEmoji } from '@/service/Util';
import { useChatStore } from '@/store/useChatStore';
import { Breadcrumb } from '@/types';
import { Badge } from 'primereact/badge';
import { classNames } from 'primereact/utils';

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
  const { setBreadcrumbs } = useLayoutStore();
  const { FetchReq } = useApi();
  const windowFocusedRef = useRef(true);
  const activeChatRef = useRef(activeChat);

  const changeWindowFocus = (focused: boolean) => {
    windowFocusedRef.current = focused;
  }

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
    <div className="card shadow-1 h-full px-2">
      <ul className="list-none m-0 p-0 overflow-auto h-full">
        {chats.map((conversation) => (
          <li
            key={conversation?.id}
            className={classNames(
              {
                'border-bottom-1 border-round-top border-gray-300 hover:bg-gray-200 ':
                  activeChat?.id !== String(conversation?.id),
                'border-1 border-primary-500 border-round bg-primary-50 hover:bg-primary-100':
                  activeChat?.id === String(conversation?.id),
              },
              'p-2 flex cursor-pointer mb-2 gap-1 overflow-hidden',
            )}
            onClick={() => {
              loadConversationMessage(Number(conversation?.id));
            }}
          >
            <div className="flex flex-none justify-content-center align-items-center mr-1">
              <img
                src={conversation?.contact?.avatar_url || '/images/avatar/avatar-noprofile.png'}
                width={55}
                height={55}
                alt={conversation?.contact?.name}
                className="border-circle"
              />
            </div>
            <div className="flex flex-1 flex-column justify-content-center relative min-w-0">
              <p className="p-0 m-0 text-lg font-semibold">
                {conversation?.contact?.client?.nome
                  ? conversation?.contact?.client?.nome + ' - '
                  : ''}
                {conversation?.contact?.name}
              </p>
              <div className="text-overflow-ellipsis white-space-nowrap overflow-hidden lastMessagePreview">
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
            </div>
            <div
              className="flex flex-none justify-content-center align-items-center relative h-auto"
              style={{ width: '2.4rem' }}
            >
              {Number(conversation?.unread_count) !== 0 && (
                <Badge
                  className="bg-primary-500"
                  value={conversation?.unread_count < 0 ? '' : conversation?.unread_count}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}


export default React.memo(ConversationSection);