'use client';
import React from 'react';
import ReactDOM from 'react-dom';
import { useChatStore } from '@/store/useChatStore';
export default function VideoPreview() {
  const videoPreview = useChatStore((s) => s.videoPreview);
  const setVideoPreview = useChatStore((s) => s.setVideoPreview);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // Só ativa quando estiver no cliente
    setMounted(true);
  }, []);

  if (!mounted || videoPreview?.source === '') return null;

  return ReactDOM.createPortal(
    <div
      onClick={() => setVideoPreview('')}
      className={`fixed top-0 left-0 w-full h-full inset-0 bg-black-alpha-90 flex items-center justify-center transition-duration-500 transition-all ${videoPreview?.source !== '' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      style={{ zIndex: 1000 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute border-none border-red-500 flex flex-row justify-content-between top-0 right-0 w-auto h-3rem mr-3 mt-2 gap-4"
      >
        <button
          onClick={() => setVideoPreview('')}
          className="border-none bg-transparent cursor-pointer"
        >
          <i className="pi pi-times text-4xl text-white"></i>
        </button>
      </div>
      <div className="flex justify-content-center align-items-center w-full h-full overflow-hidden rounded-lg">
        <video
          controls
          autoPlay
          playsInline
          onClick={(e) => e.stopPropagation()}
        >
          <source
            src={videoPreview?.source}
            type={videoPreview?.mime_type}
          />
        </video>
      </div>
    </div>,
    document.body,
  );
}

