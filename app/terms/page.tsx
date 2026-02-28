import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Terms of Service | Hover Ninja",
  description: "Terms of Service for Hover Ninja",
}

export default function TermsPage() {
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

        <h1 className="mb-2 text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mb-8 text-sm text-muted-foreground">Last updated: February 26, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Hover Ninja (&quot;the Service&quot;), you agree to be bound by these 
              Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Description of Service</h2>
            <p>
              Hover Ninja is an AI-powered assistant that integrates with the Hover platform to help 
              users manage their Hover workspace. The Service provides chat-based interactions, 
              job management, and measurement retrieval capabilities.
            </p>
            <p>
              <strong>Important:</strong> Hover Ninja is an independent third-party application and 
              is not affiliated with, endorsed by, or officially connected to Hover. Your use of 
              Hover Ninja requires separate account credentials from your Hover account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Account Registration</h2>
            <p>
              To use the Service, you must create an account by providing accurate and complete 
              information. You are responsible for maintaining the confidentiality of your account 
              credentials and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. User Responsibilities</h2>
            <p>You agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service only for lawful purposes</li>
              <li>Not attempt to gain unauthorized access to any part of the Service</li>
              <li>Not interfere with or disrupt the Service or servers</li>
              <li>Not use the Service to transmit harmful or malicious content</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. API Integrations</h2>
            <p>
              The Service integrates with third-party APIs, including the Hover API and various 
              AI language model providers. Your use of these integrations is subject to the 
              respective third-party terms of service. We are not responsible for the availability 
              or functionality of third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Data and Privacy</h2>
            <p>
              Your use of the Service is also governed by our Privacy Policy. By using the Service, 
              you consent to the collection and use of information as described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality are owned by 
              Hover Ninja and are protected by international copyright, trademark, and other 
              intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, 
              EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, 
              SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Limitation of Liability</h2>
            <p>
              IN NO EVENT SHALL HOVER NINJA BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
              CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Termination</h2>
            <p>
              We reserve the right to terminate or suspend your account and access to the Service 
              at our sole discretion, without notice, for conduct that we believe violates these 
              Terms or is harmful to other users, us, or third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">11. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of any 
              material changes by posting the new Terms on this page and updating the &quot;Last updated&quot; 
              date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">12. Contact</h2>
            <p>
              If you have any questions about these Terms, please contact us at support@hoverninja.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
