import { Metadata } from 'next';

import { ChannelResponse, DepartmentResponse, IUsuariosResponse } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import RelatorioClientesSection from './_RelatorioClientesSection';

export const metadata: Metadata = {
  title: 'Relatório por Cliente',
};

export default async function RelatorioClientesPage() {
  const { FetchReq } = await ApiService();

  // `allSettled`, mesma razão dos demais relatórios: sem `department:view`
  // ou `channel:view` a chamada correspondente falha, e um select a menos é
  // melhor do que a tela inteira recusada.
  const [usuarios, setores, canais] = await Promise.allSettled([
    FetchReq<IUsuariosResponse[]>('ListarUsuarios'),
    FetchReq<DepartmentResponse[]>('ListarSetores'),
    FetchReq<ChannelResponse[]>('ListarCanais'),
  ]);

  const valor = <T,>(resultado: PromiseSettledResult<T[]>): T[] =>
    resultado.status === 'fulfilled' ? (resultado.value ?? []) : [];

  return (
    <div className="grid">
      <div className="col-12 card shadow-1">
        <RelatorioClientesSection
          usuarios={valor(usuarios)}
          setores={valor(setores)}
          canais={valor(canais)}
        />
      </div>
    </div>
  );
}
