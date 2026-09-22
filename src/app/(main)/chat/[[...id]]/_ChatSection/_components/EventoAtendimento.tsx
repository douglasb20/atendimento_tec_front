'use client';

import { memo } from 'react';

import { SupportChatEventResponse } from '@/Interfaces';
import { DateToBR } from '@/service/Util';
import { nomeCompleto } from '@/service/Util';

type EventoAtendimentoProps = {
  evento: SupportChatEventResponse;
};

/**
 * O que aconteceu com a conversa, entre as mensagens.
 *
 * Centralizado e discreto, como o separador de protocolo: não é fala de
 * ninguém, é contexto. Quem abre a conversa depois de uma transferência
 * entende por que o histórico é de outra pessoa.
 */
const EventoAtendimento = ({ evento }: EventoAtendimentoProps) => {
  const origem = nomeCompleto(evento.userOrigem) || 'Atendente removido';

  // Destino nulo não é falta de dado: é a devolução para a espera.
  const texto = evento.userDestino
    ? `${origem} transferiu para ${nomeCompleto(evento.userDestino)}`
    : `${origem} devolveu para a espera`;

  return (
    <div className="flex align-items-center gap-2 my-3 px-2">
      <div className="flex-1 border-top-1 border-300" />
      <span className="flex flex-column align-items-center text-xs text-500 white-space-nowrap">
        <span>
          <i className="fa-regular fa-right-left mr-1" />
          {texto} · {DateToBR(evento.created_at, 'Pp')}
        </span>
        {/* O motivo quebra a linha em vez de alongar a faixa: é texto livre e
            pode ser longo. */}
        {evento.motivo && (
          <span
            className="text-400 font-italic white-space-normal text-center"
            style={{ maxWidth: '28rem' }}
          >
            {evento.motivo}
          </span>
        )}
      </span>
      <div className="flex-1 border-top-1 border-300" />
    </div>
  );
};

export default memo(EventoAtendimento);
