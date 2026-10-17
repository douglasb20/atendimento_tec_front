import { Metadata } from 'next';

import { ChannelResponse, DepartmentResponse, IUsuariosResponse } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import RelatorioAtendimentosSection from './_RelatorioAtendimentosSection';

export const metadata: Metadata = {
  title: 'Relatório de Atendimentos',
};

export default async function RelatorioAtendimentosPage() {
  const { FetchReq } = await ApiService();

  // As listas dos filtros, no servidor: elas mudam pouco e são as mesmas em
  // toda abertura da tela. Buscá-las no cliente faria os selects nascerem
  // vazios e preencherem depois.
  //
  // `allSettled` e não `all`: sem `department:view` ou `channel:view` a
  // chamada correspondente falha, e um select a menos é melhor do que a tela
  // inteira recusada - quem tem a permissão do relatório pode não ter a de
  // gerenciar canais.
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
        <RelatorioAtendimentosSection
          usuarios={valor(usuarios)}
          setores={valor(setores)}
          canais={valor(canais)}
        />
      </div>
    </div>
  );
}
