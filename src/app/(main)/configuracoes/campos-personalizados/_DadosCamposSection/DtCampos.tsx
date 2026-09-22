import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { memo } from 'react';

import AcoesDataTable from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';
import { CustomFieldResponse, ROTULO_APLICA_A, ROTULO_TIPO } from '@/Interfaces';

/** As opções em linha, para a lista ser conferível sem abrir a edição. */
const BodyOpcoes = (campo: CustomFieldResponse) => {
  if (campo.tipo !== 'lista') return <span className="text-400">-</span>;

  return (
    <div className="flex flex-wrap gap-1 justify-content-center">
      {(campo.opcoes ?? []).map((opcao) => (
        <Tag
          key={opcao}
          value={opcao}
          severity="secondary"
          className="text-xs"
        />
      ))}
    </div>
  );
};

const DtCampos = ({ actions, ...props }) => {
  return (
    <DataTableCustom
      {...props}
      globalFilterFields={['nome']}
    >
      <Column
        field="nome"
        header="Nome"
        align="center"
        sortable
      />
      <Column
        header="Tipo"
        align="center"
        headerClassName="w-10rem"
        body={(campo: CustomFieldResponse) => ROTULO_TIPO[campo.tipo] ?? campo.tipo}
      />
      <Column
        header="Onde aparece"
        align="center"
        headerClassName="w-12rem"
        body={(campo: CustomFieldResponse) => ROTULO_APLICA_A[campo.aplica_a] ?? campo.aplica_a}
      />
      <Column
        header="Opções"
        align="center"
        body={BodyOpcoes}
      />
      <Column
        header="Ações"
        align="center"
        headerClassName="w-8rem"
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

/** Memoizado: a lista só muda ao salvar ou remover. */
export default memo(DtCampos);
