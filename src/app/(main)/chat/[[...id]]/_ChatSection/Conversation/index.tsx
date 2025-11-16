'use client';
import Interweave from '@/components/Interweave';
import { SupportChatsResponse } from '@/Interfaces';
import { Badge } from 'primereact/badge';
import { classNames } from 'primereact/utils';
import { useEffect } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { fixHeartEmoji } from '@/service/Util';
import useApi from '@/service/Api/ApiClient';
import { useLayoutStore } from '@/layout/context/layoutcontext';
import { Breadcrumb } from '@/types';

export default function ConversationSection() {
  const {
    chats,
    socket,
    setUnreadCount,
    updateChat,
    activeChat,
    setSmoothScroll,
    addMessages,
    setLoadMessages,
    setChatNotFound,
    setActiveChat,
  } = useChatStore();
  const { setBreadcrumbs } = useLayoutStore();
  const { FetchReq } = useApi();

  const onChangeBreadcrumbs = (chatId: number) => {
    let breadcrumbs: Breadcrumb[] = [
      { labels: ['Dashboard', 'Atendimentos', 'Chat'], to: `/chat/${chatId}` },
    ];
    setBreadcrumbs((prev) => [...prev, ...breadcrumbs]);
  };

  const getChatMessages = async (chatId: number) => {
    try {
      setSmoothScroll(false);
      const data = await FetchReq<SupportChatsResponse>('ListarMensagensPorAtendimentoId', [
        chatId,
      ]);
      addMessages(data.supportChatMessages);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const loadConversationMessage = async (chatId: number) => {
    try {
      setLoadMessages(true);
      const chatData = await getChatMessages(chatId);
      setActiveChat(chatData);
      window.history.replaceState(null, '', `/chat/${chatId}`);
      onChangeBreadcrumbs(chatId);
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
    if (socket == null) return;

    socket.off('whatsapp:unread_count');
    socket.on('whatsapp:unread_count', (payload) => {
      const { chatId, unreadCount } = payload;
      setUnreadCount(chatId, unreadCount);
    });

    socket.off('whatsapp:chat_state');
    socket.on('whatsapp:chat_state', (payload: SupportChatsResponse) => {
      console.log(
        `🔵 Atualizando estado do chat ${payload?.id}: ${payload?.supportChatStatus?.name}`,
        payload,
      );
      updateChat(payload);
    });

    return () => {
      socket.off('whatsapp:unread_count');
    };
  }, [socket]);
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
              // router.replace(`/chat/${conversation?.id}`);
            }}
          >
            <div className="flex flex-none justify-content-center align-items-center mr-1">
              <img
                src={conversation?.contact?.avatar_url}
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
                <Interweave
                  content={fixHeartEmoji(conversation?.last_message?.replace(/\n/g, ' '))}
                />
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
