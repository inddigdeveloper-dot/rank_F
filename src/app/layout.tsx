import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RankAutoCheck | Google Maps SEO Tracker",
  description: "Monitor your local business ranking in real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Decode GitHub Pages 404 SPA redirect back to the real path */}
        <script dangerouslySetInnerHTML={{ __html: `(function(l){if(l.search[1]==='/'){var d=l.search.slice(1).split('&').map(function(s){return s.replace(/~and~/g,'&')}).join('?');window.history.replaceState(null,null,l.pathname.slice(0,-1)+d+l.hash)}}(window.location))` }} />
      </head>
      <body className={inter.className} style={{ margin: 0, padding: 0 }}>
        <Providers>
          <Header />
          <main style={{ minHeight: 'calc(100vh - 120px)' }}>
            {children}
          </main>
          <footer
            style={{
              textAlign: 'center',
              padding: '16px 0',
              fontSize: '12px',
              color: '#64748b',
              borderTop: '1px solid #e2e8f0',
              lineHeight: '1.6',
            }}
            className="app-footer"
          >
            © 2026 RankAutoCheck | Built by Inddig Media
          </footer>
        </Providers>
        <style>{`
          .app-footer { border-top-color: #e5d7d3; background-color: #fffdfc; }
          [data-theme='dark'] .app-footer { border-top-color: #473226; color: #a88c80; background-color: #1e140f; }
        `}</style>
      </body>
    </html>
  );
}
