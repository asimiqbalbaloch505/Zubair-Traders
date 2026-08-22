import React, { useState, useMemo } from 'react';
import { FileText, Printer, Search, Plus, Calendar, X, CreditCard, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useGetSales, useGetCustomers, useGetPayments } from '../hooks/useSupabaseData';

export function CustomerLedger({ PageIntro, Button, Modal, Loading, Failed, Empty, money, timeDate }: any) {
  const sales = useGetSales();
  const customers = useGetCustomers();
  const payments = useGetPayments(); // Fetch debt/collection payments

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // 1. Calculate Ledger Metrics per Customer
  const customerLedgerData = useMemo(() => {
    if (!customers.data) return [];

    const salesData = sales.data || [];
    const paymentData = payments.data || [];

    return customers.data.map((cust: any) => {
      const custId = cust.id;
      const custName = cust.name || cust.customer_name || '';

      // Get all sales invoices associated with this customer
      const custSales = salesData.filter(
        (s: any) =>
          String(s.customerId || s.customer_id) === String(custId) ||
          String(s.buyerName || s.buyer_name).toLowerCase() === custName.toLowerCase()
      );

      // Get all collection payments received from this customer
      const custPayments = paymentData.filter(
        (p: any) =>
          String(p.customerId || p.customer_id) === String(custId) ||
          String(p.customerName || p.customer_name).toLowerCase() === custName.toLowerCase()
      );

      // Aggregate Total Invoiced Amount
      const totalInvoiced = custSales.reduce(
        (sum: number, s: any) => sum + Number(s.totalAmount ?? s.total_amount ?? 0),
        0
      );

      // Initial down payments made at invoice creation time
      const initialDownPayments = custSales.reduce(
        (sum: number, s: any) => sum + Number(s.paidAmount ?? s.paid_amount ?? 0),
        0
      );

      // Total collections recorded in debt receipts
      const directReceipts = custPayments.reduce(
        (sum: number, p: any) => sum + Number(p.amount ?? p.paid_amount ?? 0),
        0
      );

      const totalPaid = initialDownPayments + directReceipts;
      const totalUdhaar = Math.max(0, totalInvoiced - totalPaid);

      return {
        ...cust,
        totalInvoiced,
        totalPaid,
        totalUdhaar,
        invoices: custSales,
        payments: custPayments,
      };
    });
  }, [customers.data, sales.data, payments.data]);

  // Selected customer object
  const activeCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customerLedgerData.find((c: any) => String(c.id) === String(selectedCustomerId)) || null;
  }, [customerLedgerData, selectedCustomerId]);

  // Unified Transaction History Timeline (Invoices + Payments)
  const customerTransactions = useMemo(() => {
    if (!activeCustomer) return [];

    const invs = activeCustomer.invoices.map((inv: any) => {
      const total = Number(inv.totalAmount ?? inv.total_amount ?? 0);
      const paid = Number(inv.paidAmount ?? inv.paid_amount ?? 0);
      const statusRaw = String(inv.paymentStatus || inv.payment_status || '').toLowerCase();

      let status = 'unpaid';
      if (statusRaw === 'paid' || paid >= total) {
        status = 'paid';
      } else if (statusRaw === 'partial' || statusRaw === 'partially_paid' || paid > 0) {
        status = 'partial';
      }

      return {
        id: inv.id,
        type: 'INVOICE',
        refNo: inv.invoiceNumber || inv.invoice_number || inv.id,
        date: inv.created_at || inv.transactionTime,
        amount: total,
        paidAmount: paid,
        dueAmount: Math.max(0, total - paid),
        status,
        raw: inv,
      };
    });

    const pmts = activeCustomer.payments.map((pmt: any) => ({
      id: pmt.id,
      type: 'PAYMENT',
      refNo: pmt.receiptNumber || pmt.receipt_number || pmt.id,
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
        return String(item.refNo).toLowerCase().includes(q);
      }
      return true;
    });
  }, [activeCustomer, dateFilter, searchQuery]);

  // Filtered customer directory list for search input
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customerLedgerData;
    const q = searchQuery.toLowerCase();
    return customerLedgerData.filter(
      (c: any) =>
        String(c.name || '').toLowerCase().includes(q) ||
        String(c.phone || '').includes(q)
    );
  }, [customerLedgerData, searchQuery]);

  if (customers.isLoading || sales.isLoading) return <Loading />;
  if (customers.isError || sales.isError) return <Failed onRetry={() => customers.refetch()} />;

  return (
    <div className="animate-in space-y-6">
      <PageIntro
        eyebrow="Financial Records"
        title="Customer Udhaar & Ledger"
        detail="Track customer credit balances, payment collection history, and detailed sales statements."
      />

      {/* Customer Selection Card Grid */}
      {!selectedCustomerId ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search customer by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-primary"
              />
            </div>
          </div>

          {filteredCustomers.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCustomers.map((cust: any) => (
                <div
                  key={cust.id}
                  onClick={() => setSelectedCustomerId(cust.id)}
                  className="group cursor-pointer rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground group-hover:text-primary">
                      {cust.name || cust.customer_name}
                    </h3>
                    <span className="text-xs text-muted-foreground">{cust.phone || 'No Phone'}</span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3 text-xs">
                    <div>
                      <span className="block text-muted-foreground">Total Dues</span>
                      <span className="font-mono font-bold text-destructive">
                        {money(cust.totalUdhaar)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-muted-foreground">Total Invoiced</span>
                      <span className="font-mono font-semibold">{money(cust.totalInvoiced)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No customers found" detail="No party accounts match your current query." />
          )}
        </div>
      ) : (
        /* Detailed Individual Ledger View */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setSelectedCustomerId('')}>
              ← Back to All Customers
            </Button>
            <div className="text-right">
              <h2 className="text-lg font-bold">{activeCustomer?.name || activeCustomer?.customer_name}</h2>
              <p className="text-xs text-muted-foreground">{activeCustomer?.phone || 'No Contact Details'}</p>
            </div>
          </div>

          {/* Customer Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <span className="text-xs text-muted-foreground">Total Sales Invoiced</span>
              <div className="mt-1 font-mono text-xl font-bold">{money(activeCustomer?.totalInvoiced || 0)}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <span className="text-xs text-muted-foreground">Total Payments Received</span>
              <div className="mt-1 font-mono text-xl font-bold text-emerald-600">
                {money(activeCustomer?.totalPaid || 0)}
              </div>
            </div>
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <span className="text-xs text-destructive">Current Udhaar (Balance Due)</span>
              <div className="mt-1 font-mono text-xl font-bold text-destructive">
                {money(activeCustomer?.totalUdhaar || 0)}
              </div>
            </div>
          </div>

          {/* Ledger Table Section */}
          <div className="panel rounded-xl border border-border/80 p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-xs">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search ledger reference #..."
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

            <div className="overflow-x-auto">
              {customerTransactions.length > 0 ? (
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="pb-3">Transaction #</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Total Amount</th>
                      <th className="pb-3">Paid / Received</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {customerTransactions.map((tx: any) => (
                      <tr
                        key={tx.id}
                        onClick={() => tx.type === 'INVOICE' && setSelectedInvoice(tx.raw)}
                        className={`transition ${tx.type === 'INVOICE' ? 'cursor-pointer hover:bg-muted/40' : ''}`}
                      >
                        <td className="py-3 font-mono text-xs font-bold text-foreground">
                          {String(tx.refNo).replace(/^INV-?/i, '')}
                        </td>
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
                <Empty title="No transactions found" detail="No ledger activity recorded for this criteria." />
              )}
            </div>
          </div>
        </div>
      )}

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