'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import Avatar from '@/components/Avatar';
import { AlertaTela, useAlertasTelaStore } from '@/store/useAlertasTelaStore';

/** Quanto tempo cada alerta fica antes de sair sozinho. */
const DURACAO_MS = 6000;

const Alerta = ({ alerta }: { alerta: AlertaTela }) => {
  const remover = useAlertasTelaStore((s) => s.remover);

  // Um timer por alerta, reiniciado quando ele é substituído por outro da
  // mesma tag - o `id` muda, e com ele o efeito.
  useEffect(() => {
    const timer = setTimeout(() => remover(alerta.id), DURACAO_MS);
    return () => clearTimeout(timer);
  }, [alerta.id, remover]);

  return (
    <div
      role="button"
      tabIndex={0}
      className="alerta-tela"
      onClick={() => {
        remover(alerta.id);
        alerta.aoClicar?.();
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return;
        remover(alerta.id);
        alerta.aoClicar?.();
      }}
    >
      <Avatar
        src={alerta.icone}
        alt={alerta.titulo}
        width={40}
        height={40}
        className="border-circle flex-shrink-0"
        style={{ objectFit: 'cover' }}
      />

      <div className="alerta-tela__texto">
        <span className="alerta-tela__titulo">{alerta.titulo}</span>
        <span className="alerta-tela__corpo">{alerta.corpo}</span>
      </div>

      <button
        type="button"
        className="alerta-tela__fechar"
        title="Fechar"
        onClick={(e) => {
          // Fechar não é abrir a conversa.
          e.stopPropagation();
          remover(alerta.id);
        }}
      >
        <i className="fa-regular fa-xmark" />
      </button>
    </div>
  );
};

/**
 * Os alertas na tela, no canto superior direito.
 *
 * Em cima, e não embaixo: o canto inferior direito é do popup do chat interno.
 * Montado uma vez em `(main)/layout.tsx`, em portal, para aparecer em qualquer
 * tela e por cima de modais.
 */
const AlertasNaTela = () => {
  const alertas = useAlertasTelaStore((s) => s.alertas);

  // Portal não existe no servidor; sem o guard a hidratação reclama.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  if (!montado || !alertas.length) return null;

  return createPortal(
    <div className="alertas-tela">
      {alertas.map((alerta) => (
        <Alerta
          key={alerta.id}
          alerta={alerta}
        />
      ))}
    </div>,
    document.body,
  );
};

export default AlertasNaTela;
