import { Metadata } from 'next';

import { ChannelResponse, DepartmentResponse, IUsuariosResponse } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import RelatorioAnaliticoClienteSection from './_RelatorioAnaliticoClienteSection';

export const metadata: Metadata = {
  title: 'Relatório Analítico por Cliente',
};

type Props = {
  // Preenchido quando a tela é aberta a partir de uma linha do relatório por
  // Cliente (`/relatorios/clientes`) - pré-seleciona a busca em vez de abrir
  // vazia.
  searchParams: Promise<{ client_id?: string; contact_id?: string }>;
};

export default async function RelatorioAnaliticoClientePage({ searchParams }: Props) {
  const { FetchReq } = await ApiService();
  const { client_id, contact_id } = await searchParams;

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
        <RelatorioAnaliticoClienteSection
          usuarios={valor(usuarios)}
          setores={valor(setores)}
          canais={valor(canais)}
          clientIdInicial={client_id ? Number(client_id) : undefined}
          contactIdInicial={contact_id ? Number(contact_id) : undefined}
        />
      </div>
    </div>
  );
}
