import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { THEME_STORAGE_KEY } from "@/ui/theme/theme";
import "./globals.css";

const inter = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-accent",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  // `template` lets each route name itself ("Today · Ledger") while the
  // landing page overrides `default` outright.
  title: { default: "Ledger", template: "%s · Ledger" },
  description: "One sentence in, a finite day out.",
};

const THEME_BOOT_SCRIPT = `(function(){try{
  var t = localStorage.getItem('${THEME_STORAGE_KEY}');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ConvexAuthNextjsServerProvider>
      {/* suppressHydrationWarning: the beforeInteractive boot script below
          sets data-theme on this element before React hydrates, which
          intentionally differs from the server-rendered markup. */}
      <html
        lang="en"
        className={`${inter.variable} ${sourceSerif.variable}`}
        suppressHydrationWarning
      >
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
