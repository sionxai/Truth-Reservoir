import type { Metadata } from "next";
import Link from "next/link";
import { absoluteSiteUrl, getSiteUrl } from "../lib/site.ts";
import "./globals.css";

const siteUrl = getSiteUrl();
const machineDiscoveryLinks = [
  {
    rel: "alternate",
    type: "application/json",
    title: "Truth Reservoir compact search manifest",
    href: absoluteSiteUrl("/api/v2/search-index.json")
  },
  {
    rel: "alternate",
    type: "application/json",
    title: "Truth Reservoir proposition index",
    href: absoluteSiteUrl("/api/v2/index.json")
  },
  {
    rel: "alternate",
    type: "application/json",
    title: "Truth Reservoir derived relation graph",
    href: absoluteSiteUrl("/api/v2/graph.json")
  },
  {
    rel: "alternate",
    type: "application/json",
    title: "Truth Reservoir public request queue",
    href: absoluteSiteUrl("/api/v2/requests.json")
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
  },
  {
    rel: "alternate",
    type: "text/plain",
    title: "Truth Reservoir full plain-text reservoir",
    href: absoluteSiteUrl("/llms-full.txt")
  }
] as const;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Truth Reservoir 진실저수지 — verified fact repository / public JSON API",
  description:
    "Truth Reservoir 진실저수지는 verified propositions, Cert v2.1, static JSON API, fact verification, Korean facts를 공개하는 정적 사실 저장소입니다.",
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
        <link
          rel="preload"
          href="/fonts/PretendardVariable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
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
