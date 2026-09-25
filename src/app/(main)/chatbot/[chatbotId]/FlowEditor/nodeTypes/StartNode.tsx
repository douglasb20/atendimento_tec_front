import { Handle, Position } from '@xyflow/react';
import { PrimeIcons } from 'primereact/api';

/**
 * O nó Início - fixo, sem configuração, só saída.
 *
 * `style` inline com `width` explícito, não classe utilitária: o React Flow
 * mede o próprio wrapper do nó para posicionar handles/seleção, e uma classe
 * PrimeFlex numa div filha não é o que ele lê. `surface-*` no lugar de
 * `bg-primary-50` porque este último é um tom claro fixo, sem variante dark.
 */
function StartNode() {
  return (
    <div
      className="border-round-lg shadow-2 surface-card border-1 border-300"
      style={{ width: '8rem' }}
    >
      <div className="flex align-items-center gap-2 p-2 border-round-lg surface-100">
        <i className={`${PrimeIcons.FLAG} text-primary`} />
        <span className="text-sm font-semibold text-primary">Início</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ padding: "0.350rem", zIndex: 1 }}
        className='border-2 border-700'
      />
    </div>
  );
}

export default StartNode;
