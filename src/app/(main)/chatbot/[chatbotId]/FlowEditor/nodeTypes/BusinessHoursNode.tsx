import { Handle, NodeProps, Position } from '@xyflow/react';
import { Dropdown } from 'primereact/dropdown';
import { useEffect, useState } from 'react';
import { DepartmentResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta } from '@/service/Util';
import RemoverNoButton from './RemoverNoButton';

type DadosHorario = {
  department_id?: number;
  onChange?: (dados: Record<string, unknown>) => void;
  onRemove?: () => void;
};

export default function BusinessHoursNode({ data, selected }: NodeProps) {
  const dados = data as DadosHorario;
  const { FetchReq } = useApi();
  const [setores, setSetores] = useState<DepartmentResponse[]>([]);
  useEffect(() => {
    let ativo = true;
    FetchReq<DepartmentResponse[]>('ListarSetores').then((lista) => { if (ativo) setSetores(lista ?? []); })
      .catch((erro) => CatchAlerta(erro, 'Não foi possível carregar os setores'));
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className={`border-round-lg shadow-2 surface-card border-1 ${selected ? 'border-primary' : 'border-300'}`} style={{ width: '24rem' }}>
    <Handle type="target" position={Position.Top} className="border-2 border-700" style={{ padding: '0.450rem' }} />
    <div className="flex align-items-center justify-content-between p-2 surface-100 border-round-top-lg">
      <span className="font-semibold text-primary"><i className="pi pi-clock mr-2" />Verificar horário do setor</span>
      <RemoverNoButton onRemove={dados.onRemove} />
    </div>
    <div className="p-2 flex flex-column gap-2">
      <Dropdown className="nodrag nowheel w-full" value={dados.department_id} options={setores} optionLabel="name" optionValue="id"
        placeholder="Escolha o setor" onChange={(e) => dados.onChange?.({ department_id: e.value })} />
      <small className="text-color-secondary">Consulta os horários, feriados e exceções cadastrados no setor. Não altera o setor do atendimento nem envia mensagens.</small>
    </div>
    {[{ id: 'inside', label: 'Dentro do horário' }, { id: 'outside', label: 'Fora do horário' }].map((saida) =>
      <div key={saida.id} className="relative p-2 border-top-1 border-300 text-sm">
        {saida.label}
        <Handle type="source" id={saida.id} position={Position.Right} className="border-2 border-700"
          style={{ padding: '0.450rem', top: '50%', right: '-1px', zIndex: 2 }} />
      </div>)}
  </div>;
}
