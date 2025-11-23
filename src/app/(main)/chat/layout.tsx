'use client';
import { useEffect, useRef } from 'react';

import { useChatStore } from '@/store/useChatStore';

export default function ChatLayout({ children }) {
  const { connect, disconnect, resetChatStore, resetMessageStore } = useChatStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    connect();

    if (audioRef.current) {
      useChatStore.setState({ notificationSound: audioRef.current });
    }

    return () => {
      disconnect();
      resetChatStore();
      resetMessageStore();
    };
  }, []);
  return (
    <>
      <audio ref={audioRef} id="notification-sound">
        <source src="/audio/notification.mp3" type="audio/mp3" />
      </audio>
      {children}
    </>
  );
}
