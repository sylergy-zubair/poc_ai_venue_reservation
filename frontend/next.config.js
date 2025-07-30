/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  images: {
    domains: ['images.venue.com', 'api.venue-booking.com'],
    formats: ['image/webp', 'image/avif'],
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Fix ESM module compatibility issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };

    // Add rule to handle dlv and other problematic ESM packages
    config.module.rules.push({
      test: /node_modules\/(dlv|other-esm-packages)\//,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
          plugins: ['@babel/plugin-transform-modules-commonjs']
        }
      }
    });

    // Analyze bundle size in development
    if (process.env.ANALYZE === 'true') {
      const withBundleAnalyzer = require('@next/bundle-analyzer')({
        enabled: true,
      });
      return withBundleAnalyzer(config);
    }
    
    return config;
  },
  
  // Transpile ESM packages that need it
  transpilePackages: ['dlv'],
  
  // Additional module resolution for problematic packages
  experimental: {
    typedRoutes: true,
    esmExternals: 'loose',
  },
};

module.exports = nextConfig;