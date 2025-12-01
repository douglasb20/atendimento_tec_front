/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '',
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        hostname: 's3.us-central-1.wasabisys.com/**',
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
  },
};

module.exports = nextConfig;
