import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  ShoppingCart, Users, Package, Truck, Wallet, 
  HandCoins, BarChart2, LayoutDashboard, Loader2, AlertCircle, Inbox, X,
  TrendingUp, TrendingDown
} from 'lucide-react';

import { Sales } from './pages/Sales';
import { Buyers } from './pages/Buyers';
import { Products } from './pages/Products';
import { Suppliers } from './pages/Suppliers';
import { Expenses } from './pages/Expenses';
import { Loans } from './pages/Loans';
import { Reports } from './pages/Reports';
import { useGetDashboard, getGetDashboardQueryKey } from './hooks/useSupabaseData';

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

function DashboardOverview({ money, navigate }: any) {
  const [filter, setFilter] = useState<string>('this_month');
  const [customMonth, setCustomMonth] = useState<string>('');

  const dash = useGetDashboard(filter, customMonth);

  if (dash.isLoading) return <Loading />;
  if (dash.isError) return <Failed onRetry={() => dash.refetch()} />;

  const data = dash.data || {};
  const netProfit = Number(data.netProfit || 0);
  const isProfitable = netProfit >= 0;
  const trend = data.salesTrend || [];
  const maxTrendValue = Math.max(...trend.map((p: any) => p.value), 1000);

  return (
    <div className="space-y-6 animate-in">
      {/* Header & Date Filter Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageIntro 
          eyebrow="Operations summary" 
          title="Dashboard" 
          detail="Zubair Traders cash position, sales volume, and quick actions." 
        />

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground outline-none focus:border-primary shadow-xs"
          >
            <option value="this_month">This Month (Default)</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
            <option value="all_time">All Time</option>
            <option value="custom_month">Select Specific Month...</option>
          </select>

          {filter === 'custom_month' && (
            <input
              type="month"
              value={customMonth}
              onChange={(e) => setCustomMonth(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground outline-none focus:border-primary"
            />
          )}
        </div>
      </div>

      {/* 5-Metric Executive Overview Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="panel cursor-pointer rounded-xl p-4 transition hover:border-primary/50" onClick={() => navigate('sales')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-muted-foreground">Total Sales</span>
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold">{money(data.totalSales || 0)}</div>
        </div>

        <div className="panel cursor-pointer rounded-xl p-4 transition hover:border-primary/50" onClick={() => navigate('buyers')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-muted-foreground">Buyer Receivables</span>
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-amber-600">{money(data.totalBuyerReceivables || 0)}</div>
        </div>

        <div className="panel cursor-pointer rounded-xl p-4 transition hover:border-primary/50" onClick={() => navigate('suppliers')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-muted-foreground">Supplier Payables</span>
            <span className="h-2 w-2 rounded-full bg-purple-500"></span>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-purple-600">{money(data.totalSupplierPayables || 0)}</div>
        </div>

        <div className="panel cursor-pointer rounded-xl p-4 transition hover:border-primary/50" onClick={() => navigate('expenses')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-muted-foreground">Expenses Logged</span>
            <span className="h-2 w-2 rounded-full bg-orange-500"></span>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-orange-600">{money(data.totalExpenses || 0)}</div>
        </div>

        {/* Dynamic Profit / Loss Metric */}
        <div className={`panel rounded-xl p-4 transition border ${isProfitable ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-muted-foreground">
              {isProfitable ? 'Net Profit' : 'Net Loss'}
            </span>
            {isProfitable ? (
              <TrendingUp size={18} className="text-emerald-600" />
            ) : (
              <TrendingDown size={18} className="text-red-600" />
            )}
          </div>
          <div className={`mt-2 font-mono text-2xl font-bold ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
            {isProfitable ? `+${money(netProfit)}` : `-${money(Math.abs(netProfit))}`}
          </div>
        </div>
      </div>

      {/* Weekly Sales Rhythm Bar Chart */}
      <div className="panel rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold">Weekly Sales Rhythm</h3>
            <p className="mt-1 text-xs text-muted-foreground">Invoiced revenue over the last 7 days</p>
          </div>
          <div className="rounded-md bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-bold text-primary">
            LAST 7 DAYS
          </div>
        </div>

        <div className="mt-8 flex h-52 items-end gap-2 sm:gap-4 border-b border-border/60 pb-2">
          {trend.length ? (
            trend.map((point: any) => {
              const heightPercent = Math.max((point.value / maxTrendValue) * 100, 4);
              return (
                <div key={point.day} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-40 w-full items-end justify-center">
                    <div className="absolute -top-7 rounded bg-foreground px-2 py-1 font-mono text-[10px] text-background opacity-0 transition-all group-hover:opacity-100 z-10 shadow-lg pointer-events-none">
                      {money(point.value)}
                    </div>
                    <div 
                      className="w-full max-w-[36px] rounded-t-md bg-primary/80 transition-all duration-300 group-hover:bg-primary" 
                      style={{ height: `${heightPercent}%` }} 
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-[11px] font-bold text-foreground">{point.day}</span>
                    <span className="text-[9px] text-muted-foreground">{point.date}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="w-full">
              <Empty title="No weekly sales data available" detail="Create invoices to see your 7-day trend chart." />
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="panel rounded-xl p-5">
        <h3 className="font-bold">Quick Actions</h3>
        <p className="mb-4 text-xs text-muted-foreground">Jump directly to common tasks</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('sales')} testId="nav-action-new-sale">
            <ShoppingCart size={16} /> New Sale Invoice
          </Button>
          <Button variant="outline" onClick={() => navigate('buyers')} testId="nav-action-add-buyer">
            <Users size={16} /> Manage Buyers
          </Button>
          <Button variant="outline" onClick={() => navigate('products')} testId="nav-action-products">
            <Package size={16} /> Inventory Catalog
          </Button>
        </div>
      </div>
    </div>
  );
}

function MainApp() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'buyers', label: 'Buyers', icon: Users },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'expenses', label: 'Expenses', icon: Wallet },
    { id: 'loans', label: 'Loans', icon: HandCoins },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
  ];

  const commonProps = {
    PageIntro,
    Button,
    Field,
    Modal,
    Loading,
    Failed,
    Empty,
    money,
    timeDate,
    shortDate,
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-mono font-bold text-primary-foreground">
              ZT
            </div>
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
        {activeTab === 'dashboard' && <DashboardOverview money={money} navigate={setActiveTab} />}
        {activeTab === 'sales' && <Sales {...commonProps} />}
        {activeTab === 'buyers' && <Buyers {...commonProps} />}
        {activeTab === 'products' && <Products {...commonProps} />}
        {activeTab === 'suppliers' && <Suppliers {...commonProps} />}
        {activeTab === 'expenses' && <Expenses {...commonProps} />}
        {activeTab === 'loans' && <Loans {...commonProps} />}
        {activeTab === 'reports' && <Reports {...commonProps} />}
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