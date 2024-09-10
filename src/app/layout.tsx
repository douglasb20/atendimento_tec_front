import { Viewport, Metadata } from 'next';
import { PrimeReactProvider } from 'primereact/api';
import { Providers } from 'providers';

import 'styles/layout/layout.scss';
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
  title: 'Automatec Sistemas',
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

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="pt-br"
      suppressHydrationWarning
    >
      <head>
        <link
          id="theme-link"
          href={`/theme/theme.css`}
          rel="stylesheet"
        ></link>
        <link
          id="ftaw-link"
          href={`/vendor/fontawesome/css/all.min.css`}
          rel="stylesheet"
        ></link>
      </head>
      <body>
        <PrimeReactProvider>
          <Providers>{children}</Providers>
        </PrimeReactProvider>
      </body>
    </html>
  );
}
