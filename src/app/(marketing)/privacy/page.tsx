import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/features/marketing";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="July 31, 2026"
      intro="SubIQ helps you track your subscriptions and recurring spend. This policy explains what we collect, why, and what we do with it. We keep it short because we collect very little."
    >
      <LegalSection heading="Information we collect">
        <ul>
          <li>
            <strong>Account details.</strong> Your email address and a hashed
            password — we never store your password in plain text. If you sign
            in with Google or GitHub, we receive your email and name from that
            provider.
          </li>
          <li>
            <strong>Your data.</strong> The subscriptions you add (name, price,
            billing cycle, category, and any notes) and your profile settings —
            display name, timezone, and preferred currency.
          </li>
          <li>
            <strong>Technical data.</strong> A single session cookie to keep you
            signed in, and basic error diagnostics if something breaks.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="How we use it">
        <p>
          We use your information only to run the product: to track your
          subscriptions, compute renewal dates, generate insights and forecasts,
          and send the renewal reminder emails you ask for.
        </p>
        <p>
          <strong>We do not sell your data</strong>, and we do not use it for
          advertising.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies">
        <p>
          We use one strictly necessary cookie: an HttpOnly session cookie that
          keeps you logged in. We do not use analytics or advertising cookies.
        </p>
      </LegalSection>

      <LegalSection heading="Service providers">
        <p>
          We rely on a small number of processors to run SubIQ, each handling
          data on our behalf under their own security terms:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> — database hosting.
          </li>
          <li>
            <strong>Vercel</strong> — application hosting.
          </li>
          <li>
            <strong>Resend</strong> — sending renewal reminder emails.
          </li>
          <li>
            <strong>Sentry</strong> — error monitoring.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="Data retention and deletion">
        <p>
          Your data stays while your account is active. You can archive or
          permanently delete any subscription at any time from within the app.
          Contact us to delete your account and all associated data.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          Depending on where you live, you may have the right to access,
          correct, export, or delete your personal data. Email us and we will
          help.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        <p>
          We may update this policy from time to time. When we do, we will
          change the date at the top of this page.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about privacy? Email{" "}
          <a href="mailto:support@subiq.app">support@subiq.app</a>. See also our{" "}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
