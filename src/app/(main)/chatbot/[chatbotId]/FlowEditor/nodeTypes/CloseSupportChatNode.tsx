import { Handle, NodeProps, Position } from '@xyflow/react';
import { PrimeIcons } from 'primereact/api';
import { InputSwitch } from 'primereact/inputswitch';

import LabelPlus from '@/components/LabelPlus';

import RemoverNoButton from './RemoverNoButton';

type CloseSupportChatData = {
  enviarDespedida?: boolean;
  executarFluxoSaida?: boolean;
  fluxoSaida?: boolean;
  onRemove?: () => void;
  onChange?: (data: CloseSupportChatData) => void;
};

/** Encerra o ticket, com despedida e pós-atendimento opcionais. */
function CloseSupportChatNode({ data, selected }: NodeProps) {
  const nodeData = data as CloseSupportChatData;
  const enviarDespedida = nodeData.enviarDespedida ?? true;

  return (
    <div
      className={`border-round-lg shadow-2 surface-card border-1 ${
        selected ? 'border-primary' : 'border-300'
      }`}
      style={{ width: '22rem' }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ padding: '0.450rem', zIndex: 1 }}
        className="border-2 border-700"
      />
      <Handle
        type="target"
        id="entrada-esquerda"
        position={Position.Left}
        style={{ padding: '0.450rem', zIndex: 1 }}
        className="border-2 border-700"
      />

      <div className="flex align-items-center justify-content-between gap-2 p-2 border-round-top-lg surface-100">
        <div className="flex align-items-center gap-2">
          <i className={`${PrimeIcons.POWER_OFF} text-primary`} />
          <div className="flex flex-column">
            <span className="text-xs text-color-secondary uppercase">Atendimento</span>
            <span className="text-lg font-semibold text-primary">Encerrar atendimento</span>
          </div>
        </div>
        <RemoverNoButton onRemove={nodeData.onRemove} />
      </div>

      <div className="py-2 flex flex-column gap-2 px-3">
        {!nodeData.fluxoSaida && (
          <>
            <div className="flex align-items-center gap-2">
              <InputSwitch
                className="nodrag"
                checked={enviarDespedida}
                onChange={(e) => nodeData.onChange?.({ enviarDespedida: e.value })}
              />
              <LabelPlus text="Enviar despedida" textHelp="Usa a mensagem de despedida configurada no canal, independentemente do fluxo de saída." />
            </div>
            <div className="flex align-items-center gap-2">
              <InputSwitch
                className="nodrag"
                checked={nodeData.executarFluxoSaida === true}
                onChange={(e) => nodeData.onChange?.({ executarFluxoSaida: e.value })}
              />
              <LabelPlus text="Executar fluxo de saída" textHelp="Após encerrar, executa o fluxo de saída do canal no mesmo protocolo, se o chatbot estiver habilitado e a saída ativa e publicada. Sem saída disponível, apenas encerra. Não dispara outra saída quando usado no pós-atendimento." />
            </div>
          </>
        )}
        <small className="text-color-secondary">
          {nodeData.fluxoSaida ? 'Conclui o pós-atendimento no mesmo protocolo, sem enviar outra despedida.'
            : 'Mantém o mesmo protocolo durante o pós-atendimento, quando houver.'}
        </small>
      </div>
    </div>
  );
}

export default CloseSupportChatNode;
