import { Metadata } from 'next';
import ApiService from '@/service/Api/ApiServer';

import DadosClientesSection from './DadosClientesSection';
import { IClientes } from '@/Interfaces';

export const metadata: Metadata = {
  title: 'Clientes',
};

export default async function ClientesPage() {
  const { FetchReq } = await ApiService();

  const dataClient = await FetchReq<IClientes[]>('ListarClientes');

  return (
    <div className="grid">
      <div className="col-8 col-offset-2 card flex flex-column justify-content-center shadow-1">
        <DadosClientesSection data={dataClient} />
      </div>
    </div>
  );
}
