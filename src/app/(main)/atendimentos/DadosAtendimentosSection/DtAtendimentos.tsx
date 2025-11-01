import React, { memo, useState } from 'react';
import { Column } from 'primereact/column';
import { Divider } from 'primereact/divider';
import { Tag, TagProps } from 'primereact/tag';

import { AtendimentosResponse } from '@/Interfaces';
import AcoesDataTable, { BodyCurrency, BodyDateOnly } from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';
import { DateToBR, FormatCurrency, Mask } from '@/service/Util';

const GetTagSeverity = (status_id: number): TagProps['severity'] => {
  switch (status_id) {
    case 1:
      return 'danger';
    case 2:
      return 'warning';
    default:
      return 'success';
  }
};

const DtAtendimentos = ({ actions, ...props }) => {
  const [expandedRows, setExpandedRows] = useState<AtendimentosResponse>(null);
  const [_, setDataExpand] = useState<AtendimentosResponse>(null);

  const rowExpansionTemplate = (data: AtendimentosResponse) => {
    return (
      <div className="px-3 py-2">
        <div className="grid ">
          <div className="col-2 text-center py-0">
            <div className="col-2 py-0 font-bold text-10 w-full">CNPJ</div>
            <div className="col-6 py-0 w-full">
              {data.cli_cnpj && Mask(data.cli_cnpj, '##.###.###/####-##')}
            </div>
          </div>
          <div className="col-2 text-center py-0">
            <div className="col-2 py-0 font-bold text-10 w-full">Contato</div>
            <div className="col-6 py-0 w-full">{data.contact_nome || '-'}</div>
          </div>
          <div className="col-2 text-center py-0">
            <div className="col-4 py-0 font-bold text-10 w-full">Valor</div>
            <div className="col-6 py-0 w-full">{FormatCurrency(data.valor_total)}</div>
          </div>
          <div className="col-2 text-center py-0">
            <div className="col-4 py-0 font-bold text-10 w-full">Está pago</div>
            <div className="col-6 py-0 w-full">{data.esta_pago ? 'Sim' : 'Não'}</div>
          </div>
          <div className="col-4 text-center py-0">
            <div className="col-4 py-0 font-bold text-10 w-full">Comentário</div>
            <div className="col-6 py-0 w-full">{data.comentario}</div>
          </div>
          {data.tipo_entrada === 'S' && (
            <>
              <div className="col-12 mt-3">
                <Divider className="my-0 py-0" />
                <h5>Serviços</h5>
                <Divider className="my-0 py-0" />
              </div>
              {data.atendimentosServicos.map((v, k) => (
                <React.Fragment key={k}>
                  <div className="col-12 grid py-0">
                    <div className="col-2 py-0 font-bold text-10">Serviço</div>
                    <div className="col-6 py-0">{v.service.name}</div>
                  </div>
                  <div className="col-12 grid py-0">
                    <div className="col-2 py-1 font-bold text-10">Valor cobrado</div>
                    <div className="col-6 py-1">{FormatCurrency(v.valor_cobrado)}</div>
                  </div>
                  <Divider />
                </React.Fragment>
              ))}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <DataTableCustom
        value={props.value}
        emptyMessage="Nenhum atendimento encontrado"
        expandedRows={expandedRows as any}
        onRowToggle={({ data }) => setExpandedRows(data as unknown as AtendimentosResponse)}
        onRowCollapse={() => setDataExpand(null)}
        onRowExpand={({ data }) => setDataExpand(data as AtendimentosResponse)}
        rowExpansionTemplate={rowExpansionTemplate}
      >
        <Column
          alignHeader="center"
          headerClassName="text-10"
          expander={true}
          style={{ width: '5rem' }}
          align="center"
        />
        <Column
          field="data_referencia"
          header="Data"
          align="center"
          className="w-8rem"
          body={BodyDateOnly}
        />
        <Column
          field="cli_nome"
          header="Nome"
          align="center"
          className="w-20rem"
        />
        <Column
          field="hora_inicio"
          header="Início"
          align="center"
          body={({ hora_inicio, data_referencia }: AtendimentosResponse) =>
            hora_inicio && DateToBR(`${data_referencia} ${hora_inicio}`, 'HH:mm')
          }
        />
        <Column
          field="hora_fim"
          header="Fim"
          align="center"
          body={({ hora_fim, data_referencia }: AtendimentosResponse) =>
            hora_fim && DateToBR(`${data_referencia} ${hora_fim}`, 'HH:mm')
          }
        />
        <Column
          field="duration"
          header="Duração"
          align="center"
          body={({ duration, data_referencia }: AtendimentosResponse) =>
            duration && DateToBR(`${data_referencia} ${duration}`, 'HH:mm')
          }
        />
        <Column
          field="comentario"
          header="Comentário"
          align="center"
          className="w-25rem"
          body={({ comentario }: AtendimentosResponse) =>
            comentario.length > 25 ? comentario.slice(0, 25).trim() + '...' : comentario
          }
        />
        <Column
          field="status_descricao"
          header="Status"
          align="center"
          body={({ atendimento_status_id, status_descricao }: AtendimentosResponse) => (
            <Tag
              severity={GetTagSeverity(atendimento_status_id)}
              value={status_descricao}
            />
          )}
        />
        <Column
          field="total_amount"
          header="Valor"
          align="center"
          className="w-10rem"
          body={BodyCurrency}
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

export default memo(DtAtendimentos);
