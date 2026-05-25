import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/rank_F",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
