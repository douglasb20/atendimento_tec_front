'use client';
import { useEffect } from 'react';

import { SupportChatsWithMessagesResponse } from '@/Interfaces';
import { useChatStore } from '../../../../../../store/useChatStore';
import Header from './Header';
import LoadingChat from './LoadingChat';
import Messages from './Messages';
import NoChatActive from './NoChatActive';
import NotFoundChat from './NotFoundChat';
import SendMessageBox from './SendMessageBox';

export default function MessageItem() {
  const { socket, updateMessage, activeChat, loadMessages, chatNotFound } = useChatStore();

  useEffect(() => {
    if (socket == null) return;

    socket.off('whatsapp:messages');
    socket.on(
      'whatsapp:messages',
      ({ supportChatMessages: msg, ...supportChats }: SupportChatsWithMessagesResponse) => {
        if (activeChat?.id !== String(msg.support_chat_id)) return;
        updateMessage(msg);
      },
    );

    return () => {
      socket.off('whatsapp:messages');
    };
  }, [socket]);

  console.log(activeChat, loadMessages, chatNotFound);

  return (
    <>
      <div className="card flex flex-column shadow-1 h-full">
        {activeChat && !loadMessages && !chatNotFound && (
          <>
            <Header />
            <Messages />
            <SendMessageBox />
          </>
        )}

        {chatNotFound && <NotFoundChat />}

        {loadMessages && <LoadingChat />}

        {!activeChat && !loadMessages && !chatNotFound && <NoChatActive />}
      </div>
    </>
  );
}
