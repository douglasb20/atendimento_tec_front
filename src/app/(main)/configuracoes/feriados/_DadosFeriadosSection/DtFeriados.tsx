import { Column } from 'primereact/column';
import { memo } from 'react';

import AcoesDataTable from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';
import { HolidayResponse } from '@/Interfaces';

/** `25/12` (recorrente) ou `25/12/2027` (data completa). */
const formataData = (feriado: HolidayResponse): string => {
  const dia = String(feriado.day).padStart(2, '0');
  const mes = String(feriado.month).padStart(2, '0');
  return feriado.recurring ? `${dia}/${mes}` : `${dia}/${mes}/${feriado.year}`;
};

const DtFeriados = ({ actions, ...props }) => {
  return (
    <DataTableCustom
      value={props.value}
      emptyMessage="Nenhum feriado cadastrado"
      globalFilterFields={['name']}
    >
      <Column
        field="id"
        header="#"
        headerClassName="w-1"
        sortable
      />

      <Column
        field="name"
        header="Feriado"
        sortable
        body={(feriado: HolidayResponse) => (
          <div className="flex align-items-center gap-2">
            <span>{feriado.name}</span>
            {feriado.is_system && (
              <i
                className="pi pi-lock text-color-secondary text-sm"
                title="Feriado nacional - data e exclusão são fixas"
              />
            )}
          </div>
        )}
      />

      <Column
        field="day"
        header="Data"
        headerClassName="w-10rem"
        body={formataData}
        sortable
      />

      <Column
        field="recurring"
        header="Recorrência"
        headerClassName="w-10rem"
        align="center"
        body={(feriado: HolidayResponse) =>
          feriado.recurring ? 'Todo ano' : `Só em ${feriado.year}`
        }
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

export default memo(DtFeriados);
