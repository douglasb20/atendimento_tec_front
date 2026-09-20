import { Metadata } from 'next';
import Link from 'next/link';
import { PrimeIcons } from 'primereact/api';

import ApiService from '@/service/Api/ApiServer';
import MolduraAuth from '../../_components/MolduraAuth';
import BoxRedefinirSenha from './BoxRedefinirSenha';

export const metadata: Metadata = {
  title: 'Redefinir senha',
};

type MotivoInvalido = 'invalido' | 'expirado' | 'usado';

const MENSAGENS: Record<MotivoInvalido, string> = {
  expirado: 'Este link já passou da validade de 30 minutos.',
  usado: 'Este link já foi usado para redefinir a senha.',
  invalido: 'Este link não é válido. Confira se ele foi copiado por inteiro.',
};

export default async function RedefinirSenhaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { FetchReq } = await ApiService();

  // Validado no servidor, antes de renderizar: pedir a senha nova e só então
  // dizer que o link venceu faria o usuário digitar duas vezes para nada.
  let valido = false;
  let motivo: MotivoInvalido = 'invalido';

  try {
    const resposta = await FetchReq<{ valido: boolean; motivo?: MotivoInvalido }>(
      'ValidarTokenSenha',
      [token],
    );
    valido = resposta?.valido ?? false;
    motivo = resposta?.motivo ?? 'invalido';
  } catch {
    // API fora do ar ou resposta inesperada: trata como link inválido. Mostrar
    // o formulário aqui só adiaria a falha para depois de digitar a senha.
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
          <h2 className="text-900 text-2xl font-bold mb-2">Link indisponível</h2>
          <p className="text-600 line-height-3 mb-4">{MENSAGENS[motivo]}</p>

          <Link
            href="/auth/esqueci-senha"
            className="p-button p-component no-underline"
          >
            <span className="p-button-label">Pedir um novo link</span>
          </Link>

          <Link
            href="/auth/login"
            className="text-600 no-underline hover:text-primary mt-3"
          >
            Voltar para o login
          </Link>
        </div>
      </MolduraAuth>
    );
  }

  return (
    <MolduraAuth>
      <BoxRedefinirSenha token={token} />
    </MolduraAuth>
  );
}
