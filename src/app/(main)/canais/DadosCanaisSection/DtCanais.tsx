import { Column } from 'primereact/column';
import { Tag, TagProps } from 'primereact/tag';
import { memo } from 'react';

import AcoesDataTable, { BodyDateAndTime, BodyPhone } from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';
import { ChannelResponse } from '@/Interfaces';

const GetStatusSeverity = (channel_status_id: number): TagProps['severity'] => {
  switch (channel_status_id) {
    case 1:
    case 5:
      return 'danger';
    case 2:
      return 'warning';
    case 3:
      return 'success';
    case 4:
      return 'info';
  }
};

const DtCanais = ({ actions, ...props }) => {
  return (
    <>
      <DataTableCustom
        value={props.value}
        emptyMessage="Nenhum canal encontrado"
      >
        {/* <Column
          alignHeader="center"
          headerClassName="text-10"
          expander={true}
          style={{ width: '5rem' }}
          align="center"
        /> */}
        <Column
          field="name"
          header="Nome"
          align="center"
          className="w-8rem"
        />
        <Column
          field="phone_number"
          header="Telefone"
          align="center"
          className="w-10rem"
          body={BodyPhone}
        />
        <Column
          field="created_at"
          header="Criado em"
          align="center"
          className="w-10rem"
          body={BodyDateAndTime}
        />
        <Column
          field="channel_status_id"
          header="Status"
          align="center"
          className="w-8rem"
          body={({ channel_status_id, channelStatus }: ChannelResponse) => {
            const severity = GetStatusSeverity(channel_status_id);
            return (
              <Tag
                severity={severity}
                value={channelStatus.name}
              />
            );
          }}
        />
        <Column
          hidden={!actions ? true : false}
          header="Ações"
          align="center"
          headerClassName="w-9rem"
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

export default memo(DtCanais);
