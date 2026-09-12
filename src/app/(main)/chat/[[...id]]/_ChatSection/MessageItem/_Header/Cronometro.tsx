'use client';

import { parseISO } from 'date-fns';
import { useEffect, useState } from 'react';

import { formatDuracao } from '@/service/Util';

type CronometroProps = {
  /** `answered_at` em ISO - o instante em que o atendimento foi assumido. */
  inicio: string;
};

/**
 * Tempo decorrido desde que o atendimento foi assumido.
 *
 * Vive num componente próprio de propósito: é o único ponto da tela que muda a
 * cada segundo. Dentro do header, cada tique reconciliaria o cabeçalho inteiro
 * sessenta vezes por minuto, junto de tudo que ele renderiza.
 */
const Cronometro = ({ inicio }: CronometroProps) => {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  if (!inicio) return null;

  const decorrido = Math.floor((agora - parseISO(inicio).getTime()) / 1000);

  return (
    <span
      className="flex align-items-center gap-2 white-space-nowrap"
      title="Tempo desde o início do atendimento"
    >
      {/* Pulsa junto com o segundo: dá a entender que o tempo está correndo
          agora, o que um número parado não comunica. */}
      <span className="ponto-ativo flex-none border-circle bg-green-500" />
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
