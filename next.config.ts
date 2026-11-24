import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components ei project-e lagbe na. On thakle auth() use kora
  // page-e Suspense chhara error dey, tai off rakhi.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;