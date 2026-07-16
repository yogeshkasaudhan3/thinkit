import { useLocation } from 'wouter';
import { ArrowLeft, Shield, Mail } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4 shadow-sm"
        style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}
      >
        <button
          onClick={() => setLocation('/signin')}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-white" />
          <h1 className="text-lg font-bold text-white tracking-wide">Privacy Policy</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-12">

        {/* Brand banner */}
        <div
          className="rounded-2xl p-5 mb-6 text-white shadow-md"
          style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-green-100 mb-1">THINKIT</p>
          <h2 className="text-xl font-bold mb-1">Privacy Policy</h2>
          <p className="text-sm text-green-100">
            Shiv Prasad Dwarika Prasad Kirana
          </p>
          <p className="text-xs text-green-200 mt-2">Last updated: July 2026</p>
        </div>

        {/* Sections */}
        <Section title="1. About THINKIT">
          <p>
            THINKIT is an online grocery delivery application operated by{' '}
            <strong>Shiv Prasad Dwarika Prasad Kirana</strong>. We connect customers
            with local grocery products and deliver them to your doorstep. Our website
            is <a href="https://thinkit.store" className="text-green-700 underline">https://thinkit.store</a>.
          </p>
          <p className="mt-2">
            This Privacy Policy explains how we collect, use, store, and protect the
            personal information you provide when using the THINKIT app or website.
            By using THINKIT, you agree to the practices described in this policy.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p className="mb-2">
            We collect only the information necessary to provide our grocery delivery
            service. This includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li><strong>Name</strong> — to identify your account and personalise delivery.</li>
            <li><strong>Mobile number</strong> — used as your login identifier and to contact you about your order.</li>
            <li><strong>Delivery address</strong> — house number, area, landmark, and pincode, used to deliver your groceries.</li>
            <li><strong>Order details</strong> — items ordered, quantities, prices, and order status.</li>
            <li><strong>Cart and purchase history</strong> — items you add to your cart and past purchases, used to improve your experience.</li>
            <li><strong>Basic device and application information</strong> — such as device type and operating system version, used for app compatibility and troubleshooting.</li>
          </ul>
          <p className="mt-2 text-sm text-gray-500">
            We do not collect payment card numbers or banking information. All payments
            are handled via cash on delivery or trusted third-party payment gateways
            where applicable.
          </p>
        </Section>

        <Section title="3. How We Use Your Information">
          <p className="mb-2">Your information is used solely to operate the THINKIT service:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li><strong>Processing grocery orders</strong> — confirming, preparing, and dispatching your orders.</li>
            <li><strong>Delivery services</strong> — routing your order to the correct delivery address.</li>
            <li><strong>Customer support</strong> — resolving order issues, cancellations, and queries.</li>
            <li><strong>Improving app experience</strong> — analysing usage patterns to improve features, performance, and product recommendations.</li>
            <li><strong>Communication</strong> — sending order confirmations and delivery updates via the app or SMS.</li>
          </ul>
          <p className="mt-2">
            We do not use your data for advertising or marketing to third parties.
          </p>
        </Section>

        <Section title="4. Data Sharing Policy">
          <p className="mb-2">
            We do <strong>not</strong> sell, trade, or rent your personal information
            to any third party. Your data may be shared only in the following limited
            circumstances:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>
              <strong>Delivery personnel</strong> — your name, address, and mobile number are shared with our delivery team solely to complete your delivery.
            </li>
            <li>
              <strong>Legal requirements</strong> — we may disclose information if required to do so by law or in response to a valid legal process.
            </li>
          </ul>
        </Section>

        <Section title="5. Third-Party Services">
          <p className="mb-2">THINKIT uses the following third-party services that may process data on our behalf:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>
              <strong>Cloudinary</strong> — used to host and serve product images. Only product images are stored; no personal user data is shared.
            </li>
            <li>
              <strong>Supabase (PostgreSQL)</strong> — our backend database, hosted on secure cloud infrastructure. Your account and order data is stored here with encryption at rest.
            </li>
          </ul>
          <p className="mt-2">
            These services are bound by their own privacy policies and are used solely
            for the operation of THINKIT.
          </p>
        </Section>

        <Section title="6. Data Security">
          <p>
            We take reasonable technical and organisational measures to protect your
            personal information against unauthorised access, alteration, disclosure,
            or destruction. These measures include:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 mt-2">
            <li>Encrypted storage of passwords (we never store passwords in plain text).</li>
            <li>Secure HTTPS connections for all data in transit.</li>
            <li>Access controls so that only authorised personnel can view order data.</li>
            <li>Session management with automatic expiry to protect your account.</li>
          </ul>
          <p className="mt-2">
            No method of transmission over the internet is 100% secure. While we strive
            to protect your personal information, we cannot guarantee its absolute security.
          </p>
        </Section>

        <Section title="7. Data Retention">
          <p>
            We retain your personal information for as long as your account is active or
            as long as necessary to provide our services. Order history is retained to
            facilitate returns, support queries, and compliance with applicable law.
            If you request deletion of your account, we will delete your personal data
            within 30 days, except where retention is required by law.
          </p>
        </Section>

        <Section title="8. Your Rights">
          <p className="mb-2">You have the following rights regarding your personal data:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li><strong>Access</strong> — request a copy of the personal information we hold about you.</li>
            <li><strong>Correction</strong> — ask us to correct inaccurate or incomplete information.</li>
            <li><strong>Deletion</strong> — request that we delete your account and associated personal data.</li>
            <li><strong>Objection</strong> — object to specific uses of your data.</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, please contact us at{' '}
            <a href="mailto:thinkitindia.team@gmail.com" className="text-green-700 underline">
              thinkitindia.team@gmail.com
            </a>.
          </p>
        </Section>

        <Section title="9. Account and Data Deletion">
          <p>
            You can request deletion of your THINKIT account and all associated personal
            data at any time by emailing us at{' '}
            <a href="mailto:thinkitindia.team@gmail.com" className="text-green-700 underline">
              thinkitindia.team@gmail.com
            </a>{' '}
            with the subject line <strong>"Account Deletion Request"</strong> and your
            registered mobile number.
          </p>
          <p className="mt-2">
            We will process your request within <strong>30 days</strong>. Upon deletion:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 mt-1">
            <li>Your account credentials will be permanently removed.</li>
            <li>Your delivery address and personal details will be deleted.</li>
            <li>Order history may be retained in anonymised form for legal and accounting purposes.</li>
          </ul>
        </Section>

        <Section title="10. Children's Privacy">
          <p>
            THINKIT is not directed at children under the age of 13. We do not knowingly
            collect personal information from children. If you believe a child has
            provided us with personal information, please contact us and we will delete it promptly.
          </p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will
            update the "Last updated" date at the top of this page. Continued use of
            the THINKIT app or website after changes are posted constitutes your
            acceptance of the updated policy.
          </p>
        </Section>

        <Section title="12. Contact Us">
          <p className="mb-3">
            If you have any questions, concerns, or requests regarding this Privacy
            Policy or your personal data, please contact us:
          </p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
            <div className="flex items-start gap-3">
              <Shield size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Shiv Prasad Dwarika Prasad Kirana</p>
                <p className="text-sm text-gray-600">Operating as THINKIT</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-green-600 flex-shrink-0" />
              <a
                href="mailto:thinkitindia.team@gmail.com"
                className="text-sm text-green-700 underline"
              >
                thinkitindia.team@gmail.com
              </a>
            </div>
          </div>
        </Section>

        <p className="text-center text-xs text-gray-400 mt-8">
          © {new Date().getFullYear()} Shiv Prasad Dwarika Prasad Kirana · THINKIT ·{' '}
          <a href="https://thinkit.store" className="underline">thinkit.store</a>
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
      <h3 className="text-base font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">
        {title}
      </h3>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </div>
  );
}
