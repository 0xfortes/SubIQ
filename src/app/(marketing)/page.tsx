import type { Metadata } from "next";
import {
  FeatureSections,
  Hero,
  HowItWorks,
  SignupCta,
} from "@/features/marketing";

export const metadata: Metadata = {
  title: "SubIQ — Know where your money quietly goes",
  description:
    "Track every subscription, forecast every renewal, and surface the savings you didn't know existed. Free, no card, 30 seconds.",
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <FeatureSections />
      <HowItWorks />
      <SignupCta />
    </>
  );
}
