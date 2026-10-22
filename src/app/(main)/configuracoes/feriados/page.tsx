import { Metadata } from 'next';

import { HolidayResponse } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import DadosFeriadosSection from './_DadosFeriadosSection';

export const metadata: Metadata = {
  title: 'Feriados',
};

export default async function FeriadosPage() {
  const { FetchReq } = await ApiService();

  const dataFeriados = await FetchReq<HolidayResponse[]>('ListarFeriados');

  return (
    <div className="grid">
      <div className="col-8 col-offset-2 card flex flex-column justify-content-center shadow-1">
        <DadosFeriadosSection data={dataFeriados} />
      </div>
    </div>
  );
}
