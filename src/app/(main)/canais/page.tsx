import { Metadata } from 'next';
import ApiService from '@/service/Api/ApiServer';
import { ChannelResponse } from '@/Interfaces';
import DadosCanaisSection from './DadosCanaisSection';


export const metadata: Metadata = {
  title: "Canais"
}

export default async function CanaisPage() {
  const { FetchReq } = await ApiService();

  const dataCanais = await FetchReq<ChannelResponse[]>('ListarCanais');

  return (
    <div className="grid">
      <div className="col-8 col-offset-2 card flex flex-column justify-content-center shadow-1" >
        <DadosCanaisSection data={dataCanais} />
      </div>
    </div>
  );
}