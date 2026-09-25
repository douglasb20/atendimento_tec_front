import { Dialog as Modal } from 'primereact/dialog';
import { PrimeIcons } from 'primereact/api';

import { ChatbotFlowNode } from '@/Interfaces';

import ConditionalNodeConfig from './ConditionalNodeConfig';

type NodeConfigDrawerProps = {
  node: ChatbotFlowNode | null;
  onHide: () => void;
  onChange: (nodeId: string, data: Record<string, unknown>) => void;
  onRemoveOutput: (nodeId: string, handleId: string) => void;
};

const TITULO_POR_TIPO: Record<string, string> = {
  conditional: 'Condicional',
  finish: 'Finalizar',
};

const ICONE_POR_TIPO: Record<string, string> = {
  conditional: PrimeIcons.SITEMAP,
  finish: PrimeIcons.CHECK_CIRCLE,
};

/**
 * O modal de configuração de um nó - centralizado sobre o canvas, igual à
 * referência (card "CHATBOT / [Tipo]" com X para fechar), não um drawer
 * lateral. Dispatcha por `node.type`, sem switch central: adicionar um tipo
 * novo é um componente novo e uma linha aqui. Início e Finalizar não têm
 * campo algum. Mensagem não usa este modal - se configura inline no próprio
 * card (ver `nodeTypes/MessageNode.tsx`).
 */
function NodeConfigDrawer({ node, onHide, onChange, onRemoveOutput }: NodeConfigDrawerProps) {
  return (
    <Modal
      visible={!!node}
      onHide={onHide}
      className="p-fluid"
      style={{ width: '28rem' }}
      breakpoints={{ '640px': '95vw' }}
      header={
        node && (
          <div className="flex align-items-center gap-2">
            <i className={ICONE_POR_TIPO[node.type]} />
            <div className="flex flex-column">
              <span className="text-xs text-color-secondary uppercase">Chatbot</span>
              <span className="font-semibold">{TITULO_POR_TIPO[node.type] ?? node.type}</span>
            </div>
          </div>
        )
      }
    >
      {node?.type === 'conditional' && (
        <ConditionalNodeConfig
          data={node.data}
          onChange={(data) => onChange(node.id, data)}
          onRemoveOutput={(handleId) => onRemoveOutput(node.id, handleId)}
        />
      )}
    </Modal>
  );
}

export default NodeConfigDrawer;
