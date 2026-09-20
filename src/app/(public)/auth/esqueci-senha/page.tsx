import { Metadata } from 'next';

import MolduraAuth from '../_components/MolduraAuth';
import BoxEsqueciSenha from './BoxEsqueciSenha';

export const metadata: Metadata = {
  title: 'Esqueci minha senha',
};

export default function EsqueciSenhaPage() {
  return (
    <MolduraAuth>
      <BoxEsqueciSenha />
    </MolduraAuth>
  );
}
