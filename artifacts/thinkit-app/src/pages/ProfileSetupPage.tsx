import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useApp } from '../context/AppContext';
import AppHeader from '../components/AppHeader';

interface ProfileFormData {
  name: string;
  phone: string;
  houseNumber: string;
  area: string;
  landmark: string;
  pincode: string;
}

export default function ProfileSetupPage() {
  const [, setLocation] = useLocation();
  const { authUser, refreshAuth } = useApp();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: authUser?.name ?? '',
      phone: '',
      houseNumber: '',
      area: '',
      landmark: '',
      pincode: '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setServerError('');
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Something went wrong' }));
        setServerError(err.error ?? 'Failed to save profile');
        return;
      }

      // Re-fetch session user so authUser.profileComplete = true
      await refreshAuth();
      setLocation('/home');
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (hasError: boolean) =>
    `w-full h-12 px-4 rounded-xl border text-base focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
      hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'
    }`;

  return (
    <motion.div
      className="min-h-[100dvh] w-full max-w-[480px] mx-auto bg-gray-50 flex flex-col"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
    >
      <AppHeader title="Complete Profile" showBack onBack={() => setLocation('/signin')} />

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div className="h-full bg-primary w-3/4 transition-all" />
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-10">
        <p className="text-muted-foreground text-sm mb-6">
          We need a few details to deliver to your doorstep.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
            <input
              {...register('name', { required: 'Name is required' })}
              placeholder="Your full name"
              className={inputCls(!!errors.name)}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number *</label>
            <div className="flex gap-2">
              <span className="h-12 px-3 rounded-xl border border-gray-200 bg-gray-100 flex items-center text-sm font-medium text-gray-600">
                +91
              </span>
              <input
                {...register('phone', {
                  required: 'Mobile number is required',
                  pattern: { value: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit mobile number' },
                })}
                placeholder="9876543210"
                inputMode="numeric"
                maxLength={10}
                className={`flex-1 h-12 px-4 rounded-xl border text-base focus:outline-none focus:ring-2 focus:ring-primary transition-all ${errors.phone ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}
              />
            </div>
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          {/* House / Flat No */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">House / Flat No. *</label>
            <input
              {...register('houseNumber', { required: 'House number is required' })}
              placeholder="B-204, Green Apartments"
              className={inputCls(!!errors.houseNumber)}
            />
            {errors.houseNumber && <p className="text-red-500 text-xs mt-1">{errors.houseNumber.message}</p>}
          </div>

          {/* Area / Colony */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Area / Colony / Street *</label>
            <input
              {...register('area', { required: 'Area is required' })}
              placeholder="Sector 12, Noida"
              className={inputCls(!!errors.area)}
            />
            {errors.area && <p className="text-red-500 text-xs mt-1">{errors.area.message}</p>}
          </div>

          {/* Landmark */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Landmark</label>
            <input
              {...register('landmark')}
              placeholder="Near metro station (optional)"
              className={inputCls(false)}
            />
          </div>

          {/* Pincode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Pincode *</label>
            <input
              {...register('pincode', {
                required: 'Pincode is required',
                pattern: { value: /^\d{6}$/, message: 'Enter a valid 6-digit pincode' },
              })}
              placeholder="201301"
              inputMode="numeric"
              maxLength={6}
              className={inputCls(!!errors.pincode)}
            />
            {errors.pincode && <p className="text-red-500 text-xs mt-1">{errors.pincode.message}</p>}
          </div>

          {serverError && (
            <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl p-3">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full h-14 bg-primary text-white rounded-xl font-bold text-lg mt-2 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
