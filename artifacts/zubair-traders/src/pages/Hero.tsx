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
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 font-sans select-none flex flex-col justify-between p-6 sm:p-12">
      
      {/* Bakery Background Image Carousel */}
      <div className="absolute inset-0 pointer-events-none">
        {bakerySlides.map((slide, idx) => (
          <div
            key={slide.image}
            className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out ${
              idx === currentIndex ? 'opacity-70 scale-100' : 'opacity-0 scale-105'
            }`}
            style={{
              backgroundImage: `url('${slide.image}')`,
            }}
          />
        ))}

        {/* Ambient Dark Overlays to enhance text readability */}
        <div className="absolute inset-0 bg-slate-950/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/70" />
      </div>

      {/* Top Left: Prominent Standalone Logo & Name (No Card Box) */}
      <header className="relative z-10 flex items-center gap-4">
        <div className="relative flex items-center justify-center">
          {/* Subtle Ambient Backlight Effect */}
          <div className="absolute h-16 w-16 bg-amber-500/20 rounded-full blur-xl pointer-events-none" />
          <img
            src="/gemini-svg.svg"
            alt="Zubair Traders Logo"
            className="h-14 w-14 sm:h-16 sm:w-16 object-contain drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-transform hover:scale-105"
          />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide leading-tight drop-shadow-md">
            Zubair Traders
          </h1>
          <p className="text-xs font-semibold text-amber-400 tracking-widest uppercase drop-shadow-sm">
            Bakery Products & Wholesale
          </p>
        </div>
      </header>

      {/* Center: Dynamic Animated Catchy Lines & Centered Button */}
      <main className="relative z-10 my-auto flex flex-col items-center justify-center text-center max-w-3xl mx-auto py-12">
        
        {/* Animated Titles */}
        <div className="relative w-full min-h-[160px] sm:min-h-[180px] flex items-center justify-center">
          {bakerySlides.map((slide, idx) => (
            <div
              key={slide.title}
              className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
                idx === currentIndex
                  ? 'opacity-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 translate-y-4 pointer-events-none'
              }`}
            >
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-lg max-w-2xl">
                {slide.title}
              </h2>
              <p className="mt-4 text-sm sm:text-base text-slate-200 font-medium leading-relaxed max-w-xl drop-shadow-md">
                {slide.subtitle}
              </p>
            </div>
          ))}
        </div>

        {/* Centered Action Button */}
        <div className="mt-8">
          <button
            onClick={onGetStarted}
            className="group inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm px-9 py-4 rounded-xl shadow-2xl shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Get Started
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-slate-400 font-medium">
        © Zubair Traders • Bakery Management & Distribution
      </footer>

    </div>
  );
}