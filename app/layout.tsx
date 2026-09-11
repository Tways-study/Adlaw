import type { Metadata } from "next";
import { Inter, Source_Serif_4, Fraunces } from "next/font/google";
import { FirebaseProvider } from "./FirebaseProvider";
import { THEME_STORAGE_KEY } from "@/ui/theme/theme";
import "./globals.css";

// No `weight` array on purpose: passing one makes next/font serve discrete
// static instances (400/500/600/700 and nothing between). DESIGN.md's type
// scale specifies **550** for the focus card title, and `font-weight: 550`
// appears in seven files — with only static faces loaded, CSS font-matching
// snaps every one of them up to 600, so the most important type in the
// product rendered heavier than it was designed at. Omitting `weight` serves
// variable Inter, whose continuous axis actually has 550 on it.
const inter = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-accent",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

// The marketing/auth surfaces' display serif — Fraunces is the free fallback
// the "Lazy" reference design (styles.refero.design) names for its licensed
// Migra. Scoped entirely to ui/landing/landing.module.css's D1-D3 headline
// roles and the login/signup echo line (both under [data-surface="marketing"]
// via ui/landing/marketing-tokens.css); Source Serif 4 above keeps its
// existing, separate, single reserved use on the board's focus card.
const displaySerif = Fraunces({
  variable: "--font-display-serif",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

export const metadata: Metadata = {
  // `template` lets each route name itself ("Today · Adlaw") while the
  // landing page overrides `default` outright.
  title: { default: "Adlaw", template: "%s · Adlaw" },
  description: "One sentence in, a finite day out.",
};

const THEME_BOOT_SCRIPT = `(function(){try{
  var t = localStorage.getItem('${THEME_STORAGE_KEY}');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the beforeInteractive boot script below sets
    // data-theme on this element before React hydrates, which intentionally
    // differs from the server-rendered markup.
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable} ${displaySerif.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/*
          Plain inline script (not next/script): a theme-boot snippet must run
          synchronously during HTML parse, before paint, to set data-theme on
          <html> ahead of hydration. dangerouslySetInnerHTML is React's
          documented escape hatch for inline scripts — next/script's
          beforeInteractive doesn't guarantee synchronous inline execution and
          warns when given inline children.
        */}
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <FirebaseProvider>{children}</FirebaseProvider>
      </body>
    </html>
  );
}
