import { Metadata } from 'next';
import Link from 'next/link';
import { PrimeIcons } from 'primereact/api';

import ApiService from '@/service/Api/ApiServer';
import MolduraAuth from '../../_components/MolduraAuth';
import BoxAceitarConvite from './BoxAceitarConvite';

export const metadata: Metadata = {
  title: 'Aceitar convite',
};

type MotivoInvalido = 'invalido' | 'expirado' | 'usado';

const MENSAGENS: Record<MotivoInvalido, string> = {
  expirado: 'Este convite já passou da validade.',
  usado: 'Este convite já foi aceito.',
  invalido: 'Este convite não é válido. Confira se o link foi copiado por inteiro.',
};

export default async function AceitarConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { FetchReq } = await ApiService();

  // Validado no servidor, antes de renderizar: pedir nome e senha e só então
  // dizer que o convite venceu faria a pessoa preencher tudo para nada.
  let valido = false;
  let motivo: MotivoInvalido = 'invalido';

  try {
    const resposta = await FetchReq<{ valido: boolean; motivo?: MotivoInvalido }>(
      'ValidarTokenConvite',
      [token],
    );
    valido = resposta?.valido ?? false;
    motivo = resposta?.motivo ?? 'invalido';
  } catch {
    // API fora do ar ou resposta inesperada: trata como convite inválido.
    valido = false;
  }

  if (!valido) {
    return (
      <MolduraAuth>
        <div
          className="flex flex-column align-items-center text-center"
          style={{ maxWidth: '26rem' }}
        >
          <i
            className={`${PrimeIcons.EXCLAMATION_TRIANGLE} text-5xl text-orange-500 mb-3`}
            aria-hidden
          />
          <h2 className="text-900 text-2xl font-bold mb-2">Convite indisponível</h2>
          <p className="text-600 line-height-3 mb-4">{MENSAGENS[motivo]}</p>

          <Link
            href="/auth/login"
            className="p-button p-component no-underline"
          >
            <span className="p-button-label">Voltar para o login</span>
          </Link>
        </div>
      </MolduraAuth>
    );
  }

  return (
    <MolduraAuth>
      <BoxAceitarConvite token={token} />
    </MolduraAuth>
  );
}
