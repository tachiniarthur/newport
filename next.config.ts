import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * nodemailer is not on the list Next externalises by default, and bundling
   * it breaks it: it resolves transports and encodings through dynamic
   * requires that a bundler cannot follow. Left as a native require, it runs
   * from node_modules the way it expects to.
   */
  serverExternalPackages: ["nodemailer"],
};

export default nextConfig;
