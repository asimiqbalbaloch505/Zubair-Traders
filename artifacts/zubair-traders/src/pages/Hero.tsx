import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

interface HeroProps {
  onGetStarted: () => void;
}

const bakerySlides = [
  {
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1920&q=80',
    title: 'Freshly Baked Quality, Wholesale Reliability.',
    subtitle: 'Streamline daily wholesale bread, flour, and pastry orders with instant digital ledger invoicing.'
  },
  {
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1920&q=80',
    title: 'Precision Khata Ledger for Bakery Traders.',
    subtitle: 'Track customer balances, credit records, and payment collection receipts in real time.'
  },
  {
    image: 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=1920&q=80',
    title: 'Complete Control Over Bakery Stock & Supplies.',
    subtitle: 'Monitor raw ingredient inventory, finished baked goods, and unit production costs effortlessly.'
  }
];

export function Hero({ onGetStarted }: HeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bakerySlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 font-sans select-none">
      
      {/* Background Image Carousel (Bakery Photos) */}
      <div className="absolute inset-0 pointer-events-none">
        {bakerySlides.map((slide, idx) => (
          <div
            key={slide.image}
            className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out ${
              idx === currentIndex ? 'opacity-75 scale-100' : 'opacity-0 scale-105'
            }`}
            style={{
              backgroundImage: `url('${slide.image}')`,
            }}
          />
        ))}

        {/* Dual Gradient Overlays to preserve text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40" />
      </div>

      {/* Main Container - Aligned Top-Left */}
      <div className="relative z-10 flex min-h-screen flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-4xl">
        
        <div className="space-y-8">
          
          {/* Prominent Logo & Brand Section */}
          <div className="inline-flex items-center gap-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 p-3.5 pr-6 backdrop-blur-md shadow-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-inner">
              <img
                src="/gemini-svg.svg"
                alt="Zubair Traders Logo"
                className="h-10 w-10 object-contain drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]"
              />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">
                Zubair Traders
              </h2>
              <p className="text-xs font-semibold text-amber-400/90 uppercase tracking-wider">
                Bakery Products & Wholesale
              </p>
            </div>
          </div>

          {/* Dynamic Catchy Title & Subtitle */}
          <div className="relative min-h-[180px] sm:min-h-[200px] flex flex-col justify-center">
            {bakerySlides.map((slide, idx) => (
              <div
                key={slide.title}
                className={`absolute left-0 top-0 w-full transition-all duration-700 ease-in-out ${
                  idx === currentIndex
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
              >
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md max-w-2xl">
                  {slide.title}
                </h1>
                <p className="mt-4 text-sm sm:text-lg text-slate-200 font-normal leading-relaxed max-w-xl drop-shadow-xs">
                  {slide.subtitle}
                </p>
              </div>
            ))}
          </div>

          {/* Get Started Button */}
          <div>
            <button
              onClick={onGetStarted}
              className="group inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm px-8 py-4 rounded-xl shadow-xl shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Get Started
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>

        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-400 font-medium pt-8">
          © Zubair Traders • Bakery Management & Distribution
        </div>

      </div>

    </div>
  );
}