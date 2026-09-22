import { NextRequest, NextResponse } from 'next/server';
import { cookies as cookieStorage } from 'next/headers';
import ApiService from './service/Api/ApiServer';
import { PUBLIC_ROUTES } from './constants';
import { jwtDecode } from 'jwt-decode';
import { JWTToken } from './Interfaces';
import { getUserInfo } from './actions/userInfo';

const isPublicRoute = (route: string) => {
  return PUBLIC_ROUTES.some((publicRoute) => {
    if (publicRoute instanceof RegExp) {
      return publicRoute.test(route);
    }
    return publicRoute === route;
  });
};

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const { apiRefreshToken } = await ApiService();
  const cookies = await cookieStorage();
  const path = nextUrl.pathname;
  const autenticado = cookies.has('token');
  const refresh = cookies.get('refresh_token')?.value;
  const userInfo: string = cookies.get('userInfo')?.value;
  const expires_at = cookies.get('expires_at')?.value;
  const now = Math.floor(new Date().getTime() / 1000.0);

  const paraLogout = () => NextResponse.redirect(new URL('/auth/logout', request.url));

  /**
   * Tenta renovar a sessão e seguir para a rota pedida.
   *
   * Os tokens são cookies **httpOnly**, emitidos pelo backend - o middleware
   * não os grava, apenas repassa ao navegador os `Set-Cookie` que a API
   * devolveu. Sem esse repasse a renovação ficaria só no servidor e o cliente
   * continuaria com os cookies velhos.
   *
   * Devolve `null` quando não há como renovar, para o chamador decidir.
   */
  const tentaRenovar = async (): Promise<NextResponse | null> => {
    if (!refresh) return null;

    // Refresh ilegível (cookie corrompido) equivale a não ter refresh.
    let refreshExp: number;
    try {
      refreshExp = Number(jwtDecode<Pick<JWTToken, 'exp'>>(refresh).exp);
    } catch {
      return null;
    }

    if (!Number.isFinite(refreshExp) || refreshExp < now) return null;

    try {
      const setCookies = await apiRefreshToken(refresh);
      if (!setCookies.length) return null;

      const resposta = NextResponse.redirect(new URL(request.url, request.url));
      // `append`, não `set`: são três cookies em cabeçalhos separados, e
      // concatená-los numa string só faria o navegador recusar todos.
      for (const cookie of setCookies) {
        resposta.headers.append('set-cookie', cookie);
      }
      return resposta;
    } catch (err) {
      // O log é o que distingue refresh recusado de API fora do ar - antes
      // este catch era vazio e a falha sumia sem rastro.
      console.error('Falha ao renovar a sessão no middleware:', err);
      return null;
    }
  };

  if (isPublicRoute(path)) {
    // Já autenticado não precisa ver a tela de login.
    if (path.startsWith('/auth/login') && autenticado) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Sem o cookie de access: só o refresh pode recuperar a sessão.
  if (!autenticado) {
    return (await tentaRenovar()) ?? paraLogout();
  }

  // Ausente conta como expirado: `Number(undefined)` é `NaN`, e como
  // `NaN < now` é `false` o middleware pulava a renovação e seguia com um
  // access morto - era a causa de o portal cair mesmo com refresh válido.
  const accessExpirado =
    !expires_at || !Number.isFinite(Number(expires_at)) || Number(expires_at) < now;

  if (accessExpirado) {
    return (await tentaRenovar()) ?? paraLogout();
  }

  if (!userInfo) {
    try {
      await getUserInfo();
      // Redireciona para a mesma URL para que a nova requisição já leve o
      // cookie `userInfo`.
      return NextResponse.redirect(new URL(request.url));
    } catch (err) {
      console.error('Failed to get user info:', err);
      return paraLogout();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!api|static|.*\\..*|_next).*)',
};
