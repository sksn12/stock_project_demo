import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS || false;
let repo = "";
if (isGithubActions && process.env.GITHUB_REPOSITORY) {
  repo = process.env.GITHUB_REPOSITORY.replace(/.*?\//, "");
}

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: repo ? `/${repo}` : undefined,
  assetPrefix: repo ? `/${repo}/` : undefined,
};

export default nextConfig;
