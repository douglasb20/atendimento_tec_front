import { Metadata } from 'next';

import { ServiceAlertResponse } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import DadosAvisosSection from './_DadosAvisosSection';

export const metadata: Metadata = {
  title: 'Avisos',
};

export default async function AvisosPage() {
  const { FetchReq } = await ApiService();

  const dados = await FetchReq<ServiceAlertResponse[]>('ListarAvisos');

  return (
    <div className="grid">
      <div className="col-12 lg:col-10 lg:col-offset-1 card flex flex-column justify-content-center shadow-1">
        <DadosAvisosSection data={dados} />
      </div>
    </div>
  );
}
