import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 15.5.19 is pinned intentionally: the PRD requires the latest installable
  // 15.5.x stable patch for this static-export foundation instead of Next 16.x.
  output: "export",
  outputFileTracingRoot: projectRoot,
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
