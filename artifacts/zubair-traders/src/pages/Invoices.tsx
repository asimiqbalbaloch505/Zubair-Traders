import React, { useState, useMemo } from 'react';
import { FileText, Printer, Search, Filter, Calendar, X, Building2 } from 'lucide-react';
import { useGetSales, useGetBuyerPayments, useGetPurchases } from '../hooks/useSupabaseData';

interface InvoicesProps {
  PageIntro: React.ComponentType<any>;
  Button: React.ComponentType<any>;
  Modal: React.ComponentType<any>;
  Loading: React.ComponentType<any>;
  Failed: React.ComponentType<{ onRetry: () => void }>;
  Empty: React.ComponentType<{ title: string; detail: string }>;
  money: (amount: number) => string;
  timeDate: (date: string | Date) => string;
}

export function Invoices({ PageIntro, Button, Modal, Loading, Failed, Empty, money, timeDate }: InvoicesProps) {
  const sales = useGetSales();
  const buyerPayments = useGetBuyerPayments();
  const purchases = useGetPurchases();

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sales' | 'udhaar' | 'purchase'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [dateFilter, setDateFilter] = useState('');

  const isLoading = sales.isLoading || buyerPayments.isLoading || purchases.isLoading;
  const isError = sales.isError || buyerPayments.isError || purchases.isError;

  const combinedRecords = useMemo(() => {
    const salesList = (sales.data || []).map((s: any) => ({
      ...s,
      uniqueKey: `sale-${s.id}`,
      recordType: 'sales',
      displayType: 'Sales',
    }));

    const udhaarList = (buyerPayments.data || []).map((p: any) => {
      const customerName = p.buyers?.name || 'Walk-in Customer';
      const recNo = p.id ? `REC-${p.id}` : 'REC-PAYMENT';
      const amount = Number(p.amount || 0);
      const recordDate = p.created_at || p.transaction_time || p.transactionTime || p.date;

      return {
        ...p,
        uniqueKey: `udhaar-${p.id}`,
        invoiceNumber: recNo,
        invoice_number: recNo,
        buyerName: customerName,
        buyer_name: customerName,
        created_at: recordDate,
        transactionTime: recordDate,
        totalAmount: amount,
        total_amount: amount,
        paidAmount: amount,
        paid_amount: amount,
        dueAmount: 0,
        due_amount: 0,
        paymentStatus: 'paid',
        payment_status: 'paid',
        paymentMethod: p.payment_method || 'Cash',
        notes: p.notes || 'Udhaar Payment Collected',
        recordType: 'udhaar',
        displayType: 'Udhaar Payment',
        items: [],
      };
    });

    const purchaseList = (purchases.data || []).map((pur: any) => {
      const supplierName = pur.supplierName || pur.suppliers?.name || pur.supplier_name || 'Walk-in / Cash Purchase';
      const purNo = pur.id ? `PUR-${pur.id}` : 'PUR-INV';
      const recordDate = pur.created_at || pur.transaction_time || pur.transactionTime || pur.date;

      return {
        ...pur,
        uniqueKey: `purchase-${pur.id}`,
        invoiceNumber: purNo,
        invoice_number: purNo,
        buyerName: supplierName,
        buyer_name: supplierName,
        created_at: recordDate,
        transactionTime: recordDate,
        totalAmount: Number(pur.totalAmount ?? pur.total_amount ?? 0),
        total_amount: Number(pur.totalAmount ?? pur.total_amount ?? 0),
        paidAmount: Number(pur.paidAmount ?? pur.paid_amount ?? 0),
        paid_amount: Number(pur.paidAmount ?? pur.paid_amount ?? 0),
        dueAmount: Number(pur.dueAmount ?? pur.due_amount ?? 0),
        due_amount: Number(pur.dueAmount ?? pur.due_amount ?? 0),
        paymentStatus: pur.paymentStatus || pur.payment_status || 'paid',
        payment_status: pur.paymentStatus || pur.payment_status || 'paid',
        recordType: 'purchase',
        displayType: 'Purchase',
        items: pur.items || pur.purchase_invoice_items || [],
      };
    });

    return [...salesList, ...udhaarList, ...purchaseList].sort((a, b) => {
      const dateA = new Date(a.created_at || a.transactionTime || a.transaction_time || a.date || 0).getTime();
      const dateB = new Date(b.created_at || b.transactionTime || b.transaction_time || b.date || 0).getTime();
      return dateB - dateA;
    });
  }, [sales.data, buyerPayments.data, purchases.data]);

  const filteredInvoices = useMemo(() => {
    return combinedRecords.filter((inv: any) => {
      if (typeFilter !== 'all' && inv.recordType !== typeFilter) return false;

      const status = String(inv.paymentStatus || inv.payment_status || '').toLowerCase();
      if (statusFilter !== 'all') {
        if (statusFilter === 'paid' && status !== 'paid') return false;
        if (statusFilter === 'partial' && status !== 'partial' && status !== 'partially_paid') return false;
        if (statusFilter === 'unpaid' && status !== 'unpaid' && status !== 'due') return false;
      }

      if (dateFilter) {
        const rawDate = inv.created_at || inv.transactionTime || inv.transaction_time || inv.date;
        if (!rawDate) return false;
        const invDateStr = new Date(rawDate).toISOString().split('T')[0];
        if (invDateStr !== dateFilter) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const invNum = String(inv.invoiceNumber || inv.invoice_number || inv.id || '').toLowerCase();
        const buyer = String(inv.buyerName || inv.buyer_name || '').toLowerCase();
        return invNum.includes(query) || buyer.includes(query);
      }

      return true;
    });
  }, [combinedRecords, typeFilter, statusFilter, dateFilter, searchQuery]);

  const handleRetry = () => {
    sales.refetch();
    buyerPayments.refetch();
    purchases.refetch();
  };

  return (
    <div className="animate-in space-y-6">
      <PageIntro
        eyebrow="Billing Records"
        title="Sales & Purchases Record"
        detail="Search, filter by date, and review all line-itemized business invoices and payment receipts."
      />

      <div className="panel rounded-xl p-5 border border-border/80">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by invoice # or customer/supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mr-1">
              <Filter size={14} /> Filter:
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
                  title="Clear date filter"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <select
              value={typeFilter}
              onChange={(e: any) => setTypeFilter(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
            >
              <option value="all">All Types</option>
              <option value="sales">Sales Invoices</option>
              <option value="udhaar">Udhaar Payments</option>
              <option value="purchase">Purchase Invoices</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Half Paid</option>
              <option value="unpaid">Udhaar / Unpaid</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <Loading />
          ) : isError ? (
            <Failed onRetry={handleRetry} />
          ) : filteredInvoices.length > 0 ? (
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-3">Invoice / Rec #</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Customer / Supplier</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Total</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filteredInvoices.map((inv: any) => {
                  const invNo = inv.invoiceNumber || inv.invoice_number || inv.id;
                  const cleanNum = String(invNo).replace(/^INV-?/i, '');
                  const customer = inv.buyerName || inv.buyer_name || 'Walk-in Customer';
                  const date = inv.created_at || inv.transactionTime || inv.transaction_time || inv.date;
                  const total = inv.totalAmount ?? inv.total_amount ?? 0;
                  const status = String(inv.paymentStatus || inv.payment_status || 'unpaid').toLowerCase();

                  return (
                    <tr
                      key={inv.uniqueKey}
                      onClick={() => setSelectedInvoice(inv)}
                      className="cursor-pointer transition hover:bg-muted/40"
                    >
                      <td className="py-3 font-mono text-xs font-bold text-foreground">
                        {cleanNum}
                      </td>
                      <td className="py-3 text-xs">
                        <span
                          className={`rounded px-2 py-0.5 font-semibold ${
                            inv.recordType === 'udhaar'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.recordType === 'purchase'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {inv.displayType}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-foreground">
                        {customer}
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {timeDate(date)}
                      </td>
                      <td className="py-3 font-mono text-xs font-bold">
                        {money(total)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'partial' || status === 'partially_paid'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="rounded-md p-2 text-muted-foreground hover:bg-muted"
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
            <Empty title="No invoices found" detail="Try updating your date filter, search query, or status filters." />
          )}
        </div>
      </div>

      {selectedInvoice && (
        <Modal
          title={`${selectedInvoice.displayType} #${String(
            selectedInvoice.invoiceNumber || selectedInvoice.invoice_number || selectedInvoice.id
          ).replace(/^INV-?/i, '')}`}
          eyebrow={
            selectedInvoice.recordType === 'udhaar'
              ? 'Udhaar Payment Receipt'
              : selectedInvoice.recordType === 'purchase'
              ? 'Supplier Restock Invoice'
              : 'Official Sales Invoice'
          }
          onClose={() => setSelectedInvoice(null)}
        >
          {/* Printable Invoice Container */}
          <div className="printable-invoice relative p-6 bg-white text-black rounded-lg border border-border overflow-hidden">
            
            {/* Zubair Traders Background Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.04]">
              <span className="text-7xl font-extrabold uppercase tracking-widest text-black -rotate-12">
                ZUBAIR TRADERS
              </span>
            </div>

            {/* Professional Header */}
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
                  {selectedInvoice.recordType === 'purchase' ? 'Purchase Invoice' : 'Tax Invoice'}
                </span>
                <p className="text-xs text-gray-600 font-mono mt-1">
                  Inv #: {String(selectedInvoice.invoiceNumber || selectedInvoice.invoice_number || selectedInvoice.id).replace(/^INV-?/i, '')}
                </p>
              </div>
            </div>

            {/* Customer & Date Info */}
            <div className="relative grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded border border-gray-200 text-xs mb-4">
              <div>
                <p className="text-gray-500 uppercase text-[10px] font-bold">
                  {selectedInvoice.recordType === 'purchase' ? 'Supplier Name' : 'Customer Name'}
                </p>
                <p className="font-bold text-black text-sm">
                  {selectedInvoice.buyerName || selectedInvoice.buyer_name || 'Walk-in Customer'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 uppercase text-[10px] font-bold">Transaction Date</p>
                <p className="font-semibold text-black">
                  {timeDate(selectedInvoice.created_at || selectedInvoice.transactionTime || selectedInvoice.transaction_time || selectedInvoice.date)}
                </p>
              </div>
            </div>

            {/* Line Items Table */}
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
                      <th className="p-2 text-right">
                        {selectedInvoice.recordType === 'purchase' ? 'Cost' : 'Unit Price'}
                      </th>
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
                        (qty * Number(item.unit_price || item.unitPrice || item.purchase_cost || item.unitCost || 0))
                      );
                      const rawUnitPrice = Number(
                        item.unit_price ??
                        item.unitPrice ??
                        item.purchase_cost ??
                        item.unitCost ??
                        0
                      );
                      const unitPrice = rawUnitPrice > 0 ? rawUnitPrice : (qty > 0 ? total / qty : 0);

                      return (
                        <tr key={idx} className="print-keep-together">
                          <td className="p-2 font-medium text-black">
                            {item.productName || item.product_name || item.name || item.products?.name || `Product #${item.product_id}`}
                          </td>
                          <td className="p-2 text-center">{qty}</td>
                          <td className="p-2 text-right">
                            {money(unitPrice)}
                          </td>
                          <td className="p-2 text-right font-mono font-bold">
                            {money(total)}
                          </td>
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

            {/* Total Summary */}
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

            {/* Invoice Footer Stamp */}
            <div className="relative text-center border-t border-gray-200 pt-3">
              <p className="text-xs font-bold text-black">Thank you for being part of Zubair Traders!!</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Zubair Traders • Authorized Computer Generated Receipt</p>
            </div>

            {/* Non-Printable Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 print:hidden border-t mt-4">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer size={15} /> Print / Save PDF
              </Button>
              <Button onClick={() => setSelectedInvoice(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}