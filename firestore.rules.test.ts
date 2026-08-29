import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "adlaw-rules-test",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
afterAll(async () => testEnv.cleanup());
beforeEach(async () => testEnv.clearFirestore());

const baseTask = {
  title: "x",
  rawText: "x",
  estimateMin: 30,
  status: "shelf",
  laneOrder: 0,
  parseState: "fallback",
  createdAt: Date.now(),
};

describe("cross-user isolation", () => {
  test("a stranger cannot read another user's task", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/owner/tasks/t1"), baseTask);
    });
    const stranger = testEnv.authenticatedContext("stranger").firestore();
    await assertFails(getDoc(doc(stranger, "users/owner/tasks/t1")));
  });

  test("a stranger cannot write another user's task", async () => {
    const stranger = testEnv.authenticatedContext("stranger").firestore();
    await assertFails(setDoc(doc(stranger, "users/owner/tasks/t2"), baseTask));
  });
});

describe("field validation", () => {
  const owner = () => testEnv.authenticatedContext("owner").firestore();

  test("estimateMin must be > 0", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/tasks/bad"), { ...baseTask, estimateMin: 0 }));
  });

  test("completedAt must be present iff status is done", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/tasks/bad2"), { ...baseTask, status: "done" }));
    await assertSucceeds(
      setDoc(doc(owner(), "users/owner/tasks/ok"), { ...baseTask, status: "done", completedAt: Date.now() }),
    );
  });

  test("rawText is immutable after create", async () => {
    const db = owner();
    const ref = doc(db, "users/owner/tasks/immut");
    await assertSucceeds(setDoc(ref, baseTask));
    await assertFails(updateDoc(ref, { rawText: "changed" }));
  });

  // The update rule used to validate far less than the create rule did,
  // which let an owner attach arbitrary keys to their own task documents
  // (storage abuse, up to 1 MiB each) and set laneOrder to a non-number,
  // breaking core/order.ts's arithmetic. These pin the parity.
  test("update rejects a field the create rule does not allow", async () => {
    const db = owner();
    const ref = doc(db, "users/owner/tasks/extra");
    await assertSucceeds(setDoc(ref, baseTask));
    await assertFails(updateDoc(ref, { junk: "x".repeat(1000) }));
  });

  test("update rejects a non-numeric laneOrder", async () => {
    const db = owner();
    const ref = doc(db, "users/owner/tasks/lane");
    await assertSucceeds(setDoc(ref, baseTask));
    await assertFails(updateDoc(ref, { laneOrder: "1" }));
  });

  test("createdAt is immutable after create", async () => {
    const db = owner();
    const ref = doc(db, "users/owner/tasks/stamp");
    await assertSucceeds(setDoc(ref, baseTask));
    await assertFails(updateDoc(ref, { createdAt: Date.now() + 1000 }));
  });

  test("a legitimate update still succeeds", async () => {
    const db = owner();
    const ref = doc(db, "users/owner/tasks/move");
    await assertSucceeds(setDoc(ref, baseTask));
    await assertSucceeds(updateDoc(ref, { status: "next", laneOrder: 128 }));
  });
});

const baseBlock = {
  weekday: 3,
  startMin: 540,
  endMin: 600,
  label: "BIO 210 lecture",
  kind: "class",
  activeFrom: Date.now(),
};

describe("scheduleBlocks — cross-user isolation", () => {
  test("a stranger cannot read another user's block", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/owner/scheduleBlocks/b1"), baseBlock);
    });
    const stranger = testEnv.authenticatedContext("stranger").firestore();
    await assertFails(getDoc(doc(stranger, "users/owner/scheduleBlocks/b1")));
  });

  test("a stranger cannot write another user's block", async () => {
    const stranger = testEnv.authenticatedContext("stranger").firestore();
    await assertFails(setDoc(doc(stranger, "users/owner/scheduleBlocks/b2"), baseBlock));
  });
});

