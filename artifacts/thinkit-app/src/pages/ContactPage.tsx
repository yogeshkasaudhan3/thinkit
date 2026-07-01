import { motion } from 'framer-motion';
import { Phone, MessageCircle, Mail, MapPin, Clock, Store } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { useStoreSettings, toPhoneDigits } from '../lib/useStoreSettings';

export default function ContactPage() {
  const { settings } = useStoreSettings();

  const waNumber = toPhoneDigits(settings.whatsappNumber);
  const telNumber = toPhoneDigits(settings.contactNumber);

  return (
    <motion.div
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-gray-50 pb-24"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
    >
      <AppHeader title="Contact Us" showBack />

      <div className="p-4 space-y-4">

        {/* Store identity */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shrink-0">
            <Store size={28} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg leading-tight">{settings.storeName}</h2>
            {settings.businessHours && (
              <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                <Clock size={13} className="text-primary" />
                {settings.businessHours}
              </p>
            )}
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => (window.location.href = `tel:${telNumber}`)}
            className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Phone size={22} className="text-green-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Call Us</span>
            <span className="text-xs text-gray-400 text-center">{settings.contactNumber}</span>
          </button>

          <button
            onClick={() =>
              window.open(
                `https://wa.me/${waNumber}?text=Hi+${encodeURIComponent(settings.storeName)}+Support,+I+need+help`,
                '_blank'
              )
            }
            className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 bg-[#25D366]/10 rounded-xl flex items-center justify-center">
              <MessageCircle size={22} className="text-[#25D366]" />
            </div>
            <span className="text-sm font-semibold text-gray-900">WhatsApp</span>
            <span className="text-xs text-gray-400 text-center">{settings.whatsappNumber}</span>
          </button>
        </div>

        {/* Detail cards */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {settings.supportEmail && (
            <button
              onClick={() => (window.location.href = `mailto:${settings.supportEmail}`)}
              className="w-full flex items-center gap-4 p-4 active:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <Mail size={18} className="text-blue-500" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs text-gray-400 font-medium">Email Support</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{settings.supportEmail}</p>
              </div>
            </button>
          )}

          {settings.storeAddress && (
            <div className="flex items-start gap-4 p-4">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={18} className="text-orange-500" />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400 font-medium">Store Address</p>
                <p className="text-sm font-semibold text-gray-900 leading-snug mt-0.5">{settings.storeAddress}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
              <Clock size={18} className="text-purple-500" />
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-400 font-medium">Business Hours</p>
              <p className="text-sm font-semibold text-gray-900">{settings.businessHours}</p>
            </div>
          </div>
        </div>

      </div>

      <BottomNav />
    </motion.div>
  );
}
