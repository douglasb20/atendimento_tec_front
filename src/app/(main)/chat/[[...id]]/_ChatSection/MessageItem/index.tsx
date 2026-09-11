'use client';
import { useEffect, useRef } from 'react';

import { SupportChatsWithMessagesResponse, SupportChatMessageResponse } from '@/Interfaces';
import { useChatStore } from '@/store/useChatStore';
import Header from './Header';
import LoadingChat from './LoadingChat';
import Messages from './Messages';
import NoChatActive from './NoChatActive';
import NotFoundChat from './NotFoundChat';
import SendMessageBox from './SendMessageBox';

export default function MessageItem() {
  const socket = useChatStore((s) => s.socket);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const activeChat = useChatStore((s) => s.activeChat);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const chatNotFound = useChatStore((s) => s.chatNotFound);
  const activeChatRef = useRef(activeChat);

  useEffect(() => {
    if (socket == null) return;

    socket.off('whatsapp:messages');
    socket.on(
      'whatsapp:messages',
      ({ supportChatMessages: msg, ...supportChats }: SupportChatsWithMessagesResponse) => {
        if (String(activeChatRef.current?.id) !== String(msg.support_chat_id)) return;

        updateMessage(msg);
      },
    );

    socket.on('whatsapp:message_ack', (message: SupportChatMessageResponse) => {
      if (String(activeChatRef.current?.id) !== String(message.support_chat_id)) return;

      updateMessage(message);
    });

    return () => {
      socket.off('whatsapp:messages');
    };
  }, [socket]);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  return (
    <>
      {/* `relative` ancora a revisão de anexos, que cobre o painel inteiro. */}
      <div className="card relative flex flex-column shadow-1 h-full">
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
