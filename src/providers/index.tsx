'use client';

import { PrimeReactProvider, addLocale, locale } from 'primereact/api';
import { usePathname } from 'next/navigation';
import Loading from '@/components/Loading';
import ptBR from '@/constants/pt-br.json';
import { ServiceProvider } from '@/contexts/ServicesContext';
import { LayoutProvider } from '@/layout/context/layoutcontext';

/**
 * Traduções registradas no import do módulo, não num `useEffect`.
 *
 * `useEffect` só roda no cliente: o servidor renderizava os rótulos internos do
 * PrimeReact em inglês ("Show Password") e o cliente em português, e o React
 * derrubava a árvore por divergência de hidratação. Registrando aqui, os dois
 * lados produzem o mesmo HTML.
 */
addLocale('pt-br', ptBR['pt-br']);
locale('pt-br');

const OthersProvider = ({ children }) => {
  return (
    <ServiceProvider>
      <Loading />
      <LayoutProvider>{children}</LayoutProvider>
    </ServiceProvider>
  );
};

const LoginProvider = ({ children }) => {
  return (
    // `locale` aqui também: o `GeneralProvider` o define e este não definia,
    // então a tela de login usava os rótulos em inglês do PrimeReact.
    //
    // `ripple` pelo contexto, não por `PrimeReact.ripple = true` num efeito:
    // aquele é lido de forma síncrona no render (igual em servidor e cliente),
    // este só depois do mount - a primeira reconciliação após a hidratação
    // sempre via o servidor sem o `<span class="p-ink">` e o cliente já com
    // ele (ou o oposto, se o singleton mutável tivesse ficado `true` de uma
    // navegação anterior), e o React derrubava a árvore com "Hydration
    // failed". Mesmo problema do comentário de `addLocale` abaixo.
    <PrimeReactProvider value={{ locale: 'pt-br', ripple: true }}>
      <OthersProvider>{children}</OthersProvider>
    </PrimeReactProvider>
  );
};

const GeneralProvider = ({ children }) => {
  return (
    <PrimeReactProvider
      value={{
        pt: {
          button: {
            root: {
              className: 'p-button-sm shadow-none',
            },
          },
          inputtext: {
            root: {
              className: 'p-inputtext-sm',
            },
          },
          dropdown: {
            root: {
              className: 'p-inputtext-sm',
            },
          },
        },
        locale: 'pt-br',
        ripple: true,
      }}
    >
      <OthersProvider>{children}</OthersProvider>
    </PrimeReactProvider>
  );
};

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const path = usePathname();
  const isLoginPage = path === '/auth/login';

  return isLoginPage ? (
    <LoginProvider>{children}</LoginProvider>
  ) : (
    <GeneralProvider>{children}</GeneralProvider>
  );
};
