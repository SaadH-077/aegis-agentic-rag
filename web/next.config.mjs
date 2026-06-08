/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three.js ships ESM that benefits from transpilation in Next 14.
  transpilePackages: ["three"],
  // Lint is run in CI / via `npm run lint`; don't fail production builds on it.
  eslint: { ignoreDuringBuilds: true },
  // Lean, self-contained server bundle for Docker.
  output: "standalone",
};

export default nextConfig;
