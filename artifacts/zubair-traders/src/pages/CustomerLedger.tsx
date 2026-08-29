import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Search, ArrowDownRight, ArrowUpRight, Banknote, User } from 'lucide-react';
import { useGetSales, useGetBuyers, useGetBuyerPayments } from '../hooks/useSupabaseData';
import { supabase } from '../lib/supabase';
import { InvoiceModal } from '../components/invoiceModal';

export function CustomerLedger({ PageIntro, Button, Modal, Loading, Failed, Empty, money, timeDate }: any) {
  const sales = useGetSales();
  const buyers = useGetBuyers();
  const payments = useGetBuyerPayments();

  const [selectedBuyerId, setSelectedBuyerId] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [receiveAmount, setReceiveAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Automatically select the first customer from the list if none is selected
  useEffect(() => {
    if (buyers.data && buyers.data.length > 0 && !selectedBuyerId) {
      setSelectedBuyerId(String(buyers.data[0].id));
    }
  }, [buyers.data, selectedBuyerId]);

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

  const activeBuyer = useMemo(() => {
    if (!selectedBuyerId) return null;
    return buyerLedgerData.find((b: any) => String(b.id) === String(selectedBuyerId)) || null;
  }, [buyerLedgerData, selectedBuyerId]);

  // Chronological List (Oldest at top -> Latest at bottom) for selected customer
  const transactionsList = useMemo(() => {
    if (!activeBuyer) return [];

    const rawSales = activeBuyer.invoices || [];
    const rawPayments = activeBuyer.payments || [];

    const salesList = rawSales.map((s: any) => {
      const total = Number(s.totalAmount ?? s.total_amount ?? 0);
      const paid = Number(s.paidAmount ?? s.paid_amount ?? 0);
      const due = Math.max(0, total - paid);

      return {
        id: s.id,
        type: 'INVOICE',
        refNo: s.invoiceNumber || s.invoice_number || s.id,
        buyerName: activeBuyer.name,
        date: s.created_at || s.transactionTime || s.transaction_time,
        rawDate: new Date(s.created_at || s.transactionTime || s.transaction_time || 0).getTime(),
        amount: total,
        paidAmount: paid,
        dueAmount: due, // Only due of this specific transaction
        items: s.items || s.sale_items || [],
        raw: s,
      };
    });

    const paymentsList = rawPayments.map((p: any) => {
      const paid = Number(p.amount ?? p.paid_amount ?? 0);
      return {
        id: p.id,
        type: 'PAYMENT',
        refNo: p.id ? `REC-${p.id}` : 'RECEIPT',
        buyerName: activeBuyer.name,
        date: p.created_at || p.payment_date || p.transactionTime,
        rawDate: new Date(p.created_at || p.payment_date || p.transactionTime || 0).getTime(),
        amount: 0,
        paidAmount: paid,
        dueAmount: 0,
        items: [],
        raw: p,
      };
    });

    // Sort ascending (Oldest first, Latest at bottom)
    const merged = [...salesList, ...paymentsList].sort((a, b) => a.rawDate - b.rawDate);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return merged.filter((item) => String(item.refNo).toLowerCase().includes(q));
    }

    return merged;
  }, [activeBuyer, searchQuery]);

  // Automatic calculation of totals at the end of Khata
  const tableTotals = useMemo(() => {
    const totalSales = transactionsList.reduce(
      (acc, tx) => acc + (tx.type === 'INVOICE' ? Number(tx.amount || 0) : 0),
      0
    );
    const totalPaid = transactionsList.reduce((acc, tx) => acc + Number(tx.paidAmount || 0), 0);
    const totalDue = Math.max(0, totalSales - totalPaid);

    return { totalSales, totalPaid, totalDue };
  }, [transactionsList]);

  const handleOpenReceivePayment = () => {
    if (!activeBuyer) return;
    setReceiveAmount(String(tableTotals.totalDue || ''));
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

      if (payments.refetch) payments.refetch();
      if (sales.refetch) sales.refetch();
      setIsPaymentModalOpen(false);
    } catch (err) {
      console.error('Failed to submit payment:', err);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const renderItemsPreview = (tx: any) => {
    if (tx.type === 'PAYMENT') {
      return (
        <span className="text-[11px] text-muted-foreground italic">
          {tx.raw?.notes ? `Note: ${tx.raw.notes}` : 'Udhaar Payment Received'}
        </span>
      );
    }

    const items = tx.items || [];
    if (!items.length) return <span className="text-[11px] text-muted-foreground italic">No items details</span>;

    const firstTwo = items.slice(0, 2);
    const extraCount = items.length - 2;

    return (
      <div className="flex flex-col text-xs space-y-0.5">
        <span>
          {firstTwo.map((it: any, idx: number) => {
            const name = it.product_name || it.name || it.product?.name || 'Item';
            const qty = it.quantity ?? it.qty ?? 1;
            return `${qty}x ${name}${idx < firstTwo.length - 1 ? ', ' : ''}`;
          }).join('')}
        </span>
        {extraCount > 0 && (
          <span className="text-[10px] text-primary font-semibold">+ {extraCount} more item(s)</span>
        )}
      </div>
    );
  };

  if (buyers.isLoading || sales.isLoading) return <Loading />;
  if (buyers.isError || sales.isError) return <Failed onRetry={() => buyers.refetch()} />;

  return (
    <div className="animate-in space-y-6">
      <PageIntro
        eyebrow="Financial Records"
        title="Customer Khata Ledger"
        detail="Notebook style entry tracking individual customer balance chronologically."
      />

      <div className="w-full sm:w-80">
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Select Customer
        </label>
        <select
          value={selectedBuyerId}
          onChange={(e) => setSelectedBuyerId(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary font-medium"
        >
          {buyerLedgerData.map((b: any) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.phone ? `(${b.phone})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="panel rounded-xl border border-border/80 p-5 space-y-4">
        {activeBuyer && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <User size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">{activeBuyer.name}</h2>
                {activeBuyer.phone && (
                  <p className="text-xs text-muted-foreground">{activeBuyer.phone}</p>
                )}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Current Udhaar Balance
              </span>
              <span className="font-mono text-lg font-bold text-destructive">
                {money(tableTotals.totalDue)}
              </span>
            </div>
          </div>
        )}

        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search invoice #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-primary"
          />
        </div>

        <div className="overflow-x-auto">
          {transactionsList.length > 0 ? (
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-3">Invoice #</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Items Purchased</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Total Amount</th>
                  <th className="pb-3">Paid / Received</th>
                  <th className="pb-3">Due / Balance</th>
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
                        <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-blue-800 font-semibold text-[11px]">
                          <ArrowUpRight size={12} /> Sale
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-emerald-800 font-semibold text-[11px]">
                          <ArrowDownRight size={12} /> Udhaar Payment
                        </span>
                      )}
                    </td>
                    <td className="py-3 max-w-[200px] truncate">
                      {renderItemsPreview(tx)}
                    </td>
                    <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">{timeDate(tx.date)}</td>
                    <td className="py-3 font-mono text-xs font-bold">
                      {tx.type === 'INVOICE' ? money(tx.amount) : '-'}
                    </td>
                    <td className="py-3 font-mono text-xs font-semibold text-emerald-700">
                      {money(tx.paidAmount)}
                    </td>
                    <td className="py-3 font-mono text-xs font-bold">
                      {tx.type === 'INVOICE' && tx.dueAmount > 0 ? (
                        <span className="text-destructive">{money(tx.dueAmount)}</span>
                      ) : (
                        <span className="text-muted-foreground">PKR 0</span>
                      )}
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

              <tfoot className="border-t-2 border-border bg-muted/20 font-semibold">
                <tr>
                  <td colSpan={5} className="py-4 text-xs text-right font-bold uppercase tracking-wider pr-4">
                    Total Khata Summary:
                  </td>
                  <td className="py-4 font-mono text-xs font-bold text-foreground">
                    {money(tableTotals.totalSales)}
                  </td>
                  <td className="py-4 font-mono text-xs font-bold text-emerald-600">
                    {money(tableTotals.totalPaid)}
                  </td>
                  <td className="py-4 font-mono text-xs font-bold text-destructive">
                    {money(tableTotals.totalDue)}
                  </td>
                  <td className="py-4 text-right">
                    {tableTotals.totalDue > 0 && (
                      <button
                        type="button"
                        onClick={handleOpenReceivePayment}
                        className="py-1.5 px-3 rounded-lg bg-destructive text-destructive-foreground font-semibold text-xs hover:bg-destructive/90 transition inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Banknote size={14} /> Receive Udhaar
                      </button>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <Empty title="No customer record selected" detail="Select a customer from the dropdown above to view their Khata." />
          )}
        </div>
      </div>

      {isPaymentModalOpen && activeBuyer && (
        <Modal
          title={`Receive Udhaar Payment`}
          eyebrow={activeBuyer.name}
          onClose={() => setIsPaymentModalOpen(false)}
        >
          <form onSubmit={handleReceivePaymentSubmit} className="space-y-4 text-xs">
            <div className="rounded-lg bg-destructive/10 p-3 border border-destructive/20 flex justify-between items-center">
              <div>
                <div className="text-muted-foreground">Current Net Due Balance</div>
                <div className="font-mono text-base font-bold text-destructive">
                  {money(tableTotals.totalDue)}
                </div>
              </div>
              {Number(receiveAmount) > 0 && (
                <div className="text-right">
                  <div className="text-muted-foreground">Remaining Balance After Payment</div>
                  <div className="font-mono text-base font-bold text-emerald-600">
                    {money(Math.max(0, tableTotals.totalDue - Number(receiveAmount)))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-muted-foreground mb-1">Amount Received</label>
              <input
                type="number"
                min="1"
                max={tableTotals.totalDue}
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

      {selectedRecord && (
        <InvoiceModal
          sale={{
            ...selectedRecord.raw,
            id: selectedRecord.raw?.id || selectedRecord.id,
            recordType: selectedRecord.type === 'INVOICE' ? 'sales' : 'udhaar',
            type: selectedRecord.type === 'INVOICE' ? 'sales' : 'udhaar',
            invoice_number: selectedRecord.refNo,
            buyer_name: selectedRecord.buyerName,
            created_at: selectedRecord.date,
            transactionTime: selectedRecord.date,
            transaction_time: selectedRecord.date,
            total_amount: selectedRecord.amount,
            paid_amount: selectedRecord.paidAmount,
            due_amount: selectedRecord.dueAmount,
            items:
              selectedRecord.type === 'INVOICE'
                ? selectedRecord.raw?.items || selectedRecord.raw?.sale_items || []
                : [
                    {
                      id: selectedRecord.id,
                      product_name: selectedRecord.raw?.notes || 'Udhaar Payment Collection',
                      quantity: 1,
                      unit_price: selectedRecord.paidAmount,
                      total_price: selectedRecord.paidAmount,
                    },
                  ],
          }}
          onClose={() => setSelectedRecord(null)}
          Modal={Modal}
          Button={Button}
          money={money}
        />
      )}
    </div>
  );
}