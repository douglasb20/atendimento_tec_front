import { Metadata } from 'next';

import { QuickReplyResponse } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import DadosRespostasSection from './_DadosRespostasSection';

export const metadata: Metadata = {
  title: 'Respostas rápidas',
};

export default async function RespostasRapidasPage() {
  const { FetchReq } = await ApiService();

  const dados = await FetchReq<QuickReplyResponse[]>('ListarRespostasRapidas');

  return (
    <div className="grid">
      <div className="col-12 lg:col-10 lg:col-offset-1 card flex flex-column justify-content-center shadow-1">
        <DadosRespostasSection data={dados} />
      </div>
    </div>
  );
}
