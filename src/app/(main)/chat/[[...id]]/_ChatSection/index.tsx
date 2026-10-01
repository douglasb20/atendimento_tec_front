'use client';
import { useParams } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

import { SupportChatsResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { useChatStore } from '@/store/useChatStore';
import ConversationSection from './Conversation';
import CabecalhoInterno from '../_ChatInterno/CabecalhoInterno';
import JanelaInterna from '../_ChatInterno/JanelaInterna';
import { useChatInternoStore } from '@/store/useChatInternoStore';
import MessageItem from './MessageItem';

type ChatSectionProps = {
  conversations?: SupportChatsResponse[];
};

export default function ChatSection(props: ChatSectionProps) {
  const { conversations } = props;
  const addChats = useChatStore((s) => s.addChats);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const setLoadMessages = useChatStore((s) => s.setLoadMessages);
  const addMessages = useChatStore((s) => s.addMessages);
  const setChatNotFound = useChatStore((s) => s.setChatNotFound);
  const { FetchReq } = useApi();
  const [rendered, setRendered] = useState(false);
  const params = useParams();

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

  const loadInit = useCallback(async () => {
    if (params?.id?.[0] !== undefined) {
      loadConversationMessage();
    }

    if (conversations) {
      addChats(conversations);
    }
    setRendered(true);
  }, []);

  const loadConversationMessage = async () => {
    try {
      setLoadMessages(true);
      const chatData = await getChatMessages(Number(params?.id?.[0]));
      setActiveChat(chatData);
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

  useEffect(() => {
    loadInit();
  }, []);

  const conversaInterna = useChatInternoStore((s) => s.ativo);
  const modoInterno = useChatInternoStore((s) => s.modo);
  const conversaInternaNoPainel = Boolean(conversaInterna) && modoInterno === 'painel';

  const activeChat = useChatStore((s) => s.activeChat);
  const chatNotFound = useChatStore((s) => s.chatNotFound);
  const loadMessages = useChatStore((s) => s.loadMessages);
  // Em tela estreita cabe uma coluna só, como no app do WhatsApp: com conversa
  // aberta (ou carregando/não encontrada) ela toma a tela e a lista some; sem
  // conversa, é a lista que aparece. A lista só esconde, não desmonta - os
  // listeners de socket dela continuam vivos.
  const conversaAberta =
    Boolean(activeChat) || chatNotFound || loadMessages || conversaInternaNoPainel;

  return (
    rendered && (
      <React.Fragment>
        <div
          className={`chat-lista ${conversaAberta ? 'chat-lista--oculta' : ''}`}
        >
          <ConversationSection />
        </div>
        <div
          className={`chat-conversa ${conversaAberta ? '' : 'chat-conversa--oculta'}`}
        >
          {/* A conversa interna toma o painel, como no atendimento: é o modo
              normal de uso. O popup existe para quem quiser falar com o colega
              sem largar o cliente, e só aparece quando a pessoa destaca. */}
          {conversaInternaNoPainel ? (
            <div className="card flex flex-column shadow-1 h-full p-0 overflow-hidden">
              <CabecalhoInterno />
              <JanelaInterna semCabecalho />
            </div>
          ) : (
            <MessageItem />
          )}
        </div>
      </React.Fragment>
    )
  );
}
