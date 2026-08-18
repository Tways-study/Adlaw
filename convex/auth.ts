import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

// One seeded account, no public signup route (docs/03-backend-schema.md §Auth,
// docs/00-stack-decision.md). `ctx.auth.getUserIdentity()` (used everywhere
// else) checks who is signed in; this callback is the separate, orthogonal
// control over who may ever be created — allowed exactly once, while `users`
// is still empty, then rejected permanently regardless of the caller.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        return args.existingUserId;
      }

      const anyUser = await ctx.db.query("users").first();
      if (anyUser) {
        throw new Error("Sign-up is disabled. This app has exactly one account.");
      }

      return ctx.db.insert("users", {
        email: args.profile.email as string,
      });
    },
  },
});
