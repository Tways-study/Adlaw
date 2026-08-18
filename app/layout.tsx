import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ledger",
  description: "One sentence in, a finite day out.",
};

const THEME_BOOT_SCRIPT = `(function(){try{
  var t = localStorage.getItem('kanban:theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ConvexAuthNextjsServerProvider>
      {/* suppressHydrationWarning: the beforeInteractive boot script below
          sets data-theme on this element before React hydrates, which
          intentionally differs from the server-rendered markup. */}
      <html lang="en" className={inter.variable} suppressHydrationWarning>
        <head>
          <Script id="theme-init" strategy="beforeInteractive">
            {THEME_BOOT_SCRIPT}
          </Script>
        </head>
        <body>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
