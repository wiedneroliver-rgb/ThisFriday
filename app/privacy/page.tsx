"use client";

import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <button
        onClick={() => router.back()}
        className="mb-6 text-sm text-zinc-400 underline underline-offset-4 hover:text-white"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-3 text-sm text-white/60">
        Last updated: March 20, 2026
      </p>

      <div className="mt-10 space-y-8 text-sm leading-6 text-white/80">
        <section>
          <h2 className="text-lg font-medium">1. Information We Collect</h2>
          <p>
            When you use ThisFriday, we collect information you provide directly,
            including your phone number, username, display name, and profile
            picture. We also store information about your activity on the
            platform, such as events you create, events you interact with, and
            your connections with other users.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">2. How We Use Your Information</h2>
          <p>
            We use your information to operate and improve the platform,
            including creating your account, enabling social features such as
            friends and invitations, displaying relevant events, and
            communicating with you. Your phone number is used for authentication
            and account security.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">
            3. Social Features and Visibility
          </h2>
          <p>
            ThisFriday is a social platform. Your profile information, activity,
            and participation in events may be visible to other users,
            especially those you are connected with. By using the platform, you
            understand that certain information is shared as part of the social
            experience.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">4. Third-Party Services</h2>
          <p>
            We use trusted third-party services to operate ThisFriday. This
            includes Supabase for data storage and authentication, and Twilio
            for sending verification messages. These services may process your
            information on our behalf in order to provide the core
            functionality of the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">5. Data Security</h2>
          <p>
            We take reasonable measures to protect your information. However, no
            system is completely secure, and we cannot guarantee absolute
            security of your data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">6. Your Choices</h2>
          <p>
            You can update your profile information at any time within the app.
            If you wish to stop using the platform, you may discontinue use of
            your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">7. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Continued use
            of the platform after changes means you accept the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">8. Contact</h2>
          <p>
            If you have any questions about this Privacy Policy, you can contact
            us at: thisfridayapp@gmail.com
          </p>
        </section>
      </div>
    </div>
  );
}