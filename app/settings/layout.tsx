import type { Metadata } from "next";

// app/settings/page.tsx is a client component and so cannot export metadata
// itself — same reason app/schedule/layout.tsx and app/board/layout.tsx exist.
export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return children;
}