describe("scheduleBlocks — field validation", () => {
  const owner = () => testEnv.authenticatedContext("owner").firestore();

  test("a valid block succeeds, with and without activeTo", async () => {
    await assertSucceeds(setDoc(doc(owner(), "users/owner/scheduleBlocks/ok1"), baseBlock));
    await assertSucceeds(
      setDoc(doc(owner(), "users/owner/scheduleBlocks/ok2"), { ...baseBlock, activeTo: Date.now() }),
    );
  });

  test("weekday must be within 0–6", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/scheduleBlocks/bad"), { ...baseBlock, weekday: 7 }));
    await assertFails(setDoc(doc(owner(), "users/owner/scheduleBlocks/bad2"), { ...baseBlock, weekday: -1 }));
  });

  test("startMin must be less than endMin", async () => {
    await assertFails(
      setDoc(doc(owner(), "users/owner/scheduleBlocks/bad3"), { ...baseBlock, startMin: 600, endMin: 600 }),
    );
  });

  test("endMin must not exceed 1440", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/scheduleBlocks/bad4"), { ...baseBlock, endMin: 1441 }));
  });

  test("kind must be one of the four enum values", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/scheduleBlocks/bad5"), { ...baseBlock, kind: "sleep" }));
  });

  test("activeTo, when present, must be a number", async () => {
    await assertFails(
      setDoc(doc(owner(), "users/owner/scheduleBlocks/bad6"), {
        ...baseBlock,
        activeTo: "yesterday",
      }),
    );
  });

  test("a missing required field fails", async () => {
    const noLabel: Record<string, unknown> = { ...baseBlock };
    delete noLabel.label;
    await assertFails(setDoc(doc(owner(), "users/owner/scheduleBlocks/bad7"), noLabel));
  });
});

describe("settings/prefs — cross-user isolation", () => {
  test("a stranger cannot read another user's prefs", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/owner/settings/prefs"), { dayEndMin: 1260 });
    });
    const stranger = testEnv.authenticatedContext("stranger").firestore();
    await assertFails(getDoc(doc(stranger, "users/owner/settings/prefs")));
  });

  test("a stranger cannot write another user's prefs", async () => {
    const stranger = testEnv.authenticatedContext("stranger").firestore();
    await assertFails(setDoc(doc(stranger, "users/owner/settings/prefs"), { dayEndMin: 1260 }));
  });
});

describe("settings/prefs — field validation", () => {
  const owner = () => testEnv.authenticatedContext("owner").firestore();

  test("a valid dayEndMin succeeds", async () => {
    await assertSucceeds(setDoc(doc(owner(), "users/owner/settings/prefs"), { dayEndMin: 1260 }));
  });

  test("writing with no dayEndMin at all still succeeds", async () => {
    await assertSucceeds(setDoc(doc(owner(), "users/owner/settings/prefs"), {}));
  });

  test("dayEndMin must be within 0–1440", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/settings/prefs"), { dayEndMin: -1 }));
    await assertFails(setDoc(doc(owner(), "users/owner/settings/prefs"), { dayEndMin: 1441 }));
  });

  test("dayEndMin must be a number", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/settings/prefs"), { dayEndMin: "late" }));
  });
});

// Slice 6 — the four google* fields the OAuth callback/sync routes write
// via the Firestore REST API (app/api/calendar/_firestoreRest.ts), evaluated
// against the exact same rule as any client SDK write.
describe("settings/prefs — Slice 6 field validation", () => {
  const owner = () => testEnv.authenticatedContext("owner").firestore();

  test("a valid set of google* fields succeeds, written together as the callback does", async () => {
    await assertSucceeds(
      setDoc(doc(owner(), "users/owner/settings/prefs"), {
        googleRefreshTokenEncrypted: "base64ciphertext==",
        googleConnectedAt: Date.now(),
        googleSyncStatus: "ok",
      }),
    );
  });

  test("googleRefreshTokenEncrypted must be a string", async () => {
    await assertFails(
      setDoc(doc(owner(), "users/owner/settings/prefs"), { googleRefreshTokenEncrypted: 12345 }),
    );
  });

  test("googleConnectedAt must be a number", async () => {
    await assertFails(
      setDoc(doc(owner(), "users/owner/settings/prefs"), { googleConnectedAt: "yesterday" }),
    );
  });

  test("googleLastSyncedAt must be a number", async () => {
    await assertFails(
      setDoc(doc(owner(), "users/owner/settings/prefs"), { googleLastSyncedAt: "just now" }),
    );
  });

  test("googleSyncStatus must be one of ok, expired, or error", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/settings/prefs"), { googleSyncStatus: "syncing" }));
    await assertSucceeds(setDoc(doc(owner(), "users/owner/settings/prefs"), { googleSyncStatus: "ok" }));
    await assertSucceeds(
      updateDoc(doc(owner(), "users/owner/settings/prefs"), { googleSyncStatus: "expired" }),
    );
    await assertSucceeds(
      updateDoc(doc(owner(), "users/owner/settings/prefs"), { googleSyncStatus: "error" }),
    );
  });

  test("a partial update (sync's status-only patch) still succeeds with no hasOnly", async () => {
    const db = owner();
    const ref = doc(db, "users/owner/settings/prefs");
    await assertSucceeds(setDoc(ref, { dayEndMin: 1260 }));
    await assertSucceeds(updateDoc(ref, { googleLastSyncedAt: Date.now(), googleSyncStatus: "ok" }));
  });
});

