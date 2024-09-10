'use client';

import Loading from 'components/Loading';
import { ServiceProvider } from 'contexts/ServicesContext';
import { LayoutProvider } from 'layout/context/layoutcontext';

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <ServiceProvider>
      <Loading />
      <LayoutProvider>{children}</LayoutProvider>
    </ServiceProvider>
  );
};
