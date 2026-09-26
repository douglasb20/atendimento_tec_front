'use client';
import { Fragment, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { MenuItem } from 'primereact/menuitem';
import { Checkbox } from 'primereact/checkbox';
import { classNames } from 'primereact/utils';
import { v4 as uuidV4 } from 'uuid';

import { ModeQuoted, podeAgirNoAtendimento, SupportChatMessageResponse } from '@/Interfaces';
import { useUsuarioLogado } from '@/hooks/useUsuarioLogado';
import ModalEditarMensagem from '../_components/ModalEditarMensagem';
import { BotaoAnterior, Separador } from '../_components/HistoricoAnterior';
import EventoAtendimento from '../_components/EventoAtendimento';
import { CatchAlerta, ConfirmaAcao, debounce } from '@/service/Util';
import { useChatStore } from '@/store/useChatStore';
import { useOutboxStore } from '@/store/useOutboxStore';
import { useSelecaoMensagens } from '@/store/useSelecaoMensagens';
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
  const { usuarioId } = useUsuarioLogado();
  const reactionState = useChatStore((s) => s.reactionState);
  const setQuotedMessage = useChatStore((s) => s.setQuotedMessage);
  const itensFila = useOutboxStore((s) => s.itens);
  const modoSelecao = useSelecaoMensagens((s) => s.ativo);
  const selecionadas = useSelecaoMensagens((s) => s.selecionadas);
  const entrarModoSelecao = useSelecaoMensagens((s) => s.entrarModoSelecao);
  const alternarSelecao = useSelecaoMensagens((s) => s.alternar);
  const anteriores = useChatStore((s) => s.anteriores);
  const totalAnteriores = useChatStore((s) => s.totalAnteriores);
  const carregandoAnterior = useChatStore((s) => s.carregandoAnterior);
  const setTotalAnteriores = useChatStore((s) => s.setTotalAnteriores);
  const setCarregandoAnterior = useChatStore((s) => s.setCarregandoAnterior);
  const adicionaAnterior = useChatStore((s) => s.adicionaAnterior);
  const { FetchReq } = useApi();
  const bottomEl = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(0);
  const divRef = useRef<HTMLDivElement>(null);

  /**
   * Descobre se o contato tem atendimentos anteriores.
   *
   * Chamada leve: não traz mensagem nenhuma, só o total - é o que decide se o
   * botão aparece, sem fazer toda abertura de conversa pagar o custo do
   * histórico inteiro.
   */
  useEffect(() => {
    if (!activeChat?.id) return;

    const contar = async () => {
      try {
        const r = await FetchReq<{ total: number }>('ContarAtendimentosAnteriores', [
          activeChat.id,
        ]);
        setTotalAnteriores(r?.total ?? 0);
      } catch {
        // Sem histórico visível é o estado seguro: um erro aqui não deve
        // impedir o atendente de usar a conversa atual.
        setTotalAnteriores(0);
      }
    };

    contar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?.id]);

  /**
   * Traz o atendimento anterior e devolve o atendente ao ponto onde estava.
   *
   * Inserir conteúdo acima empurra o que está visível para baixo: sem medir a
   * altura antes e restaurar depois, quem estava lendo perde o lugar - é o
   * defeito clássico deste padrão.
   */
  const carregarAnterior = async () => {
    if (!activeChat?.id || carregandoAnterior) return;

    const el = bottomEl.current;
    const alturaAntes = el?.scrollHeight ?? 0;
    const posicaoAntes = el?.scrollTop ?? 0;

    // O mais antigo já carregado é o ponto de partida; sem nenhum, a própria
    // conversa atual.
    const antesDe = anteriores.length ? anteriores[0].id : Number(activeChat.id);

    try {
      setCarregandoAnterior(true);

      const anterior = await FetchReq<{
        id: number;
        protocol: string;
        finished_at?: string | null;
        updated_at?: string | null;
        supportChatMessages?: SupportChatMessageResponse[];
      }>('BuscarAtendimentoAnterior', [activeChat.id, antesDe]);

      if (!anterior?.id) {
        setTotalAnteriores(0);
        return;
      }

      adicionaAnterior({
        id: anterior.id,
        protocol: anterior.protocol,
        encerrado_em: anterior.finished_at ?? anterior.updated_at ?? null,
        mensagens: anterior.supportChatMessages ?? [],
      });

      // Depois da pintura: o conteúdo novo precisa estar no DOM para a altura
      // nova existir.
      requestAnimationFrame(() => {
        if (!el) return;
        el.scrollTop = posicaoAntes + (el.scrollHeight - alturaAntes);
      });
    } catch (err) {
      CatchAlerta(err, 'Não foi possível carregar o atendimento anterior');
    } finally {
      setCarregandoAnterior(false);
    }
  };

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
   * Transferências desta conversa, em ordem.
   *
   * Chegam junto das mensagens na rota que abre o chat; os payloads de socket
   * não os trazem, então uma transferência feita por outro atendente com a
   * conversa já aberta só aparece ao recarregá-la.
   */
  const souODono = podeAgirNoAtendimento(activeChat, usuarioId);

  const eventos = useMemo(
    () =>
      [...(activeChat?.supportChatEvents ?? [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    [activeChat?.supportChatEvents],
  );

  /** Os que vieram depois da última mensagem - renderizados ao final da lista. */
  const eventosDepoisDaUltima = useMemo(() => {
    const ultima = mensagensNaTela[mensagensNaTela.length - 1];
    if (!ultima) return eventos;

    const limite = new Date(ultima.datetime).getTime();
    return eventos.filter((evento) => new Date(evento.created_at).getTime() > limite);
  }, [eventos, mensagensNaTela]);

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
   *
   * Serve **só** ao scroll. A animação das bolhas não pode depender dela: é
   * escrita num `useLayoutEffect`, depois do render, então a primeira mensagem
   * enviada era renderizada com o valor ainda `false` e entrava sem animação -
   * só a versão definitiva, vinda do webhook, aparecia animada.
   */
  const jaRolouAoFim = useRef(false);

  /**
   * Ids das mensagens que já estavam na tela quando a conversa abriu.
   *
   * O histórico não deve animar - desfilaria inteiro na frente do atendente. O
   * que chega depois, sim. Comparar contra este conjunto responde isso sem
   * depender de quando o efeito de scroll rodou, e vale igual para a bolha
   * otimista e para a definitiva.
   */
  const idsIniciais = useRef<Set<string> | null>(null);

  if (idsIniciais.current === null && (messages?.length || !loadMessages)) {
    idsIniciais.current = new Set((messages ?? []).map((m) => String(m.id)));
  }

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
      id: 'select',
      label: 'Selecionar',
      icon: 'fa-regular fa-circle-check',
      command: ({ item: { data } }) => {
        entrarModoSelecao((data as SupportChatMessageResponse).message_id);
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
    // Declarada fora do try para o `finally` alcançá-la: com a revogação no
    // fim do bloco, uma falha entre a criação e ela deixava o blob retido na
    // memória da aba - num vídeo grande, centenas de MB até o reload.
    let url: string | null = null;

    try {
      const resposta = await fetch(source);
      if (!resposta.ok) throw new Error(`Falha ao baixar (HTTP ${resposta.status})`);

      const blob = await resposta.blob();
      url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = file_name || `${uuidV4()}.${mime_type?.split('/')[1] || 'bin'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      CatchAlerta(error, 'Não foi possível baixar o arquivo');
    } finally {
      if (url) URL.revokeObjectURL(url);
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
    // `null` e não `new Set()`: o bloco acima o preenche no próximo render, já
    // com as mensagens da conversa nova carregadas.
    idsIniciais.current = null;
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
    }, 50); // só executa 50ms depois do último scroll

    el.addEventListener('scroll', handleScroll);

    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      <div
        ref={bottomEl}
        className="message-box relative border-right-1 border-left-1 border-noround-top border-bottom-1 border-primary-700 flex flex-1 flex-column bg-gray-50 border-round p-3 overflow-y-auto overflow-x-hidden"
      >
        <div className="flex flex-column z-0 w-full">
          <BotaoAnterior
            total={totalAnteriores}
            carregando={carregandoAnterior}
            onCarregar={carregarAnterior}
          />

          {/* Os atendimentos anteriores, do mais antigo para o mais novo, acima
              das mensagens deste protocolo. Cada um com seu separador: sem ele
              uma frase de meses atrás parece resposta à de hoje. */}
          {anteriores.map((protocolo) => (
            <div key={protocolo.id}>
              <Separador
                protocol={protocolo.protocol}
                encerradoEm={protocolo.encerrado_em}
              />
              {protocolo.mensagens.map((msg) => (
                // A mesma estrutura das mensagens deste protocolo - avatar,
                // largura e alinhamento. Um bloco próprio, mais simples,
                // deixava os balões antigos sem foto e com largura diferente,
                // como se fossem outra coisa.
                <div
                  key={msg.message_id}
                  className={`w-full relative message-content flex-column flex ${
                    msg.from_me ? 'align-items-end' : 'align-items-start'
                  }`}
                >
                  <div
                    className={classNames(
                      'relative flex message-item mb-1',
                      msg.from_me ? 'flex-row-reverse' : 'flex-row',
                    )}
                    style={{ maxWidth: '70%', minWidth: '10%' }}
                  >
                    <ShowAvatarComponent
                      message={msg}
                      activeChat={activeChat}
                    />
                    {/* Sem `MenuMessageComponent`: responder ou editar mensagem
                        de atendimento encerrado falharia no backend. */}
                    <div className="relative message-balloon">
                      <SingleMessageComponent
                        message={msg}
                        activeChat={activeChat}
                        isLast={false}
                        doAnimation={false}
                      />
                      <ShowReactionMessageComponent message={msg} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {anteriores.length > 0 && activeChat?.protocol && (
            <Separador
              protocol={activeChat.protocol}
              encerradoEm={null}
            />
          )}

          {mensagensNaTela?.map((msg, indice) => {
            const messageClass = msg.from_me ? 'align-items-end' : 'align-items-start';

            // Os eventos que aconteceram antes desta mensagem e ainda não foram
            // desenhados. Ficam fora de `mensagensNaTela` de propósito: entrar
            // ali obrigaria `indicePorId`, `isLast` e a seleção a distinguir
            // evento de mensagem em todo lugar.
            const eventosAntes = eventos.filter((evento) => {
              const quando = new Date(evento.created_at).getTime();
              const anterior =
                indice > 0 ? new Date(mensagensNaTela[indice - 1].datetime).getTime() : 0;
              return quando > anterior && quando <= new Date(msg.datetime).getTime();
            });

            const naFila = itensFila.find((i) => i.id === msg.id);

            // Qualquer mensagem visível pode ser selecionada: as que não cabem
            // na revogação do WhatsApp são ocultadas só do nosso lado. Pendente
            // ainda não existe no provider, e revogada/oculta já não tem o que
            // apagar.
            const selecionavel = !msg.pending && !msg.is_deleted && !msg.hidden_at;
            const marcada = selecionadas.includes(msg.message_id);

            const conteudoMensagem = (
              <div
                className={`w-full relative message-content flex-column flex ${messageClass}`}
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
                  <div className="relative message-balloon w-fit">
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
                      // Anima o que chegou depois de a conversa abrir. Antes
                      // vinha de `jaRolouAoFim`, que só era escrita após o
                      // render - e a primeira mensagem enviada não animava.
                      doAnimation={!idsIniciais.current?.has(String(msg.id))}
                      // Compara contra a lista que está sendo renderizada: a fila
                      // entra em `mensagensNaTela` e não em `messages`, e numa
                      // conversa nova esta última está vazia - `messages[-1].id`
                      // estourava ao enviar a primeira mensagem.
                      isLast={mensagensNaTela[mensagensNaTela.length - 1]?.id === msg.id}
                      activeChat={activeChat}
                    />
                    <ShowReactionMessageComponent message={msg} />
                    {/* Dentro da bolha (`w-fit`), não do wrapper flex maior
                        (até 70% da largura do painel) - senão o botão
                        ancorava longe de mensagens curtas, na borda do
                        container em vez da borda real do balão. */}
                    <ShowReactionPickerComponent
                      message={msg}
                      bottomEl={bottomEl?.current}
                    />
                  </div>
                </div>
                {naFila && (
                  <div className="flex align-items-center gap-2 mt-1 mb-1 text-xs text-600">
                    {naFila.status === 'falhou' ? (
                      <>
                        <i className="fa-regular fa-circle-exclamation text-red-500" />
                        <span className="text-red-500">{naFila.erro ?? 'Falha ao enviar'}</span>
                        {/* Reenviar escreveria na conversa, e o backend recusa
                            com 403 se ela mudou de dono. Descartar continua
                            disponível: a fila é deste navegador, e limpar o
                            próprio rascunho não toca no atendimento. */}
                        {podeReenviar(naFila) && souODono && (
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

            // O wrapper existe sempre, e só a coluna da checkbox é condicional:
            // trocando a profundidade da árvore ao entrar e sair do modo de
            // seleção, o React desmontava tudo e a mídia que estava tocando
            // reiniciava do zero.
            const linha = (
              <div
                key={msg.id}
                className={classNames(
                  'flex align-items-center gap-2 w-full border-round transition-colors transition-duration-150',
                  modoSelecao && selecionavel && 'cursor-pointer hover:surface-hover',
                  modoSelecao && marcada && 'surface-100',
                )}
                // Clicar em qualquer ponto da linha marca, como no WhatsApp.
                onClick={
                  modoSelecao && selecionavel ? () => alternarSelecao(msg.message_id) : undefined
                }
              >
                {modoSelecao && (
                  <div
                    className="flex-shrink-0"
                    style={{ width: '1.5rem' }}
                  >
                    {selecionavel && (
                      // Sem `onChange`: quem alterna é o `onClick` da linha,
                      // que envolve a checkbox. Com os dois, clicar nela
                      // disparava a alternância duas vezes - o `onChange` e o
                      // clique borbulhando até o wrapper - e a marcação
                      // desfazia na hora. A checkbox aqui é o indicador
                      // visual; a área clicável é a linha inteira.
                      <Checkbox
                        checked={marcada}
                        readOnly
                        aria-label={`Selecionar mensagem de ${msg.datetime}`}
                      />
                    )}
                  </div>
                )}

                {conteudoMensagem}
              </div>
            );

            if (!eventosAntes.length) return linha;

            return (
              <Fragment key={msg.id}>
                {eventosAntes.map((evento) => (
                  <EventoAtendimento
                    key={evento.id}
                    evento={evento}
                  />
                ))}
                {linha}
              </Fragment>
            );
          })}

          {/* Os eventos posteriores à última mensagem - o caso comum, já que
              transferir logo depois de responder é o fluxo normal. */}
          {eventosDepoisDaUltima.map((evento) => (
            <EventoAtendimento
              key={evento.id}
              evento={evento}
            />
          ))}
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
