'use client';

import { useEffect, useRef } from 'react';

import { useChatStore } from '@/store/useChatStore';

/**
 * Espaço mínimo entre dois avisos ao servidor.
 *
 * Sem ele, mover o mouse dispararia dezenas de mensagens por segundo. Dois
 * minutos é folgado diante dos dez que definem a ausência: quem está na mesa
 * bate pelo menos cinco vezes antes de o prazo fechar.
 */
const INTERVALO_MINIMO_MS = 2 * 60 * 1000;

/** O que conta como "a pessoa está aí". */
const EVENTOS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;

/**
 * Avisa o servidor que a pessoa continua na mesa.
 *
 * ⚠️ É o **único** ponto do portal em que o front emite pelo socket - todo o
 * resto é servidor→cliente. Uma chamada HTTP a cada retomada, vezes o número de
 * atendentes, encheria o log de auditoria, que registra toda requisição
 * autenticada e as queries dela.
 *
 * Só o backend decide quem está ausente. Daqui sai apenas o fato de ter havido
 * interação; o relógio e o limite de dez minutos vivem lá, num lugar só.
 */
export const useAvisoDeAtividade = ({ ativo = true }: { ativo?: boolean } = {}) => {
  const socket = useChatStore((s) => s.socket);
  const ultimoAvisoRef = useRef(0);

  useEffect(() => {
    if (!ativo || socket == null) return;

    const avisar = () => {
      const agora = Date.now();

      if (agora - ultimoAvisoRef.current < INTERVALO_MINIMO_MS) return;

      ultimoAvisoRef.current = agora;
      socket.emit('presenca:atividade');
    };

    // `passive` porque nenhum destes handlers chama `preventDefault`, e sem a
    // dica o navegador espera para descobrir - o que trava a rolagem.
    EVENTOS.forEach((evento) => window.addEventListener(evento, avisar, { passive: true }));

    // Voltar à aba é interação: o `mousemove` só chegaria quando a pessoa
    // mexesse de fato, e até lá ela apareceria ausente sem estar.
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') avisar();
    };

    document.addEventListener('visibilitychange', aoVoltar);

    // Conectar já é sinal de presença, e sem este aviso quem recarrega a
    // página depois de dez minutos parado continuaria amarelo.
    avisar();

    return () => {
      EVENTOS.forEach((evento) => window.removeEventListener(evento, avisar));
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [ativo, socket]);
};
