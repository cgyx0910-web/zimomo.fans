import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@guge/db"],
  serverExternalPackages: ["pg", "postgres"],
  async rewrites() {
    return {
      beforeFiles: [
        /** 外层 URL 仍为 `/calendar/feed.ics`，避免带点段名触发构建限制 */
        { source: "/calendar/feed.ics", destination: "/calendar/feed" },
      ],
    };
  },
};

export default nextConfig;
