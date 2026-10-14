'use client';

import { useEffect, useState } from 'react';

export type CoresDoTema = {
  linha: string;
  texto: string;
  grade: string;
  superficie: string;
};

/**
 * As cores do tema, lidas das variáveis CSS do documento.
 *
 * Existe porque gráfico é desenhado em `canvas`, onde classe de CSS não
 * alcança - a cor precisa ser passada como valor.
 *
 * ⚠️ **Em `useEffect`, nunca em `useMemo`.** `useMemo` também executa no SSR,
 * e lá não há `getComputedStyle`: ler de lá derruba a renderização de servidor
 * da página inteira ("Switched to client rendering because the server
 * rendering errored").
 *
 * Devolve `null` até a primeira pintura no cliente; quem usa deve segurar o
 * gráfico até lá, senão ele pisca com a cor de fallback antes de assumir a do
 * tema.
 */
export const useCoresDoTema = (variavelDaLinha = '--blue-500'): CoresDoTema | null => {
  const [cores, setCores] = useState<CoresDoTema | null>(null);

  useEffect(() => {
    const estilo = getComputedStyle(document.documentElement);

    setCores({
      linha: estilo.getPropertyValue(variavelDaLinha).trim() || '#3b82f6',
      texto: estilo.getPropertyValue('--text-color-secondary').trim(),
      grade: estilo.getPropertyValue('--surface-border').trim(),
      superficie: estilo.getPropertyValue('--surface-card').trim(),
    });
  }, [variavelDaLinha]);

  return cores;
};
