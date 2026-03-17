import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 mb-3 pb-2 border-b border-gray-100">{title}</h2>
    <div className="text-[13px] text-gray-600 leading-relaxed space-y-2">{children}</div>
  </div>
);

export const TermsPage: React.FC = () => {
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
            <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-1">Terms of Service</h1>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Last updated: March 2026</p>
          </div>

          <Section title="1. Introduction">
            <p>Welcome to BraidStudio, an AI-powered platform for English Language Teaching (ELT) professionals, operated by <strong>Adaptiv Personalised Learning</strong> ("we", "us", "our"). By creating an account and using BraidStudio, you agree to these Terms of Service. Please read them carefully.</p>
          </Section>

          <Section title="2. Eligibility">
            <p>BraidStudio is intended exclusively for qualified teachers, educators, and educational professionals. By signing up, you confirm that you are using the platform in a professional educational capacity and are at least 18 years of age.</p>
          </Section>

          <Section title="3. Account Creation & Approval">
            <p>Account registration is subject to admin approval. After creating an account, access to the platform is granted once an administrator reviews and approves your registration. During the pending period, access to core features is restricted.</p>
            <p>You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.</p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree to use BraidStudio solely for legitimate educational purposes. You must not:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Share your account credentials with others</li>
              <li>Use the platform to generate content for commercial resale</li>
              <li>Attempt to reverse-engineer, scrape, or extract data from the platform</li>
              <li>Upload content that is unlawful, harmful, or violates the rights of third parties</li>
              <li>Use the platform in any way that disrupts or damages its operation</li>
            </ul>
          </Section>

          <Section title="5. Intellectual Property & Uploaded Content">
            <p>All materials you upload to BraidStudio (textbook pages, worksheets, images) remain the intellectual property of their respective copyright holders. You represent that you have the right to use and process such materials for the purposes described herein.</p>
            <p>BraidStudio processes uploaded content solely to extract linguistic features (vocabulary, grammar points, topic, level) to support activity creation. <strong>We do not store, retain, or reuse raw uploaded content beyond the immediate processing session.</strong> Extracted metadata (vocabulary lists, grammar points) is stored in your account for your personal use.</p>
            <p>AI-generated activities and worksheets created through BraidStudio are provided for your use. You take responsibility for reviewing and adapting AI-generated content before use in the classroom.</p>
          </Section>

          <Section title="6. AI-Generated Content">
            <p>BraidStudio uses artificial intelligence to assist in drafting educational activities. AI-generated content is provided as a starting point and may contain errors, inaccuracies, or inappropriate suggestions. <strong>You are responsible for reviewing, editing, and validating all AI-generated content before distributing it to students.</strong> Adaptiv Personalised Learning does not guarantee the accuracy, completeness, or pedagogical appropriateness of AI-generated outputs.</p>
          </Section>

          <Section title="7. Subscription & Access">
            <p>BraidStudio is currently in an invite-only beta phase. Access is granted at our discretion. We reserve the right to modify, suspend, or discontinue access at any time with reasonable notice where possible. Future paid subscription tiers may be introduced; existing users will be notified in advance.</p>
          </Section>

          <Section title="8. Limitation of Liability">
            <p>BraidStudio is provided "as is" without warranties of any kind, express or implied. To the maximum extent permitted by law, Adaptiv Personalised Learning shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform, including loss of data, loss of profits, or service interruptions.</p>
          </Section>

          <Section title="9. Termination">
            <p>We reserve the right to suspend or terminate your account if you breach these Terms of Service or engage in conduct we deem harmful to the platform or its users. You may request account deletion at any time by contacting us.</p>
          </Section>

          <Section title="10. Changes to These Terms">
            <p>We may update these Terms of Service from time to time. Continued use of the platform after changes are published constitutes acceptance of the revised terms. We will notify you of significant changes via email or an in-app notice.</p>
          </Section>

          <Section title="11. Governing Law">
            <p>These Terms are governed by the laws of the Republic of Cyprus and the European Union. Any disputes shall be subject to the exclusive jurisdiction of the courts of Cyprus.</p>
          </Section>

          <Section title="12. Contact">
            <p>If you have questions about these Terms, please contact us at: <a href="mailto:info@getadaptiv.com" className="text-coral hover:underline font-bold">info@getadaptiv.com</a></p>
          </Section>

          <div className="pt-6 border-t border-gray-100 flex gap-4 text-[11px] font-bold text-gray-400">
            <Link to="/privacy" className="hover:text-coral transition-colors">Privacy Policy</Link>
            <Link to="/signup" className="hover:text-coral transition-colors">Sign Up</Link>
            <Link to="/login" className="hover:text-coral transition-colors">Log In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
