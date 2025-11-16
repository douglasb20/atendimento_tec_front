import { Fragment } from 'react';
import { Metadata } from 'next';

import ApiService from '@/service/Api/ApiServer';
import ChatSection from './_ChatSection';
import { SupportChatsResponse } from '@/Interfaces';

export const metadata: Metadata = {
  title: 'Chat de atendimento',
};

export default async function DashboardPage() {
  const { FetchReq } = await ApiService();
  const dataSupportChats = await FetchReq<SupportChatsResponse[]>('ListarAtendimentosSuporte');

  return (
    <Fragment>
      <div
        className="grid p-fluid "
        style={{ minHeight: '87vh', height: '87vh' }}
      >
        <ChatSection conversations={dataSupportChats} />
      </div>
    </Fragment>
  );
}
