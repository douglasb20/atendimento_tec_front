import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { PrimeIcons } from 'primereact/api';

import LabelPlus from '@/components/LabelPlus';

type MenuOption = { id: string; emoji?: string; text: string };

type MenuData = {
  title?: string;
  body?: string;
  options?: MenuOption[];
  invalidOptionOutputHandle?: string;
};

type MenuNodeConfigProps = {
  data: MenuData;
  onChange: (data: MenuData) => void;
  /** Chamado quando uma opção é removida - o editor precisa apagar a edge daquela saída junto. */
  onRemoveOutput: (handleId: string) => void;
};

function MenuNodeConfig({ data, onChange, onRemoveOutput }: MenuNodeConfigProps) {
  const opcoes = data.options ?? [];

  const adicionarOpcao = () => {
    const novaId = `opt_${Date.now()}`;
    onChange({ ...data, options: [...opcoes, { id: novaId, emoji: '', text: '' }] });
  };

  const atualizarOpcao = (id: string, campo: keyof MenuOption, valor: string) => {
    onChange({
      ...data,
      options: opcoes.map((o) => (o.id === id ? { ...o, [campo]: valor } : o)),
    });
  };

  const removerOpcao = (id: string) => {
    onChange({ ...data, options: opcoes.filter((o) => o.id !== id) });
    onRemoveOutput(id);
  };

  return (
    <div className="flex flex-column gap-3">
      <div>
        <LabelPlus text="Título" />
        <InputText
          value={data.title ?? ''}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          className="w-full"
        />
      </div>

      <div>
        <LabelPlus
          text="Corpo"
          textHelp="Aceita variáveis, ex.: {{ contact.name }}"
        />
        <InputTextarea
          value={data.body ?? ''}
          onChange={(e) => onChange({ ...data, body: e.target.value })}
          className="w-full"
          rows={3}
          autoResize
        />
      </div>

      <div className="flex flex-column gap-2">
        <LabelPlus text="Opções" />

        {opcoes.map((opcao, indice) => (
          <div
            key={opcao.id}
            className="flex align-items-center gap-2"
          >
            <span className="text-color-secondary">{indice + 1}.</span>
            <InputText
              value={opcao.emoji ?? ''}
              onChange={(e) => atualizarOpcao(opcao.id, 'emoji', e.target.value)}
              className="w-3rem text-center"
              placeholder="🙂"
            />
            <InputText
              value={opcao.text}
              onChange={(e) => atualizarOpcao(opcao.id, 'text', e.target.value)}
              className="flex-1"
              placeholder="Texto da opção"
            />
            <Button
              icon={PrimeIcons.TRASH}
              severity="danger"
              text
              onClick={() => removerOpcao(opcao.id)}
            />
          </div>
        ))}

        <Button
          label="Adicionar Opção"
          icon={PrimeIcons.PLUS}
          outlined
          onClick={adicionarOpcao}
        />
      </div>

      <small className="text-color-secondary">
        O contato responde pelo número ou pelo texto da opção. Sem bater com
        nenhuma, o fluxo segue pela saída &quot;Opção inválida&quot;.
      </small>
    </div>
  );
}

export default MenuNodeConfig;
