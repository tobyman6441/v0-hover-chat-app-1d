import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Privacy Policy | Hover Ninja",
  description: "Privacy Policy for Hover Ninja",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/auth/sign-up"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Sign Up
        </Link>

        <h1 className="mb-2 text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mb-8 text-sm text-muted-foreground">Last updated: February 26, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold">1. Introduction</h2>
            <p>
              Hover Ninja (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This 
              Privacy Policy explains how we collect, use, disclose, and safeguard your information 
              when you use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Information We Collect</h2>
            
            <h3 className="mt-4 text-lg font-medium">Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, and password when you create an account</li>
              <li><strong>Integration Credentials:</strong> OAuth tokens for connecting to Hover and API keys for AI services</li>
              <li><strong>Chat Data:</strong> Messages and conversations you have with the AI assistant</li>
              <li><strong>Organization Data:</strong> Company or team information you provide</li>
            </ul>

            <h3 className="mt-4 text-lg font-medium">Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Usage Data:</strong> Information about how you use the Service</li>
              <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers</li>
              <li><strong>Log Data:</strong> IP address, access times, and pages viewed</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process your requests and transactions</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Protect against fraudulent or illegal activity</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Third-Party Services</h2>
            <p>
              The Service integrates with third-party services including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Hover:</strong> To access your Hover workspace data (jobs, measurements, etc.)</li>
              <li><strong>AI Providers (OpenAI, etc.):</strong> To power the AI assistant functionality</li>
              <li><strong>Supabase:</strong> For authentication and data storage</li>
            </ul>
            <p className="mt-2">
              Each third-party service has its own privacy policy governing how they handle your data. 
              We encourage you to review their policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Data Storage and Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal 
              information against unauthorized access, alteration, disclosure, or destruction. This includes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of sensitive data at rest and in transit</li>
              <li>Secure storage of API keys and OAuth tokens</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication measures</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed 
              to provide you with the Service. You may request deletion of your account and associated 
              data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Cookies and Tracking</h2>
            <p>
              We use essential cookies to maintain your session and preferences. We do not use 
              third-party tracking or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for children under 13 years of age. We do not knowingly 
              collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your 
              country of residence. These countries may have different data protection laws. We 
              take appropriate safeguards to ensure your information remains protected.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">12. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data practices, please 
              contact us at:
            </p>
            <p className="mt-2">
              <strong>Email:</strong> privacy@hoverninja.com
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
