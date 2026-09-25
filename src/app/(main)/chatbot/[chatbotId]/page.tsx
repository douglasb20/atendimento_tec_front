import { Metadata } from 'next';

import { ChatbotFlowVersionResponse } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import FlowEditor from './FlowEditor';

export const metadata: Metadata = {
  title: 'Editor de fluxo',
};

type ChatbotEditorPageProps = {
  params: Promise<{ chatbotId: string }>;
};

export default async function ChatbotEditorPage({ params }: ChatbotEditorPageProps) {
  const { chatbotId: chatbotIdParam } = await params;
  const chatbotId = Number(chatbotIdParam);
  const { FetchReq } = await ApiService();

  const versao = await FetchReq<ChatbotFlowVersionResponse>({
    endpoint: 'BuscarFluxoChatbot',
    variables: [chatbotId],
  });

  return (
    // Único ponto que define a altura: `.layout-content` (compartilhado por
    // todo o app) não reserva a viewport inteira, só cresce com o conteúdo.
    // Daqui para baixo, tudo usa `h-full` em cascata.
    <div
      className="grid"
      style={{ height: 'calc(100vh - 12rem)' }}
    >
      <div className="col-12 h-full">
        <div
          className="card h-full flex flex-column"
          style={{ marginBottom: 0 }}
        >
          <FlowEditor
            chatbotId={chatbotId}
            versao={versao}
          />
        </div>
      </div>
    </div>
  );
}
