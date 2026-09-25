'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format, isToday, parseISO } from 'date-fns';

import Avatar from '@/components/Avatar';
import Interweave from '@/components/Interweave';
import { SupportChatsResponse, SupportChatsWithMessagesResponse } from '@/Interfaces';
import { useLayoutStore } from '@/layout/context/layoutcontext';
import useApi from '@/service/Api/ApiClient';
import { fixHeartEmoji, nomeCompleto } from '@/service/Util';
import { useChatStore } from '@/store/useChatStore';
import { Breadcrumb } from '@/types';
import { Badge } from 'primereact/badge';
import { Button } from 'primereact/button';
import { classNames } from 'primereact/utils';

import AcoesConversa from './AcoesConversa';
import ModalNovoAtendimento from './ModalNovoAtendimento';
import AbasConversa, { AbaConversa } from '../../_ChatInterno/AbasConversa';
import ListaColegas from '../../_ChatInterno/ListaColegas';
import { podeTocarSom, useAvisarEvento } from '@/hooks/useAvisarEvento';
import { useChatInterno } from '@/hooks/useChatInterno';
import { useUsuarioLogado } from '@/hooks/useUsuarioLogado';
import { usePermissoes } from '@/hooks/usePermissoes';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import { useChatInternoStore } from '@/store/useChatInternoStore';
import FiltroAtendimentos, {
  filtraPorGrupo,
  grupoDaConversa,
  GrupoAtendimento,
} from './FiltroAtendimentos';

/** O texto da notificação: mídia vira rótulo, texto aparece cortado. */
const previaDoWhatsapp = (msg: { type?: string; content?: string }): string => {
  const rotulos: Record<string, string> = {
    image: '📷 Foto',
    video: '🎥 Vídeo',
    document: '📎 Documento',
    audio: '🎵 Áudio',
    ptt: '🎤 Mensagem de voz',
    sticker: '💬 Figurinha',
    location: '📍 Localização',
  };

  // Com legenda, ela diz mais que o rótulo do tipo.
  return msg.content?.trim().slice(0, 120) || rotulos[msg.type ?? ''] || 'Nova mensagem';
};

/**
 * Hora quando foi hoje, data quando foi antes - o mesmo critério dos
 * mensageiros: para o que é recente importa a hora, para o resto o dia.
 */
const horaDaConversa = (iso: string) => {
  const data = parseISO(iso);
  return isToday(data) ? format(data, 'HH:mm') : format(data, 'dd/MM/yy');
};

