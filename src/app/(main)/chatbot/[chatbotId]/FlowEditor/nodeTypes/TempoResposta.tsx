import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { InputSwitch } from 'primereact/inputswitch';
import { InputNumber } from 'primereact/inputnumber';
import { useEffect } from 'react';
import LabelPlus from '@/components/LabelPlus';

export const SAIDA_SEM_RESPOSTA = 'sem-resposta';
export type ConfigTempoResposta = { replyTimeoutEnabled?: boolean; replyTimeoutMinutes?: number };

type Props = ConfigTempoResposta & {
  nodeId: string;
  onChange: (patch: ConfigTempoResposta) => void;
  onRemoveOutput?: (handleId: string) => void;
};

export default function TempoResposta({ nodeId, replyTimeoutEnabled = false, replyTimeoutMinutes = 5, onChange, onRemoveOutput }: Props) {
  const atualizarConectores = useUpdateNodeInternals();
  useEffect(() => { atualizarConectores(nodeId); }, [nodeId, replyTimeoutEnabled, atualizarConectores]);

  return <div className="flex flex-column gap-2 border-top-1 border-300 pt-2">
    <div className="flex align-items-center justify-content-between gap-3">
      <LabelPlus text="Tempo limite de resposta" textHelp="Se o cliente não responder, segue a saída Sem resposta. Ao responder ou sair do chatbot, o prazo deixa de valer." />
      <InputSwitch className="nodrag" checked={replyTimeoutEnabled} onChange={e => {
        onChange({ replyTimeoutEnabled: e.value, replyTimeoutMinutes });
        if (!e.value) onRemoveOutput?.(SAIDA_SEM_RESPOSTA);
      }} />
    </div>
    {replyTimeoutEnabled && <>
      <div className="flex align-items-center justify-content-between gap-3">
        <span className="text-sm text-color-secondary">Aguardar por</span>
        <InputNumber className="nodrag nowheel" value={replyTimeoutMinutes} min={1} max={10080}
          suffix=" min" useGrouping={false} maxFractionDigits={0} inputStyle={{ width: '7rem' }}
          onValueChange={e => onChange({ replyTimeoutMinutes: e.value ?? 5 })} />
      </div>
      <div className="text-sm text-color-secondary py-2" style={{ position: 'relative' }}>
        Sem resposta
        <Handle type="source" id={SAIDA_SEM_RESPOSTA} position={Position.Right} className="border-2 border-700"
          style={{ right: '-8px', top: '50%', padding: '0.550rem', zIndex: 5, transform: 'translate(50%, -50%)' }} />
      </div>
    </>}
  </div>;
}
