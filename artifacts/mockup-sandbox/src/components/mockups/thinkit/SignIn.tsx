import React from 'react';

export default function SignIn() {
  return (
    <div className="w-[390px] h-[100dvh] bg-white flex flex-col mx-auto font-sans relative overflow-hidden">
      {/* Header section with brand color */}
      <div className="bg-[#1B4D2E] pt-16 pb-12 px-6 flex flex-col items-center rounded-b-[40px] shadow-sm z-10">
        <div className="bg-white rounded-2xl px-6 py-3 shadow-lg">
          <img 
            src="/__mockup/images/thinkit-logo.png" 
            alt="Thinkit Logo" 
            className="h-24 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const textLogo = document.getElementById('signin-text-logo');
              if (textLogo) textLogo.style.display = 'flex';
            }}
          />
          <div id="signin-text-logo" className="hidden flex-row items-center justify-center">
            <span className="text-[#1B4D2E] text-4xl font-black tracking-tight">Think</span>
            <span className="text-[#FFD700] text-4xl font-black tracking-tight">it</span>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="flex-1 flex flex-col items-center px-6 pt-10 z-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Welcome to Thinkit<br/>by Dwarika</h1>
        <p className="text-gray-500 text-center mb-10">Sign in to get groceries delivered in minutes</p>

        <button className="w-full bg-white border border-gray-200 text-gray-700 font-semibold py-4 rounded-xl shadow-sm flex items-center justify-center space-x-3 active:scale-95 transition-transform mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="mt-auto pb-8 pt-8">
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            By continuing, you agree to our<br/>
            <a href="#" className="text-[#1B4D2E] font-semibold">Terms of Service</a> & <a href="#" className="text-[#1B4D2E] font-semibold">Privacy Policy</a>
          </p>
        </div>
      </div>

      {/* Decorative background bottom */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none flex items-end justify-between px-4 pb-2 opacity-30">
        <div className="text-5xl">🍅</div>
        <div className="text-4xl mb-4">🥬</div>
        <div className="text-6xl mb-2">🍞</div>
        <div className="text-4xl mb-6">🥛</div>
        <div className="text-5xl">🍌</div>
      </div>
    </div>
  );
}
