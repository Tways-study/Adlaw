import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Turbopack's root auto-detection walks up parent directories looking for
  // a lockfile and can land on an unrelated one outside this repo (e.g. a
  // stray package-lock.json in the home directory) — pin it explicitly so
  // it never picks the wrong project root.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
