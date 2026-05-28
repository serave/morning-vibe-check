import { Link } from "react-router-dom";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-8">
    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Link to="/login" className="text-sm text-primary hover:underline">
          ← Back
        </Link>

        <header className="mt-6">
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last Updated: May 2026</p>
        </header>

        <div className="mt-6 rounded-lg bg-card p-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Morning Vibe Check</strong> ("we", "our", or "us")
            respects your privacy and is committed to protecting your personal information. This
            Privacy Policy explains how we collect, use, store, and protect information when you
            use Morning Vibe Check ("Service"). By using the Service, you agree to this Privacy
            Policy.
          </p>

          <Section title="1. Information We Collect">
            <p>We may collect the following categories of information:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong className="text-foreground">Account Information:</strong> name, email
                address, and credentials you provide when creating an account.
              </li>
              <li>
                <strong className="text-foreground">User Content:</strong> daily check-ins, notes,
                ratings, and other information you submit to the Service.
              </li>
              <li>
                <strong className="text-foreground">Health & Wellness Data:</strong> data you
                choose to sync from connected third-party platforms (such as Oura, Apple Health,
                Strava, or RunGap).
              </li>
              <li>
                <strong className="text-foreground">Usage Data:</strong> information about how you
                interact with the Service, including device type, browser, and timestamps.
              </li>
              <li>
                <strong className="text-foreground">Cookies and Similar Technologies:</strong> used
                to maintain sessions and improve the Service.
              </li>
            </ul>
          </Section>

          <Section title="2. How We Use Information">
            <p>We use the information we collect to:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Operate, maintain, and improve the Service.</li>
              <li>Personalize your experience and provide insights.</li>
              <li>Communicate with you about updates, security, or support.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </Section>

          <Section title="3. Third-Party Integrations">
            <p>
              When you connect a third-party platform, we receive only the data you authorize. Your
              use of those services is governed by their own privacy policies, and we are not
              responsible for their practices.
            </p>
          </Section>

          <Section title="4. How We Share Information">
            <p>
              We do not sell your personal information. We may share information only with:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Service providers who help us operate the Service under confidentiality.</li>
              <li>Authorities when required by law or to protect rights and safety.</li>
              <li>Successors in connection with a merger, acquisition, or asset transfer.</li>
            </ul>
          </Section>

          <Section title="5. Data Retention">
            <p>
              We retain your information for as long as your account is active or as needed to
              provide the Service. You may request deletion of your account and associated data at
              any time.
            </p>
          </Section>

          <Section title="6. Security">
            <p>
              We use reasonable administrative, technical, and physical safeguards to protect your
              information. However, no method of transmission or storage is completely secure, and
              we cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="7. Your Rights">
            <p>
              Depending on your jurisdiction, you may have the right to access, correct, delete,
              or restrict processing of your personal information, and to withdraw consent or
              object to certain uses.
            </p>
          </Section>

          <Section title="8. International Users">
            <p>
              The Service is operated from the United States. If you access it from outside the
              U.S., your information may be transferred to, stored, and processed in the U.S.
            </p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>
              The Service is not intended for children under 16. We do not knowingly collect
              personal information from children.
            </p>
          </Section>

          <Section title="10. Changes to This Privacy Policy">
            <p>
              We may update this Privacy Policy from time to time. Updated versions will be posted
              on this page with a revised "Last Updated" date. Continued use of the Service after
              changes become effective constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="11. Contact Information">
            <p>If you have questions about this Privacy Policy, contact:</p>
            <p>
              <strong className="text-foreground">Morning Vibe Check</strong>
              <br />
              Website:{" "}
              <a
                href="https://morning-vibe-check.lovable.app"
                className="text-primary hover:underline"
              >
                https://morning-vibe-check.lovable.app
              </a>
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
