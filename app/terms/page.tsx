"use client";

import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <button
        onClick={() => router.back()}
        className="mb-6 text-sm text-zinc-400 underline underline-offset-4 hover:text-white"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-semibold tracking-tight">Terms of Use</h1>
      <p className="mt-3 text-sm text-white/60">
        Last updated: March 20, 2026
      </p>

      <div className="mt-10 space-y-8 text-sm leading-6 text-white/80">
        <section>
          <h2 className="text-lg font-medium">1. Overview</h2>
          <p>
            ThisFriday is a platform that allows users to discover, create, and
            share nightlife events. By accessing or using the platform, you agree
            to these Terms of Use.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">2. User Accounts</h2>
          <p>
            You are responsible for maintaining the accuracy of your account
            information and for all activity that occurs under your account. You
            must not use the platform for unlawful or unauthorized purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">3. User-Generated Content</h2>
          <p>
            Users may create and share events and other content on ThisFriday.
            You are solely responsible for the content you create, including the
            accuracy of event details and any interactions that occur as a
            result.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">4. Events and Liability</h2>
          <p>
            ThisFriday does not organize, host, or control any events listed on
            the platform. All events are created and managed by users or third
            parties. Participation in any event is at your own risk.
          </p>
          <p className="mt-2">
            To the fullest extent permitted by law, ThisFriday is not responsible
            for any injuries, damages, losses, or incidents that may occur in
            connection with events discovered through the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">5. Social Interactions</h2>
          <p>
            The platform enables users to connect and interact with others. You
            are responsible for your interactions with other users, both online
            and offline. ThisFriday does not conduct background checks and does
            not guarantee the behavior of any user.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">6. Prohibited Use</h2>
          <p>
            You agree not to use the platform to promote illegal activities,
            harmful behavior, harassment, or any content that violates
            applicable laws or regulations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">7. Termination</h2>
          <p>
            We reserve the right to suspend or terminate access to the platform
            at any time if users violate these terms or engage in harmful
            behavior.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">8. Changes to These Terms</h2>
          <p>
            We may update these Terms of Use from time to time. Continued use of
            the platform after changes means you accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">9. Contact</h2>
          <p>
            If you have any questions about these Terms, contact us at:
            thisfridayapp@gmail.com
          </p>
        </section>
      </div>
    </div>
  );
}