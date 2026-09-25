import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { memo } from 'react';

import AcoesDataTable from '@/components/AcoesDataTable';
import DataTableCustom from '@/components/DataTableCustom';
import { ChatbotResponse } from '@/Interfaces';
import { DateToBR } from '@/service/Util';

const LABEL_POR_TIPO: Record<ChatbotResponse['type'], string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  agendamento: 'Agendamento',
  complementar: 'Complementar',
};

const DtChatbots = ({ actions, ...props }) => {
  return (
    <DataTableCustom
      value={props.value}
      emptyMessage="Nenhum chatbot cadastrado"
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
        header="Nome"
        sortable
        body={(chatbot: ChatbotResponse) => (
          <div className="flex flex-column">
            <span className="font-medium">{chatbot.name}</span>
            {chatbot.channel?.name && (
              <small className="text-color-secondary">{chatbot.channel.name}</small>
            )}
          </div>
        )}
      />

      <Column
        field="type"
        header="Tipo"
        headerClassName="w-10rem"
        sortable
        body={(chatbot: ChatbotResponse) => LABEL_POR_TIPO[chatbot.type]}
      />

      <Column
        field="active"
        header="Status"
        headerClassName="w-8rem"
        align="center"
        sortable
        body={(chatbot: ChatbotResponse) => (
          <Tag
            value={chatbot.active ? 'Ativo' : 'Inativo'}
            severity={chatbot.active ? 'success' : 'secondary'}
          />
        )}
      />

      <Column
        field="current_published_version_id"
        header="Publicado"
        headerClassName="w-8rem"
        align="center"
        body={(chatbot: ChatbotResponse) =>
          chatbot.current_published_version_id ? (
            <Tag
              value="Sim"
              severity="info"
            />
          ) : (
            <Tag
              value="Rascunho"
              severity="warning"
            />
          )
        }
      />

      <Column
        field="created_at"
        header="Criado em"
        headerClassName="w-12rem"
        sortable
        body={(chatbot: ChatbotResponse) => DateToBR(chatbot.created_at, 'P')}
      />

      <Column
        hidden={!actions ? true : false}
        header="Ações"
        align="center"
        headerClassName="w-14rem"
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

export default memo(DtChatbots);
