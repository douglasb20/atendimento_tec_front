import { Viewport, Metadata } from 'next';
import { cookies } from 'next/headers';

import { Providers } from '@/providers';
import { COOKIE_TEMA, temaDoServidor, urlDoTema } from '@/service/Tema';

import '@/styles/layout/layout.scss';
import 'animate.css';

interface RootLayoutProps {
  children: React.ReactNode;
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'Automatec Sistemas',
    template: 'Automatec Sistemas | %s',
  },
  metadataBase: new URL('http://dgapp:3000'),
  description: 'Automatec Sistemas',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    title: 'Automatec Sistemas',
    url: process.env.URL_OGG,
    description: 'Automatec Sistemas',
    // images: [`${process.env.URL_OGG}/layout/image/logo-atende.png`],
    ttl: 604800,
  },
  icons: {
    icon: `/images/logo.png`,
  },
};

export default async function RootLayout({ children }: RootLayoutProps) {
  // O tema já sai no HTML do servidor.
  //
  // A fonte de verdade é o banco (`users.tema`), mas lê-lo aqui custaria uma
  // chamada à API antes do primeiro byte. O cookie é o espelho: o `RootLayout`
  // monta o `<link>` certo de cara, e quem usa tema escuro não vê o flash
  // branco que os dois sistemas de referência têm - ambos entregam um tema
  // fixo no HTML e corrigem depois da hidratação.
  //
  // Cookie ausente ou adulterado cai no padrão, pelo `desserializaTema`.
  //
  // O `userInfo` entra como segunda fonte: ele carrega o tema vindo do banco e
  // é recriado pelo middleware sempre que falta. Sem ele, um navegador que
  // perdesse só o cookie de tema (ou uma aba aberta antes de a preferência
  // existir) pintaria no padrão e o sidebar apareceria com a sombra clara do
  // tema light sobre o fundo escuro.
  const jar = await cookies();
  const { cor, modo } = temaDoServidor(jar.get(COOKIE_TEMA)?.value, jar.get('userInfo')?.value);

  return (
    <html
      lang="pt-br"
      suppressHydrationWarning
      // No `<html>`, e não na div do layout como vem do template: o
      // PrimeReact renderiza modal, dropdown e tooltip em portais no `body`,
      // que ficam fora daquela div - eram eles que continuavam claros.
      // `layout-colorscheme-menu` junto: é ele que define `--menu-bg` e as
      // cores do menu a partir das superfícies do tema. Na div do layout ele
      // não alcançaria os portais, e o modal ficava claro sobre o fundo escuro.
      className={`layout-${modo} layout-colorscheme-menu`}
    >
      <head>
        <link
          id="theme-link"
          href={urlDoTema(cor, modo)}
          rel="stylesheet"
        ></link>
        <link
          id="ftaw-link"
          href={`/vendor/fontawesome/css/all.css`}
          rel="stylesheet"
        ></link>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
