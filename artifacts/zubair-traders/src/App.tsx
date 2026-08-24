import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  ShoppingCart, Users, Package, Truck, Wallet, 
  HandCoins, BarChart2, LayoutDashboard, Loader2, AlertCircle, Inbox, X,
  FileText, BookOpen
} from 'lucide-react';

import { Sales } from './pages/Sales';
import { Buyers } from './pages/Buyers';
import { Products } from './pages/Products';
import { Suppliers } from './pages/Suppliers';
import { Expenses } from './pages/Expenses';
import { Invoices } from './pages/Invoices';
import { Dashboard } from './pages/Dashboard';
import { CustomerLedger } from './pages/CustomerLedger';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

export function money(val: number | string | undefined | null) {
  const num = Number(val) || 0;
  return `Rs. ${num.toLocaleString('en-PK')}`;
}

export function timeDate(val: string | Date | undefined | null) {
  if (!val) return '—';
  return new Date(val).toLocaleString('en-PK', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function shortDate(val: string | Date | undefined | null) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-PK', {
    dateStyle: 'medium',
  });
}

function PageIntro({ eyebrow, title, detail, action }: any) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {eyebrow && <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{eyebrow}</span>}
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone = 'default' }: any) {
  const tones: Record<string, string> = {
    default: 'text-foreground',
    warning: 'text-amber-500',
    accent: 'text-emerald-600',
    destructive: 'text-red-600',
  };

  return (
    <div className="panel rounded-xl p-4 border border-border/80 shadow-xs">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        {Icon && <Icon size={18} className={tones[tone] || tones.default} />}
      </div>
      <div className={`mt-2 font-mono text-2xl font-bold ${tones[tone] || tones.default}`}>
        {value}
      </div>
    </div>
  );
}

function Button({ children, variant = 'default', testId, className = '', ...props }: any) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg text-xs font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none h-10 px-4";
  const variants: Record<string, string> = {
    default: "bg-primary text-primary-foreground shadow hover:opacity-90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  };

  return (
    <button data-testid={testId} className={`${base} ${variants[variant] || variants.default} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Field({ label, name, type = 'text', value, onChange, required, placeholder }: any) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
      {label} {required && <span className="text-destructive">*</span>}
      <input
        data-testid={`input-${name}`}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}

function Modal({ title, eyebrow, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in">
      <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between border-b pb-3">
          <div>
            {eyebrow && <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{eyebrow}</div>}
            <h2 className="text-lg font-bold">{title}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex h-32 items-center justify-center text-muted-foreground">
      <Loader2 size={24} className="animate-spin" />
    </div>
  );
}

function Failed({ onRetry }: any) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-destructive">
      <AlertCircle size={28} />
      <span className="text-sm font-semibold">Failed to load data</span>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

function Empty({ title, detail, action }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 rounded-full bg-muted p-3 text-muted-foreground">
        <Inbox size={24} />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {detail && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{detail}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function MainApp() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedLedgerBuyerId, setSelectedLedgerBuyerId] = useState<string | null>(null);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'invoices', label: 'Records', icon: FileText },
    { id: 'buyers', label: 'Customers', icon: Users },
    { id: 'ledger', label: 'Khata', icon: BookOpen },
    { id: 'products', label: 'Stock', icon: Package },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'expenses', label: 'Expenses', icon: Wallet },
  ];

  const navigateToLedger = (buyerId?: string) => {
    if (buyerId) {
      setSelectedLedgerBuyerId(buyerId);
    }
    setActiveTab('ledger');
  };

  const commonProps = {
    PageIntro,
    Stat,
    Button,
    Field,
    Modal,
    Loading,
    Failed,
    Empty,
    money,
    timeDate,
    shortDate,
    onNavigateToLedger: navigateToLedger,
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
         <div className="flex items-center gap-3">
  <img 
    src="/gemini-svg.svg" 
    alt="Zubair Traders Logo" 
    className="h-10 w-10 object-contain"
  />
  <div>
    <div className="font-bold tracking-tight text-foreground">Zubair Traders</div>
    <div className="text-[10px] font-medium text-muted-foreground">Wholesale & Sales Ledger</div>
  </div>
</div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  data-testid={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <nav className="flex overflow-x-auto border-t border-border/50 px-2 py-1 md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium ${
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeTab === 'dashboard' && <Dashboard {...commonProps} onNavigate={setActiveTab} />}
        {activeTab === 'sales' && <Sales {...commonProps} />}
        {activeTab === 'invoices' && <Invoices {...commonProps} />}
        {activeTab === 'buyers' && <Buyers {...commonProps} />}
        {activeTab === 'ledger' && (
          <CustomerLedger 
            {...commonProps} 
            initialBuyerId={selectedLedgerBuyerId} 
          />
        )}
        {activeTab === 'products' && <Products {...commonProps} />}
        {activeTab === 'suppliers' && <Suppliers {...commonProps} />}
        {activeTab === 'expenses' && <Expenses {...commonProps} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}