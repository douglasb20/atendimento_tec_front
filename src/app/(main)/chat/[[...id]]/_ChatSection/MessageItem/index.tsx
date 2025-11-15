'use client';
import { useEffect } from 'react';

import { SupportChatMessageResponse } from '@/Interfaces';
import { useChatStore } from '../store/useChatStore';
import Header from './Header';
import Messages from './Messages';
import SendMessageBox from './SendMessageBox';
import NoChatActive from './NoChatActive';
import { ProgressSpinner } from 'primereact/progressspinner';

export default function MessageItem() {
  const { socket, updateMessage, activeChatId, loadMessages } = useChatStore();

  

  useEffect(() => {
    if (socket == null) return;

    socket.off('whatsapp:messages');
    socket.on('whatsapp:messages', (msg: SupportChatMessageResponse) => {
      if(activeChatId !== String(msg.support_chat_id)) return;
      updateMessage(msg);
    });

    return () => {
      socket.off('whatsapp:messages');
    };
  }, [socket]);

  return (
    <>
      <div className="card flex flex-column shadow-1 h-full">
        {activeChatId !== null && !loadMessages && (
          <>
            <Header />
            <Messages />
            <SendMessageBox />
          </>
        )}

        {activeChatId !== null && loadMessages && (
          <div className="flex flex-column flex-1 justify-content-center align-items-center gap-2">
            <ProgressSpinner />
            <span className="text-center text-lg">Carregando conversa, por favor aguarde...</span>
          </div>
        )}

        {activeChatId === null && (
          <NoChatActive />
        )}
      </div>
    </>
  );
}
