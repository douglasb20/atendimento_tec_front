'use client';

import { parseISO } from 'date-fns';
import { useEffect, useState } from 'react';

import { formatDuracao } from '@/service/Util';

type CronometroProps = {
  /** `answered_at` em ISO - o instante em que o atendimento foi assumido. */
  inicio: string;
  /** `paused_at` em ISO: com ele o tempo congela nesse instante. */
  pausadoEm?: string | null;
  /** Segundos de pausas já encerradas, descontados do total. */
  pausadoTotalSegundos?: number;
};

/**
 * Tempo decorrido desde que o atendimento foi assumido.
 *
 * Vive num componente próprio de propósito: é o único ponto da tela que muda a
 * cada segundo. Dentro do header, cada tique reconciliaria o cabeçalho inteiro
 * sessenta vezes por minuto, junto de tudo que ele renderiza.
 */
const Cronometro = ({ inicio, pausadoEm, pausadoTotalSegundos = 0 }: CronometroProps) => {
  const [agora, setAgora] = useState(() => Date.now());

  const pausado = Boolean(pausadoEm);

  // Pausado, nada muda na tela: sem o intervalo, o componente não re-renderiza.
  useEffect(() => {
    if (pausado) return;
    setAgora(Date.now());
    const intervalo = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [pausado]);

  if (!inicio) return null;

  const fim = pausado ? parseISO(pausadoEm).getTime() : agora;
  const decorrido = Math.max(
    0,
    Math.floor((fim - parseISO(inicio).getTime()) / 1000) - pausadoTotalSegundos,
  );

  return (
    <span
      className="flex align-items-center gap-2 white-space-nowrap"
      title={
        pausado ? 'Atendimento pausado - o tempo está parado' : 'Tempo desde o início do atendimento'
      }
    >
      {/* Pulsa junto com o segundo: dá a entender que o tempo está correndo
          agora, o que um número parado não comunica. */}
      {pausado ? (
        <i className="fa-regular fa-pause text-yellow-500 text-sm" />
      ) : (
        <span className="ponto-ativo flex-none border-circle bg-green-500" />
      )}
      {/* Largura estável: sem isto o texto "pula" a cada segundo, porque os
          dígitos de largura variável mudam a medida da caixa. */}
      <span
        className="text-sm font-semibold text-700"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {formatDuracao(decorrido)}
      </span>
    </span>
  );
};

export default Cronometro;
