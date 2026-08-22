import React, { useState, useMemo } from 'react';
import { FileText, Printer, Search, Filter, Calendar, X } from 'lucide-react';
import { useGetSales } from '../hooks/useSupabaseData';

export function Invoices({ PageIntro, Button, Modal, Loading, Failed, Empty, money, timeDate }: any) {
  const sales = useGetSales();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sales' | 'purchase'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [dateFilter, setDateFilter] = useState('');

  const filteredInvoices = useMemo(() => {
    if (!sales.data) return [];

    return sales.data.filter((inv: any) => {
      // Type filtering
      if (typeFilter === 'purchase') return false;

      // Status filtering
      const status = String(inv.paymentStatus || inv.payment_status || '').toLowerCase();
      if (statusFilter !== 'all') {
        if (statusFilter === 'paid' && status !== 'paid') return false;
        if (statusFilter === 'partial' && status !== 'partial' && status !== 'partially_paid') return false;
        if (statusFilter === 'unpaid' && status !== 'unpaid' && status !== 'due') return false;
      }

      // Date filtering (YYYY-MM-DD)
      if (dateFilter) {
        const rawDate = inv.created_at || inv.transactionTime;
        if (!rawDate) return false;
        const invDateStr = new Date(rawDate).toISOString().split('T')[0];
        if (invDateStr !== dateFilter) return false;
      }

      // Search query filtering
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const invNum = String(inv.invoiceNumber || inv.invoice_number || inv.id || '').toLowerCase();
        const buyer = String(inv.buyerName || inv.buyer_name || '').toLowerCase();
        return invNum.includes(query) || buyer.includes(query);
      }

      return true;
    });
  }, [sales.data, typeFilter, statusFilter, dateFilter, searchQuery]);

  return (
    <div className="animate-in space-y-6">
      <PageIntro
        eyebrow="Billing Records"
        title="Invoices Directory"
        detail="Search, filter by date, and review all line-itemized business invoices."
      />

      <div className="panel rounded-xl p-5 border border-border/80">
        {/* Filters and Controls */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by invoice # or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mr-1">
              <Filter size={14} /> Filter:
            </div>

            {/* Date Filter */}
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
              <option value="purchase">Purchase Invoices</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        {/* Invoice List Table */}
        <div className="overflow-x-auto">
          {sales.isLoading ? (
            <Loading />
          ) : sales.isError ? (
            <Failed onRetry={() => sales.refetch()} />
          ) : filteredInvoices.length > 0 ? (
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-3">Invoice #</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Client / Party</th>
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
                  const buyer = inv.buyerName || inv.buyer_name || 'Walk-in Buyer';
                  const date = inv.created_at || inv.transactionTime;
                  const total = inv.totalAmount ?? inv.total_amount ?? 0;
                  const status = String(inv.paymentStatus || inv.payment_status || 'unpaid').toLowerCase();

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className="cursor-pointer transition hover:bg-muted/40"
                    >
                      <td className="py-3 font-mono text-xs font-bold text-foreground">
                        {cleanNum}
                      </td>
                      <td className="py-3 text-xs">
                        <span className="rounded bg-muted px-2 py-0.5 font-semibold text-muted-foreground">
                          Sales
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-foreground">
                        {buyer}
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

      {/* Invoice Detail View Modal */}
      {selectedInvoice && (
        <Modal
          title={`Invoice #${String(selectedInvoice.invoiceNumber || selectedInvoice.invoice_number || selectedInvoice.id).replace(/^INV-?/i, '')}`}
          eyebrow="Invoice Itemized Statement"
          onClose={() => setSelectedInvoice(null)}
        >
          <div className="space-y-4 text-sm printable-invoice">
            <div className="flex justify-between border-b pb-3 text-xs text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">Client:</span> {selectedInvoice.buyerName || selectedInvoice.buyer_name || 'Walk-in Buyer'}
              </div>
              <div>
                <span className="font-semibold text-foreground">Date:</span> {timeDate(selectedInvoice.created_at || selectedInvoice.transactionTime)}
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
                        <td className="py-1.5 text-right font-mono">{money(item.totalPrice ?? item.total_price ?? 0)}</td>
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
                <span className="font-mono font-bold">{money(selectedInvoice.totalAmount ?? selectedInvoice.total_amount ?? 0)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Paid Amount:</span>
                <span className="font-mono font-bold">{money(selectedInvoice.paidAmount ?? selectedInvoice.paid_amount ?? 0)}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>Balance Due:</span>
                <span className="font-mono font-bold">{money(selectedInvoice.dueAmount ?? selectedInvoice.due_amount ?? 0)}</span>
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