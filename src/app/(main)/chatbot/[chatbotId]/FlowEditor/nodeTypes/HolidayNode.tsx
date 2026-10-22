import { Handle, NodeProps, Position } from '@xyflow/react';
import { PrimeIcons } from 'primereact/api';

import RemoverNoButton from './RemoverNoButton';

type HolidayData = {
  holidayOutputHandle?: string;
  notHolidayOutputHandle?: string;
  onRemove?: () => void;
};

const handleNaLinha = { position: 'absolute', right: '-6px', top: '50%', transform: 'translateY(-50%)' } as const;

/**
 * O nó Feriados - sem configuração, 2 saídas fixas (É feriado / Não é
 * feriado). Consulta o cadastro global de feriados em runtime
 * (`HolidayHandler`), não algo que se escolhe aqui.
 */
function HolidayNode({ data, selected }: NodeProps) {
  const holidayData = data as HolidayData;

  return (
    <div
      className={`border-round-lg shadow-2 surface-card border-1 ${
        selected ? 'border-primary' : 'border-300'
      }`}
      style={{ width: '16rem' }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ padding: '0.550rem', zIndex: 1 }}
        className="border-2 border-700"
      />

      <div className="flex align-items-center justify-content-between gap-2 p-2 border-round-top-lg surface-100">
        <div className="flex align-items-center gap-2">
          <i className={`${PrimeIcons.CALENDAR} text-primary`} />
          <span className="text-lg font-semibold text-primary">Feriados</span>
        </div>
        <RemoverNoButton onRemove={holidayData.onRemove} />
      </div>

      <div className="flex flex-column">
        <div
          style={{ position: 'relative' }}
          className="flex align-items-center justify-content-between gap-2 p-2 border-top-1 border-300 text-sm"
        >
          <span>É feriado</span>
          <Handle
            type="source"
            id={holidayData.holidayOutputHandle}
            position={Position.Right}
            style={handleNaLinha}
          />
        </div>

        <div
          style={{ position: 'relative' }}
          className="flex align-items-center justify-content-between gap-2 p-2 border-top-1 border-300 text-sm text-color-secondary"
        >
          <span>Não é feriado</span>
          <Handle
            type="source"
            id={holidayData.notHolidayOutputHandle}
            position={Position.Right}
            style={handleNaLinha}
          />
        </div>
      </div>
    </div>
  );
}

export default HolidayNode;
