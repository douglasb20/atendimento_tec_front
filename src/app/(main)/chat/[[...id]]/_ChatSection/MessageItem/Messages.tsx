import React, { memo, useEffect, useMemo, useRef } from 'react';

import { SupportChatMessageResponse } from '@/Interfaces';
import { useChatStore } from '../store/useChatStore';
import { parseMensagem } from '../_components';
import { classNames } from 'primereact/utils';

function SingleMessage({
  message,
  doAnimation,
  isLast,
}: {
  message: SupportChatMessageResponse;
  doAnimation: boolean;
  isLast: boolean;
}) {
  const { from_me, content } = message;

  // --- 4. Otimização com useMemo ---
  // Evita re-processar a mesma mensagem em cada renderização.
  // A formatação só é recalculada se o 'body' da mensagem mudar.
  const formattedContent = useMemo(() => parseMensagem(content), [content]);

  const messageClass = from_me
    ? 'align-self-end bg-blue-500 text-white'
    : 'align-self-start bg-gray-300 text-black';

  return (
    <div
      className={classNames(
        ` animation-duration-200 w-auto p-2 mb-2 border-round-lg max-w-xs ${messageClass}`,
        {
          fadeinright: doAnimation && isLast && from_me,
          fadeinleft: doAnimation && isLast && !from_me,
        },
      )}
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      <div className="flex flex-column">
        {message.has_media && message.type === 'image' && (
          <>
            <img
              src={message.media_url}
              alt="Media"
              className="mb-2 border-round shadow-2"
              style={{ maxWidth: '500px', height: '500px' }}

            />
            {formattedContent}
          </>
        )}
        {message.has_media && message.type === 'ptt' && (
          <>
            <audio
              controls
              className="mb-2 "
              style={{ width: '35rem' }}
            >
              <source
                src={message.media_url}
                type={ message.media_type}
              />
              Seu navegador não suporta o elemento de áudio.
            </audio>
          </>
        )}
        {message.has_media && message.type === 'video' && (
          <>
            <video
              controls
              className="mb-2 "
              style={{ maxWidth: '40rem', height: '50rem', objectFit: 'contain' }}
            >
              <source
                src={message.media_url}
                type={message.media_type}
              />
              Seu navegador não suporta o elemento de vídeo.
            </video>
            {formattedContent}
          </>
        )}
        {!message.has_media && formattedContent}
      </div>
    </div>
  );
}

const Messages = () => {
  const { messages, doSmoothScroll, setSmoothScroll, loadMessages } = useChatStore();
  const bottomEl = useRef(null);

  useEffect(() => {
    if (!bottomEl.current) return;

    if (!doSmoothScroll && !loadMessages) {
      bottomEl.current.scrollTop = bottomEl.current.scrollHeight;
      setSmoothScroll(true);
      return;
    }

    // Nas próximas execuções: scroll suave
    bottomEl.current.scrollTo({
      top: bottomEl.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);
  return (
    <>
      <div
        ref={bottomEl}
        className="flex flex-1 flex-column bg-gray-100 border-round p-3 overflow-y-auto overflow-x-hidden mb-3"
      >
        {messages?.map((msg) => {
          const messageClass = msg.from_me ? 'align-self-end' : 'align-self-start';
          return (
            <div
              className={classNames(
                {
                  'mb-4': msg.has_reaction,
                },
                `relative ${messageClass}`,
              )}
              key={msg.id}
            >
              <SingleMessage
                message={msg}
                doAnimation={doSmoothScroll}
                isLast={messages[messages.length - 1].id === msg.id}
              />
              {msg.has_reaction && (
                <span
                  className={classNames(
                    { 'bg-blue-300 border-blue-400 text-white right-0': msg.from_me },
                    { 'bg-gray-300 border-gray-400 text-white left-0': !msg.from_me },
                    'absolute bottom-0 p-1 text-lg border-circle rounded-full border-1 ',
                  )}
                  style={{
                    transform: msg.from_me ? 'translate(25%, 25%)' : 'translate(-25%, 50%)',
                  }}
                >
                  {msg.reaction}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default memo(Messages);

