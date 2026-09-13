'use client';
import ModalAlteraSenha from '@/components/ModalAlteraSenha';
import Layout from '@/layout/layout';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  // TEMPORÁRIO: o React passa a pilha de COMPONENTES como último argumento do
  // aviso. É ela que nomeia o culpado, ao contrário do stack de execução.
  if (typeof window !== 'undefined' && !(window as any).__patchKey2) {
    (window as any).__patchKey2 = true;
    const original = console.error;
    console.error = (...args: unknown[]) => {
      if (String(args[0]).includes('unique "key"')) {
        original('### PILHA DE COMPONENTES ###');
        original(args[args.length - 1]);
      }
      original(...args);
    };
  }

  return (
    <>
      <ModalAlteraSenha />
      <Layout>{children}</Layout>
    </>
  );
}
