import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  experimental: {
    typedRoutes: false,
  },
  serverComponentsExternalPackages: ["pdfkit"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude pdfkit from webpack bundling to avoid font file issues
      config.externals = config.externals || [];
      config.externals.push("pdfkit");
    }
    return config;
  },
};

export default nextConfig;
