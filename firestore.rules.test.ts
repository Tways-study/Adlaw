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