const baseEvent = {
  gcalId: "gcal-event-1",
  startsAt: Date.now(),
  endsAt: Date.now() + 60 * 60 * 1000,
  title: "BIO 210 lab",
  fetchedAt: Date.now(),
};

describe("calendarCache — cross-user isolation", () => {
  test("a stranger cannot read another user's cached event", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/owner/calendarCache/e1"), baseEvent);
    });
    const stranger = testEnv.authenticatedContext("stranger").firestore();
    await assertFails(getDoc(doc(stranger, "users/owner/calendarCache/e1")));
  });

  test("a stranger cannot write another user's cached event", async () => {
    const stranger = testEnv.authenticatedContext("stranger").firestore();
    await assertFails(setDoc(doc(stranger, "users/owner/calendarCache/e2"), baseEvent));
  });
});

describe("calendarCache — field validation", () => {
  const owner = () => testEnv.authenticatedContext("owner").firestore();

  test("a valid cached event succeeds", async () => {
    await assertSucceeds(setDoc(doc(owner(), "users/owner/calendarCache/ok1"), baseEvent));
  });

  test("gcalId must be a string", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/calendarCache/bad1"), { ...baseEvent, gcalId: 123 }));
  });

  test("startsAt must be a number", async () => {
    await assertFails(
      setDoc(doc(owner(), "users/owner/calendarCache/bad2"), { ...baseEvent, startsAt: "soon" }),
    );
  });

  test("endsAt must be a number", async () => {
    await assertFails(
      setDoc(doc(owner(), "users/owner/calendarCache/bad3"), { ...baseEvent, endsAt: "later" }),
    );
  });

  test("title must be a string", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/calendarCache/bad4"), { ...baseEvent, title: 42 }));
  });

  test("fetchedAt must be a number", async () => {
    await assertFails(
      setDoc(doc(owner(), "users/owner/calendarCache/bad5"), { ...baseEvent, fetchedAt: "now" }),
    );
  });

  test("a missing required field fails", async () => {
    const noTitle: Record<string, unknown> = { ...baseEvent };
    delete noTitle.title;
    await assertFails(setDoc(doc(owner(), "users/owner/calendarCache/bad6"), noTitle));
  });

  test("an unknown field fails — this is a wholesale-replace cache, not a place for extra keys", async () => {
    await assertFails(
      setDoc(doc(owner(), "users/owner/calendarCache/bad7"), { ...baseEvent, extra: "nope" }),
    );
  });

  test("update is held to the same shape as create — the sync route replaces wholesale via delete+create, but this pins parity anyway", async () => {
    const db = owner();
    const ref = doc(db, "users/owner/calendarCache/upd");
    await assertSucceeds(setDoc(ref, baseEvent));
    await assertSucceeds(updateDoc(ref, { ...baseEvent, title: "Updated title" }));
    await assertFails(updateDoc(ref, { junk: "x" }));
  });
});

const baseCourse = {
  code: "BIO 210",
  active: true,
};

describe("courses — cross-user isolation", () => {
  test("a stranger cannot read another user's course", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/owner/courses/c1"), baseCourse);
    });
    const stranger = testEnv.authenticatedContext("stranger").firestore();
    await assertFails(getDoc(doc(stranger, "users/owner/courses/c1")));
  });

  test("a stranger cannot write another user's course", async () => {
    const stranger = testEnv.authenticatedContext("stranger").firestore();
    await assertFails(setDoc(doc(stranger, "users/owner/courses/c2"), baseCourse));
  });
});

