'use client';

import { Button } from 'primereact/button';

import { useSelecaoMensagens } from '@/store/useSelecaoMensagens';

type BarraSelecaoProps = {
  onApagar: () => void;
  apagando?: boolean;
};

/**
 * Barra que substitui o campo de mensagem enquanto o modo de seleção está
 * ativo: cancelar à esquerda, contagem no centro, apagar à direita.
 */
const BarraSelecao = ({ onApagar, apagando = false }: BarraSelecaoProps) => {
  const { selecionadas, sairModoSelecao } = useSelecaoMensagens();

  const total = selecionadas.length;

  return (
    <div className="flex align-items-center justify-content-between gap-3 px-3 py-2 surface-card border-top-1 surface-border">
      <Button
        icon="fa-regular fa-xmark text-xl"
        text
        rounded
        aria-label="Cancelar seleção"
        onClick={sairModoSelecao}
        disabled={apagando}
      />

      <span className="text-sm text-700">
        {total === 0
          ? 'Nenhum item selecionado'
          : `${total} ${total === 1 ? 'item selecionado' : 'itens selecionados'}`}
      </span>

      <Button
        icon="fa-regular fa-trash-can text-xl"
        text
        rounded
        severity="danger"
        aria-label="Apagar selecionadas"
        // Sem nada marcado não há o que apagar — o botão fica inerte em vez de
        // abrir uma confirmação vazia.
        disabled={total === 0 || apagando}
        loading={apagando}
        onClick={onApagar}
      />
    </div>
  );
};

export default BarraSelecao;
