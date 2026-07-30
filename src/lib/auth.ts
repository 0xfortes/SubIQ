import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { bootstrapPersonalWorkspace } from "@/lib/workspace";

// Email+password login is handled outside Auth.js's provider flow (verified in
// a Server Action, then a DB session is minted — see features/auth/actions.ts +
// lib/session.ts). Auth.js keeps database sessions and the adapter, so OAuth and
// magic-link can be added back later as pure provider additions.
const providers: Provider[] = [];

// OAuth providers register only when credentials exist (validated as pairs
// by the env schema), so dev without keys still boots.
if (env.AUTH_GOOGLE_ID) providers.push(Google);
if (env.AUTH_GITHUB_ID) providers.push(GitHub);

/** Provider ids the auth pages should render OAuth buttons for. */
export const oauthProviderIds = providers
  .map((provider) => ("id" in provider ? provider.id : null))
  .filter((id): id is string => id !== null);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers,
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) await bootstrapPersonalWorkspace(user.id);
    },
  },
  trustHost: true,
});
