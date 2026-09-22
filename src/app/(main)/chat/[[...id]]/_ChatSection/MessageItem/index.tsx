'use client';
import { useEffect, useRef, useState } from 'react';

import {
  podeAgirNoAtendimento,
  SupportChatMessageResponse,
  SupportChatsWithMessagesResponse,
} from '@/Interfaces';
import { useUsuarioLogado } from '@/hooks/useUsuarioLogado';
import useApi from '@/service/Api/ApiClient';
import { Alerta, ConfirmaAcao } from '@/service/Util';
import { useChatStore } from '@/store/useChatStore';
import { useSelecaoMensagens } from '@/store/useSelecaoMensagens';
import BarraSelecao from '../_components/BarraSelecao';
import { podeApagar } from '../_components/MenuMessageComponent';
import Header from './Header';
import LoadingChat from './LoadingChat';
import Messages from './Messages';
import NoChatActive from './NoChatActive';
import NotFoundChat from './NotFoundChat';
import SendMessageBox from './SendMessageBox';

export default function MessageItem() {
  const socket = useChatStore((s) => s.socket);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const activeChat = useChatStore((s) => s.activeChat);
  const { usuarioId } = useUsuarioLogado();
  const loadMessages = useChatStore((s) => s.loadMessages);
  const chatNotFound = useChatStore((s) => s.chatNotFound);
  const messages = useChatStore((s) => s.messages);

  const activeChatRef = useRef(activeChat);
  const { FetchReq } = useApi();
  const modoSelecao = useSelecaoMensagens((s) => s.ativo);
  const selecionadas = useSelecaoMensagens((s) => s.selecionadas);
  const sairModoSelecao = useSelecaoMensagens((s) => s.sairModoSelecao);
  const [apagando, setApagando] = useState(false);

  /**
   * Apaga as mensagens marcadas, escolhendo o caminho por mensagem.
   *
   * O WhatsApp só aceita revogar mensagem própria dentro de 60h. As demais -
   * recebidas do contato, ou antigas demais - são apenas ocultadas do portal:
   * somem daqui e continuam no aparelho do cliente, como o "apagar para mim".
   */
  const apagarSelecionadas = async () => {
    setApagando(true);

    // `messages` não contém os itens da fila de envio, e é de propósito: o que
    // ainda não chegou ao provider não tem o que revogar nem ocultar. A lista
    // já impede selecioná-los (`selecionavel` exclui `pending`), e o filtro
    // aqui é a segunda barreira - se as duas divergirem, a contagem do aviso
    // final é a que denuncia.
    const mensagens = messages.filter((m) => selecionadas.includes(m.message_id));
    const paraRevogar = mensagens.filter(podeApagar);
    const paraOcultar = mensagens.filter((m) => !podeApagar(m));

    let falhas = 0;

    // O provider não tem operação em lote, então cada revogação é um pedido.
    // Uma falha no meio não interrompe as demais: o que deu certo já foi
    // apagado para todos, e desistir deixaria o resultado pela metade.
    for (const mensagem of paraRevogar) {
      try {
        await FetchReq({
          endpoint: 'DeleteMessage',
          body: { message_id: mensagem.message_id },
          variables: [String(activeChat?.id)],
        });
      } catch {
        falhas += 1;
      }
    }

    // Ocultar é só nosso: uma chamada resolve todas.
    if (paraOcultar.length > 0) {
      try {
        await FetchReq({
          endpoint: 'OcultarMensagens',
          body: { message_ids: paraOcultar.map((m) => m.message_id) },
          variables: [String(activeChat?.id)],
        });
        // Diferente da revogação, não há webhook a esperar: a ocultação já
        // está gravada, então a bolha vira marcador na hora.
        paraOcultar.forEach((m) =>
          updateMessage({
            ...m,
            hidden_at: new Date().toISOString(),
            content: '',
            media_url: null,
            has_media: false,
          }),
        );
      } catch {
        falhas += paraOcultar.length;
      }
    }

    setApagando(false);
    sairModoSelecao();

    if (falhas > 0) {
      Alerta(
        // Conta sobre o que de fato foi tentado, não sobre o que estava
        // marcado: os dois divergem se algo tiver sido filtrado acima.
        `${falhas} de ${mensagens.length} não puderam ser apagadas.`,
        'Nem todas foram apagadas',
        'warning',
      );
    }
    // A marcação visual das revogadas chega pelo webhook `messages.delete`.
  };

  const confirmarApagar = () => {
    const mensagens = messages.filter((m) => selecionadas.includes(m.message_id));
    const revogaveis = mensagens.filter(podeApagar).length;
    const ocultaveis = mensagens.length - revogaveis;

    // O texto diz o que de fato vai acontecer: revogar alcança o contato,
    // ocultar não. Prometer "apagada para todos" quando parte só some daqui
    // seria enganoso.
    const descricao =
      ocultaveis === 0
        ? 'Será apagada para todos na conversa.'
        : revogaveis === 0
          ? 'Será removida apenas do sistema - no WhatsApp do contato ela continua.'
          : `${revogaveis} ${revogaveis === 1 ? 'será apagada' : 'serão apagadas'} para todos e ` +
            `${ocultaveis} ${ocultaveis === 1 ? 'será removida' : 'serão removidas'} apenas do sistema.`;

    ConfirmaAcao(
      descricao,
      apagarSelecionadas,
      undefined,
      mensagens.length === 1 ? 'Apagar mensagem?' : `Apagar ${mensagens.length} mensagens?`,
      'Apagar',
      'Cancelar',
    );
  };

  useEffect(() => {
    if (socket == null) return;

    socket.off('whatsapp:messages');
    socket.on(
      'whatsapp:messages',
      ({ supportChatMessages: msg, ...supportChats }: SupportChatsWithMessagesResponse) => {
        if (String(activeChatRef.current?.id) !== String(msg.support_chat_id)) return;

        updateMessage(msg);
      },
    );

    socket.off('whatsapp:message_ack');
    socket.on('whatsapp:message_ack', (message: SupportChatMessageResponse) => {
      if (String(activeChatRef.current?.id) !== String(message.support_chat_id)) return;

      updateMessage(message);
    });

    return () => {
      // Os dois saem juntos: `message_ack` ficava registrado após o cleanup, e
      // o próximo efeito o duplicava - dois `updateMessage` por ack.
      socket.off('whatsapp:messages');
      socket.off('whatsapp:message_ack');
    };
  }, [socket]);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const souODono = podeAgirNoAtendimento(activeChat, usuarioId);

  // Trocar de conversa encerra a seleção: os ids marcados são de mensagens que
  // já não estão na tela.
  //
  // O dono entra na dependência pelo mesmo motivo, com um gatilho diferente:
  // a conversa pode ser transferida pelo socket com a seleção aberta, e a
  // barra de apagar continuaria no rodapé de um atendimento que já não é meu.
  useEffect(() => {
    sairModoSelecao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?.id, souODono]);

  return (
    <>
      {/* `relative` ancora a revisão de anexos, que cobre o painel inteiro. */}
      <div className="card relative flex flex-column shadow-1 h-full p-2">
        {activeChat && !loadMessages && !chatNotFound && (
          <>
            <Header />
            <Messages />
            {modoSelecao ? (
              <BarraSelecao
                onApagar={confirmarApagar}
                apagando={apagando}
              />
            ) : (
              <SendMessageBox />
            )}
          </>
        )}

        {chatNotFound && <NotFoundChat />}

        {loadMessages && <LoadingChat />}

        {!activeChat && !loadMessages && !chatNotFound && <NoChatActive />}
      </div>
    </>
  );
}
