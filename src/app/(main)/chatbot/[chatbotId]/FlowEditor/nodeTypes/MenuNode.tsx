import { Handle, NodeProps, Position } from '@xyflow/react';
import { PrimeIcons } from 'primereact/api';

import RemoverNoButton from './RemoverNoButton';

type MenuOption = { id: string; emoji?: string; text: string };

type MenuData = {
  title?: string;
  options?: MenuOption[];
  invalidOptionOutputHandle?: string;
  onRemove?: () => void;
};

const handleNaLinha = { position: 'absolute', right: '-6px', top: '50%', transform: 'translateY(-50%)' } as const;

/**
 * O nó Menu - uma saída por opção (na ordem em que aparecem) mais a saída
 * "Opção inválida" sempre por último. Cada saída é endereçada pelo `id` da
 * opção, exatamente como o `MenuHandler` do motor resolve.
 */
function MenuNode({ data, selected }: NodeProps) {
  const menuData = data as MenuData;
  const opcoes = menuData.options ?? [];

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
        style={{ padding: '0.550rem', zIndex: 1 }}
        className="border-2 border-700"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        style={{ padding: '0.550rem', zIndex: 1 }}
        className="border-2 border-700"
      />

      <div className="flex align-items-center justify-content-between gap-2 p-2 border-round-top-lg surface-100">
        <div className="flex align-items-center gap-2">
          <i className={`${PrimeIcons.LIST} text-primary`} />
          <span className="text-lg font-semibold text-primary">Menu</span>
        </div>
        <RemoverNoButton onRemove={menuData.onRemove} />
      </div>

      <div className="flex flex-column">
        {menuData.title && (
          <div className="p-2 border-top-1 border-300 text-sm font-semibold">{menuData.title}</div>
        )}

        {opcoes.length === 0 && (
          <div className="p-2 text-sm text-color-secondary">Clique para configurar</div>
        )}

        {opcoes.map((opcao, indice) => (
          <div
            key={opcao.id}
            style={{ position: 'relative' }}
            className="flex align-items-center justify-content-between gap-2 p-2 border-top-1 border-300 text-sm"
          >
            <span>
              {indice + 1}. {opcao.emoji ? `${opcao.emoji} ` : ''}
              {opcao.text || '(sem texto)'}
            </span>
            <Handle
              type="source"
              id={opcao.id}
              position={Position.Right}
              style={handleNaLinha}
            />
          </div>
        ))}

        <div
          style={{ position: 'relative' }}
          className="flex align-items-center justify-content-between gap-2 p-2 border-top-1 border-300 text-sm text-color-secondary"
        >
          <span>Opção inválida</span>
          <Handle
            type="source"
            id={menuData.invalidOptionOutputHandle}
            position={Position.Right}
            style={handleNaLinha}
          />
        </div>
      </div>
    </div>
  );
}

export default MenuNode;
