import { Metadata } from 'next';

import { CustomFieldResponse } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import DadosCamposSection from './_DadosCamposSection';

export const metadata: Metadata = {
  title: 'Campos personalizados',
};

export default async function CamposPersonalizadosPage() {
  const { FetchReq } = await ApiService();

  const dataCampos = await FetchReq<CustomFieldResponse[]>('ListarCamposPersonalizados');

  return (
    <div className="grid">
      <div className="col-10 col-offset-1 card flex flex-column justify-content-center shadow-1">
        <DadosCamposSection data={dataCampos} />
      </div>
    </div>
  );
}
