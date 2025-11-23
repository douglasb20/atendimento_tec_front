'use client';
import { Image } from 'primereact/image';
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Button } from 'primereact/button';
import { classNames } from 'primereact/utils';
import { Menu } from 'primereact/menu';
import { addHours, addMinutes, isAfter, isEqual, parseISO, startOfDay } from 'date-fns';
import { MenuItem } from 'primereact/menuitem';

import Interweave from '@/components/Interweave';
import { SupportChatMessageResponse } from '@/Interfaces';
import { DateToBR, fixHeartEmoji } from '@/service/Util';
import { useChatStore } from '@/store/useChatStore';

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
      // style={{ overflowWrap: 'anywhere' }}
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
      <div className="flex flex-column text-base ">
        {message.has_media && message.type === 'image' && (
          <>
            <Image
              src={message.media_url}
              alt="Media"
              className="mb-2 border-round shadow-2"
              imageStyle={{ maxWidth: '500px', height: '500px', objectFit: 'cover' }}
              preview
              downloadable
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
              controls={!message.is_gif}
              className="mb-2 inline-block"
              autoPlay={message.is_gif}
              loop={message.is_gif}
              muted={message.is_gif}
              style={{
                maxWidth: '40rem',
                height: !message.is_gif ? '50rem' : 'auto',
                objectFit: 'contain',
              }}
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
      <div className="w-full text-right flex align-items-end justify-content-end gap-1 ">
        <span className="text-xs">{ArrumaData(message.datetime)}</span>
        {message.from_me && (
          <span>
            <i className={`fa ${ProccessAck(message.ack)} text-xs`}></i>
          </span>
        )}
      </div>
    </div>
  );
}

const ArrumaData = (data: string) => {
  const hoje = startOfDay(new Date());
  const dataMsg = startOfDay(parseISO(data));

  if (isEqual(hoje, dataMsg)) {
    return DateToBR(data, 'HH:mm');
  } else {
    return DateToBR(data, 'dd/MM/yyyy HH:mm');
  }
};

const ProccessAck = (ack: number) => {
  switch (ack) {
    case 0:
      return 'fa-clock';
    case 1:
      return 'fa-check';
    case 2:
      return 'fa-check-double';
    case 3:
      return 'fa-check-double text-blue-500';
    default:
      return 'fa-clock';
  }
};

const isAfter15min = (input: string) => {
  const date = parseISO(input);

  // Data + 15 minutos
  const limite = addMinutes(date, 15);

  // Agora > data + 15?
  const passou15min = isAfter(new Date(), limite);

  return passou15min;
};

const isAfter60Hour = (input: string) => {
  const date = parseISO(input);

  // Data + 60 horas
  const limite = addHours(date, 60);
  // Agora > data + 15?
  const passou60horas = isAfter(new Date(), limite);

  return passou60horas;
};

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

