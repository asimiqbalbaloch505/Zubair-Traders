import React, { useState, useMemo } from 'react';
import { FileText, Printer, Search, Filter, Calendar, X, Building2 } from 'lucide-react';
import { useGetSales, useGetBuyerPayments, useGetPurchases } from '../hooks/useSupabaseData';

interface InvoicesProps {
  PageIntro: React.ComponentType<any>;
  Button: React.ComponentType<any>;
  Modal: React.ComponentType<any>;
  InvoiceModal: React.ComponentType<any>; // <-- ADDED THIS
  Loading: React.ComponentType<any>;
  Failed: React.ComponentType<{ onRetry: () => void }>;
  Empty: React.ComponentType<{ title: string; detail: string }>;
  money: (amount: number) => string;
  timeDate: (date: string | Date) => string;
}

export function Invoices({ PageIntro, Button, Modal, InvoiceModal, Loading, Failed, Empty, money, timeDate }: InvoicesProps) {
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
      const purNo = pur.purchaseNumber || pur.purchase_number 
  ? `PUR-${pur.purchase_number || pur.purchaseNumber}` 
  : pur.id 
  ? `PUR-${pur.id}` 
  : 'PUR-INV';
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
                  const invNo = inv.invoiceNumber || inv.invoice_number || inv.purchaseNumber || inv.purchase_number || inv.id;
const cleanNum = String(invNo).replace(/^(INV|PUR|REC)-?/i, '');
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
        <InvoiceModal
          sale={{
            id: selectedInvoice.id,
            invoice_number: selectedInvoice.invoiceNumber || selectedInvoice.invoice_number || selectedInvoice.purchaseNumber || selectedInvoice.id,
            buyer_name: selectedInvoice.buyerName || selectedInvoice.buyer_name || 'Walk-in Customer',
            transaction_time: selectedInvoice.created_at || selectedInvoice.transactionTime || selectedInvoice.transaction_time || selectedInvoice.date,
            total_amount: selectedInvoice.totalAmount ?? selectedInvoice.total_amount ?? 0,
            paid_amount: selectedInvoice.paidAmount ?? selectedInvoice.paid_amount ?? 0,
            due_amount: selectedInvoice.dueAmount ?? selectedInvoice.due_amount ?? 0,
            payment_status: selectedInvoice.paymentStatus || selectedInvoice.payment_status || 'paid',
            items: selectedInvoice.items && selectedInvoice.items.length > 0 
              ? selectedInvoice.items 
              : selectedInvoice.recordType === 'udhaar'
              ? [
                  {
                    id: selectedInvoice.id,
                    product_name: selectedInvoice.notes || 'Udhaar Payment Collection',
                    quantity: 1,
                    unit_price: selectedInvoice.totalAmount ?? selectedInvoice.total_amount ?? 0,
                    total_price: selectedInvoice.totalAmount ?? selectedInvoice.total_amount ?? 0,
                  },
                ]
              : [],
          }}
          onClose={() => setSelectedInvoice(null)}
          Modal={Modal}
          Button={Button}
          money={money}
        />
      )}
    </div>
  );
}