'use client';
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Button } from 'primereact/button';
import { MenuItem } from 'primereact/menuitem';
import { classNames } from 'primereact/utils';
import { v4 as uuidV4 } from 'uuid';

import { ModeQuoted, SupportChatMessageResponse } from '@/Interfaces';
import { CatchAlerta, ConfirmaAcao, debounce } from '@/service/Util';
import { useChatStore } from '@/store/useChatStore';
import { useOutboxStore } from '@/store/useOutboxStore';
import { cancelarItem, podeReenviar, reenviar } from '@/service/Outbox';
import useApi from '@/service/Api/ApiClient';
import {
  MenuMessageComponent,
  ReactionPickerComponent,
  ShowAvatarComponent,
  ShowReactionMessageComponent,
  ShowReactionPickerComponent,
  SingleMessageComponent,
} from '../_components';

const Messages = () => {
  // Seletores por fatia: sem eles, qualquer mudança na store re-renderiza este
  // componente e, com ele, todas as bolhas da conversa.
  const messages = useChatStore((s) => s.messages);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const activeChat = useChatStore((s) => s.activeChat);
  const reactionState = useChatStore((s) => s.reactionState);
  const setQuotedMessage = useChatStore((s) => s.setQuotedMessage);
  const itensFila = useOutboxStore((s) => s.itens);
  const { FetchReq } = useApi();
  const bottomEl = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(0);
  const divRef = useRef<HTMLDivElement>(null);

  /**
   * Junta as mensagens confirmadas com as que ainda estão na fila de envio.
   *
   * Os itens da fila viram mensagens do mesmo formato, para reaproveitar toda a
   * renderização. A ordenação usa o instante do envio (`datetime`), e não o da
   * confirmação — é o que impede um vídeo grande de pular para o fim da
   * conversa quando o webhook dele finalmente chega.
   */
  const mensagensNaTela = useMemo(() => {
    const pendentes: SupportChatMessageResponse[] = itensFila
      .filter((i) => String(i.supportChatId) === String(activeChat?.id))
      .map(
        (i) =>
          ({
            id: i.id,
            message_id: i.id,
            support_chat_id: i.supportChatId,
            datetime: i.enviadoEm,
            created_at: i.enviadoEm,
            ack: 0,
            from_me: true,
            type:
              i.tipo === 'voz' ? 'ptt' : i.tipo === 'texto' ? 'chat' : (i.mediaType ?? 'document'),
            content: i.conteudo ? `*${i.autor}:*\n${i.conteudo}` : '',
            has_media: i.tipo !== 'texto',
            media_url: i.previewUrl ?? '',
            // O player precisa do mimetype (`video/mp4`), não do tipo do menu.
            media_type: i.mimetype ?? i.mediaType ?? '',
            file_name: i.fileName,
            // O upload corre em paralelo, antes da vez na corrente: prender o
            // indicador ao status 'enviando' o faria surgir só no fim.
            progresso: i.status === 'falhou' ? undefined : i.progresso,
            has_quoted: Boolean(i.quotedMessageId),
            quoted_msg_id: i.quotedMessageId,
            is_deleted: false,
            is_edited: false,
            pending: true,
            falhou: i.status === 'falhou',
            erro: i.erro,
          }) as SupportChatMessageResponse & { falhou?: boolean; erro?: string },
      );

    return [...(messages ?? []), ...pendentes].sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
    );
  }, [messages, itensFila, activeChat?.id]);

  /**
   * Índice por `message_id` para resolver mensagens citadas.
   *
   * Antes cada bolha assinava a lista inteira e fazia um `find` linear nela —
   * com 200 mensagens, eram 200 varreduras de 200 itens a cada evento.
   */
  const indicePorId = useMemo(
    () => new Map(mensagensNaTela.map((m) => [m.message_id, m])),
    [mensagensNaTela],
  );

  const scrollHeightBeforeUpdate = useRef(0);

  /**
   * Marca se a primeira rolagem ao fim já aconteceu nesta conversa.
   *
   * Era estado da store, o que fazia cada carga de mensagem propagar um
   * re-render para todos os componentes que a assinam — e, por descer como
   * prop até cada bolha, invalidava qualquer memoização. Como só este
   * componente precisa do valor, um ref basta e não dispara renderização.
   */
  const jaRolouAoFim = useRef(false);

  const menuModel: MenuItem[] = [
    {
      id: 'reply',
      label: 'Responder',
      icon: 'fa-regular fa-arrow-turn-left',
      command: ({ item: { data } }) => {
        const message = data as SupportChatMessageResponse;
        setQuotedMessage(ModeQuoted.REPLY, message);
        SetScrollBottom();
        console.log(message);
      },
    },
    {
      id: 'download',
      label: 'Baixar Mídia',
      icon: 'fa-regular fa-arrow-down-to-line',
      visible: true,
      command: ({ item: { data } }) => {
        const message = data as SupportChatMessageResponse;
        const mediaDownload = {
          source: message.media_url,
          mime_type: message.media_type,
        };

        onDownload(mediaDownload);
      },
    },
    {
      id: 'edit',
      label: 'Editar',
      icon: 'fa-regular fa-pen-to-square',
      command: ({ item: { data } }) => {
        const message = data as SupportChatMessageResponse;
        setQuotedMessage(ModeQuoted.EDIT, message);
        SetScrollBottom();
        console.log(message);
      },
    },
    {
      id: 'delete',
      label: 'Apagar',
      icon: 'fa-regular fa-trash-can',
      command: ({ item: { data } }) => {
        const message = data as SupportChatMessageResponse;

        // Revogar é irreversível, daí a confirmação.
        // O `ConfirmaAcao` repassa o terceiro argumento tal como recebe, então
        // vai a mensagem em si — não um array com ela dentro.
        ConfirmaAcao(
          'A mensagem será apagada para todos na conversa.',
          onApagarMensagem,
          message,
          'Apagar mensagem?',
          'Apagar',
          'Cancelar',
        );
      },
    },
  ];

  const onApagarMensagem = async (message: SupportChatMessageResponse) => {
    try {
      await FetchReq({
        endpoint: 'DeleteMessage',
        body: { message_id: message.message_id },
        variables: [String(activeChat?.id)],
      });
      // A marcação visual chega pelo webhook `messages.delete`, que confirma
      // que o WhatsApp aceitou a revogação.
    } catch (error) {
      CatchAlerta(error, 'Não foi possível apagar a mensagem');
    }
  };

  const onDownload = async ({ source, mime_type }) => {
    const link = document.createElement('a');
    link.href = source;
    link.download = `${uuidV4()}.` + (mime_type?.split('/')[1] || 'mp4');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const SetScrollBottom = () => {
    const el = bottomEl.current;
    if (!el) return;

    // 1. Verifica se o usuário estava no final ANTES da nova mensagem chegar
    const isAtBottomBefore =
      scrollHeightBeforeUpdate.current - (el.scrollTop + el.clientHeight) < 80;

    // 2. Primeira carga da conversa: vai direto ao fim, sem animação.
    if (!jaRolouAoFim.current && !loadMessages) {
      el.scrollTop = el.scrollHeight;
      jaRolouAoFim.current = true;
      return;
    }

    // 3. Se o usuário estava no final, rola para o novo final. Senão, não faz nada.
    if (isAtBottomBefore) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // Nova conversa recomeça o ciclo: a primeira rolagem dela também é seca.
  useLayoutEffect(() => {
    jaRolouAoFim.current = false;
  }, [activeChat?.id]);

  useLayoutEffect(() => {
    SetScrollBottom();
    // Inclui a fila: a mensagem recém-enviada aparece antes da confirmação e
    // precisa trazer a conversa para o fim do mesmo jeito.
  }, [mensagensNaTela]);

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
          {mensagensNaTela?.map((msg) => {
            const messageClass = msg.from_me ? 'align-items-end' : 'align-items-start';

            const naFila = itensFila.find((i) => i.id === msg.id);

            return (
              <div
                className={`w-full relative message-content flex-column flex ${messageClass}`}
                key={msg.id}
                id={msg.message_id}
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
                      quotedMessage={
                        msg.has_quoted ? indicePorId.get(msg.quoted_msg_id) : undefined
                      }
                      message={msg}
                      doAnimation={jaRolouAoFim.current}
                      isLast={messages[messages.length - 1].id === msg.id}
                      activeChat={activeChat}
                    />
                    <ShowReactionMessageComponent message={msg} />
                  </div>
                  <ShowReactionPickerComponent
                    message={msg}
                    bottomEl={bottomEl?.current}
                  />
                </div>
                {naFila && (
                  <div className="flex align-items-center gap-2 mt-1 mb-1 text-xs text-600">
                    {naFila.status === 'falhou' ? (
                      <>
                        <i className="fa-regular fa-circle-exclamation text-red-500" />
                        <span className="text-red-500">{naFila.erro ?? 'Falha ao enviar'}</span>
                        {podeReenviar(naFila) && (
                          <button
                            type="button"
                            onClick={() => reenviar(naFila.id, FetchReq)}
                            className="cursor-pointer border-none bg-transparent text-primary underline p-0"
                          >
                            Tentar novamente
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => cancelarItem(naFila.id)}
                          className="cursor-pointer border-none bg-transparent text-600 underline p-0"
                        >
                          Descartar
                        </button>
                      </>
                    ) : (
                      <>
                        <i className="pi pi-spin pi-spinner" />
                        <span>
                          {naFila.tipo === 'texto' || naFila.progresso === undefined
                            ? 'Enviando...'
                            : naFila.progresso < 100
                              ? `Enviando... ${naFila.progresso}%`
                              : 'Finalizando...'}
                        </span>
                        {/* Cancelar só enquanto o arquivo sobe: depois de aceito
                            pelo provider, a mensagem já saiu e não volta. */}
                        <button
                          type="button"
                          onClick={() => cancelarItem(naFila.id)}
                          className="cursor-pointer border-none bg-transparent text-primary underline p-0"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
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
