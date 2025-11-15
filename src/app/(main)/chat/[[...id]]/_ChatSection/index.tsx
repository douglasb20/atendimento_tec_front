'use client';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { SupportChatsResponse } from '@/Interfaces';
import { useLayoutStore } from '@/layout/context/layoutcontext';
import useApi from '@/service/Api/ApiClient';
import { Breadcrumb } from '@/types';
import ConversationSection from './Conversation';
import MessageItem from './MessageItem';
import { useChatStore } from './store/useChatStore';

type ChatSectionProps = {
  conversations?: SupportChatsResponse[];
};

export default function ChatSection(props: ChatSectionProps) {
  const { conversations } = props;
  const { connect, disconnect, addChats, setActiveChatId, setLoadMessages, addMessages, setSmoothScroll } = useChatStore();
  const { FetchReq } = useApi();
  const [rendered, setRendered] = useState(false);
  const { setBreadcrumbs } = useLayoutStore();
  const params = useParams();

  const getChatMessages = async (chatId: number) => {
    try {
      setLoadMessages(true)
      setSmoothScroll(false);
      const data = await FetchReq<SupportChatsResponse>('ListarMensagensPorAtendimentoId', [chatId]);
      
      addMessages(data.supportChatMessages);
      setLoadMessages(false);
    } catch (error) {
      console.error('Erro ao buscar mensagens do chat:', error);
    } finally {
      setLoadMessages(false);
    }
  };

  useEffect(() => {
    connect();
    if (params?.id?.[0] !== undefined) {
      let breadcrumbs: Breadcrumb[] = [
        { labels: ['Dashboard', 'Atendimentos', 'Chat'], to: `/chat/${params?.id?.[0]}` },
      ];
      setBreadcrumbs((prev) => [...prev, ...breadcrumbs]);
      getChatMessages(Number(params?.id?.[0]));
    }
    setActiveChatId(params?.id?.[0] || null);

    if (conversations) {
      addChats(conversations);
    }
    setRendered(true);
    return () => {
      disconnect();
    };
  }, []);

  return (
    rendered && (
      <React.Fragment>
        <div className="col-4 h-full">
          <ConversationSection />
        </div>
        <div className="col-8 h-full">
          <MessageItem />
        </div>
      </React.Fragment>
    )
  );
}
