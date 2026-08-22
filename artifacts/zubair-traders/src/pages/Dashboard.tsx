import React, { useState } from 'react';
import { Link } from 'wouter';
import { Plus, Banknote, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, FileText, CircleDollarSign, Receipt } from 'lucide-react';
import { useGetDashboard, getGetDashboardQueryKey } from '../hooks/useSupabaseData';

export function Dashboard({ PageIntro, Stat, Loading, Failed, Empty, money }: any) {
  const [filter, setFilter] = useState<string>('this_week');
  const q = useGetDashboard(filter, undefined, { query: { queryKey: getGetDashboardQueryKey() } });

  if (q.isLoading) return <><PageIntro eyebrow="Operations Summary" title="Dashboard" detail="Zubair Traders cash position, sales volume, and quick actions." /><Loading rows={6} /></>;
  if (q.isError) return <><PageIntro eyebrow="Operations Summary" title="Dashboard" detail="Your command view for the day." /><Failed onRetry={() => q.refetch()} /></>;

  const d = q.data;
  const trend = (d?.salesTrend || []).map((p: any) => ({
    label: p.label || p.day || '',
    value: Number(p.value || 0)
  }));
  const max = Math.max(...trend.map((p: any) => p.value), 1);

  // Core metrics matching backend query payload
  const totalSales = d?.totalSales ?? 0;
  const grossProfit = d?.grossProfit ?? 0;
  const expensesLogged = d?.totalExpenses ?? 0;
  const netProfit = d?.netProfit ?? 0;

  const isLoss = netProfit < 0;

  return (
    <div className="animate-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageIntro 
          eyebrow="OPERATIONS SUMMARY" 
          title="Dashboard" 
          detail="Zubair Traders cash position, sales volume, and quick actions." 
          action={<Link href="/sales" data-testid="link-start-sale" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:brightness-110"><Plus size={16} /> Start a sale</Link>} 
        />
        <div className="self-start sm:self-center">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)} 
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
            <option value="all_time">All Time</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="TOTAL SALES" value={money(totalSales)} icon={Banknote} />
        <Stat label="GROSS PROFIT" value={money(grossProfit)} icon={TrendingUp} tone="warning" />
        <Stat label="EXPENSES LOGGED" value={money(expensesLogged)} icon={Wallet} />
        <Stat 
          label={isLoss ? "NET LOSS" : "NET PROFIT"} 
          value={money(netProfit)} 
          icon={isLoss ? ArrowDownRight : ArrowUpRight} 
          tone={isLoss ? "destructive" : "accent"} 
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
        <section className="panel rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div><h3 className="font-bold">Weekly Sales Rhythm</h3><p className="mt-1 text-xs text-muted-foreground">Invoiced revenue over the last 7 days</p></div>
            <div className="rounded-md bg-secondary/30 px-2 py-1 font-mono text-[10px] font-bold text-primary">LAST 7 DAYS</div>
          </div>
          <div className="mt-7 flex h-52 items-end gap-2 sm:gap-5">
            {trend.length ? trend.map((point: any, idx: number) => (
              <div key={point.label || idx} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="relative flex h-40 w-full items-end justify-center">
                  <div className="absolute -top-6 rounded bg-primary px-1.5 py-1 font-mono text-[9px] text-primary-foreground opacity-0 transition group-hover:opacity-100">{money(point.value)}</div>
                  <div className="w-full max-w-10 rounded-t-md bg-primary/80 transition-all duration-500 group-hover:bg-accent" style={{ height: `${Math.max((point.value / max) * 100, 5)}%` }} />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">{point.label}</span>
              </div>
            )) : <div className="w-full"><Empty title="No sales rhythm yet" detail="Your first invoice will give this chart a pulse." /></div>}
          </div>
        </section>

        <section className="panel rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div><h3 className="font-bold">Low stock watch</h3><p className="mt-1 text-xs text-muted-foreground">Restock before running out</p></div>
            <Link href="/products" data-testid="link-view-stock" className="text-xs font-bold text-primary hover:underline">View stock</Link>
          </div>
          <div className="mt-5 grid gap-1">
            {d?.lowStock?.length ? d.lowStock.map((p: any) => (
              <div key={p.id} data-testid={`row-low-stock-${p.id}`} className="flex items-center justify-between rounded-lg px-3 py-3 transition hover:bg-muted">
                <div><div className="text-sm font-bold">{p.name}</div><div className="text-xs text-muted-foreground">Min {p.minStockAlert ?? p.min_stock_alert ?? 0} {p.unit || 'pcs'}</div></div>
                <div className="text-right"><div className="font-mono text-sm font-bold text-destructive">{p.stockQuantity ?? p.stock_quantity ?? 0} {p.unit || 'pcs'}</div><div className="text-[10px] text-muted-foreground">remaining</div></div>
              </div>
            )) : <Empty title="Stock is comfortable" detail="Nothing needs your attention right now." />}
          </div>
        </section>
      </div>

      <section className="panel mt-5 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div><h3 className="font-bold">Recent activity</h3><p className="mt-1 text-xs text-muted-foreground">What moved through the business</p></div>
          <FileText size={18} className="text-muted-foreground" />
        </div>
        <div className="mt-4 grid divide-y divide-border/70">
          {d?.recentActivity?.length ? d.recentActivity.map((a: any) => (
            <div key={a.id} data-testid={`row-activity-${a.id}`} className="flex items-center gap-3 py-3">
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${a.type === 'payment' ? 'bg-secondary text-primary' : 'bg-muted text-muted-foreground'}`}>{a.type === 'payment' ? <CircleDollarSign size={16} /> : <Receipt size={16} />}</div>
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{a.title}</div><div className="truncate text-xs text-muted-foreground">{a.detail}</div></div>
              <div className="shrink-0 font-mono text-[10px] text-muted-foreground">{a.time}</div>
            </div>
          )) : <Empty title="The day is just beginning" detail="Sales, purchases and collections will appear here." />}
        </div>
      </section>
    </div>
  );
}