/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera `.next/standalone` com um servidor Node e apenas os módulos que o
  // build realmente usa. Sem isso, a imagem de produção precisa carregar o
  // `node_modules` inteiro — 1.7GB contra algo em torno de 200MB.
  output: 'standalone',
  basePath: '',
  reactStrictMode: false,
  images: {
    remotePatterns: [
      // Backblaze B2 (endpoint S3-compatible). O bucket é público, então a URL
      // é permanente e o next/image consegue otimizá-la.
      {
        hostname: 's3.eu-central-003.backblazeb2.com',
        protocol: 'https',
      },
      // Avatares de contato vêm do WhatsApp. A URL é assinada e expira, mas
      // declarar o host evita que o next/image lance durante o render.
      {
        hostname: 'pps.whatsapp.net',
        protocol: 'https',
      },
    ],
  },
  sassOptions: {
    silenceDeprecations: ['legacy-js-api', 'import'], // Add the IDs of warnings to silence
  },
  turbopack: {
    resolveAlias: {
      '@/': './src/',
    },
  },
  env: {
    URL_ENDPOINT: process.env.URL_ENDPOINT,
    WEBSOCKET_HOST: process.env.WEBSOCKET_HOST,
  },
};

module.exports = nextConfig;
