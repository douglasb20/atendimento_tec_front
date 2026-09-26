'use client';
import { useParams, usePathname } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

import { SupportChatsResponse } from '@/Interfaces';
import { useLayoutStore } from '@/layout/context/layoutcontext';
import useApi from '@/service/Api/ApiClient';
import { useChatStore } from '@/store/useChatStore';
import { Breadcrumb } from '@/types';
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
  const { setBreadcrumbs } = useLayoutStore();
  const params = useParams();
  const pathname = usePathname();

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

  const onChangeBreadcrumbs = () => {
    const breadcrumbs: Breadcrumb[] = [
      { labels: ['Dashboard', 'Atendimentos', 'Chat'], to: `/chat/${params?.id?.[0]}` },
    ];
    // Substitui em vez de concatenar: a trilha nomeia onde se está agora, e
    // acumulando ela ganhava uma entrada repetida a cada troca de conversa.
    setBreadcrumbs(breadcrumbs);
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
      // Sem `response` em falha de rede, timeout ou CORS: ler `.status` direto
      // lançava um TypeError dentro do próprio catch e engolia o erro real.
      console.error('Falha ao carregar a conversa:', err?.response?.status ?? err);
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

  const conversaInterna = useChatInternoStore((s) => s.ativo);
  const modoInterno = useChatInternoStore((s) => s.modo);
  const conversaInternaNoPainel = Boolean(conversaInterna) && modoInterno === 'painel';

  return (
    rendered && (
      <React.Fragment>
        <div className="col-5 md:col-4 lg:col-3 h-full"
          style={{ maxWidth: '35rem' }}>
          <ConversationSection />
        </div>
        <div className="flex-1 h-full"
          style={{padding: '0.5rem'}}
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
