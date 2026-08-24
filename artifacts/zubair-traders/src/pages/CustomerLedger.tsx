import React, { useState, useMemo } from 'react';
import { Search, Filter, Calendar, FileText, Printer, Building2, UserCheck, CreditCard } from 'lucide-react';
import { useGetBuyers, useGetSales, useGetBuyerPayments } from '../hooks/useSupabaseData';

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

// Embedded Invoice Modal Component to avoid missing import build errors
function InvoiceModal({
  selectedInvoice,
  onClose,
  Modal,
  Button,
  money,
  timeDate,
}: {
  selectedInvoice: any;
  onClose: () => void;
  Modal: React.ComponentType<any>;
  Button: React.ComponentType<any>;
  money: (amount: number) => string;
  timeDate: (date: string | Date) => string;
}) {
  if (!selectedInvoice) return null;

  const invNumber = String(
    selectedInvoice.invoiceNumber || selectedInvoice.invoice_number || selectedInvoice.id
  ).replace(/^INV-?/i, '');

  return (
    <Modal
      title={`${selectedInvoice.displayType || 'Invoice'} #${invNumber}`}
      eyebrow={
        selectedInvoice.recordType === 'udhaar'
          ? 'Udhaar Payment Receipt'
          : 'Official Sales Invoice'
      }
      onClose={onClose}
    >
      <div className="printable-invoice relative p-6 bg-white text-black rounded-lg border border-border overflow-hidden">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.04]">
          <span className="text-7xl font-extrabold uppercase tracking-widest text-black -rotate-12">
            ZUBAIR TRADERS
          </span>
        </div>

        {/* Header */}
        <div className="relative flex justify-between items-start border-b border-black/20 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 size={24} className="text-black" />
              <h1 className="text-xl font-bold uppercase tracking-wider text-black">
                Zubair Traders
              </h1>
            </div>
            <p className="text-xs text-gray-600 mt-1 font-medium">
              Bakery & General Traders Management
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-black text-white text-xs font-bold uppercase rounded">
              Tax Invoice
            </span>
            <p className="text-xs text-gray-600 font-mono mt-1">
              Inv #: {invNumber}
            </p>
          </div>
        </div>

        {/* Customer & Date */}
        <div className="relative grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded border border-gray-200 text-xs mb-4">
          <div>
            <p className="text-gray-500 uppercase text-[10px] font-bold">Customer Name</p>
            <p className="font-bold text-black text-sm">
              {selectedInvoice.buyerName || selectedInvoice.buyer_name || 'Walk-in Customer'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 uppercase text-[10px] font-bold">Transaction Date</p>
            <p className="font-semibold text-black">
              {timeDate(
                selectedInvoice.created_at ||
                  selectedInvoice.transactionTime ||
                  selectedInvoice.transaction_time ||
                  selectedInvoice.date
              )}
            </p>
          </div>
        </div>

        {/* Line Items */}
        {selectedInvoice.recordType === 'udhaar' ? (
          <div className="rounded-lg bg-emerald-50/60 p-4 border border-emerald-200 space-y-2 mb-4">
            <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              Udhaar Repayment Detail
            </div>
            <div className="text-xs text-black">
              <strong>Notes / Reference:</strong> {selectedInvoice.notes || 'Udhaar Payment Collected'}
            </div>
            {selectedInvoice.paymentMethod && (
              <div className="text-xs text-gray-600">
                <strong>Payment Method:</strong> {selectedInvoice.paymentMethod}
              </div>
            )}
          </div>
        ) : selectedInvoice.items && selectedInvoice.items.length > 0 ? (
          <div className="border border-gray-200 rounded overflow-hidden mb-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 border-b border-gray-200 text-black font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2">Item Description</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Unit Price</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {selectedInvoice.items.map((item: any, idx: number) => {
                  const qty = Number(item.quantity || item.qty || 0);
                  const total = Number(
                    item.subtotal ??
                      item.totalPrice ??
                      item.total_price ??
                      qty * Number(item.unit_price || item.unitPrice || 0)
                  );
                  const rawUnitPrice = Number(item.unit_price ?? item.unitPrice ?? 0);
                  const unitPrice = rawUnitPrice > 0 ? rawUnitPrice : qty > 0 ? total / qty : 0;

                  return (
                    <tr key={idx}>
                      <td className="p-2 font-medium text-black">
                        {item.productName || item.product_name || item.name || item.products?.name || `Product #${item.product_id}`}
                      </td>
                      <td className="p-2 text-center">{qty}</td>
                      <td className="p-2 text-right">{money(unitPrice)}</td>
                      <td className="p-2 text-right font-mono font-bold">{money(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded border bg-gray-50 p-3 text-center text-xs text-gray-500 mb-4">
            No itemized product lines attached to this invoice.
          </div>
        )}

        {/* Totals */}
        <div className="relative flex justify-end mb-6">
          <div className="w-64 space-y-1.5 bg-gray-50 border border-gray-200 p-3 rounded text-xs">
            <div className="flex justify-between text-gray-700">
              <span>Total Amount:</span>
              <span className="font-mono font-bold text-black">
                {money(selectedInvoice.totalAmount ?? selectedInvoice.total_amount ?? 0)}
              </span>
            </div>
            <div className="flex justify-between text-emerald-800">
              <span>Paid Amount:</span>
              <span className="font-mono font-bold">
                {money(selectedInvoice.paidAmount ?? selectedInvoice.paid_amount ?? 0)}
              </span>
            </div>
            <div className="flex justify-between text-red-700 border-t border-gray-300 pt-1 font-bold">
              <span>Balance Due:</span>
              <span className="font-mono">
                {money(selectedInvoice.dueAmount ?? selectedInvoice.due_amount ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative text-center border-t border-gray-200 pt-3">
          <p className="text-xs font-bold text-black">Thank you for being part of Zubair Traders!!</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Zubair Traders • Authorized Computer Generated Receipt</p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 print:hidden border-t mt-4">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={15} /> Print / Save PDF
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
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
  const [dateFilter, setDateFilter] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const isLoading = buyers.isLoading || sales.isLoading || buyerPayments.isLoading;
  const isError = buyers.isError || sales.isError || buyerPayments.isError;

  const handleRetry = () => {
    buyers.refetch();
    sales.refetch();
    buyerPayments.refetch();
  };

  const selectedBuyer = useMemo(() => {
    if (!buyers.data || !selectedBuyerId) return null;
    return buyers.data.find((b: any) => String(b.id) === String(selectedBuyerId)) || null;
  }, [buyers.data, selectedBuyerId]);

  const customerTransactions = useMemo(() => {
    if (!selectedBuyerId) return [];

    const salesList = (sales.data || [])
      .filter((s: any) => String(s.buyer_id || s.buyerId) === String(selectedBuyerId))
      .map((s: any) => ({
        ...s,
        uniqueKey: `sale-${s.id}`,
        recordType: 'sale',
        displayType: 'Sale Invoice',
        debit: Number(s.total_amount ?? s.totalAmount ?? 0),
        credit: Number(s.paid_amount ?? s.paidAmount ?? 0),
        date: s.created_at || s.transaction_time || s.transactionTime || s.date,
      }));

    const paymentList = (buyerPayments.data || [])
      .filter((p: any) => String(p.buyer_id || p.buyerId) === String(selectedBuyerId))
      .map((p: any) => ({
        ...p,
        uniqueKey: `payment-${p.id}`,
        recordType: 'udhaar',
        displayType: 'Payment Received',
        debit: 0,
        credit: Number(p.amount || 0),
        date: p.created_at || p.transaction_time || p.transactionTime || p.date,
      }));

    return [...salesList, ...paymentList].sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateA - dateB;
    });
  }, [sales.data, buyerPayments.data, selectedBuyerId]);

  const filteredTransactions = useMemo(() => {
    return customerTransactions.filter((tx: any) => {
      if (dateFilter) {
        if (!tx.date) return false;
        const txDateStr = new Date(tx.date).toISOString().split('T')[0];
        if (txDateStr !== dateFilter) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const refNum = String(tx.invoice_number || tx.invoiceNumber || tx.id || '').toLowerCase();
        const notes = String(tx.notes || '').toLowerCase();
        return refNum.includes(query) || notes.includes(query);
      }
      return true;
    });
  }, [customerTransactions, dateFilter, searchQuery]);

  const ledgerSummary = useMemo(() => {
    let totalSales = 0;
    let totalPayments = 0;

    customerTransactions.forEach((tx: any) => {
      totalSales += tx.debit;
      totalPayments += tx.credit;
    });

    const runningBalance = totalSales - totalPayments;

    return { totalSales, totalPayments, runningBalance };
  }, [customerTransactions]);

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
              <option value="">-- Choose Customer --</option>
              {(buyers.data || []).map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.phone || 'No phone'})
                </option>
              ))}
            </select>
          </div>

          {selectedBuyerId && (
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
          )}
        </div>

        {isLoading ? (
          <Loading />
        ) : isError ? (
          <Failed onRetry={handleRetry} />
        ) : !selectedBuyerId ? (
          <Empty title="No customer selected" detail="Select a customer above to view their detailed transaction ledger and total balance." />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">Total Sales Billed</p>
                <p className="text-xl font-bold font-mono mt-1 text-foreground">
                  {money(ledgerSummary.totalSales)}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                <p className="text-[11px] font-semibold text-emerald-800 uppercase">Total Payments Received</p>
                <p className="text-xl font-bold font-mono mt-1 text-emerald-900">
                  {money(ledgerSummary.totalPayments)}
                </p>
              </div>

              <div
                className={`rounded-xl border p-4 ${
                  ledgerSummary.runningBalance > 0
                    ? 'border-red-200 bg-red-50/40'
                    : 'border-emerald-200 bg-emerald-50/40'
                }`}
              >
                <p
                  className={`text-[11px] font-semibold uppercase ${
                    ledgerSummary.runningBalance > 0 ? 'text-red-800' : 'text-emerald-800'
                  }`}
                >
                  Current Udhaar / Due Balance
                </p>
                <p
                  className={`text-xl font-bold font-mono mt-1 ${
                    ledgerSummary.runningBalance > 0 ? 'text-red-900' : 'text-emerald-900'
                  }`}
                >
                  {money(ledgerSummary.runningBalance)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredTransactions.length > 0 ? (
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Ref / Inv #</th>
                      <th className="pb-3 text-right">Debit (Sales)</th>
                      <th className="pb-3 text-right">Credit (Paid)</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {filteredTransactions.map((tx: any) => {
                      const refNo =
                        tx.invoice_number ||
                        tx.invoiceNumber ||
                        (tx.recordType === 'udhaar' ? `REC-${tx.id}` : `INV-${tx.id}`);

                      return (
                        <tr key={tx.uniqueKey} className="hover:bg-muted/30 transition">
                          <td className="py-3 text-xs text-muted-foreground">{timeDate(tx.date)}</td>
                          <td className="py-3 text-xs font-semibold">
                            <span
                              className={`rounded px-2 py-0.5 text-[11px] ${
                                tx.recordType === 'udhaar'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {tx.displayType}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-xs font-bold">{refNo}</td>
                          <td className="py-3 text-right font-mono text-xs text-red-700 font-semibold">
                            {tx.debit > 0 ? money(tx.debit) : '-'}
                          </td>
                          <td className="py-3 text-right font-mono text-xs text-emerald-700 font-semibold">
                            {tx.credit > 0 ? money(tx.credit) : '-'}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => setSelectedInvoice(tx)}
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