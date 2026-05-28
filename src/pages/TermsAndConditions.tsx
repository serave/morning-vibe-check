import { Link } from "react-router-dom";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-8">
    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Link to="/login" className="text-sm text-primary hover:underline">
          ← Back
        </Link>

        <header className="mt-6">
          <h1 className="text-3xl font-bold text-foreground">Terms and Conditions</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last Updated: May 2026</p>
        </header>

        <div className="mt-6 rounded-lg bg-card p-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Welcome to <strong className="text-foreground">Morning Vibe Check</strong> ("App",
            "Service", "we", "our", or "us"). By accessing or using the Service, you agree to
            these Terms and Conditions ("Terms"). If you do not agree, do not use the Service.
          </p>

          <Section title="1. Description of Service">
            <p>
              Morning Vibe Check is a wellness and performance insights application that helps
              users log daily recovery check-ins, track trends over time, and optionally connect
              health data sources such as wearables and fitness platforms.
            </p>
            <p>
              The Service is provided for informational and personal wellness purposes only. It
              is not a medical device and does not provide medical advice, diagnosis, or
              treatment.
            </p>
          </Section>

          <Section title="2. Eligibility">
            <p>
              You must be at least 16 years old to use the Service. By using the Service, you
              represent and warrant that you meet this requirement and have the legal capacity to
              enter into these Terms.
            </p>
          </Section>

          <Section title="3. Account Registration">
            <p>
              To access certain features, you must create an account. You agree to provide
              accurate, current, and complete information and to keep it updated. You are
              responsible for maintaining the confidentiality of your account credentials and for
              all activity under your account.
            </p>
          </Section>

          <Section title="4. User Content">
            <p>
              You retain ownership of any data you submit ("User Content"), including check-ins,
              notes, and metrics. By using the Service, you grant us a limited license to store,
              process, and display your User Content solely to operate and improve the Service.
            </p>
          </Section>

          <Section title="5. Third-Party Integrations">
            <p>
              The Service may allow you to connect third-party platforms (such as Oura, Apple
              Health, Strava, or RunGap). Your use of these integrations is governed by the
              respective third party's terms and privacy policies. We are not responsible for
              the accuracy, availability, or practices of third-party services.
            </p>
          </Section>

          <Section title="6. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Use the Service for any unlawful or harmful purpose.</li>
              <li>Interfere with or disrupt the Service or its underlying infrastructure.</li>
              <li>Attempt to gain unauthorized access to any portion of the Service.</li>
              <li>Reverse engineer, decompile, or copy any part of the Service.</li>
            </ul>
          </Section>

          <Section title="7. Health Disclaimer">
            <p>
              The Service is not intended to diagnose, treat, cure, or prevent any disease or
              health condition. Always consult a qualified healthcare professional before making
              decisions about your health, training, or recovery.
            </p>
          </Section>

          <Section title="8. Intellectual Property">
            <p>
              All content, features, and functionality of the Service — excluding User Content —
              are owned by us or our licensors and are protected by intellectual property laws.
            </p>
          </Section>

          <Section title="9. Privacy">
            <p>
              Your use of the Service is also governed by our Privacy Policy, which describes how
              we collect, use, and protect your information.
            </p>
          </Section>

          <Section title="10. Termination">
            <p>
              We may suspend or terminate your access to the Service at any time, with or
              without notice, for conduct that we believe violates these Terms or is harmful to
              other users or to the Service.
            </p>
          </Section>

          <Section title="11. Disclaimer of Warranties">
            <p>
              The Service is provided "as is" and "as available" without warranties of any kind,
              whether express or implied, including merchantability, fitness for a particular
              purpose, and non-infringement.
            </p>
          </Section>

          <Section title="12. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, we shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from or related to
              your use of the Service.
            </p>
          </Section>

          <Section title="13. Indemnification">
            <p>
              You agree to indemnify and hold us harmless from any claims, damages, or expenses
              arising from your use of the Service or your violation of these Terms.
            </p>
          </Section>

          <Section title="14. Governing Law">
            <p>
              These Terms are governed by the laws of the State of Arizona, United States,
              without regard to its conflict of law principles. Any disputes shall be resolved
              in the courts located in Arizona.
            </p>
          </Section>

          <Section title="15. Changes to These Terms">
            <p>
              We may update these Terms from time to time. Continued use of the Service after
              updates constitutes acceptance of the revised Terms.
            </p>
          </Section>

          <Section title="16. Contact Information">
            <p>If you have questions about these Terms, contact:</p>
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

export default TermsAndConditions;
