import React, { memo } from 'react';
import { Column } from 'primereact/column';

import { AtendimentosResponse } from '@/Interfaces';
import AcoesDataTable, { BodyCNPJ, BodyDateOnly } from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';
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
          align="center"
          body={BodyDateOnly}
        />
        <Column
          field="cli_cnpj"
          header="CNPJ"
          align="center"
          body={BodyCNPJ}
        />
        <Column
          field="cli_nome"
          header="Nome"
          align="center"
          body={(data: AtendimentosResponse) =>
            `${data.cli_nome}${data.contact_nome !== null && ` (${data.contact_nome})`}`
          }
        />
        <Column
          field="hora_inicio"
          header="Início"
          align="center"
          body={(data: AtendimentosResponse) =>
            DateToBR(`${data.data_referencia} ${data.hora_inicio}`, 'HH:mm')
          }
        />
        <Column
          field="hora_fim"
          header="Fim"
          align="center"
          body={(data: AtendimentosResponse) =>
            DateToBR(`${data.data_referencia} ${data.hora_fim}`, 'HH:mm')
          }
        />
        <Column
          field="duration"
          header="Duração"
          align="center"
          body={(data: AtendimentosResponse) =>
            DateToBR(`${data.data_referencia} ${data.duration}`, 'HH:mm')
          }
        />
        <Column
          field="comentario"
          header="Serviço"
          align="center"
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
