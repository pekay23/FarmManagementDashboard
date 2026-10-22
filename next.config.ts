import type { NextConfig } from "next";

const ALLOWED_DEV_ORIGINS = process.env.ALLOWED_DEV_ORIGINS
  ?.split(",")
  .map((s) => s.trim())
  .filter(Boolean) ?? ["localhost", "127.0.0.1", "192.168.8.202"];

// `next-auth/react` parses NEXTAUTH_URL at module scope and prefixes it with
// "https://" when it does not start with "http". A value with stray whitespace
// becomes "https:// https://host:3000" and crashes the build. Normalize here.
if (typeof process.env.NEXTAUTH_URL === "string") {
  const trimmed = process.env.NEXTAUTH_URL.trim();
  if (trimmed !== process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = trimmed;
  }
}

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ALLOWED_DEV_ORIGINS,

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 80, 90],
    minimumCacheTTL: 3600,
    contentSecurityPolicy: "img-src 'self' data: https:; object-src https: data:;",
    localPatterns: [
      { pathname: "/images/**" },
      { pathname: "/logos/**" },
      { pathname: "/favicon/**" },
    ],
  },

  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    if (isProd) {
      csp.push("upgrade-insecure-requests");
      headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
      headers.push({ key: "Content-Security-Policy", value: csp.join("; ") });
    }
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;