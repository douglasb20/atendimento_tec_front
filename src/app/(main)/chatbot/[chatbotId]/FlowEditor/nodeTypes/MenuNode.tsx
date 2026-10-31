import { Handle, NodeProps, Position } from '@xyflow/react';
import { PrimeIcons } from 'primereact/api';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';

import LabelPlus from '@/components/LabelPlus';

import RemoverNoButton from './RemoverNoButton';

type MenuOption = { id: string; emoji?: string; text: string };

type MenuData = {
  title?: string;
  body?: string;
  options?: MenuOption[];
  invalidOptionOutputHandle?: string;
  onRemove?: () => void;
  onChange?: (data: MenuData) => void;
  onRemoveOutput?: (handleId: string) => void;
};

// Fica deliberadamente além da borda do card: dentro da linha de inputs o
// conector disputa espaço com o botão de remover e se torna difícil de pegar.
// O padding é o mesmo dos conectores de entrada/saída deste card.
const handleNaLinha = {
  position: 'absolute',
  right: '-8px',
  top: '50%',
  padding: '0.550rem',
  zIndex: 5,
  transform: 'translate(50%, -50%)',
} as const;

/**
 * O nó Menu - uma saída por opção (na ordem em que aparecem) mais a saída
 * "Opção inválida" sempre por último. Cada saída é endereçada pelo `id` da
 * opção, exatamente como o `MenuHandler` do motor resolve.
 */
function MenuNode({ data, selected }: NodeProps) {
  const menuData = data as MenuData;
  const opcoes = menuData.options ?? [];

  const atualizar = (patch: Partial<MenuData>) => {
    menuData.onChange?.({
      title: menuData.title ?? '',
      body: menuData.body ?? '',
      options: opcoes,
      invalidOptionOutputHandle: menuData.invalidOptionOutputHandle ?? 'invalid',
      ...patch,
    });
  };

  const adicionarOpcao = () => {
    atualizar({ options: [...opcoes, { id: `opt_${Date.now()}`, emoji: '', text: '' }] });
  };

  const atualizarOpcao = (id: string, campo: keyof MenuOption, valor: string) => {
    atualizar({ options: opcoes.map((opcao) => (opcao.id === id ? { ...opcao, [campo]: valor } : opcao)) });
  };

  const removerOpcao = (id: string) => {
    atualizar({ options: opcoes.filter((opcao) => opcao.id !== id) });
    menuData.onRemoveOutput?.(id);
  };

  return (
    <div
      className={`border-round-lg shadow-2 surface-card border-1 ${
        selected ? 'border-primary' : 'border-300'
      }`}
      style={{ width: '28rem' }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ padding: '0.550rem', zIndex: 1 }}
        className="border-2 border-700"
      />
      <Handle
        type="target"
        id="entrada-esquerda"
        position={Position.Left}
        style={{ padding: '0.550rem', zIndex: 1 }}
        className="border-2 border-700"
      />
      <Handle
        type="target"
        id="entrada-inferior"
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

      <div className="flex flex-column gap-3 px-3 py-2">
        <div>
          <LabelPlus text="Título" />
          <InputText
            className="nodrag w-full"
            value={menuData.title ?? ''}
            onChange={(e) => atualizar({ title: e.target.value })}
            placeholder="Ex.: Como podemos ajudar?"
          />
        </div>

        <div>
          <LabelPlus text="Corpo" textHelp="Aceita variáveis, ex.: {{ contact.name }}" />
          <InputTextarea
            className="nodrag w-full"
            value={menuData.body ?? ''}
            onChange={(e) => atualizar({ body: e.target.value })}
            rows={3}
            autoResize
            placeholder="Escolha uma das opções abaixo"
          />
        </div>

        <div className="flex flex-column gap-2">
          <LabelPlus text="Opções" />

          {opcoes.map((opcao, indice) => (
            <div key={opcao.id} className="flex align-items-center gap-2" style={{ position: 'relative' }}>
              <span className="text-color-secondary">{indice + 1}.</span>
              <InputText
                className="nodrag w-3rem text-center"
                value={opcao.emoji ?? ''}
                onChange={(e) => atualizarOpcao(opcao.id, 'emoji', e.target.value)}
                placeholder="🙂"
              />
              <InputText
                className="nodrag flex-1"
                value={opcao.text}
                onChange={(e) => atualizarOpcao(opcao.id, 'text', e.target.value)}
                placeholder="Texto da opção"
              />
              <Button
                className="nodrag"
                icon={PrimeIcons.TRASH}
                severity="danger"
                text
                onClick={() => removerOpcao(opcao.id)}
              />
              <Handle
                type="source"
                id={opcao.id}
                position={Position.Right}
                style={handleNaLinha}
                className="border-2 border-700"
              />
            </div>
          ))}

          <Button
            className="nodrag"
            label="Adicionar opção"
            icon={PrimeIcons.PLUS}
            outlined
            size="small"
            onClick={adicionarOpcao}
          />
        </div>

        <small className="text-color-secondary">
          O contato responde pelo número ou pelo texto da opção. Caso não corresponda, o fluxo segue pela saída abaixo.
        </small>

        <div
          style={{ position: 'relative' }}
          className="flex align-items-center justify-content-between gap-2 pt-2 border-top-1 border-300 text-sm text-color-secondary"
        >
          <span>Opção inválida</span>
          <Handle
            type="source"
            id={menuData.invalidOptionOutputHandle}
            position={Position.Right}
            style={handleNaLinha}
            className="border-2 border-700"
          />
        </div>
      </div>
    </div>
  );
}

export default MenuNode;
