import { Metadata } from 'next';

import {
  PermissionGroupResponse,
  PermissionModuleResponse,
  PermissionResponse,
} from '@/Interfaces';
import ApiService from '@/service/Api/ApiServer';
import DadosGruposSection from './_DadosGruposSection';

export const metadata: Metadata = {
  title: 'Grupos de permissão',
};

export default async function GruposPermissaoPage() {
  const { FetchReq } = await ApiService();

  // O catálogo de permissões vem junto: é fixo (só muda por migration) e o
  // formulário precisa dele inteiro para montar os grupos. Buscá-lo a cada
  // abertura do modal seria uma ida ao servidor por nada.
  const [grupos, permissoes, modulos] = await Promise.all([
    FetchReq<PermissionGroupResponse[]>('ListarGruposPermissao'),
    FetchReq<PermissionResponse[]>('ListarPermissoes'),
    FetchReq<PermissionModuleResponse[]>('ListarModulosPermissao'),
  ]);

  return (
    <div className="grid">
      <div className="col-12 lg:col-10 lg:col-offset-1 card flex flex-column justify-content-center shadow-1">
        <DadosGruposSection
          data={grupos}
          permissoes={permissoes}
          modulos={modulos}
        />
      </div>
    </div>
  );
}
