import { Column } from 'primereact/column';
import { memo } from 'react';

import AcoesDataTable, { BodyCurrency, BodyDateAndTime } from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';

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
          field="valor_hora"
          header="Valor hora"
          align="center"
          body={BodyCurrency}
        />
        <Column
          field="lastlogin_at"
          header="Último login"
          alignHeader="center"
          headerClassName="w-12rem"
          body={BodyDateAndTime}
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
