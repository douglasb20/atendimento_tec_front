'use client';
import { useEffect } from 'react';

import { useChatStore } from '@/store/useChatStore';
import VideoPreview from '@/components/VideoPreview';

export default function ChatLayout({ children }) {
  const resetChatStore = useChatStore((s) => s.resetChatStore);
  const resetMessageStore = useChatStore((s) => s.resetMessageStore);

  useEffect(() => {
    // Os resets ficam: são estado *da tela* de atendimento - a conversa aberta
    // e suas mensagens -, e sair dela deve limpá-los.
    //
    // O que saiu daqui foi a conexão do socket e o `<audio>` de notificação,
    // que passaram a viver em `(main)/layout.tsx`: o chat interno recebe
    // mensagem em qualquer tela e precisa avisar de qualquer uma delas.
    return () => {
      resetChatStore();
      resetMessageStore();
    };
  }, [resetChatStore, resetMessageStore]);

  return (
    <>
      {children}
      <VideoPreview />
    </>
  );
}
