'use client';

import { memo } from 'react';
import { PrimeIcons } from 'primereact/api';
import { Button } from 'primereact/button';

import { DateToBR } from '@/service/Util';

type BotaoProps = {
  total: number;
  carregando: boolean;
  onCarregar: () => void;
};

/**
 * Botão que traz o atendimento anterior do mesmo contato.
 *
 * Só existe quando há histórico: o backend informa o total ao abrir a conversa,
 * e com zero este componente não renderiza nada. Carregar tudo de uma vez faria
 * um cliente de dois anos travar a tela ao abrir - justamente o cliente que
 * mais volta.
 */
const BotaoCarregarAnterior = ({ total, carregando, onCarregar }: BotaoProps) => {
  if (total <= 0) return null;

  return (
    <div className="flex justify-content-center w-full py-3">
      <Button
        label={
          total === 1 ? 'Ver o atendimento anterior' : `Ver atendimentos anteriores (${total})`
        }
        icon={PrimeIcons.HISTORY}
        className="p-button-text p-button-sm p-button-rounded"
        // A tela do chat esta dentro de um `p-fluid`, e o tema tem
        // `.p-fluid .p-button { width: 100% }`: o botao esticava pela largura
        // toda, o rotulo centralizava e o icone ia parar na margem esquerda,
        // solto. `width: auto` vence a regra do tema pela especificidade do
        // style inline; classe utilitaria nao vencia.
        style={{ width: 'auto' }}
        loading={carregando}
        onClick={onCarregar}
      />
    </div>
  );
};

type SeparadorProps = {
  protocol: string;
  encerradoEm: string | null;
};

/**
 * Marca onde um atendimento termina e outro começa.
 *
 * Sem ele as mensagens viram uma corrente contínua, e uma frase de três meses
 * atrás parece resposta à de hoje.
 */
const SeparadorProtocolo = ({ protocol, encerradoEm }: SeparadorProps) => (
  <div className="flex align-items-center gap-2 my-3 px-2">
    <div className="flex-1 border-top-1 border-300" />
    <span className="text-xs text-500 white-space-nowrap">
      #{protocol}
      {encerradoEm && ` · encerrado em ${DateToBR(encerradoEm, 'P')}`}
    </span>
    <div className="flex-1 border-top-1 border-300" />
  </div>
);

export const BotaoAnterior = memo(BotaoCarregarAnterior);
export const Separador = memo(SeparadorProtocolo);
