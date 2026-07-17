import { useLocation } from 'wouter';
import { ArrowLeft, Trash2, Mail, Clock, Shield, AlertCircle } from 'lucide-react';

export default function DataDeletionPage() {
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
          <Trash2 size={20} className="text-white" />
          <h1 className="text-lg font-bold text-white tracking-wide">Data Deletion Request</h1>
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
          <h2 className="text-xl font-bold mb-1">Data Deletion Request</h2>
          <p className="text-sm text-green-100">Shiv Prasad Dwarika Prasad Kirana</p>
          <p className="text-xs text-green-200 mt-2">Last updated: July 2026</p>
        </div>

        {/* Intro */}
        <Section title="Your Right to Delete Your Data">
          <p>
            You have the right to request the deletion of your personal data held by THINKIT
            at any time. This page explains what data we hold, what can be deleted, what may
            be retained for legal reasons, and how to submit a deletion request.
          </p>
          <p className="mt-2">
            THINKIT is operated by <strong>Shiv Prasad Dwarika Prasad Kirana</strong>{' '}
            (trading as THINKIT / Dwarika Grocery Mart). We are committed to honouring your
            data rights promptly and transparently.
          </p>
        </Section>

        {/* How to request */}
        <Section title="How to Submit a Deletion Request">
          <p className="mb-3">
            To request deletion of your account and personal data, please follow these steps:
          </p>

          <div className="space-y-3">
            <Step number="1" title="Send an email to us">
              <p>
                Email us at{' '}
                <a
                  href="mailto:thinkitindia.team@gmail.com?subject=Account%2FData%20Deletion%20Request"
                  className="text-green-700 underline font-medium"
                >
                  thinkitindia.team@gmail.com
                </a>
              </p>
              <p className="mt-1">
                Use the subject line exactly as:{' '}
                <strong className="font-semibold">"Account/Data Deletion Request"</strong>
              </p>
            </Step>

            <Step number="2" title="Include your account details">
              <p>In the body of your email, please provide:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-700">
                <li>Your <strong>registered mobile number</strong></li>
                <li>Your <strong>full name</strong> as registered in the app</li>
                <li>Any other detail that helps us identify your account</li>
              </ul>
            </Step>

            <Step number="3" title="We confirm and process your request">
              <p>
                We will send you a confirmation email within <strong>72 hours</strong> of
                receiving your request. Your data will be permanently deleted within{' '}
                <strong>30 days</strong> of confirmation.
              </p>
            </Step>
          </div>

          {/* Quick action button */}
          <a
            href="mailto:thinkitindia.team@gmail.com?subject=Account%2FData%20Deletion%20Request"
            className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white text-sm font-semibold shadow-sm transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}
          >
            <Mail size={16} />
            Send Deletion Request Email
          </a>
        </Section>

        {/* Data that will be deleted */}
        <Section title="Data That Will Be Deleted">
          <p className="mb-2">
            Upon a verified deletion request, the following personal data will be permanently
            removed from our systems:
          </p>
          <ul className="space-y-2">
            {[
              { label: 'Name', detail: 'Your full name as registered in the THINKIT app.' },
              { label: 'Mobile number', detail: 'Your registered phone number used for login and delivery contact.' },
              { label: 'Delivery address', detail: 'All saved addresses including house number, area, landmark, and pincode.' },
              { label: 'Account credentials', detail: 'Your login session, password hash, and authentication data.' },
              { label: 'Cart and browsing history', detail: 'Items added to your cart and your in-app activity.' },
              { label: 'Other user-associated data', detail: 'Any other personal data linked to your account where applicable.' },
            ].map(({ label, detail }) => (
              <li key={label} className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-gray-800">{label}</span>
                  <span className="text-gray-600"> — {detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* Data that may be retained */}
        <Section title="Data That May Be Retained">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
            <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Certain data may be retained after your request where required by law or for
              legitimate business purposes.
            </p>
          </div>
          <ul className="space-y-2">
            {[
              {
                label: 'Transaction and order records',
                detail: 'Order IDs, amounts, and dates may be retained for accounting, tax, and legal compliance purposes as required under applicable Indian law.',
              },
              {
                label: 'Anonymised analytics',
                detail: 'Aggregate, non-identifiable usage data that cannot be linked back to you may be retained to improve the service.',
              },
            ].map(({ label, detail }) => (
              <li key={label} className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-gray-800">{label}</span>
                  <span className="text-gray-600"> — {detail}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-gray-500">
            Retained data is kept only for as long as legally required and is never used
            for marketing or shared with third parties.
          </p>
        </Section>

        {/* Timeline */}
        <Section title="Processing Timeline">
          <div className="space-y-3">
            {[
              { icon: <Mail size={16} className="text-green-600" />, label: 'Request received', detail: 'We acknowledge your email within 72 hours.' },
              { icon: <Shield size={16} className="text-green-600" />, label: 'Identity verified', detail: 'We verify your mobile number and account details to prevent unauthorised deletions.' },
              { icon: <Trash2 size={16} className="text-green-600" />, label: 'Data deleted', detail: 'Your personal data is permanently deleted within 30 days of verification.' },
              { icon: <Clock size={16} className="text-green-600" />, label: 'Confirmation sent', detail: 'We send a final confirmation email once deletion is complete.' },
            ].map(({ icon, label, detail }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-sm text-gray-600">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Contact */}
        <Section title="Contact Us">
          <p className="mb-3">
            For any questions about your data or this deletion process, contact us directly:
          </p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Shield size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Shiv Prasad Dwarika Prasad Kirana</p>
                <p className="text-sm text-gray-600">Operating as THINKIT (Dwarika Grocery Mart)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-4 flex-shrink-0" />
              <div className="text-sm text-gray-700 leading-relaxed">
                <p>Chowk Ghantaghar, Towards G.N. Road</p>
                <p>Sultanpur, Uttar Pradesh – 228001</p>
                <p>India</p>
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
            <div className="flex items-center gap-3">
              <div className="w-4 flex-shrink-0" />
              <a href="https://thinkit.store" className="text-sm text-green-700 underline">
                https://thinkit.store
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

function Step({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
        style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}
      >
        {number}
      </div>
      <div>
        <p className="font-semibold text-gray-800 mb-0.5">{title}</p>
        <div className="text-gray-600">{children}</div>
      </div>
    </div>
  );
}
