import type { Metadata } from "next";

// app/board/page.tsx is a client component and so cannot export metadata
// itself. This layout exists for that reason alone.
export const metadata: Metadata = {
  title: "Today",
};

export default function BoardLayout({ children }: LayoutProps<"/board">) {
  return children;
}
