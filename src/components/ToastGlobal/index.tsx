'use client';

import { Toast } from 'primereact/toast';
import { useEffect, useRef } from 'react';

type Severidade = 'success' | 'info' | 'warn' | 'error';

let refToast: Toast | null = null;

/**
 * Feedback passageiro de ação concluída (some sozinho, sem exigir clique) -
 * ao contrário de `Alerta()`, que abre um modal bloqueante e é para avisos
 * que merecem confirmação. Chame de qualquer arquivo, como já se faz com
 * `Alerta`/`CatchAlerta`.
 */
export const mostrarToast = (
  detail: string,
  summary?: string,
  severity: Severidade = 'success',
) => {
  refToast?.show({ severity, summary, detail, life: 3500 });
};

/**
 * Monta o `Toast` uma vez, em `(main)/layout.tsx`, no mesmo padrão de
 * `AlertasNaTela`/`ModalAlteraSenha` - existe uma única instância para o
 * portal inteiro, e `mostrarToast` a alcança por uma ref de módulo (não dá
 * para usar hook: `Alerta`/`CatchAlerta` já são chamadas fora de componente,
 * de qualquer arquivo de serviço).
 */
const ToastGlobal = () => {
  const localRef = useRef<Toast>(null);

  useEffect(() => {
    refToast = localRef.current;
    return () => {
      refToast = null;
    };
  }, []);

  return (
    <Toast
      ref={localRef}
      position="top-right"
    />
  );
};

export default ToastGlobal;
