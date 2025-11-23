'use client';
import { createContext, useContext, useReducer } from 'react';
import { parseCookies, setCookie, destroyCookie } from 'nookies';
import { jwtDecode } from 'jwt-decode';
import useApi from '@/service/Api/ApiClient';
import { JWTToken } from '@/Interfaces';

export const AuthContext = createContext({});

interface IAuthContext {
  login?: (email: string, password: string) => Promise<void>;
  logout?: () => Promise<void>;
}

export function AuthProvider({ children }) {
  const cookies = parseCookies();
  const { apiLogin } = useApi();

  const login = async (email: string, password: string) => {
    try {
      const { access_token, refresh_token } = await apiLogin(email, password);
      const decodedToken = jwtDecode<JWTToken>(access_token);
      const decodedRefresh = jwtDecode<Pick<JWTToken, 'exp'>>(refresh_token);

      setCookie(null, 'token', access_token, {
        maxAge: decodedToken.exp + 60 * 5 - Math.floor(Date.now() / 1000.0),
        path: '/',
      });
      setCookie(null, 'refresh_token', refresh_token, {
        maxAge: decodedRefresh.exp - Math.floor(Date.now() / 1000.0),
        path: '/',
      });
      setCookie(null, 'expires_at', decodedToken.exp.toString(), {
        maxAge: 20000,
        path: '/',
      });

      localStorage.setItem('token', access_token);
      localStorage.setItem('expires_at', decodedToken.exp.toString());
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      localStorage.clear();
      Object.keys(cookies).forEach((cookie) => {
        destroyCookie({}, cookie, {
          path: '/',
        });
      });
    } catch (error) {}
  };

  const [contexts] = useReducer(
    (state: IAuthContext, newState: Partial<IAuthContext>) => ({ ...state, ...newState }),
    {
      login,
      logout,
    },
  );

  return <AuthContext.Provider value={contexts}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext<IAuthContext>(AuthContext);
