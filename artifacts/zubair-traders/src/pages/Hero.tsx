import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

interface HeroProps {
  onGetStarted: () => void;
}

const snackSlides = [
  {
    image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=1920&q=80',
    title: 'Wholesale Snacks & Confectionery Distribution',
    subtitle: 'Manage bulk orders of packaged chips, biscuits, and wholesale snacks with real-time digital billing.'
  },
  {
    image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=1920&q=80',
    title: 'Precision Khata Ledger for Retail & Wholesale Traders',
    subtitle: 'Effortlessly track retailer dues, credit limits, and payment collection receipts in real time.'
  },
  {
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=1920&q=80',
    title: 'Complete Inventory & Stock Control',
    subtitle: 'Monitor stock levels, carton counts, and wholesale unit purchase costs with full clarity.'
  }
];

export function Hero({ onGetStarted }: HeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % snackSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen w-full font-sans select-none overflow-hidden flex flex-col justify-between bg-slate-950 text-slate-100">
      
      {/* FULL-SCREEN BACKGROUND IMAGES WITH DARK SHADE */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {snackSlides.map((slide, idx) => (
          <div
            key={slide.image}
            className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out ${
              idx === currentIndex ? 'opacity-50 scale-100' : 'opacity-0 scale-105'
            }`}
            style={{ backgroundImage: `url('${slide.image}')` }}
          />
        ))}

        {/* Dark Slate Gradients */}
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/90" />
      </div>

      {/* TOP HEADER */}
      <header className="relative z-10 w-full px-6 py-5 border-b border-slate-800/60 bg-slate-900/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/gemini-svg.svg"
              alt="Zubair Traders Logo"
              className="h-11 w-11 object-contain drop-shadow-sm"
            />
            <div>
              <h1 className="text-xl font-black text-white tracking-tight leading-tight">
                Zubair Traders
              </h1>
              <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                Snack Distribution & Wholesale
              </p>
            </div>
          </div>

          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm transition active:scale-95"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* MAIN CENTER CONTENT */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
        
        {/* Dynamic Title */}
        <div className="min-h-[100px] sm:min-h-[120px] flex items-center justify-center">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-3xl transition-all duration-500 drop-shadow-md">
            {snackSlides[currentIndex].title}
          </h2>
        </div>

        {/* Dynamic Subtitle */}
        <p className="mt-4 text-sm sm:text-lg text-slate-300 max-w-xl font-medium leading-relaxed min-h-[60px] drop-shadow-xs">
          {snackSlides[currentIndex].subtitle}
        </p>

        {/* Centered Action Button */}
        <div className="mt-8">
          <button
            onClick={onGetStarted}
            className="group inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm px-9 py-4 rounded-xl shadow-lg hover:shadow-amber-500/20 hover:shadow-xl transition-all transform active:scale-95"
          >
            Get Started
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full py-4 bg-slate-900/60 border-t border-slate-800/60 backdrop-blur-md text-center text-xs text-slate-400 font-medium">
        © Zubair Traders • Snacks Wholesale & Distribution System
      </footer>

    </div>
  );
}