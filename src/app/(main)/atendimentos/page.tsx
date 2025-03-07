import { Metadata } from 'next';
import { jwtDecode } from 'jwt-decode';

import { AtendimentosResponse, IUsuariosResponse, JWTToken } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import DadosAtendimentoSection from './DadosAtendimentosSection';

export const metadata: Metadata = {
  title: 'Atendimentos',
};

export default async function AtendimentosPage() {
  const { FetchReq, token } = await ApiService();
  const tokenDecoded = jwtDecode<JWTToken>(token);

  const dataUser = await FetchReq<IUsuariosResponse[]>('ListarUsuarios');
  const data = await FetchReq<AtendimentosResponse[]>('BuscarAtendimentoUserId', [
    tokenDecoded.sub,
  ]);
  return (
    <div className="grid">
      <div className="col-12 card flex flex-column justify-content-center shadow-1">
        <DadosAtendimentoSection
          data={data}
          users={dataUser}
          currentUser={tokenDecoded.sub}
        />
      </div>
    </div>
  );
}
