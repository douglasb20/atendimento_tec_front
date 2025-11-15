import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '../store/useChatStore';
import { SupportChatsResponse } from '@/Interfaces';
import { parseMensagem } from '../_components';
import { classNames } from 'primereact/utils';

export default function ConversationSection() {
  const { chats, socket, setUnreadCount, updateChat, activeChatId } = useChatStore();
  const router = useRouter();

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
        `🔵 Atualizando estado do chat ${payload.id}: ${payload.supportChatStatus.name}`,
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
            key={conversation.id}
            className={
              classNames(
                {

                  "border-bottom-1 border-round-top  border-gray-300": activeChatId !== String(conversation.id),
                  "border-1 border-indigo-500 border-round ": activeChatId === String(conversation.id),
                },
                "p-2  flex cursor-pointer hover:bg-gray-200 mb-2 gap-1"
              )
            }
            onClick={() =>router.replace(`/chat/${conversation.id}`, { scroll: false })}
          >
            <div className="flex-shrink-0">
              <img
                src={conversation?.contact?.avatar_url}
                width={55}
                height={55}
                alt={conversation?.contact?.name}
                className="border-circle mr-2"
              />
            </div>
            <div className="flex flex-column justify-content-center flex-1 relative">
              <p className="p-0 m-0 text-lg font-semibold">
                {conversation?.contact?.client?.nome
                  ? conversation?.contact?.client?.nome + ' - '
                  : ''}
                {conversation?.contact?.name}
              </p>
              {Number(conversation?.unread_count) !== 0 && (
                <span className="absolute right-0 h-2rem w-2rem border-circle font-bold text-white bg-green-400 flex justify-content-center align-items-center">
                  {conversation?.unread_count < 0 || conversation?.unread_count}
                </span>
              )}
              <div className="text-overflow-ellipsis white-space-nowrap overflow-hidden w-30rem">
                {parseMensagem(conversation?.last_message?.replace(/\n/g, ' '))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
