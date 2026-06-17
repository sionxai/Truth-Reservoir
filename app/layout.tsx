import type { Metadata } from "next";
import Link from "next/link";
import { absoluteSiteUrl, getSiteUrl } from "../lib/site.ts";
import "./globals.css";

const siteUrl = getSiteUrl();
const machineDiscoveryLinks = [
  {
    rel: "alternate",
    type: "application/json",
    title: "Truth Reservoir proposition index",
    href: absoluteSiteUrl("/api/v2/index.json")
  },
  {
    rel: "service-desc",
    type: "application/json",
    title: "OpenAPI",
    href: absoluteSiteUrl("/api/v2/openapi.json")
  },
  {
    rel: "describedby",
    type: "application/schema+json",
    href: absoluteSiteUrl("/api/v2/schema/cert-v2.schema.json")
  },
  {
    rel: "alternate",
    type: "text/plain",
    title: "LLM usage guide",
    href: absoluteSiteUrl("/llms.txt")
  }
] as const;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Truth Reservoir / 진실저수지",
  description: "증거 네트워크와 재현 가능한 해시를 공개하는 정적 신뢰 레이어",
  alternates: {
    canonical: "/"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {machineDiscoveryLinks.map((link) => (
          <link key={`${link.rel}:${link.href}`} {...link} />
        ))}
      </head>
      <body>
        <header className="site-header">
          <nav className="site-nav" aria-label="주요 이동">
            <Link className="brand" href="/">
              Truth Reservoir
            </Link>
            <div className="nav-links">
              <Link href="/api-docs">API</Link>
              <Link href="/about">About</Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
