import React, { useState, useMemo } from 'react';
import { FileText, Printer, Search, Calendar, X, ArrowDownRight, ArrowUpRight, Banknote, Store } from 'lucide-react';
import { useGetSales, useGetBuyers, useGetBuyerPayments } from '../hooks/useSupabaseData';
import { supabase } from '../lib/supabase';
import { InvoiceModal } from '../components/invoiceModal';

export function CustomerLedger({ PageIntro, Button, Modal, Loading, Failed, Empty, money, timeDate }: any) {
  const sales = useGetSales();
  const buyers = useGetBuyers();
  const payments = useGetBuyerPayments();

  const [selectedBuyerId, setSelectedBuyerId] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null); // Stores either Invoice or Payment object
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date Presets: 'today' | 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'custom' | 'all'
  const [datePreset, setDatePreset] = useState<string>('this_month');
  const [customDate, setCustomDate] = useState<string>('');

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [receiveAmount, setReceiveAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Calculate Base Ledger Metrics per Buyer
  const buyerLedgerData = useMemo(() => {
    if (!buyers.data) return [];

    const salesData = sales.data || [];
    const paymentData = payments.data || [];

    return buyers.data.map((buyer: any) => {
      const buyerId = buyer.id;
      const buyerName = buyer.name || '';

      const buyerSales = salesData.filter(
        (s: any) =>
          String(s.buyer_id || s.buyerId) === String(buyerId) ||
          String(s.buyerName || s.buyer_name).toLowerCase() === buyerName.toLowerCase()
      );

      const buyerPayments = paymentData.filter(
        (p: any) =>
          String(p.buyer_id || p.buyerId) === String(buyerId) ||
          String(p.buyers?.name || p.buyer_name).toLowerCase() === buyerName.toLowerCase()
      );

      const totalInvoiced = buyerSales.reduce(
        (sum: number, s: any) => sum + Number(s.totalAmount ?? s.total_amount ?? 0),
        0
      );

      const initialDownPayments = buyerSales.reduce(
        (sum: number, s: any) => sum + Number(s.paidAmount ?? s.paid_amount ?? 0),
        0
      );

      const directReceipts = buyerPayments.reduce(
        (sum: number, p: any) => sum + Number(p.amount ?? p.paid_amount ?? 0),
        0
      );

      const totalPaid = initialDownPayments + directReceipts;
      const totalUdhaar = Math.max(0, totalInvoiced - totalPaid);

      return {
        ...buyer,
        totalInvoiced,
        totalPaid,
        totalUdhaar,
        invoices: buyerSales,
        payments: buyerPayments,
      };
    });
  }, [buyers.data, sales.data, payments.data]);

  // Selected Active Customer
  const activeBuyer = useMemo(() => {
    if (!selectedBuyerId) return null;
    return buyerLedgerData.find((b: any) => String(b.id) === String(selectedBuyerId)) || null;
  }, [buyerLedgerData, selectedBuyerId]);

  // Date Filtering Helper
  const isDateInFilterRange = (itemDateStr: string) => {
    if (!itemDateStr) return false;
    const itemDate = new Date(itemDateStr);
    const now = new Date();

    if (datePreset === 'today') {
      return itemDate.toDateString() === now.toDateString();
    }

    if (datePreset === 'this_month') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }

    if (datePreset === 'last_month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return (
        itemDate.getMonth() === lastMonth.getMonth() &&
        itemDate.getFullYear() === lastMonth.getFullYear()
      );
    }

    if (datePreset === 'this_year') {
      return itemDate.getFullYear() === now.getFullYear();
    }

    if (datePreset === 'last_year') {
      return itemDate.getFullYear() === now.getFullYear() - 1;
    }

    if (datePreset === 'custom' && customDate) {
      return itemDate.toISOString().split('T')[0] === customDate;
    }

    return true; // 'all' or fallback
  };

  // Filtered Raw Sales & Payments (used for Summary Cards & Table)
  const filteredSales = useMemo(() => {
    const rawSales = activeBuyer ? activeBuyer.invoices : (sales.data || []);
    return rawSales.filter((s: any) => isDateInFilterRange(s.created_at || s.transactionTime || s.transaction_time));
  }, [activeBuyer, sales.data, datePreset, customDate]);

  const filteredPayments = useMemo(() => {
    const rawPayments = activeBuyer ? activeBuyer.payments : (payments.data || []);
    return rawPayments.filter((p: any) => isDateInFilterRange(p.created_at || p.payment_date || p.transactionTime));
  }, [activeBuyer, payments.data, datePreset, customDate]);

  // Dynamically Calculated Metrics based on Customer + Date Filter
  const summaryMetrics = useMemo(() => {
    const totalSales = filteredSales.reduce(
      (sum: number, s: any) => sum + Number(s.totalAmount ?? s.total_amount ?? 0),
      0
    );

    const initialDown = filteredSales.reduce(
      (sum: number, s: any) => sum + Number(s.paidAmount ?? s.paid_amount ?? 0),
      0
    );

    const directReceipts = filteredPayments.reduce(
      (sum: number, p: any) => sum + Number(p.amount ?? p.paid_amount ?? 0),
      0
    );

    const totalCollected = initialDown + directReceipts;
    const totalUdhaar = Math.max(0, totalSales - totalCollected);

    return { totalSales, totalCollected, totalUdhaar };
  }, [filteredSales, filteredPayments]);

  // Combined Merged Transactions
  const transactionsList = useMemo(() => {
    const invs = filteredSales.map((inv: any) => {
      const total = Number(inv.totalAmount ?? inv.total_amount ?? 0);
      const paid = Number(inv.paidAmount ?? inv.paid_amount ?? 0);
      const statusRaw = String(inv.paymentStatus || inv.payment_status || '').toLowerCase();

      let status = 'unpaid';
      if (statusRaw === 'paid' || (total > 0 && paid >= total)) {
        status = 'paid';
      } else if (statusRaw === 'partial' || statusRaw === 'partially_paid' || paid > 0) {
        status = 'partial';
      }

      return {
        id: inv.id,
        type: 'INVOICE',
        refNo: inv.invoiceNumber || inv.invoice_number || inv.id,
        buyerName: inv.buyerName || inv.buyer_name || 'Walk-in Buyer',
        date: inv.created_at || inv.transactionTime || inv.transaction_time,
        amount: total,
        paidAmount: paid,
        dueAmount: Math.max(0, total - paid),
        status,
        raw: inv,
      };
    });

    const pmts = filteredPayments.map((pmt: any) => ({
      id: pmt.id,
      type: 'PAYMENT',
      refNo: pmt.id ? `REC-${pmt.id}` : 'RECEIPT',
      buyerName: pmt.buyers?.name || pmt.buyer_name || activeBuyer?.name || 'Customer',
      date: pmt.created_at || pmt.payment_date || pmt.transactionTime,
      amount: Number(pmt.amount ?? pmt.paid_amount ?? 0),
      paidAmount: Number(pmt.amount ?? pmt.paid_amount ?? 0),
      dueAmount: 0,
      status: 'paid',
      raw: pmt,
    }));

    const merged = [...invs, ...pmts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return merged.filter(
        (item) =>
          String(item.refNo).toLowerCase().includes(q) ||
          String(item.buyerName).toLowerCase().includes(q)
      );
    }

    return merged;
  }, [filteredSales, filteredPayments, activeBuyer, searchQuery]);

  // Open Receive Payment Modal
  const handleOpenReceivePayment = () => {
    if (!activeBuyer) return;
    setReceiveAmount(String(activeBuyer.totalUdhaar || ''));
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  // Submit Payment Received
  const handleReceivePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBuyer || !receiveAmount || Number(receiveAmount) <= 0) return;

    setIsSubmittingPayment(true);
    try {
      const { error } = await supabase.from('buyer_payments').insert([
        {
          buyer_id: activeBuyer.id,
          amount: Number(receiveAmount),
          notes: paymentNotes,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      if (payments.refetch) payments.refetch();
      if (sales.refetch) sales.refetch();
      setIsPaymentModalOpen(false);
    } catch (err) {
      console.error('Failed to submit payment:', err);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  if (buyers.isLoading || sales.isLoading) return <Loading />;
  if (buyers.isError || sales.isError) return <Failed onRetry={() => buyers.refetch()} />;

  return (
    <div className="animate-in space-y-6">
      <PageIntro
        eyebrow="Financial Records"
        title="Customers Khata"
        detail="View customer credit balances, collections history, and itemized invoice details."
      />

      {/* Select Customer Dropdown */}
      <div className="w-full sm:w-80">
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Select Customer
        </label>
        <select
          value={selectedBuyerId}
          onChange={(e) => setSelectedBuyerId(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary font-medium"
        >
          <option value="">All Customers</option>
          {buyerLedgerData.map((b: any) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.phone ? `(${b.phone})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs text-muted-foreground font-semibold">Total Sales</span>
          <div className="mt-1 font-mono text-xl font-bold">{money(summaryMetrics.totalSales)}</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs text-muted-foreground font-semibold">Collected</span>
          <div className="mt-1 font-mono text-xl font-bold text-emerald-600">
            {money(summaryMetrics.totalCollected)}
          </div>
        </div>

        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex flex-col justify-between">
          <div>
            <span className="text-xs text-destructive font-semibold">Udhaar (Balance Due)</span>
            <div className="mt-1 font-mono text-xl font-bold text-destructive">
              {money(summaryMetrics.totalUdhaar)}
            </div>
          </div>

          {activeBuyer && summaryMetrics.totalUdhaar > 0 && (
            <div className="mt-3 pt-2 border-t border-destructive/20">
              <button
                type="button"
                onClick={handleOpenReceivePayment}
                className="w-full py-1.5 px-3 rounded-lg bg-destructive text-destructive-foreground font-semibold text-xs hover:bg-destructive/90 transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Banknote size={14} /> Receive Payment
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      <div className="panel rounded-xl border border-border/80 p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search invoice # or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: 'Today' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'this_year', label: 'This Year' },
              { id: 'last_year', label: 'Last Year' },
              { id: 'all', label: 'All Time' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setDatePreset(preset.id);
                  setCustomDate('');
                }}
                className={`h-8 px-3 rounded-md text-xs font-semibold transition ${
                  datePreset === preset.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 hover:bg-muted text-muted-foreground'
                }`}
              >
                {preset.label}
              </button>
            ))}

            <div className="relative flex items-center ml-1">
              <Calendar size={13} className="absolute left-2.5 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setDatePreset('custom');
                }}
                className={`h-8 rounded-md border text-xs font-semibold pl-8 pr-2 outline-none ${
                  datePreset === 'custom'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-input bg-background text-muted-foreground'
                }`}
              />
              {customDate && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomDate('');
                    setDatePreset('this_month');
                  }}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          {transactionsList.length > 0 ? (
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-3">Invoice #</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Total Amount</th>
                  <th className="pb-3">Paid / Received</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {transactionsList.map((tx: any) => (
                  <tr
                    key={`${tx.type}-${tx.id}`}
                    onClick={() => setSelectedRecord(tx)}
                    className="transition cursor-pointer hover:bg-muted/40"
                  >
                    <td className="py-3 font-mono text-xs font-bold text-foreground">
                      {String(tx.refNo).replace(/^INV-?/i, '')}
                    </td>
                    <td className="py-3 text-xs font-medium">{tx.buyerName}</td>
                    <td className="py-3 text-xs">
                      {tx.type === 'INVOICE' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-blue-800 font-semibold">
                          <ArrowUpRight size={12} /> Invoice
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-emerald-800 font-semibold">
                          <ArrowDownRight size={12} /> Udhaar Payment
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">{timeDate(tx.date)}</td>
                    <td className="py-3 font-mono text-xs font-bold">{money(tx.amount)}</td>
                    <td className="py-3 font-mono text-xs font-semibold text-emerald-700">
                      {money(tx.paidAmount)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          tx.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tx.status === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedRecord(tx)}
                        className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                      >
                        <FileText size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty title="No records found" detail="No transactions match your current search and date parameters." />
          )}
        </div>
      </div>

      {/* Receive Udhaar Payment Modal */}
      {isPaymentModalOpen && activeBuyer && (
        <Modal
          title={`Receive Udhaar Payment`}
          eyebrow={activeBuyer.name}
          onClose={() => setIsPaymentModalOpen(false)}
        >
          <form onSubmit={handleReceivePaymentSubmit} className="space-y-4 text-xs">
            <div className="rounded-lg bg-destructive/10 p-3 border border-destructive/20 flex justify-between items-center">
              <div>
                <div className="text-muted-foreground">Current Udhaar Balance</div>
                <div className="font-mono text-base font-bold text-destructive">
                  {money(activeBuyer.totalUdhaar)}
                </div>
              </div>
              {Number(receiveAmount) > 0 && (
                <div className="text-right">
                  <div className="text-muted-foreground">Remaining Balance</div>
                  <div className="font-mono text-base font-bold text-emerald-600">
                    {money(Math.max(0, activeBuyer.totalUdhaar - Number(receiveAmount)))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-muted-foreground mb-1">Amount Received</label>
              <input
                type="number"
                min="1"
                max={activeBuyer.totalUdhaar}
                step="any"
                required
                placeholder="Enter amount paid by customer"
                value={receiveAmount}
                onChange={(e) => setReceiveAmount(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-muted-foreground mb-1">Notes / Remarks (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Received cash / Bank transfer"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingPayment}>
                {isSubmittingPayment ? 'Saving...' : 'Confirm Received Payment'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Invoice & Payment Receipt Detail Modal (Matching Design Layout) */}
      {/* Invoice & Payment Receipt Detail Modal */}
      {selectedRecord && (
        selectedRecord.type === 'INVOICE' ? (
          <InvoiceModal
            sale={{
              id: selectedRecord.raw?.id || selectedRecord.id,
              invoice_number: selectedRecord.refNo,
              buyer_name: selectedRecord.buyerName,
              transaction_time: selectedRecord.date,
              total_amount: selectedRecord.amount,
              paid_amount: selectedRecord.paidAmount,
              due_amount: selectedRecord.dueAmount,
              payment_status: selectedRecord.status,
              items: selectedRecord.raw?.items || selectedRecord.raw?.sale_items || [],
            }}
            onClose={() => setSelectedRecord(null)}
            money={money}
            timeDate={timeDate}
          />
        ) : (
          <Modal title="" onClose={() => setSelectedRecord(null)}>
            <div className="space-y-5 text-xs printable-invoice p-1">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  PAYMENT RECEIPT
                </span>
                <h3 className="font-mono text-2xl font-black tracking-tight text-foreground">
                  Receipt #{String(selectedRecord.refNo).replace(/^REC-?/i, '')}
                </h3>
              </div>

              <div className="rounded-xl border border-border p-5 space-y-4 relative bg-card shadow-sm">
                <div className="flex items-start justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Store size={20} />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold uppercase tracking-wide text-foreground">ZUBAIR TRADERS</h4>
                      <p className="text-[11px] text-muted-foreground">Bakery & General Traders Management</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded bg-foreground text-background px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                      PAYMENT RECEIPT
                    </span>
                    <div className="mt-1 font-mono text-xs font-bold text-muted-foreground">
                      Rec #: {String(selectedRecord.refNo).replace(/^REC-?/i, '')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">CUSTOMER NAME</span>
                    <span className="font-bold text-foreground text-xs leading-snug">
                      {selectedRecord.buyerName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">TRANSACTION DATE</span>
                    <span className="font-bold text-foreground text-xs leading-snug">
                      {timeDate(selectedRecord.date)}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3 bg-muted/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Payment Note / Method</span>
                  <p className="font-semibold text-foreground text-xs">
                    {selectedRecord.raw?.notes || 'Direct Cash Collection / Udhaar Payment'}
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <div className="w-full sm:w-64 space-y-1.5 rounded-lg border border-border/80 bg-muted/20 p-3">
                    <div className="flex justify-between items-center text-xs font-semibold text-emerald-600">
                      <span>Received Amount:</span>
                      <span className="font-mono font-bold">{money(selectedRecord.paidAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-2 border-t border-border/60">
                  <p className="font-bold text-xs text-foreground">Thank you for your business!</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Zubair Traders • Authorized Computer Generated Receipt</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 print:hidden">
                <Button variant="outline" onClick={() => window.print()} className="gap-1.5">
                  <Printer size={14} /> Print / Save PDF
                </Button>
                <Button onClick={() => setSelectedRecord(null)}>Close</Button>
              </div>
            </div>
          </Modal>
        )
      )}
    </div>
  );
} 