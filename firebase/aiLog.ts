import { addDoc, collection } from "firebase/firestore";
import { db } from "./client";
import type { AiLogPayload } from "@/ai/types";

// There is no Firebase Admin SDK and no service account in this project
// (see CLAUDE.md's Slice 7 scope note) — an app/api/ai/* Route Handler
// cannot write to Firestore as the user, so it returns the log payload
// alongside its result and the client writes it here, with its own auth.
// firestore.rules validates the shape structurally on the way in, the same
// role this typed signature plays on the way out.
export async function writeAiLog(uid: string, payload: AiLogPayload): Promise<void> {
  await addDoc(collection(db, "users", uid, "aiLog"), {
    ...payload,
    createdAt: Date.now(),
  });
}
