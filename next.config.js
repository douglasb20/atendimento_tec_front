/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '',
  reactStrictMode: false,
  images: {
    domains: ['s3.us-central-1.wasabisys.com'],
  },
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
