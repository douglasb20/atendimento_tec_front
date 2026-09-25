import { Metadata } from 'next';

import { DepartmentResponse } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import DadosSetoresSection from './_DadosSetoresSection';

export const metadata: Metadata = {
  title: 'Setores',
};

export default async function SetoresPage() {
  const { FetchReq } = await ApiService();

  const dataSetores = await FetchReq<DepartmentResponse[]>('ListarSetores');

  return (
    <div className="grid">
      <div className="col-8 col-offset-2 card flex flex-column justify-content-center shadow-1">
        <DadosSetoresSection data={dataSetores} />
      </div>
    </div>
  );
}
