'use client';
import { createContext, useContext, useReducer } from 'react';
import { parseCookies, destroyCookie } from 'nookies';
import useApi from '@/service/Api/ApiClient';

export const AuthContext = createContext({});

interface IAuthContext {
  login?: (email: string, password: string) => Promise<void>;
  logout?: () => Promise<void>;
}

export function AuthProvider({ children }) {
  const cookies = parseCookies();
  const { apiLogin, apiLogout } = useApi();

  const login = async (email: string, password: string) => {
    try {
      // Nada de credencial no localStorage: as duas linhas que gravavam
      // `token` e `expires_at` ali eram resíduo — ninguém as lia, e deixavam o
      // access token num lugar a mais ao alcance de qualquer script da página.
      await apiLogin(email, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    // Os cookies de sessão são httpOnly: `destroyCookie` não os alcança, só o
    // servidor consegue apagá-los. A chamada vem primeiro — se ela falhar, a
    // limpeza local ainda acontece e o usuário sai da aplicação de todo modo.
    try {
      await apiLogout();
    } catch (error) {
      console.error('Falha ao encerrar a sessão no servidor:', error);
    }

    try {
      // Os demais (userInfo, preferências) são legíveis e saem daqui.
      localStorage.clear();
      Object.keys(cookies).forEach((cookie) => {
        destroyCookie({}, cookie, { path: '/' });
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
