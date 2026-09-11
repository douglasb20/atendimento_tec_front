'use client';
import { useEffect, useRef } from 'react';

import { useChatStore } from '@/store/useChatStore';
import VideoPreview from '@/components/VideoPreview';

export default function ChatLayout({ children }) {
  const connect = useChatStore((s) => s.connect);
  const disconnect = useChatStore((s) => s.disconnect);
  const resetChatStore = useChatStore((s) => s.resetChatStore);
  const resetMessageStore = useChatStore((s) => s.resetMessageStore);
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
      <audio
        ref={audioRef}
        id="notification-sound"
      >
        <source
          src="/audio/notification.mp3"
          type="audio/mp3"
        />
      </audio>
      {children}
      <VideoPreview />
    </>
  );
}
