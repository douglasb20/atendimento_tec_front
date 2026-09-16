import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { memo } from 'react';

import AcoesDataTable from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';
import { IntegrationResponse } from '@/Interfaces';
import { DateToBR } from '@/service/Util';

/** O endereço é longo e quebraria a linha; o título traz o valor inteiro. */
const Endereco = ({ url }: { url: string | null }) =>
  url ? (
    <span
      className="text-sm text-600 white-space-nowrap overflow-hidden text-overflow-ellipsis block"
      style={{ maxWidth: '18rem' }}
      title={url}
    >
      {url}
    </span>
  ) : (
    <span className="text-sm text-400">—</span>
  );

const DtIntegracoes = ({ actions, ...props }) => {
  return (
    <DataTableCustom
      value={props.value}
      emptyMessage="Nenhuma integração cadastrada"
      globalFilterFields={['name', 'base_url', 'integrationProvider.name']}
    >
      <Column
        field="name"
        header="Integração"
        sortable
        body={(integracao: IntegrationResponse) => (
          <div className="flex flex-column">
            <div className="flex align-items-center gap-2">
              <span className="font-medium">{integracao.name}</span>
              {/* A padrão atende todo canal sem integração própria — é a
                  informação que decide qual delas o atendimento está usando. */}
              {integracao.is_default && (
                <Tag
                  value="Padrão"
                  severity="info"
                  className="text-xs"
                />
              )}
            </div>
            <span className="text-xs text-500">
              {integracao.integrationProvider?.name ?? 'Provider desconhecido'}
            </span>
          </div>
        )}
      />

      <Column
        field="base_url"
        header="Endereço"
        body={(integracao: IntegrationResponse) => <Endereco url={integracao.base_url} />}
      />

      <Column
        field="is_active"
        header="Situação"
        headerClassName="w-8rem"
        align="center"
        sortable
        body={(integracao: IntegrationResponse) => (
          <Tag
            value={integracao.is_active ? 'Ativa' : 'Inativa'}
            severity={integracao.is_active ? 'success' : 'danger'}
          />
        )}
      />

      <Column
        field="created_at"
        header="Criada em"
        headerClassName="w-10rem"
        sortable
        body={(integracao: IntegrationResponse) => DateToBR(integracao.created_at, 'P')}
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
  );
};

export default memo(DtIntegracoes);
