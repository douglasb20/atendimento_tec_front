import { Handle, NodeProps, Position, useUpdateNodeInternals } from '@xyflow/react';
import { PrimeIcons } from 'primereact/api';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { Dropdown } from 'primereact/dropdown';
import { useEffect } from 'react';

import LabelPlus from '@/components/LabelPlus';

import RemoverNoButton from './RemoverNoButton';
import TempoResposta, { ConfigTempoResposta } from './TempoResposta';

type MenuOption = { id: string; emoji?: string; text: string };

type MenuData = ConfigTempoResposta & {
  title?: string;
  body?: string;
  options?: MenuOption[];
  invalidOptionOutputHandle?: string;
  invalidAttemptLimitEnabled?: boolean;
  maxInvalidAttempts?: number;
  invalidOptionAction?: 'repeat_menu' | 'wait_reply' | 'follow_output';
  onRemove?: () => void;
  onChange?: (data: MenuData) => void;
  onRemoveOutput?: (handleId: string) => void;
};

const SAIDA_LIMITE_TENTATIVAS = 'limite-tentativas';

// Fica deliberadamente além da borda do card: dentro da linha de inputs o
// conector disputa espaço com o botão de remover e se torna difícil de pegar.
// O padding é o mesmo dos conectores de entrada/saída deste card.
const handleNaLinha = {
  position: 'absolute',
  right: '-13px',
  top: '50%',
  padding: '0.550rem',
  zIndex: 5,
  transform: 'translate(50%, -50%)',
} as const;

/**
 * O nó Menu - uma saída por opção (na ordem em que aparecem) mais a saída
 * saídas de erro conforme a configuração. Cada opção é endereçada pelo `id` da
 * opção, exatamente como o `MenuHandler` do motor resolve.
 */
function MenuNode({ id, data, selected }: NodeProps) {
  const menuData = data as MenuData;
  const opcoes = menuData.options ?? [];
  const atualizarConectores = useUpdateNodeInternals();
  const limitarTentativas = menuData.invalidAttemptLimitEnabled ?? false;
  const acaoInvalida = menuData.invalidOptionAction ?? 'follow_output';
  useEffect(() => { atualizarConectores(id); }, [id, limitarTentativas, acaoInvalida, opcoes.length, atualizarConectores]);

  const atualizar = (patch: Partial<MenuData>) => {
    menuData.onChange?.({
      title: menuData.title ?? '',
      body: menuData.body ?? '',
      options: opcoes,
      invalidOptionOutputHandle: menuData.invalidOptionOutputHandle ?? 'invalid',
      replyTimeoutEnabled: menuData.replyTimeoutEnabled ?? false,
      replyTimeoutMinutes: menuData.replyTimeoutMinutes ?? 5,
      invalidAttemptLimitEnabled: limitarTentativas,
      maxInvalidAttempts: menuData.maxInvalidAttempts ?? 3,
      invalidOptionAction: menuData.invalidOptionAction,
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
        id="entrada-superior"
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
          <LabelPlus text="Opções" textHelp="O contato responde pelo número ou pelo texto da opção." />

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

        <div className="border-top-1 border-300 pt-2">
          <LabelPlus htmlFor={`acao-invalida-${id}`} text="Quando a opção for inválida"
            textHelp="Reenvie o menu automaticamente, aguarde outra resposta sem enviar mensagem ou siga um caminho próprio pela saída Opção inválida. Ao esgotar o limite, a saída Excesso de tentativas tem prioridade." />
          <Dropdown inputId={`acao-invalida-${id}`} className="nodrag nowheel w-full" value={acaoInvalida}
            options={[
              { label: 'Reenviar o menu', value: 'repeat_menu' },
              { label: 'Aguardar outra resposta', value: 'wait_reply' },
              { label: 'Seguir saída Opção inválida', value: 'follow_output' },
            ]} onChange={(e) => {
              atualizar({ invalidOptionAction: e.value });
              if (acaoInvalida === 'follow_output' && e.value !== 'follow_output') menuData.onRemoveOutput?.(menuData.invalidOptionOutputHandle ?? 'invalid');
            }} />
        </div>
        {acaoInvalida === 'follow_output' && <div
          style={{ position: 'relative' }}
          className="flex align-items-center justify-content-between gap-2 pt-2 border-top-1 border-300 text-sm text-color-secondary"
        >
          <LabelPlus text="Opção inválida" textHelp="Segue este caminho a cada erro, antes de esgotar o limite. Para repetir sem desenhar uma ligação de retorno, escolha Reenviar o menu no campo acima." />
          <Handle
            type="source"
            id={menuData.invalidOptionOutputHandle ?? 'invalid'}
            position={Position.Right}
            style={handleNaLinha}
            className="border-2 border-700"
          />
        </div>}
        <div className="flex flex-column gap-2 border-top-1 border-300 pt-2">
          <div className="flex align-items-center gap-2">
            <InputSwitch inputId={`limitar-tentativas-${id}`} className="nodrag" checked={limitarTentativas} onChange={(e) => {
              atualizar({ invalidAttemptLimitEnabled: e.value });
              if (!e.value) menuData.onRemoveOutput?.(SAIDA_LIMITE_TENTATIVAS);
            }} />
            <LabelPlus htmlFor={`limitar-tentativas-${id}`} text="Limitar tentativas inválidas"
              textHelp="Conta respostas inválidas deste Menu. Antes do máximo, aplica a ação escolhida acima; ao atingir o máximo, segue Excesso de tentativas. Uma escolha válida ou o excesso atingido zera a contagem. Não conta ausência de resposta." />
          </div>
          {limitarTentativas && <>
            <div className="flex align-items-center justify-content-between gap-3">
              <LabelPlus htmlFor={`maximo-tentativas-${id}`} text="Máximo de tentativas" textHelp="De 1 a 10. Com limite 3, a terceira resposta inválida segue a saída Excesso de tentativas." />
              <InputNumber inputId={`maximo-tentativas-${id}`} className="nodrag nowheel" value={menuData.maxInvalidAttempts ?? 3}
                min={1} max={10} useGrouping={false} maxFractionDigits={0} inputStyle={{ width: '5rem' }}
                onValueChange={(e) => atualizar({ maxInvalidAttempts: e.value ?? 3 })} />
            </div>
            <div className="text-sm text-color-secondary py-2" style={{ position: 'relative' }}>
              <LabelPlus text="Excesso de tentativas" textHelp="Conecte ao caminho desejado após esgotar as tentativas, como orientar o cliente, encaminhar ao atendimento ou encerrar." />
              <Handle type="source" id={SAIDA_LIMITE_TENTATIVAS} position={Position.Right}
                style={handleNaLinha} className="border-2 border-700" />
            </div>
          </>}
        </div>
        <TempoResposta nodeId={id} replyTimeoutEnabled={menuData.replyTimeoutEnabled}
          replyTimeoutMinutes={menuData.replyTimeoutMinutes} onChange={atualizar} onRemoveOutput={menuData.onRemoveOutput} />
      </div>
    </div>
  );
}

export default MenuNode;
