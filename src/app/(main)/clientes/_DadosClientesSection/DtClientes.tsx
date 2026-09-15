import React, { memo } from 'react';
import { Column } from 'primereact/column';

import AcoesDataTable, { BodyCNPJ } from '@/components/AcoesDataTable';
import ChipTag from '@/components/ChipTag';
import { ClientResponse } from '@/Interfaces';
import DataTableCustom from '@/components/DataTableCustom';

const DtClientes = ({ actions, ...props }) => {
  return (
    <>
      <DataTableCustom
        // `tags_busca` é derivado das etiquetas (ver a seção): o filtro global
        // compara valores simples, e um array de objetos nunca casaria.
        globalFilterFields={['nome', 'cnpj', 'tags_busca']}
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
          align="center"
        />
        <Column
          field="cnpj"
          header="CNPJ"
          align="center"
          className="w-15rem"
          body={BodyCNPJ}
        />
        <Column
          header="Etiquetas"
          className="w-18rem"
          body={(cliente: ClientResponse) =>
            cliente.tags?.length ? (
              <div className="flex flex-wrap gap-1">
                {cliente.tags.map((tag) => (
                  <ChipTag
                    key={tag.id}
                    tag={tag}
                  />
                ))}
              </div>
            ) : (
              <span className="text-400">—</span>
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

export default memo(DtClientes);
