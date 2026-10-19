import { Metadata } from 'next';

import { IUsuariosResponse } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import HistoricoAtendimentosSection from './_HistoricoAtendimentosSection';

export const metadata: Metadata = {
  title: 'Histórico de Atendimentos',
};

export default async function HistoricoAtendimentosPage() {
  const { FetchReq } = await ApiService();

  // Só o atendente é filtro aqui - a tela não tem setor/canal/situação, ver
  // `_HistoricoAtendimentosSection` para o porquê.
  const usuarios = await FetchReq<IUsuariosResponse[]>('ListarUsuarios').catch(() => []);

  return (
    <div className="grid">
      <div className="col-12 card shadow-1">
        <HistoricoAtendimentosSection usuarios={usuarios ?? []} />
      </div>
    </div>
  );
}
