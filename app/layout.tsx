import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { FirebaseProvider } from "./FirebaseProvider";
import "./globals.css";

// No `weight` array on purpose: passing one makes next/font serve discrete
// static instances. DESIGN.md's type scale uses Linear's 510 and 590, which
// only exist on the variable axis — with static faces loaded, CSS
// font-matching would snap them to 500 and 600.
const inter = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
});

// Linear's code face is Berkeley Mono (licensed); JetBrains Mono is its
// documented substitute. Reserved for the reference's "issue ID" slot —
// course codes and keyboard hints — never headings, prose, or durations.
const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  // `template` lets each route name itself ("Today · Adlaw") while the
  // landing page overrides `default` outright.
  title: { default: "Adlaw", template: "%s · Adlaw" },
  description: "One sentence in, a finite day out.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>
        <FirebaseProvider>{children}</FirebaseProvider>
      </body>
    </html>
  );
}
