'use client';
import { useEffect } from 'react';

import { useChatStore } from '@/store/useChatStore';

export default function ChatLayout({ children }) {
  const { connect, disconnect, resetChatStore, resetMessageStore } = useChatStore();

  useEffect(() => {
    connect();
    return () => {
      disconnect();
      resetChatStore();
      resetMessageStore();
    };
  }, []);
  return children;
}
