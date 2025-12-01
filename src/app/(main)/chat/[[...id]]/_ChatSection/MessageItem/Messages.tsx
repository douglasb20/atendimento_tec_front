'use client';
import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { Image } from 'primereact/image';
import { Menu } from 'primereact/menu';
import { MenuItem } from 'primereact/menuitem';
import { classNames } from 'primereact/utils';
import { addHours, addMinutes, isAfter, parseISO } from 'date-fns';

import { SupportChatMessageResponse } from '@/Interfaces';
import { debounce } from '@/service/Util';
import { useChatStore } from '@/store/useChatStore';
import { ShowReactionComponent, SingleMessage } from '../_components';

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

const Messages = () => {
  const { messages, doSmoothScroll, setSmoothScroll, loadMessages, activeChat } = useChatStore();
  const bottomEl = useRef(null);
  const scrollRef = useRef(0);
  const divRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<{ [key: string]: Menu | null }>({});

  const scrollHeightBeforeUpdate = useRef(0);

  const menuModel: MenuItem[] = [
    {
      id: 'reply',
      label: 'Responder',
      icon: 'fa-regular fa-arrow-turn-left',
    },
    {
      id: 'forward',
      label: 'Encaminhar',
      icon: 'fa-regular fa-download',
      visible: false,
    },
    {
      id: 'download',
      label: 'Baixar Mídia',
      icon: 'fa-regular fa-arrow-down-to-line',
      visible: true,
    },
    {
      id: 'edit',
      label: 'Editar',
      icon: 'fa-regular fa-pen-to-square',
    },
    {
      id: 'delete',
      label: 'Apagar',
      icon: 'fa-regular fa-trash-can',
    },
    {
      id: 'option2',
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
        <div className="flex flex-column z-0 w-full">
          {messages?.map((msg) => {
            const messageClass = msg.from_me ? 'align-items-end' : 'align-items-start';
            let avatarUrl = '/images/avatar/avatar-noprofile.png';
            const newModel = menuModel.map((item, key) => {
              const newItem: MenuItem = { ...item };
              newItem.data = msg;

              switch (newItem.id) {
                case 'edit':
                  newItem.visible =
                    !isAfter15min(msg.datetime) && msg.from_me && msg.device_type === 'web';
                  break;
                case 'delete':
                  newItem.visible =
                    !isAfter60Hour(msg.datetime) && msg.from_me && msg.device_type === 'web';
                  break;
                case 'download':
                  newItem.visible = msg.has_media;
                  break;
                case 'option2':
                  newItem.template = (item, options) => {
                    return <>Teste </>;
                  };
                  break;
              }

              return newItem;
            });
            if (msg.from_me && activeChat?.user?.avatar_url) {
              avatarUrl = activeChat.user.avatar_url;
            } else if (!msg.from_me && activeChat?.contact?.avatar_url) {
              avatarUrl = activeChat.contact.avatar_url;
            }
            return (
              <div
                className={`w-full message-content flex-column flex ${messageClass}`}
                key={msg.id}
              >
                <div
                  className={classNames(
                    {
                      'mb-4': msg.has_reaction,
                    },
                    `relative flex message-item ${msg.from_me ? 'flex-row-reverse' : 'flex-row'} mb-1`,
                  )}
                  style={{ maxWidth: '70%', minWidth: '10%' }}
                >
                  <div className="mx-2 overflow-hidden flex flex-none justify-content-center align-items-center">
                    <Image
                      src={avatarUrl}
                      alt="Avatar"
                      imageClassName="w-4rem h-4rem border-circle"
                      imageStyle={{ objectFit: 'cover' }}
                    />
                  </div>

                  <div className="relative message-balloon">
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
                  <ShowReactionComponent
                    position={msg.from_me ? 'right' : 'left'}
                    message={msg}
                    activeChat={activeChat || null}
                  />
                </div>
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
            severity="success"
            aria-label="Scroll to bottom"
          />
        </div>
      </div>
    </>
  );
};

export default memo(Messages);
