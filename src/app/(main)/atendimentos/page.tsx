import { Metadata } from 'next';
import { jwtDecode } from 'jwt-decode';
import { startOfMonth } from 'date-fns';

import { AtendimentosResponse, IUsuariosResponse, JWTToken } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import DadosAtendimentoSection from './DadosAtendimentosSection';
import { DateToBR } from '@/service/Util';

export const metadata: Metadata = {
  title: 'Atendimentos',
};

export default async function AtendimentosPage() {
  const { FetchReq, token } = await ApiService();
  const tokenDecoded = jwtDecode<JWTToken>(token);

  const dataInicio = startOfMonth(new Date());
  const dataFim = new Date();

  const dataUser = await FetchReq<IUsuariosResponse[]>('ListarUsuarios');
  const data = await FetchReq<AtendimentosResponse[]>('ListarAtendimentosPorData', [
    tokenDecoded.sub,
    DateToBR(dataInicio, 'yyyy-MM-dd'),
    DateToBR(dataFim, 'yyyy-MM-dd'),
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
