import { memo } from 'react';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';

import AcoesDataTable, { BodyDateAndTime } from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';
import { IUsuariosResponse } from '@/Interfaces';
import { nomeCompleto } from '@/service/Util';

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
          body={(usuario: IUsuariosResponse) => (
            <span className="flex align-items-center gap-2">
              {usuario.schedule_color && (
                <span
                  className="border-circle border-1 surface-border flex-none"
                  style={{ width: '0.8rem', height: '0.8rem', backgroundColor: usuario.schedule_color }}
                  title={`Cor da agenda: ${usuario.schedule_color}`}
                />
              )}
              {nomeCompleto(usuario)}
            </span>
          )}
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
          header="Setores"
          body={(usuario: IUsuariosResponse) =>
            usuario.departments?.length ? (
              usuario.departments.map((setor) => setor.name).join(', ')
            ) : (
              <span className="text-500 text-sm">Nenhum</span>
            )
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
          header="Status"
          align="center"
          headerClassName="w-10rem"
          body={(usuario: IUsuariosResponse) =>
            usuario.convite_status === 'pendente' ? (
              <Tag
                severity="warning"
                value="Convite pendente"
              />
            ) : (
              <Tag
                severity="success"
                value="Ativo"
              />
            )
          }
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
