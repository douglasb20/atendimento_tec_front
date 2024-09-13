import React, { memo } from 'react';
import { Column } from 'primereact/column';

import AcoesDataTable from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';

const DtClientes = ({ actions, ...props }) => {
  return (
    <>
      <DataTableCustom
        value={props.value}
        emptyMessage="Nenhum cliente encontrado"
      >
        <Column
          field="id"
          header="#"
          align="center"
          headerClassName="w-1 "
        />
        <Column
          field="nome"
          header="Nome"
          alignHeader="center"
        />
        <Column
          field="cnpj"
          header="CNPJ"
          alignHeader="center"
        />
        <Column
          hidden={!actions ? true : false}
          header="Ações"
          align="center"
          headerClassName="w-12rem"
          body={(rowData) => (
            <AcoesDataTable
              rowData={rowData}
              actions={actions}
            />
          )}
        />
      </DataTableCustom>
    </>
  );
};

export default memo(DtClientes);
