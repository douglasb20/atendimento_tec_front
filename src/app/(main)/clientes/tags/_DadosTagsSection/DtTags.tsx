import { Column } from 'primereact/column';
import { memo } from 'react';

import AcoesDataTable from '@/components/AcoesDataTable';
import ChipTag from '@/components/ChipTag';
import DataTableCustom from '@/components/DataTableCustom';
import { TagResponse } from '@/Interfaces';
import { DateToBR } from '@/service/Util';

const DtTags = ({ actions, ...props }) => {
  return (
    <DataTableCustom
      value={props.value}
      emptyMessage="Nenhuma etiqueta encontrada"
      globalFilterFields={['name']}
    >
      <Column
        field="id"
        header="#"
        headerClassName="w-1"
        sortable
      />

      {/* A etiqueta é mostrada como o usuário vai vê-la no cliente — nome e cor
          juntos, não duas colunas separadas. */}
      <Column
        field="name"
        header="Etiqueta"
        sortable
        body={(tag: TagResponse) => <ChipTag tag={tag} />}
      />

      <Column
        field="color"
        header="Cor"
        headerClassName="w-8rem"
        body={(tag: TagResponse) => <span className="text-sm text-500">{tag.color}</span>}
      />

      <Column
        field="created_at"
        header="Criada em"
        headerClassName="w-12rem"
        sortable
        body={(tag: TagResponse) => DateToBR(tag.created_at, 'P')}
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

export default memo(DtTags);
