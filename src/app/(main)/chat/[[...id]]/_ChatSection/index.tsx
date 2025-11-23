'use client';
import { useParams, usePathname } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

import { SupportChatsResponse } from '@/Interfaces';
import { useLayoutStore } from '@/layout/context/layoutcontext';
import useApi from '@/service/Api/ApiClient';
import { useChatStore } from '@/store/useChatStore';
import { Breadcrumb } from '@/types';
import ConversationSection from './Conversation';
import MessageItem from './MessageItem';

type ChatSectionProps = {
  conversations?: SupportChatsResponse[];
};

export default function ChatSection(props: ChatSectionProps) {
  const { conversations } = props;
  const {
    addChats,
    setActiveChat,
    setLoadMessages,
    addMessages,
    setSmoothScroll,
    setChatNotFound,
  } = useChatStore();
  const { FetchReq } = useApi();
  const [rendered, setRendered] = useState(false);
  const { setBreadcrumbs } = useLayoutStore();
  const params = useParams();
  const pathname = usePathname();

  const getChatMessages = async (chatId: number) => {
    try {
      setSmoothScroll(false);
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

  const onChangeBreadcrumbs = () => {
    let breadcrumbs: Breadcrumb[] = [
      { labels: ['Dashboard', 'Atendimentos', 'Chat'], to: `/chat/${params?.id?.[0]}` },
    ];
    setBreadcrumbs((prev) => [...prev, ...breadcrumbs]);
  };

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
      console.log(err.response, err.response.status);
    } finally {
      setLoadMessages(false);
    }
  };

  useEffect(() => {
    if (params?.id?.[0] !== undefined) {
      onChangeBreadcrumbs();
    }
  }, [pathname]);

  useEffect(() => {
    loadInit();
  }, []);

  return (
    rendered && (
      <React.Fragment>
        <div className="col-5 md:col-4 lg:col-3 h-full">
          <ConversationSection />
        </div>
        <div className="col-7 md:col-8 lg:col-9 h-full">
          <MessageItem />
        </div>
      </React.Fragment>
    )
  );
}
