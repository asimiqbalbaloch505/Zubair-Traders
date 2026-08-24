import React, { useState, useEffect } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroProps {
  onGetStarted: () => void;
}

const bakerySlides = [
  {
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
    title: 'Freshly Baked Quality, Wholesale Reliability',
    subtitle: 'Streamline daily wholesale bread, flour, and pastry orders with instant digital ledger invoicing.'
  },
  {
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80',
    title: 'Precision Khata Ledger for Bakery Traders',
    subtitle: 'Track customer balances, credit records, and payment collection receipts in real time.'
  },
  {
    image: 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=1200&q=80',
    title: 'Complete Control Over Bakery Stock & Supplies',
    subtitle: 'Monitor raw ingredient inventory, finished baked goods, and unit production costs effortlessly.'
  }
];

export function Hero({ onGetStarted }: HeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bakerySlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % bakerySlides.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + bakerySlides.length) % bakerySlides.length);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col justify-between">
      
      {/* 1. TOP HEADER (Logo Prominent in Top-Left) */}
      <header className="w-full bg-white border-b border-slate-200/80 px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/gemini-svg.svg"
              alt="Zubair Traders Logo"
              className="h-11 w-11 object-contain"
            />
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                Zubair Traders
              </h1>
              <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">
                Bakery Products & Wholesale
              </p>
            </div>
          </div>

          <button
            onClick={onGetStarted}
            className="hidden sm:inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* 2. MAIN CENTERED HERO CONTENT */}
      <main className="max-w-5xl mx-auto px-6 py-10 flex-1 flex flex-col items-center justify-center text-center">
        
        {/* Dynamic Title */}
        <div className="min-h-[90px] sm:min-h-[110px] flex items-center justify-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-3xl transition-all duration-500">
            {bakerySlides[currentIndex].title}
          </h2>
        </div>

        {/* Dynamic Subtitle */}
        <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-xl font-normal leading-relaxed min-h-[50px]">
          {bakerySlides[currentIndex].subtitle}
        </p>

        {/* Single "Get Started" Button (Fixed spacing, no overlapping) */}
        <div className="mt-6 mb-10">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm px-8 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all transform active:scale-95"
          >
            Get Started
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Crisp Bakery Image Display Box with Controls */}
        <div className="relative w-full max-w-3xl h-[260px] sm:h-[360px] rounded-2xl overflow-hidden border border-slate-200 shadow-xl bg-slate-100">
          {bakerySlides.map((slide, idx) => (
            <div
              key={slide.image}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out ${
                idx === currentIndex ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ backgroundImage: `url('${slide.image}')` }}
            />
          ))}

          {/* Navigation Controls */}
          <button
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 p-2 rounded-full shadow-md backdrop-blur-xs transition"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 p-2 rounded-full shadow-md backdrop-blur-xs transition"
          >
            <ChevronRight size={18} />
          </button>

          {/* Slide Indicator Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/40 px-3 py-1.5 rounded-full backdrop-blur-xs">
            {bakerySlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentIndex ? 'w-6 bg-amber-400' : 'w-2 bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>

      </main>

      {/* 3. FOOTER */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 font-medium">
        © Zubair Traders • Bakery Management & Distribution System
      </footer>

    </div>
  );
}