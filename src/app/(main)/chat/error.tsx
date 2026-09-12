'use client';

import { Button } from 'primereact/button';
import { useEffect } from 'react';

/**
 * Falhas de render dentro do chat ficam contidas aqui.
 *
 * Sem este arquivo, a exceção sobe até o boundary de `(main)` e substitui a
 * página inteira - inclusive a navegação - por uma tela crua em inglês. Como o
 * chat carrega conteúdo de fora (avatares e mídia do WhatsApp e do storage),
 * uma falha isolada é esperada o bastante para merecer tratamento próprio.
 */
export default function ErroChat({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // O detalhe técnico não vai para a tela, mas precisa estar em algum lugar.
    console.error('Falha ao renderizar o chat:', error);
  }, [error]);

  return (
    <div className="card flex flex-1 flex-column justify-content-center align-items-center gap-3 h-full shadow-1 p-5">
      <i
        style={{ fontSize: '6rem' }}
        className="fa-light fa-triangle-exclamation text-orange-500"
      />
      <span className="text-2xl font-semibold text-700">Não foi possível exibir a conversa</span>
      <span className="text-center text-600">
        Algo falhou ao montar esta tela. Tentar de novo costuma resolver; se persistir, recarregue a
        página.
      </span>
      <Button
        label="Tentar novamente"
        icon="fa-regular fa-rotate-right"
        onClick={reset}
      />
    </div>
  );
}