const ConversationSection = () => {
  const chats = useChatStore((s) => s.chats);
  const socket = useChatStore((s) => s.socket);
  const activeChat = useChatStore((s) => s.activeChat);
  const notificationSound = useChatStore((s) => s.notificationSound);
  const updateChat = useChatStore((s) => s.updateChat);
  const addMessages = useChatStore((s) => s.addMessages);
  const setUnreadCount = useChatStore((s) => s.setUnreadCount);
  const setLoadMessages = useChatStore((s) => s.setLoadMessages);
  const setChatNotFound = useChatStore((s) => s.setChatNotFound);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const setQuotedMessage = useChatStore((s) => s.setQuotedMessage);
  const fecharConversa = useChatStore((s) => s.fecharConversa);
  const { setBreadcrumbs } = useLayoutStore();
  const { FetchReq } = useApi();
  const [grupoAtivo, setGrupoAtivo] = useState<GrupoAtendimento>('todos');
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const windowFocusedRef = useRef(true);
  const activeChatRef = useRef(activeChat);

  const { avisar } = useAvisarEvento();
  const { usuarioId } = useUsuarioLogado();

  /**
   * Espelha a lista para o handler do socket.
   *
   * Ele é registrado com `[socket]` como dependência e capturaria a lista da
   * primeira renderização - sempre vazia. É o estado *anterior* que diz se o
   * contador subiu ou se o dono mudou.
   */
  const chatsRef = useRef(chats);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  // Refiltra só quando a lista ou o grupo mudam; sem isto, cada mensagem nova
  // recriaria o array e re-renderizaria todos os itens.
  /**
   * Conversas do grupo escolhido, da mais recente para a mais antiga.
   *
   * A ordenação precisa acontecer aqui, e não só no backend: a listagem inicial
   * vem ordenada, mas o socket adiciona e atualiza conversas ao longo do tempo,
   * e sem reordenar uma mensagem nova fica onde o item já estava.
   */
  const chatsVisiveis = useMemo(
    () =>
      filtraPorGrupo(chats, grupoAtivo).sort((a, b) => {
        const quando = (c: SupportChatsResponse) =>
          new Date(c.updated_at ?? c.created_at).getTime() || 0;

        return quando(b) - quando(a);
      }),
    [chats, grupoAtivo],
  );

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;

      // Um diálogo aberto trata o próprio Esc: fechar a conversa por baixo dele
      // deixaria o modal órfão, apontando para um chat que não existe mais.
      if (document.querySelector('.p-dialog-mask, .swal2-container')) return;

      // Digitando, o Esc é do campo (cancelar edição, fechar sugestão).
      const alvo = evento.target as HTMLElement | null;
      if (alvo?.closest('input, textarea, [contenteditable="true"]')) return;

      if (!activeChatRef.current) return;

      fecharConversa();
    };

    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  const changeWindowFocus = (focused: boolean) => {
    windowFocusedRef.current = focused;
  };

  const onChangeBreadcrumbs = (chatId: number) => {
    const breadcrumbs: Breadcrumb[] = [
      { labels: ['Dashboard', 'Atendimentos', 'Chat'], to: `/chat/${chatId}` },
    ];
    // Substitui em vez de concatenar: a trilha nomeia onde se está agora, e
    // acumulando ela ganhava uma entrada repetida a cada troca de conversa.
    setBreadcrumbs(breadcrumbs);
  };

  const getChatMessages = async (chatId: number) => {
    try {
      const data = await FetchReq<SupportChatsResponse>('ListarMensagensPorAtendimentoId', [
        chatId,
      ]);
      addMessages(data.supportChatMessages);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const loadConversationMessage = async (supportChatId: number) => {
    if (String(activeChatRef.current?.id) === String(supportChatId)) return;

    try {
      setLoadMessages(true);
      setQuotedMessage(null, null);
      const chatData = await getChatMessages(supportChatId);
      setActiveChat(chatData);
      window.history.replaceState(null, '', `/chat/${supportChatId}`);
      onChangeBreadcrumbs(supportChatId);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setActiveChat(null);
        setChatNotFound(true);
      }
      // Sem `response` em falha de rede, timeout ou CORS: ler `.status` direto
      // lançava um TypeError dentro do próprio catch e engolia o erro real.
      console.error('Falha ao carregar a conversa:', err?.response?.status ?? err);
    } finally {
      setLoadMessages(false);
    }
  };

  /** A conversa criada pelo modal entra na lista e abre na hora, como se o
   * atendente tivesse clicado nela - mesmo caminho de `loadConversationMessage`. */
  const onNovoAtendimentoCriado = (conversa: SupportChatsResponse) => {
    updateChat(conversa);
    loadConversationMessage(Number(conversa.id));
  };

  /**
   * Decide quais notificações um `chat_state` merece.
   *
   * Só a transferência sai daqui: é mudança de dono, que o `chat_state`
   * carrega. Mensagem nova - na fila ou em atendimento - vem do
   * `whatsapp:messages`, logo abaixo.
   *
   * `anterior` é o estado antes do `updateChat`: sem ele não dá para saber se
   * algo *mudou* - toda atualização pareceria uma transferência nova.
   */
  const notificarEstado = (chat: SupportChatsResponse, anterior?: SupportChatsResponse) => {
    const nome = nomeCompleto(chat?.contact) || 'Contato';
    const abrirConversa = () => {
      setActiveChat(chat);
      window.history.replaceState(null, '', `/chat/${chat.id}`);
    };

    // ⚠️ **Mensagem nova não é detectada aqui.** O `chat_state` chega com o
    // `unread_count` anterior ao incremento - é por isso que o `updateChat` o
    // descarta -, e comparar contra ele nunca acusava aumento. Quem avisa é o
    // `whatsapp:messages`, que carrega a mensagem inteira com `from_me`.

    // Transferido para mim: o dono mudou e agora sou eu.
    const virouMinha =
      Number(chat.user_id) === Number(usuarioId) &&
      anterior != null &&
      Number(anterior.user_id) !== Number(usuarioId);

    if (virouMinha) {
      avisar({
        preferencia: 'notif_transferencia',
        titulo: 'Atendimento transferido para você',
        corpo: `${nome} agora é seu.`,
        icone: chat.contact?.avatar_url,
        tag: `transf-${chat.id}`,
        url: `/chat/${chat.id}`,
        aoClicar: abrirConversa,
      });
    }
  };

  useEffect(() => {
    if (socket === null) return;

    socket.off('whatsapp:unread_count');
    socket.on('whatsapp:unread_count', (payload) => {
      const { chatId, unreadCount } = payload;
      setUnreadCount(chatId, unreadCount);
    });

    /**
     * Mensagem nova de cliente.
     *
     * Escutado **aqui**, e não só no `MessageItem`: lá o handler descarta o que
     * não é da conversa aberta, e é justamente a mensagem de outra conversa que
     * precisa de aviso. O evento é broadcast e carrega a mensagem inteira - com
     * `from_me`, que distingue o que o cliente mandou do que nós respondemos.
     */
    // ⚠️ Handler **nomeado**, e o `off` abaixo passa a referência. O
    // `MessageItem` escuta o mesmo evento, e um `socket.off('whatsapp:messages')`
    // sem argumento remove *todos* os handlers - os dois componentes se
    // derrubariam conforme a ordem de montagem.
    const aoChegarMensagem = ({
      supportChatMessages: msg,
      ...chat
    }: SupportChatsWithMessagesResponse) => {
        // O eco do próprio envio também passa por aqui.
        if (msg?.from_me) return;

        const conversa = chatsRef.current.find(
          (c) => String(c.id) === String(msg.support_chat_id),
        );
        const nome = nomeCompleto(conversa?.contact ?? chat?.contact) || 'Contato';

        // O status vem do payload, que é o mais recente; a da lista pode ainda
        // não ter recebido o `chat_state` desta mesma mensagem. A primeira
        // mensagem de um contato novo cai aqui como "na fila" - é ela que
        // substituiu o antigo aviso de "atendimento novo na fila".
        const estado =
          (chat as SupportChatsResponse)?.support_chat_status_id != null
            ? (chat as SupportChatsResponse)
            : conversa;
        const naFila = estado != null && grupoDaConversa(estado) === 'fila';

        avisar({
          preferencia: naFila ? 'notif_fila' : 'notif_mensagem_cliente',
          titulo: nome,
          corpo: previaDoWhatsapp(msg),
          icone: conversa?.contact?.avatar_url ?? chat?.contact?.avatar_url,
          // Uma por conversa: dez mensagens seguidas substituem a anterior.
          tag: `chat-${msg.support_chat_id}`,
          url: `/chat/${msg.support_chat_id}`,
          conversaAberta: String(activeChatRef.current?.id) === String(msg.support_chat_id),
          aoClicar: () => {
            const alvo = conversa ?? (chat as SupportChatsResponse);
            setActiveChat(alvo);
            window.history.replaceState(null, '', `/chat/${alvo.id}`);
          },
        });
    };

    socket.on('whatsapp:messages', aoChegarMensagem);

    socket.off('whatsapp:chat_state');
    socket.on('whatsapp:chat_state', async (payload: SupportChatsResponse) => {
      const anterior = chatsRef.current.find((c) => String(c.id) === String(payload.id));

      updateChat(payload);

      if (!windowFocusedRef.current && podeTocarSom()) {
        await notificationSound?.play();
      }

      notificarEstado(payload, anterior);
    });

    // As funções precisam ser nomeadas: `removeEventListener` compara por
    // referência, e uma arrow nova no cleanup não removia nada. Como o efeito
    // depende do socket, cada reconexão empilhava mais um par de handlers.
    const aoDesfocar = () => changeWindowFocus(false);
    const aoFocar = () => changeWindowFocus(true);

    window.addEventListener('blur', aoDesfocar);
    window.addEventListener('focus', aoFocar);

    return () => {
      // `chat_state` também sai aqui: sem isso o `.off()` no início do efeito
      // era a única proteção contra duplicar o handler - e handler duplicado
      // toca o som de notificação duas vezes.
      socket.off('whatsapp:unread_count');
      // Com a referência: sem ela, sairia junto o handler do `MessageItem`.
      socket.off('whatsapp:messages', aoChegarMensagem);
      socket.off('whatsapp:chat_state');
      window.removeEventListener('blur', aoDesfocar);
      window.removeEventListener('focus', aoFocar);
    };
  }, [socket]);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const [abaAtiva, setAbaAtiva] = useState<AbaConversa>('atendimentos');

  // A aba some para quem não usa o chat interno: sem a permissão, e para o
  // superusuário, que não participa (o backend recusa todas as rotas dele).
  const { podeVisualizar: podeChatInterno } = usePermissoesModulo('internal.chat');
  const { ehSuperusuario } = usePermissoes();
  const temChatInterno = podeChatInterno && !ehSuperusuario;

  const conversasInternas = useChatInternoStore((s) => s.conversas);
  const abrirCom = useChatInternoStore((s) => s.abrirCom);
  const destacarInterno = useChatInternoStore((s) => s.destacar);
  const naoLidasInternas = conversasInternas.reduce((soma, c) => soma + c.nao_lidas, 0);

  // A carga dos dados e as assinaturas vivem em `ChatInterno`, montado no
  // layout: aqui só se lê a store e se pede o histórico ao abrir alguém.
  const { carregarMensagens } = useChatInterno({ ativo: false });

  /** Carrega o histórico, se a conversa já existir. */
  const carregarSeExistir = (colegaId: number) => {
    const existente = conversasInternas.find((conversa) => conversa.outro.id === colegaId);

    // Sem conversa ainda não há histórico a buscar - ela nasce no primeiro
    // envio, do lado do backend.
    if (existente) carregarMensagens(existente.id);
  };

  type ColegaDaLista = (typeof conversasInternas)[number]['outro'];

  const abrirConversaInterna = (colega: ColegaDaLista) => {
    abrirCom(colega);
    carregarSeExistir(colega.id);
  };

  const destacarConversaInterna = (colega: ColegaDaLista) => {
    destacarInterno(colega);
    carregarSeExistir(colega.id);
  };

  return (
    <div className="card flex flex-column shadow-1 h-full px-2 pt-2">
      {temChatInterno && (
        <AbasConversa
          ativa={abaAtiva}
          onTrocar={setAbaAtiva}
          naoLidasInternas={naoLidasInternas}
        />
      )}

      {temChatInterno && abaAtiva === 'interno' ? (
        <div className="flex-1 overflow-hidden">
          <ListaColegas
            onAbrir={abrirConversaInterna}
            onDestacar={destacarConversaInterna}
          />
        </div>
      ) : (
        <>
      <div className="flex align-items-center justify-content-between gap-2 mb-2">
        <FiltroAtendimentos
          chats={chats}
          grupoAtivo={grupoAtivo}
          onSelecionar={setGrupoAtivo}
        />
        <Button
          icon="fa-regular fa-message-plus text-lg"
          rounded
          text
          style={{ padding: '0.4rem' }}
          title="Novo atendimento"
          aria-label="Novo atendimento"
          onClick={() => setModalNovoAberto(true)}
        />
      </div>

      <ModalNovoAtendimento
        visible={modalNovoAberto}
        onHide={() => setModalNovoAberto(false)}
        onCriado={onNovoAtendimentoCriado}
      />

      <ul className="list-none flex-1 m-0 p-0 overflow-auto">
        {chatsVisiveis.length === 0 ? (
          // Ternário, não `&&` seguido do map: como irmãos, o React trata os
          // dois como uma lista e cobra `key` do primeiro.
          <li className="flex flex-column align-items-center gap-2 py-6 text-center text-500">
            <i className="fa-regular fa-inbox text-3xl text-300" />
            <span className="text-sm">
              {grupoAtivo === 'fila'
                ? 'Nenhum atendimento aguardando'
                : grupoAtivo === 'andamento'
                  ? 'Nenhum atendimento em andamento'
                  : 'Nenhuma conversa por aqui'}
            </span>
          </li>
        ) : (
          chatsVisiveis.map((conversation) => (
            <li
              key={conversation?.id}
              className={classNames(
                {
                  // `surface-100` e não `surface-50`: nos modos escuros a
                  // `surface-50` tem o mesmo valor do `surface-card` do painel,
                  // e o cartão da conversa desaparecia no fundo. Um tom acima
                  // o destaca nos três modos.
                  'surface-100 border-200 hover:surface-200':
                    activeChat?.id !== String(conversation?.id),
                  // `conversa-ativa` em vez de `bg-primary-50`: a escala
                  // `--primary-*` é sempre clareada, nos dois modos, e o tom
                  // 50 deixava a conversa aberta como um retângulo branco no
                  // tema escuro. A classe usa `--highlight-bg`, que o tema
                  // resolve por modo.
                  'conversa-ativa border-primary-200':
                    activeChat?.id === String(conversation?.id),
                },
                // Cada conversa é um cartão: borda e fundo próprio dão a
                // separação que só o espaçamento não dava - sem eles os itens
                // liam como texto corrido numa coluna.
                // `relative` ancora o overlay das ações; `acoes-hover` é o
                // grupo que o revela ao passar o mouse (a regra está em
                // `styles/layout/_chat.scss`).
                'acoes-hover relative flex cursor-pointer align-items-center gap-3 border-1 border-round-lg p-2 mb-2 overflow-hidden transition-colors transition-duration-150',
              )}
              style={{
                // A faixa à esquerda reforça a seleção sem trocar a espessura
                // da borda, o que faria o cartão "pular" ao ser escolhido.
                boxShadow:
                  activeChat?.id === String(conversation?.id)
                    ? 'inset 3px 0 0 0 var(--primary-color)'
                    : undefined,
              }}
              onClick={() => {
                loadConversationMessage(Number(conversation?.id));
              }}
            >
              <div className="relative flex flex-none">
                {/* `Avatar`, e não um `<img>` cru: a foto vem do
                    `pps.whatsapp.net`, com assinatura que vence. Quando a URL
                    existe mas não carrega, o `||` não socorre - só o `onError`
                    do componente troca pelo padrão. Sem ele ficava o buraco
                    circular que parecia um avatar genérico. */}
                <Avatar
                  src={conversation?.contact?.avatar_url}
                  alt={nomeCompleto(conversation?.contact) || 'Contato'}
                  width={48}
                  height={48}
                  className="border-circle"
                  style={{ objectFit: 'cover' }}
                />
                {/* Sobre o avatar, o estado deixa de disputar espaço com o nome
                    e fica onde o olho já está. */}
                <span
                  className={classNames(
                    grupoDaConversa(conversation) === 'fila' ? 'bg-orange-400' : 'bg-green-500',
                    'absolute border-circle',
                  )}
                  style={{
                    width: '0.75rem',
                    height: '0.75rem',
                    right: 0,
                    bottom: 0,
                    boxShadow: '0 0 0 2px var(--surface-0)',
                  }}
                  title={grupoDaConversa(conversation) === 'fila' ? 'Aguardando' : 'Em atendimento'}
                />
              </div>
              <div className="flex flex-1 flex-column min-w-0">
                <div className="flex align-items-baseline gap-2 min-w-0">
                  <span className="flex-1 text-base font-semibold text-900 white-space-nowrap overflow-hidden text-overflow-ellipsis">
                    {conversation?.contact?.client?.nome ?? nomeCompleto(conversation?.contact)}
                  </span>

                  {/* A hora fica alinhada à direita, como em qualquer
                      mensageiro: é por ela que se varre a lista. */}
                  {conversation?.updated_at && (
                    // `conversa-meta`: some quando o mouse entra no item, para
                    // o botão de ações tomar o lugar - como a data de um
                    // e-mail no Gmail.
                    <span className="conversa-meta flex-none text-xs text-500">
                      {horaDaConversa(conversation.updated_at)}
                    </span>
                  )}

                </div>

                {/* O contato só aparece quando há cliente: sem ele, o nome do
                    contato já está no título e repetir seria ruído. */}
                {conversation?.contact?.client?.nome && (
                  <span
                    className="text-xs font-semibold text-500 white-space-nowrap overflow-hidden text-overflow-ellipsis"
                    // Encostado no título: os dois nomeiam a mesma conversa e
                    // devem ler como um bloco só, separados da prévia abaixo.
                    style={{ marginTop: '-0.15rem' }}
                  >
                    {nomeCompleto(conversation?.contact)}
                  </span>
                )}
                <div className="flex align-items-center gap-2 mt-1 min-w-0">
                  <div className="flex-1 text-sm text-600 text-overflow-ellipsis white-space-nowrap overflow-hidden lastMessagePreview">
                    {conversation?.last_message_type === 'revoked' ? (
                      <span className="font-italic text-600">
                        <i className="fa-regular fa-ban mr-1" />
                        Mensagem apagada
                      </span>
                    ) : (
                      <Interweave
                        content={fixHeartEmoji(conversation?.last_message?.replace(/\n/g, ' '))}
                      />
                    )}
                  </div>

                  {/* Junto da prévia, não numa coluna própria: o espaço só é
                      ocupado quando há o que contar. */}
                  {Number(conversation?.unread_count) > 0 && (
                    <Badge
                      className="conversa-meta flex-none bg-primary-500"
                      value={conversation?.unread_count}
                    />
                  )}
                </div>
              </div>

              {/* Em overlay, e não no fluxo: ocupando espaço próprio ele
                  empurrava a hora e ficava aceso em todos os itens de uma vez.
                  Aqui aparece só no item sob o mouse, e o degradê à esquerda
                  impede que ele caia sobre o texto da prévia. */}
              <AcoesConversa conversa={conversation} />
            </li>
          ))
        )}
      </ul>
        </>
      )}
    </div>
  );
};

export default React.memo(ConversationSection);
