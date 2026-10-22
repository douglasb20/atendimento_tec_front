import { Metadata } from 'next';

import { AjusteSistema } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import DadosSistemaSection from './_DadosSistemaSection';

export const metadata: Metadata = {
  title: 'Configurações do sistema',
};

export default async function ConfiguracoesSistemaPage() {
  const { FetchReq } = await ApiService();

  // Sem `try`: quem não é o usuário master recebe 403 e a página deve falhar
  // mesmo - o item nem aparece no menu para ele, e chegar aqui é acesso direto
  // pela URL.
  const ajustes = await FetchReq<AjusteSistema[]>('ListarAjustesSistema');

  return (
    <div className="grid">
      <div className="col-12 lg:col-8 lg:col-offset-2 card flex flex-column shadow-1">
        <DadosSistemaSection data={ajustes} />
      </div>
    </div>
  );
}
