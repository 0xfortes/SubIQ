import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/features/marketing";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="July 31, 2026"
      intro="These terms cover your use of SubIQ. By creating an account or using the service, you agree to them."
    >
      <LegalSection heading="Your account">
        <p>
          You are responsible for keeping your login details secure and for
          activity under your account. Use a strong, unique password and let us
          know if you suspect unauthorized access.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>
          Use SubIQ for its intended purpose — tracking your own recurring
          spend. Do not attempt to break, overload, reverse-engineer, or gain
          unauthorized access to the service or to other users&apos; data.
        </p>
      </LegalSection>

      <LegalSection heading="Your content">
        <p>
          The subscription data you enter is yours. You grant us permission to
          store and process it solely to provide the service to you.
        </p>
      </LegalSection>

      <LegalSection heading="Service availability">
        <p>
          We work to keep SubIQ available and accurate, but we provide it{" "}
          <strong>&ldquo;as is,&rdquo;</strong> without warranties of any kind.
          Renewal dates, forecasts, and insights are estimates to help you
          decide — they are not financial advice.
        </p>
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        <p>
          To the extent permitted by law, SubIQ is not liable for indirect or
          consequential damages, or for any missed cancellation, charge, or
          financial loss arising from your use of the service. Always confirm
          important dates and charges with the provider directly.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to the service and these terms">
        <p>
          We may update the service and these terms. When the terms change we
          will update the date at the top of this page; continued use of SubIQ
          means you accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection heading="Termination">
        <p>
          You can stop using SubIQ and delete your account at any time. We may
          suspend or terminate accounts that violate these terms.
        </p>
      </LegalSection>

      <LegalSection heading="Governing law">
        <p>
          These terms are governed by the laws of [your jurisdiction], without
          regard to conflict-of-law rules.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about these terms? Email{" "}
          <a href="mailto:support@subiq.app">support@subiq.app</a>. See also our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
