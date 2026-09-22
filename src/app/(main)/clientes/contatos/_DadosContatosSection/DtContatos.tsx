import { memo } from 'react';
import { Column, ColumnBodyOptions } from 'primereact/column';

import AcoesDataTable from '@/components/AcoesDataTable';
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
      >
        <Column
          field="name"
          header="Nome"
          align="center"
          headerClassName=""
          // As colunas são separadas no banco; a tabela mostra o nome inteiro.
          body={(contato: ContactResponse) => nomeCompleto(contato)}
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