const Messages = () => {
  const { messages, doSmoothScroll, setSmoothScroll, loadMessages } = useChatStore();
  const bottomEl = useRef(null);
  const scrollRef = useRef(0);
  const divRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<{ [key: string]: Menu | null }>({});

  const scrollHeightBeforeUpdate = useRef(0);

  const menuModel: MenuItem[] = [
    {
      label: 'Responder',
      icon: 'fa-regular fa-arrow-turn-left',
    },
    {
      label: 'Encaminhar',
      icon: 'fa-regular fa-arrow-turn-right',
      visible: false,
    },
    {
      label: 'Editar',
      icon: 'fa-regular fa-pen-to-square',
    },
    {
      label: 'Apagar',
      icon: 'fa-regular fa-trash-can',
    },
    {
      label: 'Opção 2',
      icon: 'fa-regular fa-fw fa-minus',
      command: ({ item: { data } }) => {
        const message = data as SupportChatMessageResponse;
        console.log(message.message_id);
      },
    },
  ];

  const onScrollToBottom = () => {
    const el = bottomEl.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth',
      });
      divRef?.current.classList.add('fadeout', 'animation-duration-150');
      setTimeout(() => {
        divRef?.current.classList.remove('fadeout', 'animation-duration-150');
        divRef?.current.classList.add('hidden');
      }, 150); // tempo em ms = duração da animação
    }
  };

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
    console.log('Capturando scrollHeight antes da atualização');
    if (el) {
      scrollHeightBeforeUpdate.current = el.scrollHeight;
    }
  });

  useEffect(() => {
    const el = bottomEl.current;

    const handleScroll = debounce(() => {
      const isFarFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) > 250;

      if (isFarFromBottom) {
        divRef?.current.classList.remove('hidden', 'fadeout', 'animation-duration-150');
        divRef?.current.classList.add('fadein', 'animation-duration-150');
      } else {
        divRef?.current.classList.add('fadeout', 'animation-duration-150');
        setTimeout(() => {
          divRef?.current.classList.remove('fadeout', 'animation-duration-150');
          divRef?.current.classList.add('hidden');
        }, 150); // tempo em ms = duração da animação
      }

      scrollRef.current = el.scrollTop;
    }, 50); // só executa 150ms depois do último scroll

    el.addEventListener('scroll', handleScroll);

    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      <div
        ref={bottomEl}
        className="message-box relative border-1 border-primary-300 flex flex-1 flex-column bg-gray-50 border-round p-3 overflow-y-auto overflow-x-hidden"
      >
        <div
          id="teste-rol"
          className="flex flex-column z-0"
        >
          {messages?.map((msg) => {
            const messageClass = msg.from_me ? 'align-self-end' : 'align-self-start';
            const newModel = menuModel.map((item, key) => {
              const newItem: MenuItem = { ...item };
              newItem.data = msg;
              if (newItem.label === 'Editar') {
                newItem.visible =
                  !isAfter15min(msg.datetime) && msg.from_me && msg.device_type === 'web';
              }
              if (newItem.label === 'Apagar') {
                newItem.visible =
                  !isAfter60Hour(msg.datetime) && msg.from_me && msg.device_type === 'web';
              }
              if (key === menuModel.length - 1) {
                newItem.template = (item, options) => {
                  return <>Teste</>;
                };
              }

              return newItem;
            });
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
                <div
                  className={`
                    message-chevron 
                    hidden
                    absolute right-0 top-0 z-1 mt-2 mr-2
                    `}
                >
                  <Menu
                    ref={(el) => {
                      menuRef.current[msg.id] = el;
                    }}
                    model={newModel}
                    popupAlignment={msg.from_me ? 'right' : 'left'}
                    onShow={() => {
                      bottomEl?.current?.classList.add('no-scroll');
                    }}
                    onHide={() => {
                      bottomEl?.current?.classList.remove('no-scroll');
                    }}
                    popup
                    style={{ width: '22rem', top: 'auto' }}
                  />
                  <Button
                    className={`bg-gray-300 border-${msg.from_me ? 'gray' : 'primary'}-500 outline-none shadow-none p-0`}
                    style={{ width: '1.5rem', height: '1.5rem' }}
                    text
                    rounded
                    outlined
                    onClick={(event) => menuRef.current[msg.id]?.toggle(event)}
                    icon="fa-regular fa-chevron-down"
                    pt={{
                      label: {
                        className: 'p-0 m-0',
                      },
                      icon: {
                        className: 'p-0 m-0',
                      },
                    }}
                  />
                </div>
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

        <div
          ref={divRef}
          className="hidden"
          style={{
            position: 'sticky',
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Button
            onClick={onScrollToBottom}
            rounded
            icon="fa-solid fa-chevron-down"
            className="shadow-none outline-none"
            severity='success'
            aria-label="Scroll to bottom"
          />
        </div>
      </div>
    </>
  );
};

export default memo(Messages);
