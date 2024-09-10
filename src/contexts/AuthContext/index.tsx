'use client';
import { createContext, useContext, useReducer } from 'react';
import { parseCookies, setCookie, destroyCookie } from 'nookies';
import { jwtDecode } from '@/service/Util';
import useApi from '@/service/Api/ApiClient';

export const AuthContext = createContext({});

interface IAuthContext {
  login?: (email: string, password: string) => Promise<void>;
  logout?: () => Promise<void>;
}

interface IJwtDecode {
  id: number;
  name: string;
  email: string;
  iat: number;
  exp: number;
}

export function AuthProvider({ children }) {
  const cookies = parseCookies();
  const { apiLogin } = useApi();

  const login = async (email: string, password: string) => {
    try {
      const { access_token } = await apiLogin(email, password);
      const decodedToken = jwtDecode<IJwtDecode>(access_token);

      setCookie(null, 'token', access_token, {
        maxAge: 60 * 60,
        path: '/',
      });
      setCookie(null, 'expires_at', decodedToken.exp.toString(), {
        maxAge: 60 * 60,
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
