import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

interface HeroProps {
  onGetStarted: () => void;
}

const backgroundImages = [
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=1920&q=80',
];

export function Hero({ onGetStarted }: HeroProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 font-sans">
      
      {/* Background Image Carousel with Smooth Fade & Scale Transition */}
      <div className="absolute inset-0 pointer-events-none">
        {backgroundImages.map((img, idx) => (
          <div
            key={img}
            className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out ${
              idx === currentImageIndex ? 'opacity-80 scale-100' : 'opacity-0 scale-105'
            }`}
            style={{
              backgroundImage: `url('${img}')`,
            }}
          />
        ))}

        {/* Gradient Overlay: Deep slate-blue tint keeping background images clear */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40" />
      </div>

      {/* Main Content Container - Aligned to Top Left */}
      <div className="relative z-10 flex min-h-screen flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-4xl">
        
        {/* Top-Left Section: Logo + Catchy Headline */}
        <div className="space-y-6">
          
          {/* Brand Header */}
          <div className="inline-flex items-center gap-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/60 px-4 py-2.5 backdrop-blur-md shadow-xl">
            <img
              src="/gemini-svg.svg"
              alt="Zubair Traders Logo"
              className="h-10 w-10 object-contain shrink-0"
            />
            <div>
              <h2 className="text-base font-bold text-white tracking-wide leading-tight">
                Zubair Traders
              </h2>
              <p className="text-[11px] font-medium text-slate-300">
                Wholesale & Ledger Management
              </p>
            </div>
          </div>

          {/* Catchy Lines */}
          <div className="space-y-3 max-w-2xl">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
              Powering Modern Wholesale with Precision.
            </h1>
            <p className="text-sm sm:text-lg text-slate-200 font-normal leading-relaxed max-w-xl drop-shadow-sm">
              Smart sales tracking, instant customer Khata ledgers, stock management, and custom invoices—built for performance.
            </p>
          </div>

          {/* Single Action Button */}
          <div className="pt-2">
            <button
              onClick={onGetStarted}
              className="group inline-flex items-center gap-2.5 bg-slate-100 hover:bg-white text-slate-950 font-bold text-sm px-7 py-3.5 rounded-xl shadow-2xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Get Started
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1 text-slate-950" />
            </button>
          </div>

        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-300 font-medium pt-8">
          © Zubair Traders • Enterprise Operations
        </div>

      </div>

    </div>
  );
}