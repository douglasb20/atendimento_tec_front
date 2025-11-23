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

  const UpdateToken = async () => {
    const { access_token, refresh_token } = await apiRefreshToken(refresh);
    const newRefreshTokenDecoded = jwtDecode<Pick<JWTToken, 'exp'>>(refresh_token);
    const newAccessTokenDecoded = jwtDecode<JWTToken>(access_token);

    cookies.set({
      name: 'token',
      value: access_token,
      maxAge: Number(newAccessTokenDecoded.exp) - Math.floor(Date.now() / 1000.0),
      path: '/',
    });
    cookies.set({
      name: 'refresh_token',
      value: refresh_token,
      maxAge: Number(newRefreshTokenDecoded.exp) - Math.floor(Date.now() / 1000.0),
      path: '/',
    });
    cookies.set({
      name: 'expires_at',
      value: newAccessTokenDecoded.exp.toString(),
      maxAge: Number(newRefreshTokenDecoded.exp) - Math.floor(Date.now() / 1000.0),
      path: '/',
    });
    return true;
  };

  // Verifica se a roda que está passando é publica
  if (!isPublicRoute(path)) {
    // verifica se está autenticado,
    // se não tiver, redireciona para tela de login
    if (!autenticado) {
      if (refresh) {
        const refreshDecoded = jwtDecode<Pick<JWTToken, 'exp'>>(refresh);
        if (Number(refreshDecoded.exp) >= now) {
          try {
            const updated = await UpdateToken();
            if (updated) {
              return NextResponse.redirect(new URL(request.url, request.url));
            }
          } catch (err) {}
        }
      }
      return NextResponse.redirect(new URL('/auth/logout', request.url));
    } else {
      // verifica se o token expirou
      // se tiver expirado, valida o refresh token
      if (Number(expires_at) < now) {
        if (refresh) {
          const refreshDecoded = jwtDecode<Pick<JWTToken, 'exp'>>(refresh);
          if (Number(refreshDecoded.exp) >= now) {
            try {
              const updated = await UpdateToken();
              if (updated) {
                return NextResponse.redirect(new URL(request.url, request.url));
              }
            } catch (err) {}
          }
        }
        return NextResponse.redirect(new URL('/auth/logout', request.url));
      }
      if (!userInfo) { 
        await getUserInfo();
      }
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
