import React from 'react';

export default function Splash() {
  return (
    <div className="w-[390px] h-[100dvh] bg-[#1B4D2E] flex flex-col items-center justify-center relative overflow-hidden mx-auto font-sans">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full border-[20px] border-white"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full border-[20px] border-white"></div>
      </div>
      
      <div className="flex flex-col items-center z-10 animate-fade-in-up">
        <img 
          src="/__mockup/images/thinkit-logo.png" 
          alt="Thinkit Logo" 
          className="w-56 mb-6 rounded-2xl"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const textLogo = document.getElementById('text-logo-fallback');
            if (textLogo) textLogo.style.display = 'flex';
          }}
        />
        <div id="text-logo-fallback" className="hidden flex-row items-center justify-center mb-6">
          <span className="text-white text-5xl font-black tracking-tight">Think</span>
          <span className="text-[#FFD700] text-5xl font-black tracking-tight">it</span>
        </div>
        
        <p className="text-[#FFD700] font-medium text-lg tracking-wide">Groceries Delivered in Minutes</p>
      </div>

      <div className="absolute bottom-16 left-0 right-0 flex justify-center z-10">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-[#FFD700] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-[#FFD700] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-[#FFD700] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
