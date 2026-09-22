'use client';

import { useState } from 'react';

type BadgeProtocoloProps = {
  protocolo?: string;
};

const BadgeProtocolo = ({ protocolo }: BadgeProtocoloProps) => {
  const [copiado, setCopiado] = useState(false);

  if (!protocolo) return null;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(protocolo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sem permissão de área de transferência não há o que fazer, e falhar
      // aqui não pode atrapalhar o atendimento.
    }
  };

  return (
    <button
      type="button"
      onClick={copiar}
      title={copiado ? 'Copiado!' : 'Clique para copiar o protocolo'}
      className="protocolo-chat flex cursor-pointer align-items-center gap-1 border-none bg-transparent p-0 white-space-nowrap"
    >
      <span
        className="text-sm font-semibold text-700"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        <span className="text-400 font-normal">#</span>
        {protocolo}
      </span>
      <i
        className={
          copiado
            ? 'fa-solid fa-check text-xs text-green-600'
            : 'fa-regular fa-copy text-xs text-400'
        }
      />
    </button>
  );
};

export default BadgeProtocolo;
