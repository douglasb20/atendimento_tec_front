import { PrimeIcons } from 'primereact/api';
import { Button } from 'primereact/button';

type RemoverNoButtonProps = {
  onRemove?: () => void;
};

/**
 * Botão de remover no header de cada nó (exceto o Início, fixo) - clicar no
 * corpo do nó abre o modal de configuração, então este X precisa de
 * `stopPropagation` para não disparar os dois ao mesmo tempo.
 *
 * `onRemove` chega por `data` (injetado pelo `FlowEditor`), não via
 * `useReactFlow().setNodes` direto: o `nodes`/`edges` daqui é controlado pelo
 * `FlowEditor` (state React comum), e mexer no store interno do React Flow em
 * modo controlado seria desfeito no próximo render pela sincronização com a
 * prop `nodes`.
 */
function RemoverNoButton({ onRemove }: RemoverNoButtonProps) {
  return (
    <Button
      icon={PrimeIcons.TIMES}
      text
      rounded
      size="small"
      className="p-1"
      style={{ width: '1.5rem', height: '1.5rem' }}
      onClick={(e) => {
        e.stopPropagation();
        onRemove?.();
      }}
      title="Remover"
    />
  );
}

export default RemoverNoButton;
