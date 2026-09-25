import { Handle, NodeProps, Position } from '@xyflow/react';
import { PrimeIcons } from 'primereact/api';

import RemoverNoButton from './RemoverNoButton';

type Condicao = { id: string; operator: string; term: string };

type ConditionalData = {
  conditions?: Condicao[];
  defaultOutputHandle?: string;
  onRemove?: () => void;
};

/** Estilo do handle dentro de uma linha - `position: relative` na linha já
 * torna isto seu ponto de referência, sem precisar calcular percentuais do
 * nó inteiro. */
const handleNaLinha = { position: 'absolute', right: '-6px', top: '50%', transform: 'translateY(-50%)' } as const;

const LABEL_OPERADOR: Record<string, string> = {
  equals: 'igual a',
  contains: 'contém',
  greater_than: 'maior que',
  less_than: 'menor que',
};

/**
 * O nó Condicional - uma saída por condição (na ordem em que aparecem) mais a
 * saída padrão sempre por último. Cada saída é endereçada pelo `id` da
 * condição, exatamente como o `ConditionalHandler` do motor resolve.
 */
function ConditionalNode({ data, selected }: NodeProps) {
  const conditionalData = data as ConditionalData;
  const condicoes = conditionalData.conditions ?? [];

  return (
    <div
      className={`border-round-lg shadow-2 surface-card border-1 ${
        selected ? 'border-primary' : 'border-300'
      }`}
      style={{ width: '19rem' }}
    >
      <Handle
        type="source"
        position={Position.Top}
        style={{ padding: "0.550rem", zIndex: 1 }}
        className='border-2 border-700'
      />
      <Handle
        type="target"
        position={Position.Bottom}
        style={{ padding: "0.550rem", zIndex: 1 }}
        className='border-2 border-700'
      />

      <div className="flex align-items-center justify-content-between gap-2 p-2 border-round-top-lg surface-100">
        <div className="flex align-items-center gap-2">
          <i className={`${PrimeIcons.SITEMAP} text-primary`} />
          <span className="text-lg font-semibold text-primary">Condicional</span>
        </div>
        <RemoverNoButton onRemove={conditionalData.onRemove} />
      </div>

      <div className="flex flex-column">
        {condicoes.length === 0 && (
          <div className="p-2 text-sm text-color-secondary">Clique para configurar</div>
        )}

        {condicoes.map((condicao) => (
          <div
            key={condicao.id}
            style={{ position: 'relative' }}
            className="flex align-items-center justify-content-between gap-2 p-2 border-top-1 border-300 text-sm"
          >
            <span>
              {LABEL_OPERADOR[condicao.operator] ?? condicao.operator} &quot;{condicao.term}&quot;
            </span>
            <Handle
              type="source"
              id={condicao.id}
              position={Position.Right}
              style={handleNaLinha}
            />
          </div>
        ))}

        <div
          style={{ position: 'relative' }}
          className="flex align-items-center justify-content-between gap-2 p-2 border-top-1 border-300 text-sm text-color-secondary"
        >
          <span>Saída padrão</span>
        </div>
      </div>
    </div>
  );
}

export default ConditionalNode;
