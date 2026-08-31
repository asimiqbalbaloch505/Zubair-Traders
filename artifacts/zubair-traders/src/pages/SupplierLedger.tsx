import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Search, ArrowDownRight, ArrowUpRight, Banknote, Building2 } from 'lucide-react';
import { useGetPurchases, useGetSuppliers, useGetSupplierPayments } from '../hooks/useSupabaseData';
import { supabase } from '../lib/supabase';

export function SupplierLedger({ PageIntro, Button, Modal, Loading, Failed, Empty, money, timeDate, InvoiceModal }: any) {
  const purchases = useGetPurchases();
  const suppliers = useGetSuppliers();
  const payments = useGetSupplierPayments();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [payAmount, setPayAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Auto-select first supplier when loaded
  useEffect(() => {
    if (suppliers.data && suppliers.data.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(String(suppliers.data[0].id));
    }
  }, [suppliers.data, selectedSupplierId]);

  // Aggregate Purchases & Payments per Supplier
  const supplierLedgerData = useMemo(() => {
    if (!suppliers.data) return [];

    const purchaseData = purchases.data || [];
    const paymentData = payments.data || [];

    return suppliers.data.map((supplier: any) => {
      const supplierId = supplier.id;
      const supplierName = supplier.name || '';

      const supplierPurchases = purchaseData.filter(
        (p: any) =>
          String(p.supplier_id || p.supplierId) === String(supplierId) ||
          String(p.supplierName || p.supplier_name).toLowerCase() === supplierName.toLowerCase()
      );

      const supplierPayments = paymentData.filter(
        (sp: any) =>
          String(sp.supplier_id || sp.supplierId) === String(supplierId) ||
          String(sp.suppliers?.name || sp.supplier_name).toLowerCase() === supplierName.toLowerCase()
      );

      const totalPurchased = supplierPurchases.reduce(
        (sum: number, p: any) => sum + Number(p.totalAmount ?? p.total_amount ?? 0),
        0
      );

      const initialDownPayments = supplierPurchases.reduce(
        (sum: number, p: any) => sum + Number(p.paidAmount ?? p.paid_amount ?? 0),
        0
      );

      const directPayments = supplierPayments.reduce(
        (sum: number, sp: any) => sum + Number(sp.amount ?? sp.paid_amount ?? 0),
        0
      );

      const totalPaid = initialDownPayments + directPayments;
      const totalDue = Math.max(0, totalPurchased - totalPaid);

      return {
        ...supplier,
        totalPurchased,
        totalPaid,
        totalDue,
        purchases: supplierPurchases,
        payments: supplierPayments,
      };
    });
  }, [suppliers.data, purchases.data, payments.data]);

  const activeSupplier = useMemo(() => {
    if (!selectedSupplierId) return null;
    return supplierLedgerData.find((s: any) => String(s.id) === String(selectedSupplierId)) || null;
  }, [supplierLedgerData, selectedSupplierId]);

  // Merge & Sort Chronologically (Oldest top -> Latest bottom)
  const transactionsList = useMemo(() => {
    if (!activeSupplier) return [];

    const rawPurchases = activeSupplier.purchases || [];
    const rawPayments = activeSupplier.payments || [];

    const purchasesList = rawPurchases.map((p: any) => {
      const total = Number(p.totalAmount ?? p.total_amount ?? 0);
      const paid = Number(p.paidAmount ?? p.paid_amount ?? 0);
      const due = Math.max(0, total - paid);

      return {
        id: p.id,
        type: 'PURCHASE',
        refNo: p.invoiceNumber || p.invoice_number || p.billNumber || p.id,
        supplierName: activeSupplier.name,
        date: p.created_at || p.transactionTime || p.transaction_time || p.date,
        rawDate: new Date(p.created_at || p.transactionTime || p.transaction_time || p.date || 0).getTime(),
        amount: total,
        paidAmount: paid,
        dueAmount: due,
        items: p.items || p.purchase_items || [],
        raw: p,
      };
    });

    const paymentsList = rawPayments.map((sp: any) => {
      const paid = Number(sp.amount ?? sp.paid_amount ?? 0);
      return {
        id: sp.id,
        type: 'PAYMENT',
        refNo: sp.id ? `PAY-${sp.id}` : 'PAYMENT',
        supplierName: activeSupplier.name,
        date: sp.created_at || sp.payment_date || sp.transactionTime,
        rawDate: new Date(sp.created_at || sp.payment_date || sp.transactionTime || 0).getTime(),
        amount: 0,
        paidAmount: paid,
        dueAmount: 0,
        items: [],
        raw: sp,
      };
    });

    const merged = [...purchasesList, ...paymentsList].sort((a, b) => a.rawDate - b.rawDate);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return merged.filter((item) => String(item.refNo).toLowerCase().includes(q));
    }

    return merged;
  }, [activeSupplier, searchQuery]);

  // Compute Bottom Totals
  const tableTotals = useMemo(() => {
    const totalPurchases = transactionsList.reduce(
      (acc, tx) => acc + (tx.type === 'PURCHASE' ? Number(tx.amount || 0) : 0),
      0
    );
    const totalPaid = transactionsList.reduce((acc, tx) => acc + Number(tx.paidAmount || 0), 0);
    const totalDue = Math.max(0, totalPurchases - totalPaid);

    return { totalPurchases, totalPaid, totalDue };
  }, [transactionsList]);

  const handleOpenPaySupplier = () => {
    if (!activeSupplier) return;
    setPayAmount(String(tableTotals.totalDue || ''));
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  const handlePaySupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier || !payAmount || Number(payAmount) <= 0) return;

    setIsSubmittingPayment(true);
    try {
      const { error } = await supabase.from('supplier_payments').insert([
        {
          supplier_id: activeSupplier.id,
          amount: Number(payAmount),
          notes: paymentNotes,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      if (payments.refetch) payments.refetch();
      if (purchases.refetch) purchases.refetch();
      setIsPaymentModalOpen(false);
    } catch (err) {
      console.error('Failed to process supplier payment:', err);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const renderItemsPreview = (tx: any) => {
    if (tx.type === 'PAYMENT') {
      return (
        <span className="text-[11px] text-muted-foreground italic">
          {tx.raw?.notes ? `Note: ${tx.raw.notes}` : 'Supplier Payment Made'}
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

  if (suppliers.isLoading || purchases.isLoading) return <Loading />;
  if (suppliers.isError || purchases.isError) return <Failed onRetry={() => suppliers.refetch()} />;

  return (
    <div className="animate-in space-y-6">
      <PageIntro
        eyebrow="Financial Records"
        title="Supplier Khata Ledger"
        detail="Notebook style ledger tracking supplier purchases and payments chronologically."
      />

      <div className="w-full sm:w-80">
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Select Supplier
        </label>
        <select
          value={selectedSupplierId}
          onChange={(e) => setSelectedSupplierId(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary font-medium"
        >
          {supplierLedgerData.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.phone ? `(${s.phone})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="panel rounded-xl border border-border/80 p-5 space-y-4">
        {activeSupplier && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Building2 size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">{activeSupplier.name}</h2>
                {activeSupplier.phone && (
                  <p className="text-xs text-muted-foreground">{activeSupplier.phone}</p>
                )}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Total Unpaid Balance ( Udhaar)
              </span>
              <span className="font-mono text-lg font-bold text-amber-600">
                {money(tableTotals.totalDue)}
              </span>
            </div>
          </div>
        )}

        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search bill/invoice #..."
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
                  <th className="pb-3">Bill / Ref #</th>
                  <th className="pb-3">Supplier</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Items Received</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Purchase Total</th>
                  <th className="pb-3">Paid Amount</th>
                  <th className="pb-3">Due / Remaining</th>
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
                      {String(tx.refNo).replace(/^BILL-?/i, '')}
                    </td>
                    <td className="py-3 text-xs font-medium">{tx.supplierName}</td>
                    <td className="py-3 text-xs">
                      {tx.type === 'PURCHASE' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-amber-800 font-semibold text-[11px]">
                          <ArrowDownRight size={12} /> Purchase
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-emerald-800 font-semibold text-[11px]">
                          <ArrowUpRight size={12} /> Supplier Payment
                        </span>
                      )}
                    </td>
                    <td className="py-3 max-w-[200px] truncate">
                      {renderItemsPreview(tx)}
                    </td>
                    <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">{timeDate(tx.date)}</td>
                    <td className="py-3 font-mono text-xs font-bold">
                      {tx.type === 'PURCHASE' ? money(tx.amount) : '-'}
                    </td>
                    <td className="py-3 font-mono text-xs font-semibold text-emerald-700">
                      {money(tx.paidAmount)}
                    </td>
                    <td className="py-3 font-mono text-xs font-bold">
                      {tx.type === 'PURCHASE' && tx.dueAmount > 0 ? (
                        <span className="text-amber-600">{money(tx.dueAmount)}</span>
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
                    Total Supplier Summary:
                  </td>
                  <td className="py-4 font-mono text-xs font-bold text-foreground">
                    {money(tableTotals.totalPurchases)}
                  </td>
                  <td className="py-4 font-mono text-xs font-bold text-emerald-600">
                    {money(tableTotals.totalPaid)}
                  </td>
                  <td className="py-4 font-mono text-xs font-bold text-amber-600">
                    {money(tableTotals.totalDue)}
                  </td>
                  <td className="py-4 text-right">
                    {tableTotals.totalDue > 0 && (
                      <button
                        type="button"
                        onClick={handleOpenPaySupplier}
                        className="py-1.5 px-3 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Banknote size={14} /> Pay Supplier
                      </button>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <Empty title="No supplier record selected" detail="Select a supplier from the dropdown above to view their Khata." />
          )}
        </div>
      </div>

      {isPaymentModalOpen && activeSupplier && (
        <Modal
          title={`Pay Supplier`}
          eyebrow={activeSupplier.name}
          onClose={() => setIsPaymentModalOpen(false)}
        >
          <form onSubmit={handlePaySupplierSubmit} className="space-y-4 text-xs">
            <div className="rounded-lg bg-amber-500/10 p-3 border border-amber-500/20 flex justify-between items-center">
              <div>
                <div className="text-muted-foreground">Current Net Payable Balance</div>
                <div className="font-mono text-base font-bold text-amber-600">
                  {money(tableTotals.totalDue)}
                </div>
              </div>
              {Number(payAmount) > 0 && (
                <div className="text-right">
                  <div className="text-muted-foreground">Remaining Payable Balance</div>
                  <div className="font-mono text-base font-bold text-emerald-600">
                    {money(Math.max(0, tableTotals.totalDue - Number(payAmount)))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-muted-foreground mb-1">Payment Amount</label>
              <input
                type="number"
                min="1"
                max={tableTotals.totalDue}
                step="any"
                required
                placeholder="Enter amount to pay supplier"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-muted-foreground mb-1">Notes / Remarks (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Bank Transfer / Cash payment"
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
                {isSubmittingPayment ? 'Processing...' : 'Confirm Supplier Payment'}
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
            recordType: selectedRecord.type === 'PURCHASE' ? 'purchase' : 'supplier_payment',
            type: selectedRecord.type === 'PURCHASE' ? 'purchase' : 'supplier_payment',
            invoice_number: selectedRecord.refNo,
            buyer_name: selectedRecord.supplierName,
            created_at: selectedRecord.date,
            transactionTime: selectedRecord.date,
            transaction_time: selectedRecord.date,
            total_amount: selectedRecord.amount,
            paid_amount: selectedRecord.paidAmount,
            due_amount: selectedRecord.dueAmount,
            items:
              selectedRecord.type === 'PURCHASE'
                ? selectedRecord.raw?.items || selectedRecord.raw?.purchase_items || []
                : [
                    {
                      id: selectedRecord.id,
                      product_name: selectedRecord.raw?.notes || 'Supplier Payment Entry',
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