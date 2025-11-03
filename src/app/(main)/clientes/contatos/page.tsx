import ApiService from '@/service/Api/ApiServer';
import { Metadata } from 'next';

import { ContactResponse } from '@/Interfaces';
import DadosContatosSection from './_DadosContatosSection';

export const metadata: Metadata = {
  title: 'Contatos',
};

export default async function ContatosPage() {
  const { FetchReq } = await ApiService();

  const dataContact = await FetchReq<ContactResponse[]>('ListarContatos');

  return (
    <div className="grid">
      <div className="col-8 col-offset-2 card flex flex-column justify-content-center shadow-1">
        <DadosContatosSection data={dataContact} />
      </div>
    </div>
  );
}
