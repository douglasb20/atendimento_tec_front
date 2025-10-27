import { Metadata } from 'next';

import ApiService from '@/service/Api/ApiServer';
import DadosUsuariosSection from './DadosUsuariosSection';
import { IUsuariosResponse } from '@/Interfaces';

export const metadata: Metadata = {
  title: 'Usuários',
};

export default async function UsuariosPage() {
  const { FetchReq } = await ApiService();

  const dataUser = await FetchReq<IUsuariosResponse[]>('ListarUsuarios');

  return (
    <div className="grid">
      <div className="col-12 card flex flex-column justify-content-center shadow-1">
        <DadosUsuariosSection data={dataUser} />
      </div>
    </div>
  );
}
