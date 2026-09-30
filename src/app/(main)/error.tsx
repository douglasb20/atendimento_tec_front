'use client'; // Error components must be Client Components

import { Button } from 'primereact/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string; title?: string };
  reset: () => void;
}) {
  // `ECONNREFUSED`/`ECONNRESET` chegam crus do axios quando o backend está
  // fora do ar - a mensagem técnica não ajuda o atendente, que só precisa
  // saber que é temporário e pode tentar de novo.
  const foraDoAr = /ECONNREFUSED|ECONNRESET|Network Error/i.test(error?.message ?? '');

  return (
    <div className="flex flex-1 flex-column justify-content-center align-items-center h-full p-4">
      <i
        className="pi pi-exclamation-triangle text-red-400 mb-3"
        style={{ fontSize: '5rem' }}
      />
      <span className="text-color text-4xl font-semibold line-height-1 text-center">
        {error?.title || (foraDoAr ? 'Não foi possível conectar ao servidor' : 'Algo deu errado')}
      </span>
      <span className="text-color-secondary text-lg font-medium mt-2 text-center">
        {foraDoAr
          ? 'O sistema pode estar reiniciando. Tente novamente em alguns instantes.'
          : 'Tente novamente - se o problema continuar, avise o suporte.'}
      </span>
      {!foraDoAr && (
        <span className="text-color-secondary text-sm mt-3 surface-100 border-round px-3 py-2">
          {error.message}
        </span>
      )}
      <Button
        label="Tentar novamente"
        icon="pi pi-refresh"
        onClick={() => reset()}
        className="mt-4"
      />
    </div>
  );
}
