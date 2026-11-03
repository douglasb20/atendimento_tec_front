import { Handle, NodeProps, Position } from '@xyflow/react';
import { Dropdown } from 'primereact/dropdown';
import { useEffect, useMemo, useState } from 'react';
import LabelPlus from '@/components/LabelPlus';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta } from '@/service/Util';
import RemoverNoButton from './RemoverNoButton';

type Setor = { id: number; name: string };
type Atendente = { id: number; name: string; last_name?: string; department_id: number };
type Destinos = { setores: Setor[]; atendentes: Atendente[] };
type DadosEncaminhamento = {
  destination?: 'department' | 'user';
  department_id?: number | null;
  user_id?: number | null;
  onChange?: (dados: Record<string, unknown>) => void;
  onRemove?: () => void;
};

export default function HandoffNode({ data, selected }: NodeProps) {
  const dados = data as DadosEncaminhamento;
  const { FetchReq } = useApi();
  const [destinos, setDestinos] = useState<Destinos>({ setores: [], atendentes: [] });
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    let ativo = true;
    FetchReq<Destinos>('DestinosAtendimentoChatbot')
      .then(lista => { if (ativo && lista) setDestinos(lista); })
      .catch(erro => CatchAlerta(erro, 'Não foi possível carregar os destinos de atendimento'))
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const paraAtendente = dados.destination === 'user';
  const atendentes = useMemo(() => Array.from(new Map(destinos.atendentes.map(a => [Number(a.id), {
    id: Number(a.id), nome: `${a.name} ${a.last_name ?? ''}`.trim(),
  }])).values()), [destinos.atendentes]);
  const setoresDoAtendente = destinos.setores.filter(s => destinos.atendentes.some(a =>
    Number(a.id) === Number(dados.user_id) && Number(a.department_id) === Number(s.id)));
  const escolherAtendente = (userId: number | null) => {
    const setores = destinos.setores.filter(s => destinos.atendentes.some(a =>
      Number(a.id) === Number(userId) && Number(a.department_id) === Number(s.id)));
    dados.onChange?.({ user_id: userId, department_id: setores.length === 1 ? Number(setores[0].id) : null });
  };

  return (
    <div className={`border-round-lg shadow-2 surface-card border-1 ${selected ? 'border-primary' : 'border-300'}`} style={{ width: '26rem' }}>
      <Handle type="target" position={Position.Top} className="border-2 border-700" style={{ padding: '0.450rem', zIndex: 1 }} />
      <Handle type="target" id="entrada-esquerda" position={Position.Left} className="border-2 border-700" style={{ padding: '0.450rem', zIndex: 1 }} />
      <div className="flex align-items-center justify-content-between gap-2 p-2 surface-100 border-round-top-lg">
        <span className="font-semibold text-primary"><i className="pi pi-directions mr-2" />Encaminhar para atendimento</span>
        <RemoverNoButton onRemove={dados.onRemove} />
      </div>
      <div className="p-2 flex flex-column gap-2">
        <LabelPlus text="Destino" required textHelp="Termina a automação e mantém o protocolo. Fila do setor coloca em Espera; atendente atribui o atendimento e coloca em Em atendimento. Use um nó Mensagem antes deste se quiser avisar o cliente." />
        <Dropdown className="nodrag nowheel w-full" value={dados.destination ?? 'department'}
          options={[{ label: 'Fila do setor', value: 'department' }, { label: 'Atendente', value: 'user' }]}
          onChange={e => dados.onChange?.({ destination: e.value, department_id: null, user_id: null })} />
        {paraAtendente && <>
          <LabelPlus text="Atendente" required />
          <Dropdown className="nodrag nowheel w-full" value={dados.user_id} options={atendentes} optionLabel="nome" optionValue="id"
            filter showClear loading={carregando} placeholder="Escolha o atendente" onChange={e => escolherAtendente(e.value)} />
        </>}
        <LabelPlus text="Setor" required textHelp={paraAtendente
          ? 'Preenchido automaticamente quando o atendente tem um setor. Se houver vários, escolha o setor deste atendimento. O setor precisa pertencer ao canal.'
          : 'O atendimento vai para a fila de espera deste setor, sem atendente definido. O setor precisa pertencer ao canal.'} />
        <Dropdown className="nodrag nowheel w-full" value={dados.department_id}
          options={paraAtendente ? setoresDoAtendente : destinos.setores} optionLabel="name" optionValue="id"
          loading={carregando} disabled={paraAtendente && (!dados.user_id || setoresDoAtendente.length === 1)} filter
          placeholder={paraAtendente && !dados.user_id ? 'Escolha o atendente primeiro' : 'Escolha o setor'}
          onChange={e => dados.onChange?.({ department_id: e.value })} />
      </div>
    </div>
  );
}
