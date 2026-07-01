import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Ticket, Phone, MessageCircle, Star, FileText,
  LogOut, ChevronRight, MapPin, X, CheckCircle2, Loader2,
} from 'lucide-react';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { useApp } from '../context/AppContext';
import { useToast } from '@/hooks/use-toast';

// ─── Edit Address Sheet ────────────────────────────────────────────────────────

interface EditAddressSheetProps {
  initial: { houseNumber: string; area: string; landmark: string; pincode: string };
  onSave: (fields: { houseNumber: string; area: string; landmark: string; pincode: string }) => Promise<void>;
  onClose: () => void;
}

function EditAddressSheet({ initial, onSave, onClose }: EditAddressSheetProps) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    setError('');
    setSaved(false);
  };

  const handleSave = async () => {
    if (!form.houseNumber.trim()) { setError('House Number is required.'); return; }
    if (!form.area.trim()) { setError('Area / Colony is required.'); return; }
    if (!/^\d{6}$/.test(form.pincode.trim())) { setError('Pincode must be 6 digits.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        houseNumber: form.houseNumber.trim(),
        area: form.area.trim(),
        landmark: form.landmark.trim(),
        pincode: form.pincode.trim(),
      });
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors placeholder-gray-400 bg-white';

  return (
    /* Backdrop */
    <motion.div
      className="fixed inset-0 z-50 flex flex-col justify-end items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />

      {/* Sheet */}
      <motion.div
        className="relative w-full max-w-[390px] bg-white rounded-t-3xl shadow-2xl overflow-hidden"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-primary" />
            <span className="font-bold text-gray-900 text-base">Edit Address</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 pt-4 pb-6 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              House / Flat Number <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass}
              placeholder="e.g. 12B, Sunrise Apartments"
              value={form.houseNumber}
              onChange={set('houseNumber')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Area / Colony <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass}
              placeholder="e.g. Rajiv Nagar"
              value={form.area}
              onChange={set('area')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Landmark <span className="text-gray-400">(optional)</span>
            </label>
            <input
              className={inputClass}
              placeholder="e.g. Near SBI Bank"
              value={form.landmark}
              onChange={set('landmark')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Pincode <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass}
              placeholder="6-digit pincode"
              value={form.pincode}
              onChange={set('pincode')}
              inputMode="numeric"
              maxLength={6}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-500 text-sm font-medium bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          {/* Success */}
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-green-700 font-semibold bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 text-sm"
            >
              <CheckCircle2 size={16} />
              Address updated successfully.
            </motion.div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 active:opacity-90 transition-opacity disabled:opacity-60 mt-1"
          >
            {saving ? (
              <><Loader2 size={18} className="animate-spin" /> Saving…</>
            ) : (
              'Save Address'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Profile Page ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { user, userAddress, logout, updateAddress } = useApp();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);

  if (!user) {
    setLocation('/signin');
    return null;
  }

  const handleLogout = async () => {
    await logout();
    setLocation('/signin');
  };

  const showToast = (msg: string) => toast({ title: msg, duration: 2000 });

  const menuItems = [
    { icon: Package, label: 'My Orders', onClick: () => setLocation('/orders'), color: 'text-blue-500' },
    { icon: Ticket, label: 'My Coupons', onClick: () => showToast('No coupons yet'), color: 'text-orange-500' },
    { icon: Phone, label: 'Call Dwarika', onClick: () => (window.location.href = 'tel:1800123456'), color: 'text-green-600' },
    { icon: MessageCircle, label: 'WhatsApp Support', onClick: () => window.open('https://wa.me/919876543210', '_blank'), color: 'text-[#25D366]' },
    { icon: Star, label: 'Rate Us', onClick: () => showToast('Thank you for rating!'), color: 'text-yellow-500' },
    { icon: FileText, label: 'Privacy Policy', onClick: () => showToast('Coming soon'), color: 'text-gray-500' },
  ];

  const addressInitial = {
    houseNumber: userAddress?.houseNumber ?? '',
    area: userAddress?.area ?? '',
    landmark: userAddress?.landmark ?? '',
    pincode: userAddress?.pincode ?? '',
  };

  return (
    <>
      <motion.div
        className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-gray-50 pb-20 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <AppHeader title="My Profile" />

        <div className="p-4 flex-1 overflow-y-auto">

          {/* Profile Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-inner">
              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">{user.name}</h2>
              <p className="text-gray-500 text-sm mt-0.5">{user.phone}</p>
            </div>
          </div>

          {/* Address card */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Saved Address</span>
              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Home</span>
            </div>

            {user.flat || user.area ? (
              <p className="text-sm text-gray-800 leading-relaxed mb-3">
                {user.flat && <><span className="font-semibold">{user.flat}</span><br /></>}
                {user.area && <>{user.area}<br /></>}
                {user.landmark && <>{user.landmark}<br /></>}
                {user.pincode}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic mb-3">No address saved yet.</p>
            )}

            <button
              onClick={() => setEditOpen(true)}
              className="w-full flex items-center justify-center gap-2 border border-primary/30 text-primary font-bold text-sm rounded-xl py-2.5 active:bg-primary/5 transition-colors"
            >
              <MapPin size={15} />
              Edit Address
            </button>
          </div>

          {/* Menu */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className={`w-full flex items-center p-4 active:bg-gray-50 transition-colors ${
                  index !== menuItems.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center ${item.color} mr-3`}>
                  <item.icon size={18} />
                </div>
                <span className="flex-1 text-left font-medium text-gray-800 text-sm">{item.label}</span>
                <ChevronRight size={18} className="text-gray-300" />
              </button>
            ))}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full bg-white border border-red-100 text-red-500 rounded-2xl p-4 flex items-center justify-center gap-2 font-bold shadow-sm active:bg-red-50 transition-colors"
          >
            <LogOut size={18} /> Log Out
          </button>

          <div className="text-center mt-8 mb-4">
            <p className="text-gray-400 text-xs">Thinkit by Dwarika v1.0.0</p>
          </div>

        </div>

        <BottomNav />
      </motion.div>

      {/* Edit address bottom sheet */}
      <AnimatePresence>
        {editOpen && (
          <EditAddressSheet
            initial={addressInitial}
            onSave={updateAddress}
            onClose={() => setEditOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
