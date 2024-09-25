import React, { memo } from 'react';
import { Column } from 'primereact/column';

import AcoesDataTable from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';
import { DateToBR } from '@/service/Util';
import { IUsuariosResponse } from '@/Interfaces';

const DtUsuarios = ({ actions, ...props }) => {
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
          className="w-5rem"
        />
        <Column
          field="name"
          header="Nome"
          alignHeader="center"
        />
        <Column
          field="email"
          header="Email"
          alignHeader="center"
        />
        <Column
          field="lastlogin_at"
          header="Último login"
          alignHeader="center"
          headerClassName="w-12rem"
          body={(data: IUsuariosResponse) => data.lastlogin_at && DateToBR(data.lastlogin_at, 'dh')}
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

export default memo(DtUsuarios);
