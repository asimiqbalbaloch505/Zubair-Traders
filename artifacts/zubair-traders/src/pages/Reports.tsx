import React, { useState } from 'react';
import { Printer, TrendingUp, TrendingDown, DollarSign, BarChart2 } from 'lucide-react';
import { 
  useGetSales, getGetSalesQueryKey,
  useGetExpenses, getGetExpensesQueryKey,
  useGetBuyers, getGetBuyersQueryKey,
  useGetSuppliers, getGetSuppliersQueryKey
} from '../hooks/useSupabaseData';

export function Reports({ PageIntro, Button, Loading, Failed, Empty, money }: any) {
  const sales = useGetSales({ query: { queryKey: getGetSalesQueryKey() } });
  const expenses = useGetExpenses({ query: { queryKey: getGetExpensesQueryKey() } });
  const buyers = useGetBuyers({ query: { queryKey: getGetBuyersQueryKey() } });
  const suppliers = useGetSuppliers({ query: { queryKey: getGetSuppliersQueryKey() } });

  const isLoading = sales.isLoading || expenses.isLoading || buyers.isLoading || suppliers.isLoading;
  const isError = sales.isError || expenses.isError || buyers.isError || suppliers.isError;

  const totalSalesVolume = sales.data?.reduce((sum: number, s: any) => sum + Number(s.totalAmount || 0), 0) || 0;
  const totalCashCollected = sales.data?.reduce((sum: number, s: any) => sum + Number(s.paidAmount || 0), 0) || 0;
  const totalExpenses = expenses.data?.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0) || 0;
  
  const totalBuyerUdhaar = buyers.data?.reduce((sum: number, b: any) => sum + Number(b.currentBalance || 0), 0) || 0;
  const totalSupplierPayable = suppliers.data?.reduce((sum: number, s: any) => sum + Number(s.currentBalance || 0), 0) || 0;

  const estimatedProfit = totalCashCollected - totalExpenses;

  if (isLoading) return <Loading />;
  if (isError) return <Failed />;

  return (
    <div className="animate-in space-y-5">
      <PageIntro 
        eyebrow="Financial Health & Analytics" 
        title="Reports & Summary" 
        detail="A high-level view of your sales revenue, cash inflow, overhead costs, and net drawer balance." 
        action={
          <Button onClick={() => window.print()} testId="button-print-reports">
            <Printer size={16} /> Print financial report
          </Button>
        } 
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel rounded-xl p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase">Total Invoiced</span>
            <BarChart2 size={18} />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold">{money(totalSalesVolume)}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">{sales.data?.length || 0} invoices total</p>
        </div>

        <div className="panel rounded-xl p-4">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase">Cash Inflow</span>
            <TrendingUp size={18} />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-emerald-700">{money(totalCashCollected)}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Collected from sales</p>
        </div>

        <div className="panel rounded-xl p-4">
          <div className="flex items-center justify-between text-destructive">
            <span className="text-xs font-bold uppercase">Expenses</span>
            <TrendingDown size={18} />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-destructive">{money(totalExpenses)}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Floor & operating overhead</p>
        </div>

        <div className="panel rounded-xl p-4">
          <div className="flex items-center justify-between text-primary">
            <span className="text-xs font-bold uppercase">Net Cash Position</span>
            <DollarSign size={18} />
          </div>
          <div className={`mt-2 font-mono text-2xl font-bold ${estimatedProfit >= 0 ? 'text-emerald-700' : 'text-destructive'}`}>
            {money(estimatedProfit)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Collected cash minus expenses</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel rounded-xl p-5">
          <h3 className="font-bold">Ledger Balance Summary</h3>
          <p className="text-xs text-muted-foreground">Outstanding balances across receivables and payables</p>

          <div className="mt-4 divide-y rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between p-3 text-sm">
              <div>
                <div className="font-semibold">Buyer Receivables (Udhaar)</div>
                <div className="text-xs text-muted-foreground">Money owed to Zubair Traders by customers</div>
              </div>
              <div className="font-mono text-base font-bold text-accent">
                {money(totalBuyerUdhaar)}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 text-sm">
              <div>
                <div className="font-semibold">Supplier Payables</div>
                <div className="text-xs text-muted-foreground">Money Zubair Traders owes to suppliers</div>
              </div>
              <div className="font-mono text-base font-bold text-amber-600">
                {money(totalSupplierPayable)}
              </div>
            </div>
          </div>
        </section>

        <section className="panel rounded-xl p-5">
          <h3 className="font-bold">Performance Ratio</h3>
          <p className="text-xs text-muted-foreground">Cash realization against invoiced sales</p>

          <div className="mt-6 space-y-4">
            <div>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="font-semibold">Collection Rate</span>
                <span className="font-mono font-bold">
                  {totalSalesVolume > 0 ? Math.round((totalCashCollected / totalSalesVolume) * 100) : 0}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div 
                  className="h-full bg-emerald-600 transition-all duration-500" 
                  style={{ width: `${totalSalesVolume > 0 ? Math.min(Math.round((totalCashCollected / totalSalesVolume) * 100), 100) : 0}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Tip:</strong> A collection rate above 80% indicates strong cash flow sustainability for raw inventory purchasing.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}