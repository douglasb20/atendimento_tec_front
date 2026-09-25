import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { PrimeIcons } from 'primereact/api';

import LabelPlus from '@/components/LabelPlus';

type Condicao = { id: string; operator: string; term: string };

type ConditionalData = {
  compareUsing?: 'last_message' | 'variable';
  variable?: string;
  conditions?: Condicao[];
  defaultOutputHandle?: string;
};

type ConditionalNodeConfigProps = {
  data: ConditionalData;
  onChange: (data: ConditionalData) => void;
  /** Chamado quando uma condição é removida - o editor precisa apagar a edge daquela saída junto. */
  onRemoveOutput: (handleId: string) => void;
};

const OPERADORES = [
  { id: 'equals', name: 'Igual a' },
  { id: 'contains', name: 'Contém' },
  { id: 'greater_than', name: 'Maior que' },
  { id: 'less_than', name: 'Menor que' },
];

const COMPARAR_USANDO = [
  { id: 'last_message', name: 'Mensagem recebida' },
  { id: 'variable', name: 'Variável' },
];

function ConditionalNodeConfig({ data, onChange, onRemoveOutput }: ConditionalNodeConfigProps) {
  const condicoes = data.conditions ?? [];

  const adicionarCondicao = () => {
    const novaId = `cond_${Date.now()}`;
    onChange({ ...data, conditions: [...condicoes, { id: novaId, operator: 'equals', term: '' }] });
  };

  const atualizarCondicao = (id: string, campo: keyof Condicao, valor: string) => {
    onChange({
      ...data,
      conditions: condicoes.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)),
    });
  };

  const removerCondicao = (id: string) => {
    onChange({ ...data, conditions: condicoes.filter((c) => c.id !== id) });
    onRemoveOutput(id);
  };

  return (
    <div className="flex flex-column gap-3">
      <div>
        <LabelPlus text="Comparar usando" />
        <Dropdown
          value={data.compareUsing ?? 'last_message'}
          onChange={(e) => onChange({ ...data, compareUsing: e.value })}
          options={COMPARAR_USANDO}
          optionLabel="name"
          optionValue="id"
          className="w-full"
        />
      </div>

      {data.compareUsing === 'variable' && (
        <div>
          <LabelPlus
            text="Variável"
            textHelp="Ex.: api_1.data.status"
          />
          <InputText
            value={data.variable ?? ''}
            onChange={(e) => onChange({ ...data, variable: e.target.value })}
            className="w-full"
            placeholder="{{ api_1.data.status }}"
          />
        </div>
      )}

      <div className="flex flex-column gap-2">
        <LabelPlus text="Condições" />

        {condicoes.map((condicao) => (
          <div
            key={condicao.id}
            className="flex align-items-center gap-2"
          >
            <Dropdown
              value={condicao.operator}
              onChange={(e) => atualizarCondicao(condicao.id, 'operator', e.value)}
              options={OPERADORES}
              optionLabel="name"
              optionValue="id"
              className="w-9rem"
            />
            <InputText
              value={condicao.term}
              onChange={(e) => atualizarCondicao(condicao.id, 'term', e.target.value)}
              className="flex-1"
              placeholder="Termo para verificar"
            />
            <Button
              icon={PrimeIcons.TRASH}
              severity="danger"
              text
              onClick={() => removerCondicao(condicao.id)}
            />
          </div>
        ))}

        <Button
          label="Adicionar Condição"
          icon={PrimeIcons.PLUS}
          outlined
          onClick={adicionarCondicao}
        />
      </div>

      <small className="text-color-secondary">
        Sem nenhuma condição bater, o fluxo segue pela saída padrão.
      </small>
    </div>
  );
}

export default ConditionalNodeConfig;
