import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

// Invite-gated multi-user signup (docs/00-intake.md's third amendment,
// docs/03-backend-schema.md §Auth). `ctx.auth.getUserIdentity()` (used
// everywhere else) checks who is signed in; the two hooks below are the
// separate, orthogonal control over who may sign up at all — the profile
// callback runs first, inside the Password provider, and rejects a bad
// invite code before any account or user row is created.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        if (params.flow === "signUp") {
          const inviteCode = params.inviteCode as string | undefined;
          if (inviteCode !== process.env.SIGNUP_INVITE_CODE) {
            throw new Error("Invalid invite code.");
          }
        }
        return { email: params.email as string };
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        return args.existingUserId;
      }
      return ctx.db.insert("users", {
        email: args.profile.email as string,
      });
    },
  },
});
