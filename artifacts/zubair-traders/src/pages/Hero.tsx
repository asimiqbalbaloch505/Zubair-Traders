import React, { useState, useEffect } from 'react';
import { ArrowRight, BookOpen, ShieldCheck, TrendingUp, Package, ArrowUpRight } from 'lucide-react';

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
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Background Image Carousel with Ultra-Subtle Blend */}
      <div className="absolute inset-0 pointer-events-none">
        {backgroundImages.map((img, idx) => (
          <div
            key={img}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
              idx === currentImageIndex ? 'opacity-20 scale-105' : 'opacity-0 scale-100'
            }`}
            style={{
              backgroundImage: `url('${img}')`,
              transitionProperty: 'opacity, transform',
              transitionDuration: '1200ms',
            }}
          />
        ))}
        {/* Soft Radial Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 mx-auto max-w-7xl w-full flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <img
            src="/gemini-svg.svg"
            alt="Zubair Traders Logo"
            className="h-9 w-9 object-contain"
          />
          <div>
            <div className="font-bold tracking-tight text-white text-sm sm:text-base">
              Zubair Traders
            </div>
            <div className="text-[10px] font-medium text-slate-400">
              Management Suite
            </div>
          </div>
        </div>

        <button
          onClick={onGetStarted}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 px-3.5 py-2 rounded-lg transition shadow-xs"
        >
          Sign In <ArrowUpRight size={14} />
        </button>
      </header>

      {/* Main Hero Content */}
      <main className="relative z-10 mx-auto max-w-4xl w-full px-6 py-12 flex flex-col items-center text-center">
        
        {/* Logo Badge */}
        <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-slate-800 bg-slate-900/90 px-4 py-1.5 text-xs font-medium text-slate-300 shadow-inner backdrop-blur-md">
          <img
            src="/gemini-svg.svg"
            alt="Logo"
            className="h-4 w-4 object-contain"
          />
          <span>Wholesale & Enterprise ERP</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-2xl leading-tight">
          Precision management for modern wholesale operations.
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
          Manage sales workflows, maintain digital customer ledger records, track inventory stock, and process invoices from a single dashboard.
        </p>

        {/* Primary CTA */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-6 py-3 rounded-lg shadow-sm transition active:scale-[0.98]"
          >
            Access Workspace <ArrowRight size={15} />
          </button>
        </div>

        {/* Structured Dashboard Capability Cards */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
          
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-md">
            <div className="mb-2 inline-flex rounded-md bg-blue-500/10 p-2 text-blue-400">
              <BookOpen size={18} />
            </div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Khata Ledger
            </h2>
            <p className="mt-1 text-[11px] text-slate-400 leading-normal">
              Track customer dues, pending balances, and instant ledger statement receipts.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-md">
            <div className="mb-2 inline-flex rounded-md bg-emerald-500/10 p-2 text-emerald-400">
              <TrendingUp size={18} />
            </div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Sales Records
            </h2>
            <p className="mt-1 text-[11px] text-slate-400 leading-normal">
              Record daily wholesale transactions and automatically generate tax invoices.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-md">
            <div className="mb-2 inline-flex rounded-md bg-amber-500/10 p-2 text-amber-400">
              <Package size={18} />
            </div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Stock Inventory
            </h2>
            <p className="mt-1 text-[11px] text-slate-400 leading-normal">
              Monitor product quantities, purchase unit prices, and stock reorder levels.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 py-4 text-center text-[11px] text-slate-500">
        Zubair Traders • Business Operations Engine
      </footer>

    </div>
  );
}