import { Metadata } from 'next';

import { ChatbotResponse } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import DadosChatbotSection from './_DadosChatbotSection';

export const metadata: Metadata = {
  title: 'Chatbot',
};

export default async function ChatbotPage() {
  const { FetchReq } = await ApiService();

  const dataChatbots = await FetchReq<ChatbotResponse[]>('ListarChatbots');

  return (
    <div className="grid">
      <div className="col-10 col-offset-1 card flex flex-column justify-content-center shadow-1">
        <DadosChatbotSection data={dataChatbots} />
      </div>
    </div>
  );
}
