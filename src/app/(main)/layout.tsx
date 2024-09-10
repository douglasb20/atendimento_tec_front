import ModalAlteraSenha from 'components/ModalAlteraSenha';
import Layout from 'layout/layout';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <>
      <ModalAlteraSenha />
      <Layout>{children}</Layout>;
    </>
  );
}
