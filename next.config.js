/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '',
  webpack: (config) => {
    config.resolve.alias.canvas = false;

    return config;
  },
  publicRuntimeConfig: {
    contextPath: '',
  },
  env: {
    URL_ENDPOINT: process.env.URL_ENDPOINT,
  },
};

module.exports = nextConfig;
