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