describe("courses — field validation", () => {
  const owner = () => testEnv.authenticatedContext("owner").firestore();

  test("a valid course succeeds, with and without name", async () => {
    await assertSucceeds(setDoc(doc(owner(), "users/owner/courses/ok1"), baseCourse));
    await assertSucceeds(
      setDoc(doc(owner(), "users/owner/courses/ok2"), { ...baseCourse, name: "Intro Biology" }),
    );
  });

  test("code must be a string", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/courses/bad"), { ...baseCourse, code: 210 }));
  });

  test("name, when present, must be a string", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/courses/bad2"), { ...baseCourse, name: 210 }));
  });

  test("active must be a boolean", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/courses/bad3"), { ...baseCourse, active: "true" }));
  });

  test("a missing required field fails", async () => {
    const noActive: Record<string, unknown> = { ...baseCourse };
    delete noActive.active;
    await assertFails(setDoc(doc(owner(), "users/owner/courses/bad4"), noActive));
  });

  test("an unknown field fails", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/courses/bad5"), { ...baseCourse, extra: "nope" }));
  });

  test("retiring a course (active: false) still succeeds via update", async () => {
    const db = owner();
    const ref = doc(db, "users/owner/courses/retire");
    await assertSucceeds(setDoc(ref, baseCourse));
    await assertSucceeds(updateDoc(ref, { code: baseCourse.code, active: false }));
  });
});

const baseLog = {
  kind: "parse",
  input: '{"text":"finish bio lab"}',
  provider: "heuristic",
  model: "heuristic",
  ok: true,
  latencyMs: 12,
  createdAt: Date.now(),
};

describe("aiLog — cross-user isolation", () => {
  test("a stranger cannot read another user's aiLog entry", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/owner/aiLog/l1"), baseLog);
    });
    const stranger = testEnv.authenticatedContext("stranger").firestore();
    await assertFails(getDoc(doc(stranger, "users/owner/aiLog/l1")));
  });

  test("a stranger cannot write another user's aiLog entry", async () => {
    const stranger = testEnv.authenticatedContext("stranger").firestore();
    await assertFails(setDoc(doc(stranger, "users/owner/aiLog/l2"), baseLog));
  });
});

describe("aiLog — field validation", () => {
  const owner = () => testEnv.authenticatedContext("owner").firestore();

  test("a valid entry succeeds", async () => {
    await assertSucceeds(setDoc(doc(owner(), "users/owner/aiLog/ok1"), baseLog));
  });

  test("a valid entry succeeds with the optional output and error fields present", async () => {
    await assertSucceeds(
      setDoc(doc(owner(), "users/owner/aiLog/ok2"), {
        ...baseLog,
        ok: false,
        output: '{"title":"x"}',
        error: "gemini request timed out after 3500ms",
      }),
    );
  });

  test("kind must be one of parse, breakdown, or focus", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/aiLog/bad"), { ...baseLog, kind: "summarize" }));
  });

  test("input must be a string", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/aiLog/bad2"), { ...baseLog, input: 123 }));
  });

  test("output, when present, must be a string", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/aiLog/bad3"), { ...baseLog, output: 123 }));
  });

  test("ok must be a boolean", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/aiLog/bad4"), { ...baseLog, ok: "true" }));
  });

  test("error, when present, must be a string", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/aiLog/bad5"), { ...baseLog, error: 404 }));
  });

  test("latencyMs must be a non-negative number", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/aiLog/bad6"), { ...baseLog, latencyMs: -1 }));
    await assertFails(setDoc(doc(owner(), "users/owner/aiLog/bad7"), { ...baseLog, latencyMs: "12" }));
  });

  test("a missing required field fails", async () => {
    const noProvider: Record<string, unknown> = { ...baseLog };
    delete noProvider.provider;
    await assertFails(setDoc(doc(owner(), "users/owner/aiLog/bad8"), noProvider));
  });

  test("an unknown field fails", async () => {
    await assertFails(setDoc(doc(owner(), "users/owner/aiLog/bad9"), { ...baseLog, extra: "nope" }));
  });

  test("aiLog entries are append-only — update is always rejected", async () => {
    const db = owner();
    const ref = doc(db, "users/owner/aiLog/immut");
    await assertSucceeds(setDoc(ref, baseLog));
    await assertFails(updateDoc(ref, { ok: false }));
  });
});
