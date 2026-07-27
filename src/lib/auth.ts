import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { bootstrapPersonalWorkspace } from "@/lib/workspace";

const MAGIC_LINK_MAX_AGE_SECONDS = 24 * 60 * 60;

const providers: Provider[] = [
  {
    id: "email",
    type: "email",
    name: "Email",
    from: env.EMAIL_FROM,
    maxAge: MAGIC_LINK_MAX_AGE_SECONDS,
    options: {},
    async sendVerificationRequest({ identifier, url }) {
      await sendEmail({
        to: identifier,
        subject: "Sign in to SubIQ",
        text: `Sign in to SubIQ:\n\n${url}\n\nThis link expires in 24 hours. If you didn't request it, you can ignore this email.`,
      });
    },
  },
];

// OAuth providers register only when credentials exist (validated as pairs
// by the env schema), so dev without keys still boots.
if (env.AUTH_GOOGLE_ID) providers.push(Google);
if (env.AUTH_GITHUB_ID) providers.push(GitHub);

/** Provider ids the sign-in page should render buttons for. */
export const oauthProviderIds = providers
  .map((provider) => ("id" in provider ? provider.id : null))
  .filter((id): id is string => id !== null && id !== "email");

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers,
  session: { strategy: "database" },
  pages: {
    signIn: "/signin",
    verifyRequest: "/check-email",
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
