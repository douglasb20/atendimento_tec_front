import React, { memo } from 'react';
import { Column } from 'primereact/column';

import AcoesDataTable from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';
import { AtendimentosResponse } from '@/Interfaces';
import { DateToBR } from '@/service/Util';

const DtAtendimentos = ({ actions, ...props }) => {
  return (
    <>
      <DataTableCustom
        value={props.value}
        emptyMessage="Nenhum atendimento encontrado"
      >
        <Column
          field="data_referencia"
          header="Data"
          alignHeader="center"
          body={(data: AtendimentosResponse) => DateToBR(data.data_referencia)}
        />
        <Column
          field="cli_cnpj"
          header="CNPJ"
          alignHeader="center"
        />
        <Column
          field="cli_nome"
          header="Nome"
          alignHeader="center"
          body={(data: AtendimentosResponse) => {
            return (
              <div className="w-full flex align-items-center gap-1">
                {data.cli_nome}
                {data.contact_nome !== null && <>({data.contact_nome})</>}
              </div>
            );
          }}
        />
        <Column
          field="hora_inicio"
          header="Início"
          alignHeader="center"
          body={(data: AtendimentosResponse) =>
            DateToBR(`${data.data_referencia} ${data.hora_inicio}`, 'HH:mm')
          }
        />
        <Column
          field="hora_fim"
          header="Fim"
          alignHeader="center"
          body={(data: AtendimentosResponse) =>
            DateToBR(`${data.data_referencia} ${data.hora_fim}`, 'HH:mm')
          }
        />
        <Column
          field="duration"
          header="Duração"
          alignHeader="center"
          body={(data: AtendimentosResponse) =>
            DateToBR(`${data.data_referencia} ${data.duration}`, 'HH:mm')
          }
        />
        <Column
          field="comentario"
          header="Serviço"
          alignHeader="center"
          className="w-30rem"
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

export default memo(DtAtendimentos);
