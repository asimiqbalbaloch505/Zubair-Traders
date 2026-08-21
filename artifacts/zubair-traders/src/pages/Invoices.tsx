import React, { useState, useMemo } from 'react';
import { FileText, Printer, Search, Filter } from 'lucide-react';
import { useGetSales } from '../hooks/useSupabaseData';

export function Invoices({ PageIntro, Button, Modal, Loading, Failed, Empty, money, timeDate }: any) {
  const sales = useGetSales();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sales' | 'purchase'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');

  const filteredInvoices = useMemo(() => {
    if (!sales.data) return [];
    
    return sales.data.filter((inv: any) => {
      // Type filtering
      if (typeFilter === 'purchase') return false; // Place purchase invoices check here when purchase module is connected

      // Status filtering
      if (statusFilter !== 'all' && inv.paymentStatus !== statusFilter) {
        return false;
      }

      // Search query filtering
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNum = String(inv.invoiceNumber || '').toLowerCase().includes(query);
        const matchesBuyer = String(inv.buyerName || '').toLowerCase().includes(query);
        return matchesNum || matchesBuyer;
      }

      return true;
    });
  }, [sales.data, typeFilter, statusFilter, searchQuery]);

  return (
    <div className="animate-in space-y-6">
      <PageIntro
        eyebrow="Billing Records"
        title="Invoices Directory"
        detail="Search, filter, and review all line-itemized business invoices."
      />

      <div className="panel rounded-xl p-5 border border-border/80">
        {/* Filters and Controls */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                {filteredInvoices.map((inv: any) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className="cursor-pointer transition hover:bg-muted/40"
                  >
                    <td className="py-3 font-mono text-xs font-bold text-foreground">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 text-xs">
                      <span className="rounded bg-muted px-2 py-0.5 font-semibold text-muted-foreground">
                        Sales
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-foreground">
                      {inv.buyerName}
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">
                      {timeDate(inv.transactionTime)}
                    </td>
                    <td className="py-3 font-mono text-xs font-bold">
                      {money(inv.totalAmount)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          inv.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.paymentStatus === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {inv.paymentStatus}
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
                ))}
              </tbody>
            </table>
          ) : (
            <Empty title="No invoices found" detail="Try updating your search query or filters." />
          )}
        </div>
      </div>

      {/* Invoice Detail View Modal */}
      {selectedInvoice && (
        <Modal
          title={`Invoice #${String(selectedInvoice.invoiceNumber).replace(/^INV-?/i, '')}`}
          eyebrow="Invoice Itemized Statement"
          onClose={() => setSelectedInvoice(null)}
        >
          <div className="space-y-4 text-sm printable-invoice">
            <div className="flex justify-between border-b pb-3 text-xs text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">Client:</span> {selectedInvoice.buyerName}
              </div>
              <div>
                <span className="font-semibold text-foreground">Date:</span> {timeDate(selectedInvoice.transactionTime)}
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
                        <td className="py-1.5 font-medium">{item.productName}</td>
                        <td className="py-1.5 text-center">{item.quantity}</td>
                        <td className="py-1.5 text-right">{money(item.unitPrice)}</td>
                        <td className="py-1.5 text-right font-mono">{money(item.totalPrice)}</td>
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
                <span className="font-mono font-bold">{money(selectedInvoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Paid Amount:</span>
                <span className="font-mono font-bold">{money(selectedInvoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>Balance Due:</span>
                <span className="font-mono font-bold">{money(selectedInvoice.dueAmount)}</span>
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