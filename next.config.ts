import type { NextConfig } from "next";

const config: NextConfig = {
  images: { unoptimized: true },
  serverExternalPackages: ["postgres"],
};

export default config;
