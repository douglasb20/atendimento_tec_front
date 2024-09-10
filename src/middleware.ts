import { NextRequest, NextResponse } from 'next/server';
import { PUBLIC_ROUTES } from './constants';

export async function middleware(request: NextRequest) {
  const { cookies, nextUrl } = request;
  const path = nextUrl.pathname;
  const autenticado = cookies.has('token');
  const expires_at = cookies.get('expires_at')?.value;

  // Verifica se a roda que está passando é publica
  if (!PUBLIC_ROUTES.includes(path)) {
    // verifica se está autenticado,
    // se não tiver, redireciona para tela de login
    if (!autenticado) {
      return NextResponse.redirect(new URL('/auth/logout', request.url));
    } else {
      // verifica se o token expirou
      // se tiver expirado, redireciona para tela de ligout
      const now = Math.floor(new Date().getTime() / 1000.0);
      if (+expires_at < now) return NextResponse.redirect(new URL('/auth/logout', request.url));
    }
  } else {
    // Caso tiver ir para a tela de login e tiver autenticado
    // irá redirecionar para a tela principal
    if (path.startsWith('/auth/login') && autenticado) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!api|static|.*\\..*|_next).*)',
};
