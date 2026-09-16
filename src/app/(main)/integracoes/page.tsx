import { Metadata } from 'next';

import { IntegrationResponse } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import DadosIntegracoesSection from './_DadosIntegracoesSection';

export const metadata: Metadata = {
  title: 'Integrações',
};

export default async function IntegracoesPage() {
  const { FetchReq } = await ApiService();

  const dataIntegracoes = await FetchReq<IntegrationResponse[]>('ListarIntegracoes');

  return (
    <div className="grid">
      <div className="col-12 lg:col-10 lg:col-offset-1 card flex flex-column justify-content-center shadow-1">
        <DadosIntegracoesSection data={dataIntegracoes} />
      </div>
    </div>
  );
}
