import { memo } from 'react';
import { Column, ColumnBodyOptions } from 'primereact/column';

import AcoesDataTable from '@/components/AcoesDataTable';
import Avatar from '@/components/Avatar';
import DataTableCustom from '@/components/DataTableCustom';
import { ContactResponse } from '@/Interfaces';
import { FormataTelefoneExibicao, nomeCompleto } from '@/service/Util';

// A máscara antiga presumia número nacional e lia o `55` do país como DDD:
// `556492698043` virava `(55) 6492-6980`, com o DDD errado e dois dígitos a
// menos. O helper conhece o DDI.
const BodyTelefone = (data: ContactResponse, options: ColumnBodyOptions) =>
  FormataTelefoneExibicao(data[options.field]);

const DtContatos = ({ actions, ...props }) => {
  return (
    <>
      <DataTableCustom
        value={props.value}
        emptyMessage="Nenhum contato encontrado"
        globalFilterFields={['name', 'last_name', 'phone']}
      >
        <Column
          header="Avatar"
          align="center"
          style={{ width: '5rem' }}
          body={(contato: ContactResponse) => (
            <Avatar src={contato.avatar_url} alt={nomeCompleto(contato) || 'Contato'}
              width={36} height={36} className="border-circle vertical-align-middle"
              style={{ objectFit: 'cover' }} />
          )}
        />
        <Column
          field="name"
          header="Nome"
          align="center"
          headerClassName=""
        />
        <Column
          field="last_name"
          header="Sobrenome"
          align="center"
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
