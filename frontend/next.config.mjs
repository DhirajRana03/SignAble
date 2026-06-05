/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle so the Docker runtime stage stays slim.
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: 'api' },
      // Production: page images + signed PDFs come from the backend on https.
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
