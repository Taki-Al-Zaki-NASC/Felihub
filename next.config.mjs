/** @type {import('next').NextConfig} */
const nextConfig = {
  // Broken links become build failures rather than 404s a user finds.
  typedRoutes: true,
  experimental: {
    // Server Actions carry the mutations; keep the body cap tight so an
    // oversized upload is refused at the edge rather than in a handler.
    serverActions: { bodySizeLimit: '4mb' },
  },
};
export default nextConfig;
