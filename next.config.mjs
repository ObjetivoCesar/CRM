/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@react-pdf/renderer'],
}

export default nextConfig
