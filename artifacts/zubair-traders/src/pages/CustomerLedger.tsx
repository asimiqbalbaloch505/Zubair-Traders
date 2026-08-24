import React, { useState, useMemo } from 'react';
import { Search, Filter, Calendar, FileText, Printer, Building2, UserCheck, CreditCard, Banknote, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import { useGetBuyers, useGetSales, useGetBuyerPayments } from '../hooks/useSupabaseData';
import { supabase } from '../lib/supabase';

// Inline Invoice Modal Component to prevent missing import errors
function InvoiceModal({ selectedInvoice, onClose, Modal, Button, money, timeDate }: any) {
  if (!selectedInvoice) return null;

  return (
    <Modal title="Invoice Details" eyebrow={selectedInvoice.invoiceNumber || selectedInvoice.id} onClose={onClose}>
      <div className="space-y-4 text-xs">
        <div className="flex justify-between border-b pb-2">
          <div>
            <p className="font-semibold text-muted-foreground">Customer</p>
            <p className="font-bold text-sm">{selectedInvoice.buyerName || selectedInvoice.buyer_name || 'Walk-in Buyer'}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-muted-foreground">Date</p>
            <p className="font-medium">{timeDate(selectedInvoice.created_at || selectedInvoice.transactionTime)}</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between py-1">
            <span>Total Amount:</span>
            <span className="font-mono font-bold">{money(selectedInvoice.totalAmount ?? selectedInvoice.total_amount ?? 0)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Amount Paid:</span>
            <span className="font-mono text-emerald-600 font-bold">{money(selectedInvoice.paidAmount ?? selectedInvoice.paid_amount ?? 0)}</span>
          </div>
          <div className="flex justify-between py-1 border-t pt-1">
            <span className="font-semibold">Balance Due:</span>
            <span className="font-mono font-bold text-red-600">
              {money(Math.max(0, (selectedInvoice.totalAmount ?? selectedInvoice.total_amount ?? 0) - (selectedInvoice.paidAmount ?? selectedInvoice.paid_amount ?? 0)))}
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

interface CustomerLedgerProps {
  PageIntro: React.ComponentType<any>;
  Button: React.ComponentType<any>;
  Modal: React.ComponentType<any>;
  Loading: React.ComponentType<any>;
  Failed: React.ComponentType<{ onRetry: () => void }>;
  Empty: React.ComponentType<{ title: string; detail: string }>;
  money: (amount: number) => string;
  timeDate: (date: string | Date) => string;
}

export function CustomerLedger({
  PageIntro,
  Button,
  Modal,
  Loading,
  Failed,
  Empty,
  money,
  timeDate,
}: CustomerLedgerProps) {
  const buyers = useGetBuyers();
  const sales = useGetSales();
  const buyerPayments = useGetBuyerPayments();

  const [selectedBuyerId, setSelectedBuyerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<string>('this_month');
  const [customDate, setCustomDate] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [receiveAmount, setReceiveAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const isLoading = buyers.isLoading || sales.isLoading || buyerPayments.isLoading;
  const isError = buyers.isError || sales.isError || buyerPayments.isError;

  const handleRetry = () => {
    buyers.refetch();
    sales.refetch();
    buyerPayments.refetch();
  };

  const buyerLedgerData = useMemo(() => {
    if (!buyers.data) return [];

    const salesData = sales.data || [];
    const paymentData = buyerPayments.data || [];

    return buyers.data.map((buyer: any) => {
      const buyerId = buyer.id;
      const buyerName = buyer.name || '';

      const buyerSales = salesData.filter(
        (s: any) =>
          String(s.buyer_id || s.buyerId) === String(buyerId) ||
          String(s.buyerName || s.buyer_name).toLowerCase() === buyerName.toLowerCase()
      );

      const buyerPaymentsList = paymentData.filter(
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

      const directReceipts = buyerPaymentsList.reduce(
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
        payments: buyerPaymentsList,
      };
    });
  }, [buyers.data, sales.data, buyerPayments.data]);

  const activeBuyer = useMemo(() => {
    if (!selectedBuyerId) return null;
    return buyerLedgerData.find((b: any) => String(b.id) === String(selectedBuyerId)) || null;
  }, [buyerLedgerData, selectedBuyerId]);

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
    if (datePreset === 'custom' && customDate) {
      return itemDate.toISOString().split('T')[0] === customDate;
    }
    return true;
  };

  const filteredSales = useMemo(() => {
    const rawSales = activeBuyer ? activeBuyer.invoices : (sales.data || []);
    return rawSales.filter((s: any) => isDateInFilterRange(s.created_at || s.transactionTime || s.transaction_time));
  }, [activeBuyer, sales.data, datePreset, customDate]);

  const filteredPayments = useMemo(() => {
    const rawPayments = activeBuyer ? activeBuyer.payments : (buyerPayments.data || []);
    return rawPayments.filter((p: any) => isDateInFilterRange(p.created_at || p.payment_date || p.transactionTime));
  }, [activeBuyer, buyerPayments.data, datePreset, customDate]);

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
        recordType: 'sale',
        displayType: 'Sale Invoice',
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
      recordType: 'udhaar',
      displayType: 'Udhaar Payment',
      refNo: pmt.id ? `REC-${pmt.id}` : 'RECEIPT',
      buyerName: pmt.buyers?.name || pmt.buyer_name || activeBuyer?.name || 'Customer',
      date: pmt.created_at || pmt.payment_date || pmt.transactionTime,
      amount: Number(pmt.amount ?? pmt.paid_amount ?? 0),
      paidAmount: Number(pmt.amount ?? pmt.paid_amount ?? 0),
      dueAmount: 0,
      status: 'paid',
      notes: pmt.notes || 'Udhaar Payment Collected',
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

  const handleOpenReceivePayment = () => {
    if (!activeBuyer) return;
    setReceiveAmount(String(activeBuyer.totalUdhaar || ''));
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

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

      if (buyerPayments.refetch) buyerPayments.refetch();
      if (sales.refetch) sales.refetch();
      setIsPaymentModalOpen(false);
    } catch (err) {
      console.error('Failed to submit payment:', err);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  return (
    <div className="animate-in space-y-6">
      <PageIntro
        eyebrow="Financial Records"
        title="Customer Ledger"
        detail="Track complete account history, transaction statements, debit/credit records, and remaining balances per customer."
      />

      <div className="panel rounded-xl p-5 border border-border/80 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:w-72">
            <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <UserCheck size={14} /> Select Customer
            </label>
            <select
              value={selectedBuyerId}
              onChange={(e) => setSelectedBuyerId(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
            >
              <option value="">-- All Customers --</option>
              {buyerLedgerData.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.phone || 'No phone'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search invoice or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-1">
              {[
                { id: 'today', label: 'Today' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'this_year', label: 'This Year' },
                { id: 'all', label: 'All' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setDatePreset(preset.id);
                    setCustomDate('');
                  }}
                  className={`h-10 px-3 rounded-lg text-xs font-semibold transition ${
                    datePreset === preset.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/60 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {preset.label}
                </button>
              ))}

              <div className="relative flex items-center">
                <Calendar size={14} className="absolute left-2.5 text-muted-foreground pointer-events-none" />
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className={`h-10 rounded-lg border text-xs font-semibold pl-8 pr-7 outline-none ${
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
                    className="absolute right-2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Loading />
        ) : isError ? (
          <Failed onRetry={handleRetry} />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">Total Sales Billed</p>
                <p className="text-xl font-bold font-mono mt-1 text-foreground">
                  {money(summaryMetrics.totalSales)}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                <p className="text-[11px] font-semibold text-emerald-800 uppercase">Total Payments Collected</p>
                <p className="text-xl font-bold font-mono mt-1 text-emerald-900">
                  {money(summaryMetrics.totalCollected)}
                </p>
              </div>

              <div
                className={`rounded-xl border p-4 flex flex-col justify-between ${
                  summaryMetrics.totalUdhaar > 0
                    ? 'border-red-200 bg-red-50/40'
                    : 'border-emerald-200 bg-emerald-50/40'
                }`}
              >
                <div>
                  <p
                    className={`text-[11px] font-semibold uppercase ${
                      summaryMetrics.totalUdhaar > 0 ? 'text-red-800' : 'text-emerald-800'
                    }`}
                  >
                    Current Udhaar / Due Balance
                  </p>
                  <p
                    className={`text-xl font-bold font-mono mt-1 ${
                      summaryMetrics.totalUdhaar > 0 ? 'text-red-900' : 'text-emerald-900'
                    }`}
                  >
                    {money(summaryMetrics.totalUdhaar)}
                  </p>
                </div>

                {activeBuyer && summaryMetrics.totalUdhaar > 0 && (
                  <div className="mt-3 pt-2 border-t border-red-200">
                    <button
                      type="button"
                      onClick={handleOpenReceivePayment}
                      className="w-full py-1.5 px-3 rounded-lg bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Banknote size={14} /> Receive Udhaar Payment
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              {transactionsList.length > 0 ? (
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Ref / Inv #</th>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3 text-right">Amount</th>
                      <th className="pb-3 text-right">Paid / Received</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {transactionsList.map((tx: any) => {
                      const refNo = String(tx.refNo).replace(/^INV-?/i, '');

                      return (
                        <tr
                          key={`${tx.type}-${tx.id}`}
                          onClick={() => setSelectedInvoice(tx.raw)}
                          className="hover:bg-muted/30 transition cursor-pointer"
                        >
                          <td className="py-3 text-xs text-muted-foreground">{timeDate(tx.date)}</td>
                          <td className="py-3 text-xs font-semibold">
                            {tx.type === 'INVOICE' ? (
                              <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-blue-800 text-[11px]">
                                <ArrowUpRight size={12} /> Invoice
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-emerald-800 text-[11px]">
                                <ArrowDownRight size={12} /> Payment
                              </span>
                            )}
                          </td>
                          <td className="py-3 font-mono text-xs font-bold">{refNo}</td>
                          <td className="py-3 text-xs font-medium">{tx.buyerName}</td>
                          <td className="py-3 text-right font-mono text-xs font-bold">
                            {money(tx.amount)}
                          </td>
                          <td className="py-3 text-right font-mono text-xs text-emerald-700 font-semibold">
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
                              onClick={() => setSelectedInvoice(tx.raw)}
                              className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                              title="View Document"
                            >
                              <FileText size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <Empty title="No transactions found" detail="No ledger entries found matching the filter selection." />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Receive Udhaar Payment Modal */}
      {isPaymentModalOpen && activeBuyer && (
        <Modal
          title="Receive Udhaar Payment"
          eyebrow={activeBuyer.name}
          onClose={() => setIsPaymentModalOpen(false)}
        >
          <form onSubmit={handleReceivePaymentSubmit} className="space-y-4 text-xs">
            <div className="rounded-lg bg-red-50 p-3 border border-red-200 flex justify-between items-center">
              <div>
                <div className="text-muted-foreground">Current Udhaar Balance</div>
                <div className="font-mono text-base font-bold text-red-700">
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

      {selectedInvoice && (
        <InvoiceModal
          selectedInvoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          Modal={Modal}
          Button={Button}
          money={money}
          timeDate={timeDate}
        />
      )}
    </div>
  );
}