import { memo } from 'react';
import { Column } from 'primereact/column';

import AcoesDataTable, { BodyDateAndTime } from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';
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
        {/* Sem grupo é estado válido e precisa se distinguir de dado faltando:
            o usuário entra no portal e não acessa nada. */}
        <Column
          field="permissionGroup.name"
          header="Grupo"
          align="center"
          headerClassName="w-12rem"
          body={(usuario: IUsuariosResponse) =>
            usuario.permissionGroup?.name ?? <span className="text-500 text-sm">Sem grupo</span>
          }
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
