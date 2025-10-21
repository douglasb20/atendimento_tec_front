'use client';
import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import TitleCards from '@/components/TitleCards';

import MessageItem from './MessageItem';
import SendMessageBox from './SendMessageBox';

export default function ChatSection() {
  const [rendered, setRendered] = useState(false);
  const [messages, setMessages] = useState<Array<any>>([]);
  const bottomEl = useRef(null);

  useEffect(() => {
    const socket = io('http://localhost:3001', {
      autoConnect: false, // Impede a conexão automática na inicialização
    });
    // socketRef.current = socket;

    // Conecta apenas se não estiver já conectado
    if (!socket.connected) {
      socket.connect();
    }

    function onConnect() {
      console.log('✅ Conectado');
    }

    function onMessage(data: any) {
      setMessages((prevMessages) => [...prevMessages, data]);
      // A função ScrollDown precisa ser definida ou movida para fora do listener
    }

    // Adiciona os listeners
    socket.on('connect', onConnect);

    // Remove listener antigo antes de adicionar
    socket.off('whatsapp:message');
    socket.on('whatsapp:message', onMessage);

    setRendered(true);
    return () => {
      console.log('🔌 Desconectando socket...');
      // Remove os listeners para evitar memory leaks
      socket.off('connect', onConnect);
      socket.off('whatsapp:message', onMessage);
      // Desconecta o socket
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    bottomEl.current?.scrollTo({
      top: bottomEl.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  return rendered && (
    <>
      <TitleCards title="Mensagens" />

      <div className="p-card-content">
        <div
          ref={bottomEl}
          className="flex flex-column bg-gray-100 h-30rem border-round p-3 overflow-y-auto mb-3"
        >
          <MessageItem messages={messages} />
        </div>
        <SendMessageBox />
      </div>
    </>
  );
}

