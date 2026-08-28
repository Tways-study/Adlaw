import type { Metadata } from "next";

// app/schedule/page.tsx is a client component and so cannot export metadata
// itself — same reason app/board/layout.tsx exists.
export const metadata: Metadata = {
  title: "Schedule",
};

export default function ScheduleLayout({ children }: LayoutProps<"/schedule">) {
  return children;
}
