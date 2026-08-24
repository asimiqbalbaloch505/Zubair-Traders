import React, { useState, useEffect } from 'react';
import { ArrowRight, BookOpen, ShoppingBag, Package, ShieldCheck } from 'lucide-react';

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
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      
      {/* Light Background Image Carousel with High Fade */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {backgroundImages.map((img, idx) => (
          <div
            key={img}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
              idx === currentImageIndex ? 'opacity-[0.07] scale-105' : 'opacity-0 scale-100'
            }`}
            style={{
              backgroundImage: `url('${img}')`,
              transitionProperty: 'opacity, transform',
              transitionDuration: '1200ms',
            }}
          />
        ))}
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-slate-200/50 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Top Navigation */}
      <header className="relative z-10 mx-auto max-w-7xl w-full flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <img
            src="/gemini-svg.svg"
            alt="Zubair Traders Logo"
            className="h-10 w-10 object-contain"
          />
          <div>
            <div className="font-bold tracking-tight text-slate-900 text-base leading-tight">
              Zubair Traders
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Wholesale & Sales Ledger
            </div>
          </div>
        </div>

        <button
          onClick={onGetStarted}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-lg shadow-xs transition active:scale-[0.98]"
        >
          Sign In
        </button>
      </header>

      {/* Hero Body */}
      <main className="relative z-10 mx-auto max-w-4xl w-full px-6 py-12 flex flex-col items-center text-center">
        
        {/* Subtle Status Pill */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1 text-xs font-medium text-slate-600 shadow-2xs backdrop-blur-md">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Verified Wholesale Operating System</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 max-w-2xl leading-tight sm:leading-tight">
          Effortless management for your wholesale business.
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-xs sm:text-sm text-slate-600 max-w-lg leading-relaxed font-normal">
          Keep track of customer Khata balances, daily sales transactions, stock quantities, and printable invoices in one clean dashboard.
        </p>

        {/* Action Button */}
        <div className="mt-8">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-6 py-3 rounded-lg shadow-md transition active:scale-[0.98]"
          >
            Open Management Suite <ArrowRight size={15} />
          </button>
        </div>

        {/* Minimalist Feature Cards */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
          
          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-5 shadow-2xs backdrop-blur-xs transition hover:border-slate-300">
            <div className="mb-3 inline-flex rounded-lg bg-slate-100 p-2.5 text-slate-800">
              <BookOpen size={18} />
            </div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Khata Ledger
            </h2>
            <p className="mt-1 text-[11px] text-slate-500 leading-normal">
              Manage customer balances, dues, and ledger reports effortlessly.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-5 shadow-2xs backdrop-blur-xs transition hover:border-slate-300">
            <div className="mb-3 inline-flex rounded-lg bg-slate-100 p-2.5 text-slate-800">
              <ShoppingBag size={18} />
            </div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Sales Records
            </h2>
            <p className="mt-1 text-[11px] text-slate-500 leading-normal">
              Record daily wholesale orders and instantly generate tax invoices.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-5 shadow-2xs backdrop-blur-xs transition hover:border-slate-300">
            <div className="mb-3 inline-flex rounded-lg bg-slate-100 p-2.5 text-slate-800">
              <Package size={18} />
            </div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Stock Control
            </h2>
            <p className="mt-1 text-[11px] text-slate-500 leading-normal">
              Monitor inventory levels, purchase unit costs, and reorder alerts.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200/70 py-4 text-center text-[11px] font-medium text-slate-400">
        Zubair Traders • Business Management Platform
      </footer>

    </div>
  );
}