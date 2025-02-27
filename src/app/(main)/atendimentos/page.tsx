import { Metadata } from 'next';

import { AtendimentosResponse, IUsuariosResponse } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import DadosAtendimentoSection from './DadosAtendimentosSection';

export const metadata: Metadata = {
  title: "Atendimentos",
};

export default async function AtendimentosPage() {
  const { FetchReq } = await ApiService();
  const dataUser = await FetchReq<IUsuariosResponse[]>('ListarUsuarios')
  const data = await FetchReq<AtendimentosResponse[]>('BuscarAtendimentoUserId', [dataUser[0].id]);
  return (
    <div className="grid">
      <div className="col-12 card flex flex-column justify-content-center shadow-1">
        <DadosAtendimentoSection data={data} users={dataUser} />
      </div>
    </div>
  );
}
