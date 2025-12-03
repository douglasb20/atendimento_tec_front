'use client';
import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { MenuItem } from 'primereact/menuitem';
import { classNames } from 'primereact/utils';

import { SupportChatMessageResponse } from '@/Interfaces';
import { debounce } from '@/service/Util';
import { useChatStore } from '@/store/useChatStore';
import {
  MenuMessageComponent,
  ReactionPickerComponent,
  ShowAvatarComponent,
  ShowReactionMessageComponent,
  ShowReactionPickerComponent,
  SingleMessageComponent,
} from '../_components';

const Messages = () => {
  const { messages, doSmoothScroll, setSmoothScroll, loadMessages, activeChat, reactionState } =
    useChatStore();
  const bottomEl = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(0);
  const divRef = useRef<HTMLDivElement>(null);

  const scrollHeightBeforeUpdate = useRef(0);

  const menuModel: MenuItem[] = [
    {
      id: 'reply',
      label: 'Responder',
      icon: 'fa-regular fa-arrow-turn-left',
      command: ({ item: { data } }) => {
        const message = data as SupportChatMessageResponse;
        console.log(message.message_id);
      },
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
  }, []);

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
                  <ShowAvatarComponent
                    message={msg}
                    activeChat={activeChat}
                  />
                  <div className="relative message-balloon">
                    <MenuMessageComponent
                      menuModel={menuModel}
                      message={msg}
                      bottomEl={bottomEl.current}
                    />
                    <SingleMessageComponent
                      message={msg}
                      doAnimation={doSmoothScroll}
                      isLast={messages[messages.length - 1].id === msg.id}
                    />
                    <ShowReactionMessageComponent message={msg} />
                  </div>
                  <ShowReactionPickerComponent
                    message={msg}
                    bottomEl={bottomEl?.current}
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
      {reactionState.anchorEl && reactionState.message && (
        <ReactionPickerComponent
          activeChat={activeChat}
          bottomEl={bottomEl?.current}
        />
      )}
    </>
  );
};

export default memo(Messages);
