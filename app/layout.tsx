import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "../lib/site.ts";
import "./globals.css";

const siteUrl = getSiteUrl();

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
