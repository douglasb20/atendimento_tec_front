'use client';
import { Reducer, createContext, useContext, useEffect, useReducer } from 'react';
import { addLocale, locale } from 'primereact/api';

import ptBR from '@/constants/pt-br.json';

export const ServiceContext = createContext({});

interface IServiceContext {
  setLoading?: (state: boolean) => void;
  setPdfPreview?: (props: IPDFPreview) => void;
  setModalPasswordVisible?: (state: boolean) => void;
  readonly modalPasswordVisible?: boolean;
  readonly isLoading?: boolean;
  readonly pdfPreview?: IPDFPreview;
}

interface IPDFPreview {
  visible: boolean;
  file: File | string | null;
}

export function ServiceProvider({ children }: { children: React.ReactNode }) {
  const setLoading = (state: boolean) => {
    setContexts({ isLoading: state });
  };

  const setPdfPreview = ({ visible, file }: IPDFPreview) => {
    setContexts({
      pdfPreview: {
        visible: visible,
        file: file,
      },
    });
  };

  const setModalPasswordVisible = (state: boolean) => {
    setContexts({ modalPasswordVisible: state });
  };

  const [contexts, setContexts] = useReducer<Reducer<IServiceContext, IServiceContext>>(
    (state: IServiceContext, newState: IServiceContext): IServiceContext => ({
      ...state,
      ...newState,
    }),
    {
      setLoading,
      setPdfPreview,
      setModalPasswordVisible,
      isLoading: false,
      modalPasswordVisible: false,
      pdfPreview: {
        visible: false,
        file: null,
      },
    },
  );

  useEffect(() => {
    addLocale('pt-br', ptBR['pt-br']);
    locale('pt-br');
  }, []);

  return (
    <>
      <ServiceContext.Provider value={contexts}>{children}</ServiceContext.Provider>
    </>
  );
}

export const useService = () => useContext<IServiceContext>(ServiceContext);
