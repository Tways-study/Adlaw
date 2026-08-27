"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/firebase/hooks";

export function FirebaseProvider({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
