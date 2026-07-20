/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用匿名登录
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // 图片域名白名单
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.qrserver.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;
