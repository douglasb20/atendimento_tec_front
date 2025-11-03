import React, { memo } from 'react';
import { Column, ColumnBodyOptions } from 'primereact/column';

import AcoesDataTable from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';
import { ContactResponse } from '@/Interfaces';
import { Mask } from '@/service/Util';

const BodyTelefone = (data: ContactResponse, options: ColumnBodyOptions) => {
  let value: string = data[options.field];
  if (value) {
    const maskType = value.length === 11 ? '(##) # ####-####' : '(##) ####-####';
    value = Mask(value, maskType);
  }

  return value;
};

const DtContatos = ({ actions, ...props }) => {
  return (
    <>
      <DataTableCustom
        value={props.value}
        emptyMessage="Nenhum contato encontrado"
      >
        <Column
          field="name"
          header="Nome"
          align="center"
          headerClassName=""
        />
        <Column
          field="phone"
          header="Telefone"
          align="center"
          headerClassName="w-3"
          body={BodyTelefone}
        />
        <Column
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

export default memo(DtContatos);
