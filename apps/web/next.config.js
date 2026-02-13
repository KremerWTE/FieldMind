/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@fieldmind/shared'],
  images: {
    domains: ['fieldmind-photos-dev.s3.amazonaws.com'],
  },
};

module.exports = nextConfig;
