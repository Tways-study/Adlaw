// PRD M17: "Captures typed while offline queue in localStorage and flush on
// reconnect." A deliberate, explicit queue — not just a bet on Firestore's
// own offline write queue (firebase/client.ts's persistentLocalCache also
// helps here, but only once courses/laneOrder have been cached from a prior
// online session; a first capture on a never-synced device still needs
// somewhere to land). ui/capture/CaptureBar.tsx is the only caller: per the
// plan, only capture submission queues — drag, complete, and delete are not
// covered by this module.

import { create } from "@/firebase/tasks";
import type { ParseState } from "@/core/types";

export interface QueuedCapture {
  localId: string;
  rawText: string;
  title: string;
  courseCode?: string;
  estimateMin: number;
  dueAt?: number;
  parseState: ParseState;
  shouldSplit: boolean;
  queuedAt: number;
}

function storageKey(uid: string): string {
  return `adlaw:offline-capture-queue:${uid}`;
}

// Some privacy modes (Safari private browsing under storage pressure, some
// locked-down enterprise profiles) throw on any localStorage access, not
// just quota errors — same defensive shape as
// ui/timeline/TodaysShape.tsx's readCalendarPromptDismissed. Losing a queued
// capture to a storage exception is an acceptable degrade; throwing up into
// the capture path is not (CLAUDE.md: capture never fails).
function readQueue(uid: string): QueuedCapture[] {
  try {
    const raw = window.localStorage.getItem(storageKey(uid));
    return raw ? (JSON.parse(raw) as QueuedCapture[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(uid: string, queue: QueuedCapture[]): void {
  try {
    window.localStorage.setItem(storageKey(uid), JSON.stringify(queue));
  } catch {
    // See readQueue — the in-memory attempt already happened either way.
  }
}

export function enqueueCapture(uid: string, item: Omit<QueuedCapture, "localId" | "queuedAt">): void {
  const queue = readQueue(uid);
  queue.push({ ...item, localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`, queuedAt: Date.now() });
  writeQueue(uid, queue);
}

export function queuedCount(uid: string): number {
  return readQueue(uid).length;
}

/**
 * Flushes queued captures in order, oldest first, stopping at the first
 * failure — a reconnect that drops again partway through must not lose
 * anything past that point; the rest stays queued for the next attempt.
 * `onCreated` lets the caller re-home ui/board/SplitSuggestionContext's
 * breakdown offer onto the real Firestore id, which only exists once this
 * actually runs (a queued item has no id of its own to suggest against).
 * Returns the number of items actually flushed.
 */
export async function flushCaptureQueue(
  uid: string,
  onCreated?: (taskId: string, shouldSplit: boolean) => void,
): Promise<number> {
  const queue = readQueue(uid);
  let flushed = 0;
  while (queue.length > 0) {
    const item = queue[0];
    try {
      const taskId = await create(uid, {
        rawText: item.rawText,
        title: item.title,
        courseCode: item.courseCode,
        estimateMin: item.estimateMin,
        dueAt: item.dueAt,
        parseState: item.parseState,
      });
      onCreated?.(taskId, item.shouldSplit);
      queue.shift();
      flushed += 1;
      writeQueue(uid, queue);
    } catch {
      break;
    }
  }
  return flushed;
}
