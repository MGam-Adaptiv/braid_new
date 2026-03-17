import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 mb-3 pb-2 border-b border-gray-100">{title}</h2>
    <div className="text-[13px] text-gray-600 leading-relaxed space-y-2">{children}</div>
  </div>
);

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      <div className="pt-8 pb-6 px-5 sm:pt-12 sm:pb-8 flex flex-col items-center text-center">
        <Logo size="md" layout="vertical" />
        <p className="text-[#9CA3AF] text-[10px] sm:text-xs tracking-[0.2em] font-bold uppercase mt-4">
          BRAIDING TEACHER CREATIVITY WITH AI
        </p>
        <Link
          to="/signup"
          className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#9CA3AF] hover:text-black transition-colors tracking-wide"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Sign Up
        </Link>
      </div>

      <div className="flex-1 flex justify-center px-4 pb-20">
        <div className="w-full max-w-2xl bg-white rounded-[24px] shadow-xl p-8 sm:p-12 border border-gray-100">
          <div className="mb-8">
            <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-1">Privacy Policy</h1>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Last updated: March 2026</p>
          </div>

          <Section title="1. Data Controller">
            <p><strong>Adaptiv Personalised Learning</strong> is the data controller responsible for the personal data you provide when using BraidStudio. For any data-related enquiries, contact us at: <a href="mailto:info@getadaptiv.com" className="text-coral hover:underline font-bold">info@getadaptiv.com</a></p>
          </Section>

          <Section title="2. Data We Collect">
            <p>We collect the following personal data when you use BraidStudio:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Account data:</strong> display name, email address, account creation date, role</li>
              <li><strong>Usage data:</strong> activities created, materials saved, feature usage statistics, token consumption</li>
              <li><strong>Content metadata:</strong> vocabulary lists, grammar points, topic, and CEFR level extracted from uploaded pages (see Section 3)</li>
            </ul>
            <p className="mt-2">We do <strong>not</strong> collect payment card data, national identity numbers, or sensitive personal data as defined under GDPR Article 9.</p>
          </Section>

          <Section title="3. Content Processing">
            <p>When you upload textbook pages or images for AI analysis, the following applies:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Page images are transmitted securely to <strong>Mistral AI</strong> (our AI vision provider) for the sole purpose of extracting linguistic features (vocabulary, grammar, topic, level)</li>
              <li><strong>Raw image data is not stored by BraidStudio or Mistral AI after processing is complete</strong></li>
              <li>The extracted linguistic metadata (vocabulary lists, grammar points) <em>is</em> stored in your BraidStudio account and associated with the material you save</li>
              <li>OCR text extracted from pages (reading passages) is stored in your account to provide context for AI activity drafting</li>
            </ul>
          </Section>

          <Section title="4. How We Use Your Data">
            <p>We use your data to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Provide and operate the BraidStudio service</li>
              <li>Enable activity creation, material management, and collaboration features</li>
              <li>Send account notifications (approval status, important updates)</li>
              <li>Monitor platform usage to improve the service and prevent abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="mt-2">We do <strong>not</strong> sell your personal data to third parties or use it for advertising purposes.</p>
          </Section>

          <Section title="5. Third-Party Services">
            <p>BraidStudio relies on the following third-party services to operate:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Google Firebase</strong> — authentication, database (Firestore), and file storage. Data processed under Google's Privacy Policy.</li>
              <li><strong>Mistral AI</strong> — AI vision and language model processing for content analysis and activity drafting. Data processed under Mistral AI's Privacy Policy.</li>
              <li><strong>Netlify</strong> — platform hosting and serverless functions. Data processed under Netlify's Privacy Policy.</li>
            </ul>
            <p className="mt-2">All third-party providers are contractually required to process your data only as directed and in compliance with applicable privacy laws.</p>
          </Section>

          <Section title="6. Data Retention">
            <p>Your personal data is retained for as long as your account is active. If you request account deletion, your personal data will be removed from our systems within <strong>30 days</strong>, except where retention is required by law.</p>
            <p>Usage analytics data may be retained in anonymised, aggregated form for platform improvement purposes.</p>
          </Section>

          <Section title="7. Your Rights (GDPR)">
            <p>As a user in the European Union or United Kingdom, you have the following rights under GDPR:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Right of access</strong> — request a copy of your personal data</li>
              <li><strong>Right to rectification</strong> — correct inaccurate or incomplete data</li>
              <li><strong>Right to erasure</strong> — request deletion of your personal data ("right to be forgotten")</li>
              <li><strong>Right to data portability</strong> — receive your data in a structured, machine-readable format</li>
              <li><strong>Right to object</strong> — object to processing based on legitimate interests</li>
              <li><strong>Right to restrict processing</strong> — request that we limit how we use your data</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, contact us at <a href="mailto:info@getadaptiv.com" className="text-coral hover:underline font-bold">info@getadaptiv.com</a>. We will respond within 30 days.</p>
          </Section>

          <Section title="8. Cookies">
            <p>BraidStudio uses only essential session cookies required for authentication and maintaining your logged-in state. We do not use advertising cookies, tracking pixels, or third-party analytics cookies that identify you personally.</p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>BraidStudio is not directed at individuals under the age of 18. We do not knowingly collect personal data from minors. If you believe a minor has created an account, please contact us immediately.</p>
          </Section>

          <Section title="10. Security">
            <p>We implement industry-standard security measures to protect your personal data, including encrypted data transmission (HTTPS), Firebase security rules, and restricted access controls. However, no system is completely secure and we cannot guarantee absolute security.</p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. The "Last updated" date at the top of this page reflects the most recent revision. Continued use of the platform after changes are published constitutes acceptance of the revised policy.</p>
          </Section>

          <Section title="12. Contact">
            <p>For any questions, data requests, or concerns regarding this Privacy Policy, contact us at: <a href="mailto:info@getadaptiv.com" className="text-coral hover:underline font-bold">info@getadaptiv.com</a></p>
          </Section>

          <div className="pt-6 border-t border-gray-100 flex gap-4 text-[11px] font-bold text-gray-400">
            <Link to="/terms" className="hover:text-coral transition-colors">Terms of Service</Link>
            <Link to="/signup" className="hover:text-coral transition-colors">Sign Up</Link>
            <Link to="/login" className="hover:text-coral transition-colors">Log In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
