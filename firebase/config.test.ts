import { describe, expect, it } from "vitest";

import { FIREBASE_ENV_KEYS, readFirebaseConfig } from "./config";

const complete: Record<string, string> = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyExampleKeyValue0000000000000000000",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "example-1234.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "example-1234",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "example-1234.appspot.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "105541928145",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:105541928145:web:abcdef0123456789",
};

describe("readFirebaseConfig", () => {
  it("maps every NEXT_PUBLIC_FIREBASE_* variable to its config key", () => {
    expect(readFirebaseConfig(complete)).toEqual({
      apiKey: complete.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: complete.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: complete.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: complete.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: complete.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: complete.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
  });

  it("names the one variable that is missing", () => {
    const withoutApiKey = { ...complete };
    delete withoutApiKey.NEXT_PUBLIC_FIREBASE_API_KEY;

    expect(() => readFirebaseConfig(withoutApiKey)).toThrow(
      /NEXT_PUBLIC_FIREBASE_API_KEY is missing/,
    );
  });

  // The failure this replaces: an undefined apiKey reached getAuth() and came
  // back as `auth/invalid-api-key`, naming neither the variable nor the file.
  it("names every missing variable at once rather than only the first", () => {
    let message = "";
    try {
      readFirebaseConfig({});
    } catch (error) {
      message = (error as Error).message;
    }

    for (const key of FIREBASE_ENV_KEYS) expect(message).toContain(key);
    expect(message).toMatch(/are missing/);
  });

  it("treats an empty or whitespace-only value as missing", () => {
    expect(() => readFirebaseConfig({ ...complete, NEXT_PUBLIC_FIREBASE_APP_ID: "" })).toThrow(
      /NEXT_PUBLIC_FIREBASE_APP_ID/,
    );
    expect(() => readFirebaseConfig({ ...complete, NEXT_PUBLIC_FIREBASE_APP_ID: "   " })).toThrow(
      /NEXT_PUBLIC_FIREBASE_APP_ID/,
    );
  });

  it("trims surrounding whitespace off values that are present", () => {
    const padded = { ...complete, NEXT_PUBLIC_FIREBASE_PROJECT_ID: "  example-1234  " };

    expect(readFirebaseConfig(padded).projectId).toBe("example-1234");
  });

  it("points at the stale-bundle case, since a set-but-not-inlined var looks identical", () => {
    let message = "";
    try {
      readFirebaseConfig({});
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain(".next");
    expect(message).toMatch(/inlined at build time/);
  });
});
