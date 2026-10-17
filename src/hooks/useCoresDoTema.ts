'use client';

import { useCallback, useEffect, useState } from 'react';

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
 * **Relê a cada troca de tema.** Antes lia uma única vez na montagem, e as
 * cores congelavam: ao passar de escuro para claro, a grade e os rótulos dos
 * eixos continuavam com a cor do tema escuro e **sumiam** no fundo branco (e
 * o inverso deixava as linhas claras demais no escuro). Só o F5 corrigia,
 * porque remontava o componente.
 *
 * Devolve `null` até a primeira pintura no cliente; quem usa deve segurar o
 * gráfico até lá, senão ele pisca com a cor de fallback antes de assumir a do
 * tema.
 */
export const useCoresDoTema = (variavelDaLinha = '--blue-500'): CoresDoTema | null => {
  const [cores, setCores] = useState<CoresDoTema | null>(null);

  const lerCores = useCallback(() => {
    const estilo = getComputedStyle(document.documentElement);

    const lidas: CoresDoTema = {
      linha: estilo.getPropertyValue(variavelDaLinha).trim() || '#3b82f6',
      texto: estilo.getPropertyValue('--text-color-secondary').trim(),
      grade: estilo.getPropertyValue('--surface-border').trim(),
      superficie: estilo.getPropertyValue('--surface-card').trim(),
    };

    // Só troca o estado quando alguma cor mudou de verdade: o observer dispara
    // também em mudanças de classe que não são de tema (o layout mexe em
    // várias no `<html>`), e redesenhar o gráfico a cada uma piscaria a tela.
    setCores((atuais) =>
      atuais &&
      atuais.linha === lidas.linha &&
      atuais.texto === lidas.texto &&
      atuais.grade === lidas.grade &&
      atuais.superficie === lidas.superficie
        ? atuais
        : lidas,
    );
  }, [variavelDaLinha]);

  useEffect(() => {
    lerCores();

    // O tema troca de duas formas (ver `service/Tema/aplicaTema`): a classe
    // `layout-<modo>` no `<html>` e o `href` do `<link id="theme-link">`.
    // Observar só a classe não bastaria - mudar de cor mantendo o modo troca
    // apenas a folha de estilo.
    const observer = new MutationObserver(lerCores);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const link = document.getElementById('theme-link');
    if (link) {
      observer.observe(link, { attributes: true, attributeFilter: ['href'] });
    }

    // O `href` muda antes de o CSS novo estar aplicado: `aplicaTema` insere um
    // clone do `<link>` e só remove o antigo no `load` dele. Ler na hora
    // devolveria as cores do tema velho, então relê quando a folha termina de
    // carregar - é aí que `getComputedStyle` já enxerga o tema novo.
    const relerAposCarregar = () => lerCores();
    document.addEventListener('load', relerAposCarregar, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('load', relerAposCarregar, true);
    };
  }, [lerCores]);

  return cores;
};
