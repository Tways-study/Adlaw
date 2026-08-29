"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/firebase/auth";
import shared from "./shared.module.css";
import styles from "./SignOutSection.module.css";

// BoardHeader.tsx keeps its own sign-out button as a fast path — this is
// the same logic, duplicated here so Settings is the complete config
// surface the plan calls for, not a subset of it.
export function SignOutSection() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  return (
    <section className={shared.section}>
      <h2 className={shared.heading}>Account</h2>
      <button type="button" className={styles.signOutBtn} onClick={() => void handleSignOut()}>
        Sign out
      </button>
    </section>
  );
}
