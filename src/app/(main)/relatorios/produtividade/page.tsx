import { Metadata } from 'next';

import { ChannelResponse, DepartmentResponse } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import RelatorioProdutividadeSection from './_RelatorioProdutividadeSection';

export const metadata: Metadata = {
  title: 'Relatório de Produtividade',
};

export default async function RelatorioProdutividadePage() {
  const { FetchReq } = await ApiService();

  // `allSettled`, mesma razão de `relatorios/atendimentos`: sem
  // `department:view` ou `channel:view` a chamada correspondente falha, e um
  // select a menos é melhor do que a tela inteira recusada.
  const [setores, canais] = await Promise.allSettled([
    FetchReq<DepartmentResponse[]>('ListarSetores'),
    FetchReq<ChannelResponse[]>('ListarCanais'),
  ]);

  const valor = <T,>(resultado: PromiseSettledResult<T[]>): T[] =>
    resultado.status === 'fulfilled' ? (resultado.value ?? []) : [];

  return (
    <div className="grid">
      <div className="col-12 card shadow-1">
        <RelatorioProdutividadeSection
          setores={valor(setores)}
          canais={valor(canais)}
        />
      </div>
    </div>
  );
}
