import React, { useState, useMemo } from 'react';
import { FileText, Printer, Search, Calendar, X, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useGetSales, useGetBuyers, useGetBuyerPayments } from '../hooks/useSupabaseData';

export function CustomerLedger({ PageIntro, Button, Modal, Loading, Failed, Empty, money, timeDate }: any) {
  const sales = useGetSales();
  const buyers = useGetBuyers();
  const payments = useGetBuyerPayments();

  const [selectedBuyerId, setSelectedBuyerId] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // 1. Calculate Ledger Metrics per Buyer
  const buyerLedgerData = useMemo(() => {
    if (!buyers.data) return [];

    const salesData = sales.data || [];
    const paymentData = payments.data || [];

    return buyers.data.map((buyer: any) => {
      const buyerId = buyer.id;
      const buyerName = buyer.name || '';

      // Get all sales invoices for this buyer
      const buyerSales = salesData.filter(
        (s: any) =>
          String(s.buyer_id || s.buyerId) === String(buyerId) ||
          String(s.buyerName || s.buyer_name).toLowerCase() === buyerName.toLowerCase()
      );

      // Get all payment collection receipts for this buyer
      const buyerPayments = paymentData.filter(
        (p: any) =>
          String(p.buyer_id || p.buyerId) === String(buyerId) ||
          String(p.buyers?.name || p.buyer_name).toLowerCase() === buyerName.toLowerCase()
      );

      // Aggregate Total Invoiced Amount
      const totalInvoiced = buyerSales.reduce(
        (sum: number, s: any) => sum + Number(s.totalAmount ?? s.total_amount ?? 0),
        0
      );

      // Down payments made at invoice creation time
      const initialDownPayments = buyerSales.reduce(
        (sum: number, s: any) => sum + Number(s.paidAmount ?? s.paid_amount ?? 0),
        0
      );

      // Collection receipts recorded separately
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

  // Currently active selected buyer from dropdown
  const activeBuyer = useMemo(() => {
    if (!selectedBuyerId) return null;
    return buyerLedgerData.find((b: any) => String(b.id) === String(selectedBuyerId)) || null;
  }, [buyerLedgerData, selectedBuyerId]);

  // Combined timeline of Invoices + Payments for selected customer (or overall if unselected)
  const transactionsList = useMemo(() => {
    const targetSales = activeBuyer ? activeBuyer.invoices : (sales.data || []);
    const targetPayments = activeBuyer ? activeBuyer.payments : (payments.data || []);

    const invs = targetSales.map((inv: any) => {
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

    const pmts = targetPayments.map((pmt: any) => ({
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

    // Merge & Sort Chronologically descending
    const merged = [...invs, ...pmts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return merged.filter((item) => {
      if (dateFilter) {
        const itemDateStr = new Date(item.date).toISOString().split('T')[0];
        if (itemDateStr !== dateFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          String(item.refNo).toLowerCase().includes(q) ||
          String(item.buyerName).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeBuyer, sales.data, payments.data, dateFilter, searchQuery]);

  // Calculate totals for active selection or global overall summary
  const summaryMetrics = useMemo(() => {
    if (activeBuyer) {
      return {
        totalSales: activeBuyer.totalInvoiced,
        totalCollected: activeBuyer.totalPaid,
        totalUdhaar: activeBuyer.totalUdhaar,
      };
    }

    const totalSales = buyerLedgerData.reduce((acc, b) => acc + b.totalInvoiced, 0);
    const totalCollected = buyerLedgerData.reduce((acc, b) => acc + b.totalPaid, 0);
    const totalUdhaar = buyerLedgerData.reduce((acc, b) => acc + b.totalUdhaar, 0);

    return { totalSales, totalCollected, totalUdhaar };
  }, [activeBuyer, buyerLedgerData]);

  if (buyers.isLoading || sales.isLoading) return <Loading />;
  if (buyers.isError || sales.isError) return <Failed onRetry={() => buyers.refetch()} />;

  return (
    <div className="animate-in space-y-6">
      <PageIntro
        eyebrow="Financial Records"
        title="Customer Ledger"
        detail="View customer credit balances, collections history, and itemized invoice details."
      />

      {/* Dropdown Customer Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="w-full sm:w-80">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Select Customer
          </label>
          <select
            value={selectedBuyerId}
            onChange={(e) => setSelectedBuyerId(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary"
          >
            <option value="">All Customers</option>
            {buyerLedgerData.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name} {b.phone ? `(${b.phone})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards: Total Sales, Collected, Udhaar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs text-muted-foreground">Total Sales</span>
          <div className="mt-1 font-mono text-xl font-bold">{money(summaryMetrics.totalSales)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs text-muted-foreground font-semibold">Collected</span>
          <div className="mt-1 font-mono text-xl font-bold text-emerald-600">
            {money(summaryMetrics.totalCollected)}
          </div>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <span className="text-xs text-destructive font-semibold">Udhaar (Balance Due)</span>
          <div className="mt-1 font-mono text-xl font-bold text-destructive">
            {money(summaryMetrics.totalUdhaar)}
          </div>
        </div>
      </div>

      {/* Search & Date Filters */}
      <div className="panel rounded-xl border border-border/80 p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search invoice # or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-primary"
            />
          </div>

          <div className="relative flex items-center">
            <Calendar size={14} className="absolute left-2.5 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background pl-8 pr-7 text-xs font-semibold outline-none focus:border-primary"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="absolute right-2 text-muted-foreground hover:text-foreground"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Transactions / Invoices Table */}
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
                    key={tx.id}
                    onClick={() => tx.type === 'INVOICE' && setSelectedInvoice(tx.raw)}
                    className={`transition ${tx.type === 'INVOICE' ? 'cursor-pointer hover:bg-muted/40' : ''}`}
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
                          <ArrowDownRight size={12} /> Payment
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
                      {tx.type === 'INVOICE' && (
                        <button
                          onClick={() => setSelectedInvoice(tx.raw)}
                          className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                        >
                          <FileText size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty title="No records found" detail="No sales or payment records match your current criteria." />
          )}
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <Modal
          title={`Invoice #${String(selectedInvoice.invoiceNumber || selectedInvoice.invoice_number || selectedInvoice.id).replace(/^INV-?/i, '')}`}
          eyebrow="Invoice Details"
          onClose={() => setSelectedInvoice(null)}
        >
          <div className="space-y-4 text-sm printable-invoice">
            <div className="flex justify-between border-b pb-3 text-xs text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">Client:</span>{' '}
                {selectedInvoice.buyerName || selectedInvoice.buyer_name || 'Walk-in Buyer'}
              </div>
              <div>
                <span className="font-semibold text-foreground">Date:</span>{' '}
                {timeDate(selectedInvoice.created_at || selectedInvoice.transactionTime)}
              </div>
            </div>

            {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
              <div className="max-h-56 overflow-y-auto border-y py-2">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-1">Item Description</th>
                      <th className="pb-1 text-center">Qty</th>
                      <th className="pb-1 text-right">Unit Price</th>
                      <th className="pb-1 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedInvoice.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-1.5 font-medium">{item.productName || item.product_name}</td>
                        <td className="py-1.5 text-center">{item.quantity}</td>
                        <td className="py-1.5 text-right">{money(item.unitPrice ?? item.unit_price ?? 0)}</td>
                        <td className="py-1.5 text-right font-mono">
                          {money(item.totalPrice ?? item.total_price ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded bg-muted p-3 text-center text-xs text-muted-foreground">
                No itemized product lines attached to this invoice record.
              </div>
            )}

            <div className="space-y-1.5 rounded-lg bg-muted/60 p-3 text-xs">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-mono font-bold">
                  {money(selectedInvoice.totalAmount ?? selectedInvoice.total_amount ?? 0)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Paid Amount:</span>
                <span className="font-mono font-bold">
                  {money(selectedInvoice.paidAmount ?? selectedInvoice.paid_amount ?? 0)}
                </span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>Balance Due:</span>
                <span className="font-mono font-bold">
                  {money(
                    (selectedInvoice.totalAmount ?? selectedInvoice.total_amount ?? 0) -
                      (selectedInvoice.paidAmount ?? selectedInvoice.paid_amount ?? 0)
                  )}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer size={15} /> Print
              </Button>
              <Button onClick={() => setSelectedInvoice(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}