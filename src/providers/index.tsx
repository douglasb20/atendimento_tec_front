'use client';

import { PrimeReactProvider } from 'primereact/api';
import { usePathname } from 'next/navigation';
import Loading from 'components/Loading';
import { ServiceProvider } from 'contexts/ServicesContext';
import { LayoutProvider } from 'layout/context/layoutcontext';

const OthersProvider = ({ children }) => {
  return (
    <ServiceProvider>
      <Loading />
      <LayoutProvider>{children}</LayoutProvider>
    </ServiceProvider>
  );
}

const LoginProvider = ({ children }) => {
  return (
    <PrimeReactProvider value={{}}>
      <OthersProvider>{children}</OthersProvider>
    </PrimeReactProvider>
  )
}

const GeneralProvider = ({ children }) => {
  return (
    <PrimeReactProvider
      value={{
        pt: {
          button: {
            root: {
              className: 'p-button-sm',
            },
          },
          inputtext: {
            root: {
              className: 'p-inputtext-sm',
            },
          },
        },
      }}
    >
      <OthersProvider>{children}</OthersProvider>
    </PrimeReactProvider>
  );
}

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const path = usePathname();
  const isLoginPage = path === '/auth/login';

  return isLoginPage ? (
    <LoginProvider>{children}</LoginProvider>
  ) : (
    <GeneralProvider>{children}</GeneralProvider>
  );
}
