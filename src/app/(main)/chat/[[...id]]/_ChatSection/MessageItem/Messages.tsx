'use client';
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { MenuItem } from 'primereact/menuitem';
import { classNames } from 'primereact/utils';
import { v4 as uuidV4 } from 'uuid';

import { ModeQuoted, SupportChatMessageResponse } from '@/Interfaces';
import ModalEditarMensagem from '../_components/ModalEditarMensagem';
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
   * confirmação - é o que impede um vídeo grande de pular para o fim da
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
            // Sem autor não se monta o prefixo: `*:*` renderizaria como um
            // ":" solto acima do texto, que foi o que apareceu na bolha.
            content: i.conteudo ? (i.autor ? `*${i.autor}:*\n${i.conteudo}` : i.conteudo) : '',
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
   * Antes cada bolha assinava a lista inteira e fazia um `find` linear nela -
   * com 200 mensagens, eram 200 varreduras de 200 itens a cada evento.
   */
  const indicePorId = useMemo(
    () => new Map(mensagensNaTela.map((m) => [m.message_id, m])),
    [mensagensNaTela],
  );

  /**
   * Se o usuário estava no fim da conversa imediatamente antes da última
   * atualização da lista.
   *
   * Guarda a *resposta*, não a altura: comparar alturas exigiria capturá-las
   * antes de cada render, e a distância até o fim (`scrollHeight - scrollTop -
   * clientHeight`) já responde a pergunta sozinha, sem precisar do valor
   * anterior. O evento de scroll a mantém atualizada.
   */
  const estavaNoFim = useRef(true);

  /**
   * Marca se a primeira rolagem ao fim já aconteceu nesta conversa.
   *
   * Era estado da store, o que fazia cada carga de mensagem propagar um
   * re-render para todos os componentes que a assinam - e, por descer como
   * prop até cada bolha, invalidava qualquer memoização. Como só este
   * componente precisa do valor, um ref basta e não dispara renderização.
   */
  const jaRolouAoFim = useRef(false);

  const [mensagemEditando, setMensagemEditando] = useState<SupportChatMessageResponse | null>(null);

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
        onDownload({
          source: message.media_url,
          mime_type: message.media_type,
          file_name: message.file_name,
        });
      },
    },
    {
      id: 'edit',
      label: 'Editar',
      icon: 'fa-regular fa-pen-to-square',
      command: ({ item: { data } }) => {
        setMensagemEditando(data as SupportChatMessageResponse);
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
        // vai a mensagem em si - não um array com ela dentro.
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

  /**
   * Baixa o arquivo em vez de navegar até ele.
   *
   * O atributo `download` de um link só vale na mesma origem: apontando para o
   * storage, o navegador o ignora e abre a mídia na aba. Buscar os bytes e
   * gerar um `blob:` local devolve a origem para nós, e aí o atributo passa a
   * valer - inclusive o nome do arquivo.
   */
  const onDownload = async ({ source, mime_type, file_name }) => {
    try {
      const resposta = await fetch(source);
      if (!resposta.ok) throw new Error(`Falha ao baixar (HTTP ${resposta.status})`);

      const blob = await resposta.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = file_name || `${uuidV4()}.${mime_type?.split('/')[1] || 'bin'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Sem revogar, o blob fica retido na memória da aba até recarregar.
      URL.revokeObjectURL(url);
    } catch (error) {
      CatchAlerta(error, 'Não foi possível baixar o arquivo');
    }
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

    // Primeira carga da conversa: salto seco, sem animação - animar aqui faria
    // o histórico inteiro desfilar na frente do atendente.
    if (!jaRolouAoFim.current && !loadMessages) {
      el.scrollTop = el.scrollHeight;
      jaRolouAoFim.current = true;
      return;
    }

    // Nas demais, acompanha só quem já estava no fim: arrastar de volta quem
    // está lendo o histórico é pior do que não rolar.
    //
    // A leitura da ref vem primeiro de propósito: quando este efeito roda, a
    // lista já cresceu e medir agora acusaria "longe do fim" mesmo para quem
    // estava lá. A ref guarda o estado de antes, mantido pelo evento de
    // scroll; o `|| ` cobre a conversa que ainda não gerou scroll nenhum.
    const podeAcompanhar = estavaNoFim.current || el.scrollHeight <= el.clientHeight;

    if (podeAcompanhar) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  };

  // Nova conversa recomeça o ciclo: a primeira rolagem dela também é seca, e
  // ela nasce "no fim" - é onde a carga inicial vai posicionar a tela.
  useLayoutEffect(() => {
    jaRolouAoFim.current = false;
    estavaNoFim.current = true;
  }, [activeChat?.id]);

  useLayoutEffect(() => {
    SetScrollBottom();
    // Inclui a fila: a mensagem recém-enviada aparece antes da confirmação e
    // precisa trazer a conversa para o fim do mesmo jeito.
  }, [mensagensNaTela]);

  useEffect(() => {
    const el = bottomEl.current;

    const handleScroll = debounce(() => {
      const distanciaDoFim = el.scrollHeight - (el.scrollTop + el.clientHeight);

      // Margem de 80px: com o teclado virtual ou meia linha visível, o usuário
      // se considera "no fim" sem estar exatamente em scrollTop máximo.
      estavaNoFim.current = distanciaDoFim < 80;

      const isFarFromBottom = distanciaDoFim > 250;

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
        className="message-box relative border-right-1 border-left-1 border-noround-top border-bottom-1 border-primary-300 flex flex-1 flex-column bg-gray-50 border-round p-3 overflow-y-auto overflow-x-hidden"
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

      <ModalEditarMensagem
        visible={Boolean(mensagemEditando)}
        onHide={() => setMensagemEditando(null)}
        mensagem={mensagemEditando}
        supportChatId={String(activeChat?.id)}
      />
    </>
  );
};

export default memo(Messages);
