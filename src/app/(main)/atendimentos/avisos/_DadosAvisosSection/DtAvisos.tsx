'use client';

import { Column } from 'primereact/column';
import { InputSwitch } from 'primereact/inputswitch';
import { Tag } from 'primereact/tag';
import { memo } from 'react';

import AcoesDataTable, { IActionTable } from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';
import { ServiceAlertResponse } from '@/Interfaces';
import { DateToBR } from '@/service/Util';

type DtAvisosProps = {
  value: ServiceAlertResponse[];
  actions: IActionTable<ServiceAlertResponse>[];
  onAlternarAtivo: (aviso: ServiceAlertResponse, ativo: boolean) => void;
  podeAlternar: boolean;
};

/** Um trecho da mensagem, para a linha não virar um parágrafo. */
const RESUMO_MAX = 70;

/** Expirado é diferente de desligado: o aviso está ligado, mas o prazo passou. */
const expirou = (expira_em: string | null): boolean =>
  !!expira_em && new Date(expira_em).getTime() <= Date.now();

const DtAvisos = ({ value, actions, onAlternarAtivo, podeAlternar }: DtAvisosProps) => (
  <DataTableCustom
    value={value}
    emptyMessage="Nenhum aviso cadastrado"
    globalFilterFields={['titulo', 'mensagem']}
  >
    {/* Primeira coluna, e não a última: o estado é o que se procura na lista
        durante um incidente - ligar ou desligar é a ação, não um detalhe. */}
    <Column
      header="Ativo"
      style={{ width: '6rem' }}
      align='center'
      alignHeader='center'
      body={(aviso: ServiceAlertResponse) => (
        <InputSwitch
          checked={aviso.ativo}
          disabled={!podeAlternar}
          onChange={(e) => onAlternarAtivo(aviso, !!e.value)}
          aria-label={aviso.ativo ? 'Desativar aviso' : 'Ativar aviso'}
        />
      )}
    />

    <Column
      field="titulo"
      header="Título"
      sortable
      style={{ width: '16rem' }}
      body={(aviso: ServiceAlertResponse) => (
        <div className="flex flex-column gap-1">
          <span className="font-semibold">{aviso.titulo}</span>
          {/* Ligado mas vencido não sai, e a lista precisa dizer isso - senão
              parece que o envio quebrou. */}
          {aviso.ativo && expirou(aviso.expira_em) && (
            <Tag
              value="Prazo vencido"
              severity="warning"
              className="w-fit text-xs"
            />
          )}
        </div>
      )}
    />

    <Column
      field="mensagem"
      header="Mensagem"
      body={({ mensagem }: ServiceAlertResponse) => (
        <span
          className="text-color-secondary"
          title={mensagem}
        >
          {mensagem.length > RESUMO_MAX ? `${mensagem.slice(0, RESUMO_MAX)}…` : mensagem}
        </span>
      )}
    />

    <Column
      header="Canais"
      style={{ width: '14rem' }}
      body={({ channels }: ServiceAlertResponse) =>
        channels?.length ? (
          <span
            className="text-sm"
            title={channels.map((c) => c.name).join(', ')}
          >
            {channels.length === 1 ? channels[0].name : `${channels.length} canais`}
          </span>
        ) : (
          // A convenção do backend: sem vínculo, vale para todos.
          <span className="text-sm text-color-secondary">Todos</span>
        )
      }
    />

    <Column
      field="expira_em"
      header="Expira em"
      sortable
      style={{ width: '11rem' }}
      body={({ expira_em }: ServiceAlertResponse) =>
        expira_em ? (
          <span className={expirou(expira_em) ? 'text-orange-500' : undefined}>
            {DateToBR(expira_em, 'dh')}
          </span>
        ) : (
          <span className="text-500">Sem prazo</span>
        )
      }
    />

    <Column
      header="Ações"
      style={{ width: '8rem' }}
      body={(rowData: ServiceAlertResponse) => (
        <AcoesDataTable
          rowData={rowData}
          actions={actions}
        />
      )}
    />
  </DataTableCustom>
);

/** Memoizado: a listagem recarrega inteira a cada salvamento. */
export default memo(DtAvisos);
