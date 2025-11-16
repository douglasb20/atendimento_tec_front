import { memo, useLayoutEffect, useMemo, useRef } from 'react';

import Interweave from '@/components/Interweave';
import { SupportChatMessageResponse } from '@/Interfaces';
import { fixHeartEmoji } from '@/service/Util';
import { classNames } from 'primereact/utils';
import { useChatStore } from '../../../../../../store/useChatStore';
import { Button } from 'primereact/button';

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

  const InterpretedContent = useMemo(() => fixHeartEmoji(content), [content]);

  const DivWithEmoji = () => (
    <Interweave
      style={{ overflowWrap: 'anywhere' }}
      content={fixHeartEmoji(InterpretedContent)}
    />
  );

  const messageClass = from_me
    ? 'align-self-end border-primary-300 bg-primary-500 text-white'
    : 'align-self-start border-gray-300 bg-gray-200 text-black';

  return (
    <div
      className={classNames(
        `relative animation-duration-200 w-auto border-1 p-2 mb-1 border-round-lg message-item-${from_me ? 'from-me' : 'from-them'} ${messageClass}`,
        {
          fadeinright: doAnimation && isLast && from_me,
          fadeinleft: doAnimation && isLast && !from_me,
        },
      )}
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      <div
        className={`
          message-content 
          hidden
          absolute right-0 top-0 mr-1 mt-1 
          `}
      >
        <Button
          className={`bg-gray-300 border-${from_me ? 'gray' : 'primary'}-500 outline-none shadow-none`}
          style={{ padding: '0.2rem', width: '1.8rem', height: '1.8rem' }}
          text
          rounded
          outlined
          icon="fa-regular fa-chevron-down"
        />
      </div>
      <div className="flex flex-column text-lg ">
        {message.has_media && message.type === 'image' && (
          <>
            <img
              src={message.media_url}
              alt="Media"
              className="mb-2 border-round shadow-2"
              style={{ maxWidth: '500px', height: '500px' }}
            />
            {DivWithEmoji()}
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
                type={message.media_type}
              />
              Seu navegador não suporta o elemento de áudio.
            </audio>
          </>
        )}
        {message.has_media && message.type === 'video' && (
          <>
            <video
              controls
              className="mb-2 inline-block"
              style={{ maxWidth: '40rem', height: '50rem', objectFit: 'contain' }}
            >
              <source
                src={message.media_url}
                type={message.media_type}
              />
              Seu navegador não suporta o elemento de vídeo.
            </video>
            {DivWithEmoji()}
          </>
        )}
        {!message.has_media && DivWithEmoji()}
      </div>
    </div>
  );
}

const Messages = () => {
  const { messages, doSmoothScroll, setSmoothScroll, loadMessages } = useChatStore();
  const bottomEl = useRef(null);

  const scrollHeightBeforeUpdate = useRef(0);

  useLayoutEffect(() => {
    const el = bottomEl.current;
    if (!el) return;

    // 1. Verifica se o usuário estava no final ANTES da nova mensagem chegar
    const isAtBottomBefore =
      scrollHeightBeforeUpdate.current - (el.scrollTop + el.clientHeight) < 80;

    // 2. Se o scroll não deve ser suave (primeiro carregamento), vai para o final instantaneamente
    if (!doSmoothScroll && !loadMessages) {
      el.scrollTop = el.scrollHeight;
      setSmoothScroll(true);
      return;
    }

    // 3. Se o usuário estava no final, rola para o novo final. Senão, não faz nada.
    if (isAtBottomBefore) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]); // O efeito ainda depende das mensagens

  // Este segundo useLayoutEffect captura o scrollHeight ANTES da próxima renderização
  useLayoutEffect(() => {
    const el = bottomEl.current;
    if (el) {
      scrollHeightBeforeUpdate.current = el.scrollHeight;
    }
  });

  return (
    <>
      <div
        ref={bottomEl}
        className="message-box border-1 border-primary-300 flex flex-1 flex-column bg-gray-50 border-round p-3 overflow-y-auto overflow-x-hidden "
      >
        {messages?.map((msg) => {
          const messageClass = msg.from_me ? 'align-self-end' : 'align-self-start';
          return (
            <div
              className={classNames(
                {
                  'mb-4': msg.has_reaction,
                },
                `relative message-item ${messageClass} mb-1 `,
              )}
              style={{ maxWidth: '70%', minWidth: '10%' }}
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
                    { 'bg-primary-300 border-primary-400 right-0': msg.from_me },
                    { 'bg-gray-300 border-gray-400 left-0': !msg.from_me },
                    'absolute bottom-0 text-lg border-circle rounded-full border-1 ',
                  )}
                  style={{
                    transform: msg.from_me ? 'translate(25%, 25%)' : 'translate(-25%, 60%)',
                    padding: '0.07rem',
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
