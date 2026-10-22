import { Metadata } from 'next';

import { AjusteAtendimento } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import DadosAtendimentoSection from './_DadosAtendimentoSection';

export const metadata: Metadata = {
  title: 'Configurações de atendimento',
};

export default async function ConfiguracoesAtendimentoPage() {
  const { FetchReq } = await ApiService();

  // Sem `try`: quem não tem `attendance_settings:manage` recebe 403 e a
  // página deve falhar mesmo - o item nem aparece no menu para ele, e chegar
  // aqui é acesso direto pela URL.
  const ajustes = await FetchReq<AjusteAtendimento[]>('ListarAjustesAtendimento');

  return (
    <div className="grid">
      <div className="col-12 lg:col-8 lg:col-offset-2 card flex flex-column shadow-1">
        <DadosAtendimentoSection data={ajustes} />
      </div>
    </div>
  );
}
