import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useApp } from '../context/AppContext';
import AppHeader from '../components/AppHeader';

interface ProfileFormData {
  name: string;
  phone: string;
  flat: string;
  area: string;
  landmark: string;
  pincode: string;
}

export default function ProfileSetupPage() {
  const [, setLocation] = useLocation();
  const { setUser } = useApp();

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    defaultValues: {
      name: '',
      phone: '',
      flat: '',
      area: '',
      landmark: '',
      pincode: ''
    }
  });

  const onSubmit = (data: ProfileFormData) => {
    setUser({
      ...data,
      phone: data.phone.startsWith('+91') ? data.phone : `+91 ${data.phone}`
    });
    setLocation('/home');
  };

  return (
    <motion.div 
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-gray-50 flex flex-col"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
    >
      <AppHeader title="Complete Profile" showBack onBack={() => setLocation('/signin')} />
      
      <div className="h-1 bg-gray-200">
        <div className="h-full bg-primary w-[50%] rounded-r-full"></div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24">
        <h2 className="text-2xl font-bold mb-6">Delivery Details</h2>
        
        <form id="profile-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 ml-1">Full Name</label>
            <input 
              {...register('name', { required: 'Name is required' })}
              placeholder="e.g. Rahul Sharma"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {errors.name && <span className="text-red-500 text-xs ml-1">{errors.name.message}</span>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 ml-1">Mobile Number</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">+91</span>
              <input 
                {...register('phone', { required: 'Phone is required', pattern: { value: /^[0-9]{10}$/, message: 'Invalid 10-digit number' } })}
                placeholder="9876543210"
                type="tel"
                maxLength={10}
                className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            {errors.phone && <span className="text-red-500 text-xs ml-1">{errors.phone.message}</span>}
          </div>

          <div className="space-y-1 pt-2">
            <label className="text-sm font-medium text-gray-700 ml-1">House / Flat No.</label>
            <input 
              {...register('flat', { required: 'Flat/House No. is required' })}
              placeholder="e.g. A-402, Green Valley Apts"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {errors.flat && <span className="text-red-500 text-xs ml-1">{errors.flat.message}</span>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 ml-1">Area / Street</label>
            <input 
              {...register('area', { required: 'Area is required' })}
              placeholder="e.g. Sector 12, Main Road"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {errors.area && <span className="text-red-500 text-xs ml-1">{errors.area.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 ml-1">Landmark (Optional)</label>
              <input 
                {...register('landmark')}
                placeholder="Near Metro"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 ml-1">Pincode</label>
              <input 
                {...register('pincode', { required: 'Required', pattern: { value: /^[0-9]{6}$/, message: 'Invalid pincode' } })}
                placeholder="201301"
                type="tel"
                maxLength={6}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {errors.pincode && <span className="text-red-500 text-xs ml-1">{errors.pincode.message}</span>}
            </div>
          </div>
        </form>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-white p-4 border-t border-gray-100 z-10">
        <button 
          type="submit"
          form="profile-form"
          className="w-full bg-primary text-white font-semibold py-4 rounded-xl shadow-md active:scale-[0.98] transition-all text-lg"
        >
          Save & Continue
        </button>
      </div>
    </motion.div>
  );
}
