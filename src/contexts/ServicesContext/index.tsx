'use client';
import { createContext, useContext, useReducer } from 'react';

export const ServiceContext = createContext({});

interface IServiceContext {
  setLoading?: (state?: boolean) => void;
  setPdfPreview?: (props: IPDFPreview) => void;
  readonly isLoading?: boolean;
  readonly pdfPreview?: IPDFPreview;
}

interface IPDFPreview {
  visible: boolean;
  file: File | string | null;
}

export function ServiceProvider({ children }: { children: React.ReactNode }) {
  // O React 19 mudou a assinatura: `useReducer` passou a inferir os tipos do
  // próprio redutor, e o genérico antigo (`Reducer<S, A>`) deixou de encaixar.
  const [contexts, setContexts] = useReducer(
    (state: IServiceContext, newState: IServiceContext): IServiceContext => ({
      ...state,
      ...newState,
    }),
    {
      isLoading: false,
      pdfPreview: {
        visible: false,
        file: null,
      },
    },
  );

  const setLoading = (state: boolean = true) => {
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

  return (
    <>
      <ServiceContext.Provider value={{ ...contexts, setLoading, setPdfPreview }}>
        {children}
      </ServiceContext.Provider>
    </>
  );
}

export const useService = () => useContext<IServiceContext>(ServiceContext);
