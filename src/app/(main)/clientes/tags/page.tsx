import { Metadata } from 'next';

import { TagResponse } from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import DadosTagsSection from './_DadosTagsSection';

export const metadata: Metadata = {
  title: 'Etiquetas',
};

export default async function TagsPage() {
  const { FetchReq } = await ApiService();

  const dataTags = await FetchReq<TagResponse[]>('ListarTags');

  return (
    <div className="grid">
      <div className="col-8 col-offset-2 card flex flex-column justify-content-center shadow-1">
        <DadosTagsSection data={dataTags} />
      </div>
    </div>
  );
}
