import { Handle, NodeProps, Position } from '@xyflow/react';
import { PrimeIcons } from 'primereact/api';

import RemoverNoButton from './RemoverNoButton';

/** O nó Finalizar - sem configuração, sem saída (encerra o fluxo). */
function FinishNode({ data, selected }: NodeProps) {
  const onRemove = (data as { onRemove?: () => void })?.onRemove;

  return (
    <div
      className={`border-round-lg shadow-2 surface-card border-1 ${
        selected ? 'border-primary' : 'border-300'
      }`}
      style={{ width: '13rem' }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ padding: "0.450rem", zIndex: 1 }}
        className='border-2 border-700'
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ padding: "0.450rem", zIndex: 1 }}
        className='border-2 border-700'
      />
      <div className="flex align-items-center justify-content-between gap-2 pl-3 p-2 border-round-lg surface-100">
        <div className="flex align-items-center gap-2">
          <i className={`${PrimeIcons.CHECK_CIRCLE} text-primary`} />
          <span className="text-lg font-semibold text-primary">Finalizar</span>
        </div>
        <RemoverNoButton onRemove={onRemove} />
      </div>
    </div>
  );
}

export default FinishNode;
