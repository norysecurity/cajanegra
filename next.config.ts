import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Libera imagens externas
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', 
      },
    ],
  },
  
  // 2. Redirecionamento da raiz (/) para o seu App (/app)
  async redirects() {
    return [
      {
        source: '/',
        destination: '/app',
        permanent: true,
      },
    ]
  },

  // 3. Configurações para o Upload e Server Actions
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
