import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    // Allow imports from parent directory
    config.resolve.alias = {
      ...config.resolve.alias,
      '@vault': path.resolve(__dirname, '../vault'),
    };

    return config;
  },

  // Transpile vault modules
  transpilePackages: [],

  // Experimental features for better module resolution
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
