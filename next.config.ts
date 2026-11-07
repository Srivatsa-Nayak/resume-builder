import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // pdf.js (via unpdf) and the OCR stack load at runtime on the server instead of being bundled.
  serverExternalPackages: ["unpdf", "tesseract.js", "@tesseract.js-data/eng", "@napi-rs/canvas", "@react-pdf/renderer"],
  // Files the server reads by path at runtime, which automatic tracing can't see.
  // Without this, serverless deployments (Vercel) ship functions without them:
  // template fonts for PDF/preview rendering, and OCR's worker, WASM core and language data.
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./public/fonts/**/*",
      "./node_modules/tesseract.js/src/**/*",
      "./node_modules/tesseract.js-core/**/*",
      "./node_modules/@tesseract.js-data/eng/4.0.0/**/*",
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
