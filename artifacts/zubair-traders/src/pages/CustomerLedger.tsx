import React, { useState, useMemo, useEffect } from 'react';
import { Search, Calendar, HandCoins, FileText, ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { useGetBuyers, useGetBuyerPayments, useGetSales, useCollectBuyerPayment, getGetBuyersQueryKey } from '../hooks/useSupabaseData';
import { useQueryClient } from '@tanstack/react-query';

export function CustomerLedger({ 
  PageIntro, 
  Button, 
  Field, 
  Modal, 
  Loading, 
  Failed, 
  Empty, 
  money, 
  timeDate, 
  initialBuyerId 
}: any) {
  const buyersQuery = useGetBuyers();
  const salesQuery = useGetSales();
  const qc = useQueryClient();

  const buyers = buyersQuery.data || [];
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>(initialBuyerId || '');
  const [activeTab, setActiveTab] = useState<'all' | 'invoices' | 'payments'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Collect Payment Modal
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', notes: 'Udhaar Payment Collected', paymentMethod: 'Cash' });
  const collectPayment = useCollectBuyerPayment();

  // Set selected buyer when initialBuyerId changes or when buyers load
  useEffect(() => {
    if (initialBuyerId) {
      setSelectedBuyerId(initialBuyerId);
    } else if (buyers.length > 0 && !selectedBuyerId) {
      setSelectedBuyerId(buyers[0].id);
    }
  }, [buyers, selectedBuyerId, initialBuyerId]);

  const currentBuyer = useMemo(() => {
    return buyers.find((b: any) => b.id === selectedBuyerId) || null;
  }, [buyers, selectedBuyerId]);

  // Fetch payments for selected buyer
  const paymentsQuery = useGetBuyerPayments(selectedBuyerId);

  // Filter buyer sales
  const buyerInvoices = useMemo(() => {
    if (!currentBuyer || !salesQuery.data) return [];
    return salesQuery.data.filter((s: any) => s.buyer_id === currentBuyer.id || s.buyerName === currentBuyer.name);
  }, [currentBuyer, salesQuery.data]);

  const buyerPayments = paymentsQuery.data || [];

  // Combine invoices and payments into a single timeline
  const combinedLedger = useMemo(() => {
    const invoices = buyerInvoices.map((inv: any) => ({
      id: inv.id,
      type: 'invoice',
      refNo: inv.invoiceNumber || inv.invoice_number || inv.id,
      date: inv.created_at || inv.transactionTime,
      amount: Number(inv.totalAmount ?? inv.total_amount ?? 0),
      status: inv.paymentStatus || inv.payment_status || 'unpaid',
      details: `${inv.items?.length || 0} line items`,
      raw: inv
    }));

    const collections = buyerPayments.map((p: any) => ({
      id: p.id,
      type: 'payment',
      refNo: `REC-${p.id}`,
      date: p.created_at,
      amount: Number(p.amount ?? 0),
      status: 'collected',
      details: p.notes || p.payment_method || 'Cash Payment',
      raw: p
    }));

    let merged = [];
    if (activeTab === 'invoices') merged = invoices;
    else if (activeTab === 'payments') merged = collections;
    else merged = [...invoices, ...collections];

    // Sort by Date descending
    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply filters
    return merged.filter((item) => {
      if (dateFilter) {
        const itemDate = new Date(item.date).toISOString().split('T')[0];
        if (itemDate !== dateFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return String(item.refNo).toLowerCase().includes(q) || item.details.toLowerCase().includes(q);
      }
      return true;
    });
  }, [buyerInvoices, buyerPayments, activeTab, dateFilter, searchQuery]);

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBuyer || !paymentForm.amount) return;

    collectPayment.mutate(
      {
        buyerId: currentBuyer.id,
        amount: Number(paymentForm.amount),
        notes: paymentForm.notes,
        paymentMethod: paymentForm.paymentMethod,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetBuyersQueryKey() });
          paymentsQuery.refetch();
          setPaymentModal(false);
          setPaymentForm({ amount: '', notes: 'Udhaar Payment Collected', paymentMethod: 'Cash' });
        },
      }
    );
  };

  const isLoading = buyersQuery.isLoading || salesQuery.isLoading || paymentsQuery.isLoading;

  return (
    <div className="animate-in space-y-6">
      <PageIntro
        eyebrow="Account Statements"
        title="Customer Ledger Directory"
        detail="Complete statement of invoices, payment receipts, and outstanding balances."
      />

      {/* Customer Selection & Summary Card */}
      <div className="panel rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div className="flex-1 max-w-md">
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Select Customer</label>
            <select
              value={selectedBuyerId}
              onChange={(e) => setSelectedBuyerId(e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-semibold outline-none focus:border-primary"
            >
              {buyers.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.phone || 'No Phone'})
                </option>
              ))}
            </select>
          </div>

          {currentBuyer && (
            <Button onClick={() => setPaymentModal(true)} testId="button-collect-ledger">
              <HandCoins size={16} /> Collect Payment
            </Button>
          )}
        </div>

        {currentBuyer && (() => {
          // Calculate down payments made at the time of invoice creation
          const invoiceDownPayments = buyerInvoices.reduce((acc: number, i: any) => {
            return acc + Number(i.paidAmount ?? i.paid_amount ?? 0);
          }, 0);

          // Calculate direct payment collections
          const directCollections = buyerPayments.reduce((acc: number, p: any) => {
            return acc + Number(p.amount ?? 0);
          }, 0);

          const totalInvoiced = buyerInvoices.reduce((acc: number, i: any) => acc + Number(i.totalAmount ?? i.total_amount ?? 0), 0);
          const totalCollected = invoiceDownPayments + directCollections;

          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="rounded-lg bg-muted/50 p-4 border border-border">
                <div className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                  <FileText size={14} /> Total Invoiced
                </div>
                <div className="mt-2 text-xl font-bold font-mono">
                  {money(totalInvoiced)}
                </div>
              </div>

              <div className="rounded-lg bg-emerald-500/10 p-4 border border-emerald-500/20">
                <div className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <ArrowDownLeft size={14} /> Total Collected
                </div>
                <div className="mt-2 text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {money(totalCollected)}
                </div>
              </div>

              <div className="rounded-lg bg-accent/10 p-4 border border-accent/20">
                <div className="text-xs font-semibold uppercase text-accent flex items-center gap-1.5">
                  <Wallet size={14} /> Current Udhaar Due
                </div>
                <div className="mt-2 text-xl font-bold font-mono text-accent">
                  {money(currentBuyer.currentBalance ?? currentBuyer.current_balance ?? 0)}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Filter and Ledger Table */}
      <div className="panel rounded-xl p-5">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                activeTab === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              All Activity
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                activeTab === 'invoices' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Invoices Only
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                activeTab === 'payments' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Collections Only
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search ref # or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-xs outline-none focus:border-primary"
              />
            </div>

            <div className="relative flex items-center">
              <Calendar size={14} className="absolute left-2.5 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background pl-8 pr-3 text-xs outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <Loading />
        ) : combinedLedger.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-3">Transaction Date</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Reference #</th>
                  <th className="pb-3">Description / Details</th>
                  <th className="pb-3 text-right">Debit (Billed)</th>
                  <th className="pb-3 text-right">Credit (Paid)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {combinedLedger.map((row: any) => (
                  <tr key={`${row.type}-${row.id}`} className="hover:bg-muted/30">
                    <td className="py-3 text-xs text-muted-foreground">{timeDate(row.date)}</td>
                    <td className="py-3 text-xs">
                      {row.type === 'invoice' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-600">
                          <ArrowUpRight size={12} /> Invoice
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600">
                          <ArrowDownLeft size={12} /> Payment
                        </span>
                      )}
                    </td>
                    <td className="py-3 font-mono text-xs font-bold">{row.refNo}</td>
                    <td className="py-3 text-xs text-muted-foreground">{row.details}</td>
                    <td className="py-3 text-right font-mono text-xs font-semibold">
                      {row.type === 'invoice' ? money(row.amount) : '-'}
                    </td>
                    <td className="py-3 text-right font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {row.type === 'payment' ? `+ ${money(row.amount)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No ledger records found" detail="Select another customer or clear your applied filters." />
        )}
      </div>

      {/* Collect Payment Modal */}
      {paymentModal && currentBuyer && (
        <Modal
          title={`Collect Payment - ${currentBuyer.name}`}
          eyebrow="Udhaar Collection Entry"
          onClose={() => setPaymentModal(false)}
        >
          <form onSubmit={submitPayment} className="grid gap-3">
            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="text-xs text-muted-foreground">Current Udhaar Balance</div>
              <div className="text-lg font-bold text-accent font-mono">
                {money(currentBuyer.currentBalance ?? currentBuyer.current_balance ?? 0)}
              </div>
            </div>

            <Field
              label="Amount Received (PKR)"
              name="payment-amount"
              type="number"
              value={paymentForm.amount}
              onChange={(v: string) => setPaymentForm({ ...paymentForm, amount: v })}
              required
            />

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Payment Method</label>
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <Field
              label="Notes / Reference"
              name="payment-notes"
              value={paymentForm.notes}
              onChange={(v: string) => setPaymentForm({ ...paymentForm, notes: v })}
            />

            <Button type="submit" disabled={collectPayment.isPending || !paymentForm.amount} testId="button-submit-payment">
              {collectPayment.isPending ? 'Processing…' : 'Confirm Payment'}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}