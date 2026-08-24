import React, { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, TrendingUp, PackageCheck } from 'lucide-react';

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
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-950 text-white">
      {/* Background Image Carousel with Fade Animation */}
      {backgroundImages.map((img, idx) => (
        <div
          key={img}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            idx === currentImageIndex ? 'opacity-40 scale-105' : 'opacity-0 scale-100'
          }`}
          style={{
            backgroundImage: `url('${img}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transitionProperty: 'opacity, transform',
            transitionDuration: '1000ms',
          }}
        />
      ))}

      {/* Dark Overlay Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/80" />

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl px-6 text-center flex flex-col items-center">
        {/* Animated Logo */}
        <div className="mb-6 animate-bounce">
          <img
            src="/gemini-svg.svg"
            alt="Zubair Traders Logo"
            className="h-24 w-24 object-contain drop-shadow-[0_10px_25px_rgba(37,99,235,0.5)]"
          />
        </div>

        <span className="mb-3 inline-block px-3 py-1 bg-blue-600/30 border border-blue-500/40 text-blue-400 text-xs font-semibold uppercase tracking-widest rounded-full backdrop-blur-md">
          Wholesale & Inventory Management
        </span>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-4">
          Zubair Traders
        </h1>

        <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mb-8 leading-relaxed font-light">
          Streamlined sales tracking, digital Khata ledger, inventory stock management, and custom invoicing for modern wholesale operations.
        </p>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-4 max-w-lg w-full mb-10 text-xs font-medium text-slate-300">
          <div className="flex items-center justify-center gap-1.5 bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg backdrop-blur-sm">
            <ShieldCheck size={16} className="text-blue-400" /> Secure Khata
          </div>
          <div className="flex items-center justify-center gap-1.5 bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg backdrop-blur-sm">
            <TrendingUp size={16} className="text-emerald-400" /> Real-time Analytics
          </div>
          <div className="flex items-center justify-center gap-1.5 bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg backdrop-blur-sm">
            <PackageCheck size={16} className="text-amber-400" /> Stock Control
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onGetStarted}
          className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-8 py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          Get Started
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}