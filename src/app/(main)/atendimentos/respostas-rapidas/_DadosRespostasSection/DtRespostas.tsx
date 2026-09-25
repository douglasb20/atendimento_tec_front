'use client';

import { Column } from 'primereact/column';
import { memo } from 'react';

import AcoesDataTable, { IActionTable } from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';
import { QuickReplyResponse } from '@/Interfaces';
import { DateToBR } from '@/service/Util';

type DtRespostasProps = {
  value: QuickReplyResponse[];
  actions: IActionTable<QuickReplyResponse>[];
};

/** Um trecho da mensagem, para a linha não virar um parágrafo. */
const RESUMO_MAX = 80;

const DtRespostas = ({ value, actions }: DtRespostasProps) => (
  <DataTableCustom
    value={value}
    emptyMessage="Nenhuma resposta rápida cadastrada"
    globalFilterFields={['atalho', 'mensagem']}
  >
    <Column
      field="atalho"
      header="Atalho"
      sortable
      style={{ width: '14rem' }}
      body={({ atalho }: QuickReplyResponse) => (
        <span className="font-semibold text-primary">/{atalho}</span>
      )}
    />

    <Column
      field="mensagem"
      header="Mensagem"
      body={({ mensagem }: QuickReplyResponse) => (
        <span
          className="text-color-secondary"
          title={mensagem}
        >
          {mensagem.length > RESUMO_MAX ? `${mensagem.slice(0, RESUMO_MAX)}…` : mensagem}
        </span>
      )}
    />

    <Column
      header="Anexo"
      style={{ width: '12rem' }}
      body={({ anexo_nome }: QuickReplyResponse) =>
        anexo_nome ? (
          <span
            className="flex align-items-center gap-2 text-sm"
            title={anexo_nome}
          >
            <i className="fa-regular fa-paperclip text-500" />
            <span className="white-space-nowrap overflow-hidden text-overflow-ellipsis">
              {anexo_nome}
            </span>
          </span>
        ) : (
          <span className="text-500">-</span>
        )
      }
    />

    <Column
      field="created_at"
      header="Criada em"
      sortable
      style={{ width: '10rem' }}
      body={({ created_at }: QuickReplyResponse) => DateToBR(created_at, 'P')}
    />

    <Column
      header="Ações"
      style={{ width: '8rem' }}
      body={(rowData: QuickReplyResponse) => (
        <AcoesDataTable
          rowData={rowData}
          actions={actions}
        />
      )}
    />
  </DataTableCustom>
);

/** Memoizado: a listagem recarrega inteira a cada salvamento. */
export default memo(DtRespostas);
