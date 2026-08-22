import React, { useState, useMemo } from 'react';
import { 
  Plus, Check, X, Printer, FileText, ShoppingCart, AlertCircle
} from 'lucide-react';
import { 
  useGetSales, getGetSalesQueryKey, 
  useGetBuyers, getGetBuyersQueryKey, 
  useGetProducts, getGetProductsQueryKey, 
  getGetDashboardQueryKey,
  useCreateSale 
} from '../hooks/useSupabaseData';
import { useQueryClient } from '@tanstack/react-query';

export interface SaleItemInput {
  productId: number | string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SalesInvoice {
  id: number | string;
  invoiceNumber?: string | number;
  invoice_number?: string | number;
  buyerId?: number | string;
  buyer_id?: number | string;
  buyerName?: string;
  buyer_name?: string;
  totalAmount?: number;
  total_amount?: number;
  paidAmount?: number;
  paid_amount?: number;
  dueAmount?: number;
  due_amount?: number;
  paymentStatus?: 'paid' | 'partial' | 'unpaid' | 'PAID' | 'PARTIALLY_PAID' | 'DUE';
  payment_status?: 'paid' | 'partial' | 'unpaid' | 'PAID' | 'PARTIALLY_PAID' | 'DUE';
  transactionTime?: string;
  created_at?: string;
  notes?: string;
  items?: SaleItemInput[];
}

function InvoiceDetailModal({ sale, onClose, Modal, Button, money }: any) {
  const formattedDate = sale.created_at || sale.transactionTime 
    ? new Date(sale.created_at || sale.transactionTime).toLocaleString('en-PK', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  const rawInv = sale.invoice_number || sale.invoiceNumber || sale.id;
  const cleanInvoiceNo = String(rawInv).replace(/^INV-?/i, '');
  const total = sale.total_amount ?? sale.totalAmount ?? 0;
  const paid = sale.paid_amount ?? sale.paidAmount ?? 0;
  const due = sale.due_amount ?? sale.dueAmount ?? Math.max(total - paid, 0);

  return (
    <Modal title={`Invoice #${cleanInvoiceNo}`} eyebrow="Sales Receipt Detail" onClose={onClose}>
      <div className="space-y-4 text-sm printable-invoice">
        <div className="flex justify-between border-b pb-3 text-xs text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">Buyer:</span> {sale.buyerName || sale.buyer_name || 'Walk-in Buyer'}
          </div>
          <div>
            <span className="font-semibold text-foreground">Date & Time:</span> {formattedDate}
          </div>
        </div>

        {sale.items && sale.items.length > 0 ? (
          <div className="max-h-56 overflow-y-auto border-y py-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-1">Item</th>
                  <th className="pb-1 text-center">Qty</th>
                  <th className="pb-1 text-right">Price</th>
                  <th className="pb-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sale.items.map((item: SaleItemInput, idx: number) => (
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
            No itemized products linked to this invoice.
          </div>
        )}

        <div className="space-y-1.5 rounded-lg bg-muted/60 p-3 text-xs">
          <div className="flex justify-between">
            <span>Total Amount:</span>
            <span className="font-mono font-bold">{money(total)}</span>
          </div>
          <div className="flex justify-between text-emerald-700">
            <span>Paid Amount:</span>
            <span className="font-mono font-bold">{money(paid)}</span>
          </div>
          <div className="flex justify-between text-destructive">
            <span>Balance Due:</span>
            <span className="font-mono font-bold">{money(due)}</span>
          </div>
        </div>

        {sale.notes && (
          <div className="text-xs text-muted-foreground">
            <strong className="text-foreground">Notes:</strong> {sale.notes}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 print:hidden">
          <Button variant="outline" testId="button-modal-print" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </Button>
          <Button testId="button-modal-close" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function Sales({ PageIntro, Button, Field, Modal, Loading, Failed, Empty, money, timeDate }: any) {
  const sales = useGetSales({ query: { queryKey: getGetSalesQueryKey() } });
  const buyers = useGetBuyers({ query: { queryKey: getGetBuyersQueryKey() } });
  const products = useGetProducts({ query: { queryKey: getGetProductsQueryKey() } });
  
  const create = useCreateSale();
  const qc = useQueryClient();

  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);

  const [buyerId, setBuyerId] = useState('');
  const [items, setItems] = useState<SaleItemInput[]>([]);
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');

  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState('1');

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [items]);

  const paid = Number(paidAmount) || 0;
  const due = Math.max(totalAmount - paid, 0);

  const addItem = () => {
    if (!selectedProductId) return;
    const prod = products.data?.find((p: any) => String(p.id) === String(selectedProductId));
    if (!prod) return;

    const availableStock = Number(prod.stockQuantity ?? prod.stock_quantity ?? prod.stock ?? prod.quantity ?? 0);

    if (availableStock <= 0) {
      setErrorMessage(`Cannot add "${prod.name}" as it is currently out of stock.`);
      return;
    }

    const requestedQty = Math.max(Number(itemQty) || 1, 1);
    const existingCartItem = items.find(i => String(i.productId) === String(prod.id));
    const currentCartQty = existingCartItem ? existingCartItem.quantity : 0;

    if (currentCartQty + requestedQty > availableStock) {
      setErrorMessage(`Cannot add line item. Total requested (${currentCartQty + requestedQty}) exceeds available stock (${availableStock}).`);
      return;
    }

    setErrorMessage(null);
    const unitPrice = Number(prod.salePrice || prod.sellingPrice || prod.price || prod.sale_price || 0);

    setItems(prev => {
      if (existingCartItem) {
        return prev.map(item => {
          if (String(item.productId) === String(prod.id)) {
            const newQty = item.quantity + requestedQty;
            return {
              ...item,
              quantity: newQty,
              totalPrice: newQty * item.unitPrice,
            };
          }
          return item;
        });
      }
      return [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          quantity: requestedQty,
          unitPrice,
          totalPrice: unitPrice * requestedQty,
        },
      ];
    });

    setSelectedProductId('');
    setItemQty('1');
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerId || items.length === 0) return;

    setErrorMessage(null);
    setDone(false);

    const dbPaymentStatus = due <= 0 ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'DUE';

    const payload = {
      buyerId: String(buyerId),
      buyer_id: String(buyerId),
      totalAmount: totalAmount,
      total_amount: totalAmount,
      paidAmount: paid,
      paid_amount: paid,
      dueAmount: due,
      due_amount: due,
      paymentStatus: dbPaymentStatus,
      payment_status: dbPaymentStatus,
      notes: notes || null,
      items: items,
    };

    create.mutate(
      { data: payload as any },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetSalesQueryKey() });
          qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          setDone(true);
          setBuyerId('');
          setItems([]);
          setPaidAmount('');
          setNotes('');
        },
        onError: (err: any) => {
          console.error('Supabase Sale Creation Error:', err);
          setErrorMessage(err?.message || 'Failed to post sale. Please check your data.');
        },
      }
    );
  };

  return (
    <div className="animate-in">
      <PageIntro eyebrow="Fast lane" title="Make a sale" detail="A clean invoice now means a clean drawer later." />

      <div className="flex flex-col gap-5">
        <section className="panel rounded-xl p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-primary">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h3 className="font-bold">New invoice</h3>
              <p className="text-xs text-muted-foreground">Select buyer and add line items</p>
            </div>
          </div>

          <form onSubmit={submit} className="grid gap-4">
            <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
              Buyer
              <select
                data-testid="select-buyer"
                required
                value={buyerId}
                onChange={e => setBuyerId(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-primary"
              >
                <option value="">Choose a buyer…</option>
                {buyers.data?.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name} · {b.phone}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">Add Products to Sale</div>
              <div className="flex gap-2">
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm font-medium outline-none focus:border-primary"
                >
                  <option value="">Select product...</option>
                  {products.data?.map((p: any) => {
                    const availableStock = Number(p.stockQuantity ?? p.stock_quantity ?? p.stock ?? p.quantity ?? 0);
                    const isOutOfStock = availableStock <= 0;
                    const stockText = isOutOfStock ? '— (Out of Stock)' : `| Stock: ${availableStock}`;
                    
                    return (
                      <option key={p.id} value={p.id} disabled={isOutOfStock}>
                        {p.name} ({money(p.salePrice || p.sellingPrice || p.price || p.sale_price)}) {stockText}
                      </option>
                    );
                  })}
                </select>
                <input
                  type="number"
                  min="1"
                  value={itemQty}
                  onChange={e => setItemQty(e.target.value)}
                  placeholder="Qty"
                  className="h-10 w-20 rounded-lg border border-input bg-background px-2 text-center text-sm outline-none focus:border-primary"
                />
                <Button testId="button-add-item" type="button" onClick={addItem} disabled={!selectedProductId}>
                  <Plus size={16} /> Add
                </Button>
              </div>

              {items.length > 0 && (
                <div className="mt-3 divide-y border-t pt-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5 text-xs">
                      <div>
                        <span className="font-semibold">{item.productName}</span>
                        <span className="ml-2 text-muted-foreground">
                          x{item.quantity} @ {money(item.unitPrice)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{money(item.totalPrice)}</span>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-destructive hover:opacity-80"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 items-start">
              <Field
                label="Sale total"
                name="sale-total"
                value={money(totalAmount)}
                readOnly
                disabled
              />
              
              <Field
                label="Paid now"
                name="paid-amount"
                type="number"
                value={paidAmount}
                onChange={setPaidAmount}
                required
                placeholder="0"
              />
            </div>

            <Field
              label="Note (optional)"
              name="sale-note"
              value={notes}
              onChange={setNotes}
              placeholder="Delivery route, order detail…"
            />

            <div className="rounded-lg bg-muted p-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Due on this invoice</span>
                <span className="font-mono font-bold text-foreground">{money(due)}</span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={create.isPending || !buyerId || items.length === 0}
              testId="button-create-sale"
              className="h-11"
            >
              {create.isPending ? 'Saving invoice…' : <><Check size={17} /> Confirm sale</>}
            </Button>

            {done && (
              <div data-testid="status-sale-success" className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <Check size={14} /> Invoice posted successfully.
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2 rounded bg-destructive/10 p-2.5 text-xs font-semibold text-destructive">
                <AlertCircle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}
          </form>
        </section>

        <section className="panel rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Recent invoices</h3>
              <p className="mt-1 text-xs text-muted-foreground">Click any invoice to view full details</p>
            </div>
            <Button variant="outline" onClick={() => window.print()} testId="button-print-sales">
              <Printer size={15} /> Print list
            </Button>
          </div>

          <div className="mt-5 overflow-x-auto">
            {sales.isLoading ? (
              <Loading />
            ) : sales.isError ? (
              <Failed onRetry={() => sales.refetch()} />
            ) : sales.data?.length ? (
              <table className="w-full min-w-[550px] text-left text-sm">
                <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="pb-3">Invoice #</th>
                    <th className="pb-3">Buyer & Time</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {sales.data.map((s: any) => {
                    const invNo = s.invoice_number || s.invoiceNumber || s.id;
                    const cleanNum = String(invNo).replace(/^INV-?/i, '');
                    const tot = s.total_amount ?? s.totalAmount ?? 0;
                    const du = s.due_amount ?? s.dueAmount ?? 0;
                    const status = s.payment_status || s.paymentStatus || 'unpaid';

                    return (
                      <tr
                        key={s.id}
                        data-testid={`row-sale-${s.id}`}
                        className="cursor-pointer transition hover:bg-muted/40"
                        onClick={() => setSelectedInvoice(s)}
                      >
                        <td className="py-3 font-mono text-xs font-bold">{cleanNum}</td>
                        <td className="py-3 font-semibold">
                          {s.buyerName || s.buyer_name || 'Walk-in Buyer'}
                          <div className="text-[10px] text-muted-foreground">
                            {timeDate(s.created_at || s.transactionTime)}
                          </div>
                        </td>
                        <td className="py-3 font-mono">
                          {money(tot)}
                          <div className="text-[10px] text-muted-foreground">Due {money(du)}</div>
                        </td>
                        <td className="py-3">
                          <span
                            data-testid={`status-sale-${s.id}`}
                            className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                              String(status).toLowerCase() === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-secondary text-primary'
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <button
                              title="View detail"
                              onClick={() => setSelectedInvoice(s)}
                              className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                            >
                              <FileText size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <Empty title="No invoices yet" detail="Your next sale will appear here for fast follow-up." />
            )}
          </div>
        </section>
      </div>

      {selectedInvoice && (
        <InvoiceDetailModal 
          sale={selectedInvoice} 
          onClose={() => setSelectedInvoice(null)} 
          Modal={Modal}
          Button={Button}
          money={money}
        />
      )}
    </div>
  );
}