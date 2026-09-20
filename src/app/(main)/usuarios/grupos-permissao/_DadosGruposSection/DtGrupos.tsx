import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { memo } from 'react';

import AcoesDataTable from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';
import { PermissionGroupResponse } from '@/Interfaces';

const DtGrupos = ({ actions, ...props }) => {
  return (
    <DataTableCustom
      value={props.value}
      emptyMessage="Nenhum grupo encontrado"
      globalFilterFields={['name', 'description']}
    >
      <Column
        field="id"
        header="#"
        headerClassName="w-1"
        sortable
      />

      <Column
        field="name"
        header="Grupo"
        sortable
        body={(grupo: PermissionGroupResponse) => (
          <div className="flex align-items-center gap-2">
            <span className="font-medium">{grupo.name}</span>
            {/* Marcado na listagem porque muda o que se pode fazer com ele:
                o botão de excluir não aparece. */}
            {grupo.is_system && (
              <Tag
                value="Sistema"
                severity="info"
                className="text-xs"
              />
            )}
          </div>
        )}
      />

      <Column
        field="description"
        header="Descrição"
        body={(grupo: PermissionGroupResponse) => (
          <span className="text-sm text-500">{grupo.description || '—'}</span>
        )}
      />

      {/* A contagem responde "este papel dá muito ou pouco acesso?" sem abrir o
          formulário, que é a dúvida ao varrer a lista. */}
      <Column
        header="Permissões"
        align="center"
        headerClassName="w-10rem"
        body={(grupo: PermissionGroupResponse) => (
          <span className="text-sm">{grupo.permissions?.length ?? 0}</span>
        )}
      />

      <Column
        hidden={!actions ? true : false}
        header="Ações"
        align="center"
        headerClassName="w-10rem"
        body={(rowData) => (
          <AcoesDataTable
            rowData={rowData}
            actions={actions}
          />
        )}
      />
    </DataTableCustom>
  );
};

export default memo(DtGrupos);
