import { Column } from 'primereact/column';
import { memo } from 'react';

import AcoesDataTable from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';
import { DepartmentResponse } from '@/Interfaces';
import { DateToBR } from '@/service/Util';

const DtSetores = ({ actions, ...props }) => {
  return (
    <DataTableCustom
      value={props.value}
      emptyMessage="Nenhum setor cadastrado"
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
        header="Setor"
        sortable
        body={(setor: DepartmentResponse) => (
          <div className="flex flex-column">
            <span className="font-medium">{setor.name}</span>
            {setor.description && (
              <small className="text-color-secondary">{setor.description}</small>
            )}
          </div>
        )}
      />

      {/* O tamanho do setor é o que se quer saber de relance; os nomes estão no
          cadastro de cada usuário. */}
      <Column
        field="total_usuarios"
        header="Atendentes"
        headerClassName="w-8rem"
        align="center"
        sortable
        body={(setor: DepartmentResponse) => setor.total_usuarios ?? 0}
      />

      <Column
        field="created_at"
        header="Criado em"
        headerClassName="w-12rem"
        sortable
        body={(setor: DepartmentResponse) => DateToBR(setor.created_at, 'P')}
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

export default memo(DtSetores);
