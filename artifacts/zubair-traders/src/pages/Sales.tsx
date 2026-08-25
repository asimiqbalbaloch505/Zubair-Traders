import React, { useState, useMemo } from 'react';
import { ErrorDialog } from '../components/ErrorDialog';
import { 
  Plus, Check, X, FileText, ShoppingCart, AlertCircle, Building2, UserPlus, Edit3, CheckCircle2
} from 'lucide-react';
import { 
  useGetSales, getGetSalesQueryKey, 
  useGetBuyers, getGetBuyersQueryKey, 
  useGetProducts, getGetProductsQueryKey, 
  getGetDashboardQueryKey,
  useCreateSale,
  useCreateBuyer
} from '../hooks/useSupabaseData';
import { useQueryClient } from '@tanstack/react-query';
import { InvoiceModal } from '../components/invoiceModal';

export interface SaleItemInput {
  productId: number | string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SalesInvoice {
  id?: number | string;
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
  items?: any[];
}

export function Sales({ PageIntro, Button, Field, Modal, Loading, Failed, Empty, money, timeDate }: any) {
  const sales = useGetSales({ query: { queryKey: getGetSalesQueryKey() } });
  const buyers = useGetBuyers({ query: { queryKey: getGetBuyersQueryKey() } });
  const products = useGetProducts({ query: { queryKey: getGetProductsQueryKey() } });
  
  const create = useCreateSale();
  const createBuyer = useCreateBuyer();
  const qc = useQueryClient();

  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);

  const [buyerId, setBuyerId] = useState('');
  const [items, setItems] = useState<SaleItemInput[]>([]);
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');

  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemUnitPrice, setItemUnitPrice] = useState('');

  // Confirmation Modal State
  const [isConfirming, setIsConfirming] = useState(false);

  // Add Customer Modal State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerCnic, setNewCustomerCnic] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [customerModalError, setCustomerModalError] = useState<string | null>(null);

  const openCustomerModal = () => {
    setIsCustomerModalOpen(true);
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    if (!productId) {
      setItemUnitPrice('');
      return;
    }
    const prod = products.data?.find((p: any) => String(p.id) === String(productId));
    if (prod) {
      const defaultPrice = Number(prod.salePrice || prod.sellingPrice || prod.price || prod.sale_price || 0);
      setItemUnitPrice(String(defaultPrice));
    }
  };

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [items]);

  const paid = Number(paidAmount) || 0;
  const due = Math.max(totalAmount - paid, 0);

  const selectedBuyerObj = useMemo(() => {
    return buyers.data?.find((b: any) => String(b.id) === String(buyerId));
  }, [buyers.data, buyerId]);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    setCustomerModalError(null);

    const payload = {
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim(),
      cnic: newCustomerCnic.trim(),
      address: newCustomerAddress.trim(),
    };

    createBuyer.mutate(
      { data: payload as any },
      {
        onSuccess: (data: any) => {
          qc.invalidateQueries({ queryKey: getGetBuyersQueryKey() });
          setIsCustomerModalOpen(false);
          setNewCustomerName('');
          setNewCustomerPhone('');
          setNewCustomerCnic('');
          setNewCustomerAddress('');

          const created = Array.isArray(data) ? data[0] : data;
          if (created && created.id) {
            setBuyerId(String(created.id));
          }
        },
        onError: (err: any) => {
          console.error('Supabase Customer Creation Error:', err);
          setCustomerModalError(err?.message || 'Failed to add customer. Please try again.');
        },
      }
    );
  };

  const addItem = () => {
    if (!selectedProductId) return;
    const prod = products.data?.find((p: any) => String(p.id) === String(selectedProductId));
    if (!prod) return;

    const availableStock = Number(prod.stockQuantity ?? prod.stock_quantity ?? prod.stock ?? prod.quantity ?? 0);

    if (availableStock <= 0) {
      setStockError(`Cannot add "${prod.name}" as it is currently out of stock.`);
      return;
    }

    const requestedQty = Math.max(Number(itemQty) || 1, 1);
    const customUnitPrice = Math.max(Number(itemUnitPrice) || 0, 0);

    const existingCartItem = items.find(i => String(i.productId) === String(prod.id));
    const currentCartQty = existingCartItem ? existingCartItem.quantity : 0;

    if (currentCartQty + requestedQty > availableStock) {
      setStockError(`Cannot add line item. Total requested (${currentCartQty + requestedQty}) exceeds available stock (${availableStock}).`);
      return;
    }

    setErrorMessage(null);
    setStockError(null);

    setItems(prev => {
      if (existingCartItem) {
        return prev.map(item => {
          if (String(item.productId) === String(prod.id)) {
            const newQty = item.quantity + requestedQty;
            return {
              ...item,
              quantity: newQty,
              unitPrice: customUnitPrice,
              totalPrice: newQty * customUnitPrice,
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
          unitPrice: customUnitPrice,
          totalPrice: customUnitPrice * requestedQty,
        },
      ];
    });

    setSelectedProductId('');
    setItemQty('1');
    setItemUnitPrice('');
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Pre-submit validation opens confirmation modal
  const handleOpenConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerId || items.length === 0) return;
    setIsConfirming(true);
  };

  // Actual DB post on confirmation
  const handleFinalSubmit = () => {
    setErrorMessage(null);

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
          setIsConfirming(false);
          setIsSuccessModalOpen(true);
          setBuyerId('');
          setItems([]);
          setPaidAmount('');
          setNotes('');
        },
        onError: (err: any) => {
          console.error('Supabase Sale Creation Error:', err);
          setIsConfirming(false);
          setErrorMessage(err?.message || 'Failed to post sale. Please check your data.');
        },
      }
    );
  };

  const recentSales = useMemo(() => {
    if (!sales.data) return [];
    return sales.data.slice(0, 50);
  }, [sales.data]);

  return (
    <div className="animate-in w-full flex flex-col justify-start pt-0 mt-0">
      <PageIntro eyebrow="Fast lane" title="Make a sale" detail="A clean invoice now means a clean drawer later." />

      <div className="flex flex-col gap-5">
        {/* SALE FORM SECTION - Enhanced Mobile UI */}
        <section className="panel rounded-xl p-3.5 sm:p-5">
          <div className="mb-4 sm:mb-5 flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Record New Sale</h3>
              <p className="text-xs text-muted-foreground">Select customer and add line items</p>
            </div>
          </div>

          <form onSubmit={handleOpenConfirmation} className="grid gap-4">
            {/* Customer Dropdown with Add Button */}
            <div className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <span>Customer</span>
                <button
                  type="button"
                  onClick={openCustomerModal}
                  className="flex items-center gap-1 text-xs text-primary font-bold hover:underline cursor-pointer shrink-0"
                >
                  <UserPlus size={14} /> + New Customer
                </button>
              </div>
              <select
                data-testid="select-buyer"
                required
                value={buyerId}
                onChange={e => setBuyerId(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-primary truncate"
              >
                <option value="">Choose a Customer…</option>
                {buyers.data?.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.phone ? `· ${b.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Picker Box */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">Add Products to Sale</div>
              
              {/* Stacked layout on mobile, inline on desktop */}
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <select
                  value={selectedProductId}
                  onChange={e => handleProductSelect(e.target.value)}
                  className="h-10 w-full sm:flex-1 rounded-lg border border-input bg-background px-3 text-sm font-medium outline-none focus:border-primary truncate"
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

                {/* Mobile: Full-width Qty/Price/Add Row */}
                <div className="grid grid-cols-12 gap-2 w-full sm:w-auto">
                  <div className="col-span-3 sm:w-20">
                    <input
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={e => setItemQty(e.target.value)}
                      placeholder="Qty"
                      title="Quantity"
                      className="h-10 w-full rounded-lg border border-input bg-background px-2 text-center text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="col-span-5 sm:w-28">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={itemUnitPrice}
                      onChange={e => setItemUnitPrice(e.target.value)}
                      placeholder="Unit Price"
                      title="Custom Unit Price"
                      className="h-10 w-full rounded-lg border border-input bg-background px-2 text-center text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="col-span-4 sm:w-auto">
                    <Button 
                      testId="button-add-item" 
                      type="button" 
                      onClick={addItem} 
                      disabled={!selectedProductId}
                      className="h-10 w-full sm:w-auto shrink-0 px-3 flex items-center justify-center gap-1"
                    >
                      <Plus size={16} /> <span>Add</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Added Cart Items List */}
              {items.length > 0 && (
                <div className="mt-3 divide-y border-t pt-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 text-xs gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{item.productName}</p>
                        <p className="text-muted-foreground text-[11px]">
                          x{item.quantity} @ {money(item.unitPrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold">{money(item.totalPrice)}</span>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-destructive hover:opacity-80 p-1"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total and Paid Amount Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
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

            {/* Balance Due Counter Box */}
            <div className="rounded-lg bg-muted p-3">
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Udhar on this invoice</span>
                <span className="font-mono font-bold text-foreground text-sm">{money(due)}</span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={create.isPending || !buyerId || items.length === 0}
              testId="button-create-sale"
              className="h-11 w-full flex items-center justify-center gap-2 font-semibold"
            >
              <Check size={17} /> Confirm sale
            </Button>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded bg-destructive/10 p-2.5 text-xs font-semibold text-destructive">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </form>
        </section>

        {/* UNCHANGED INVOICES TABLE SECTION */}
        <section className="panel rounded-xl p-3.5 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base sm:text-lg">Recent invoices</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Click any invoice to view full details</p>
            </div>
          </div>

          <div className="mt-4 sm:mt-5 overflow-x-auto -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
            {sales.isLoading ? (
              <Loading />
            ) : sales.isError ? (
              <Failed onRetry={() => sales.refetch()} />
            ) : recentSales.length ? (
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="pb-3">Invoice #</th>
                    <th className="pb-3">Customer & Time</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {recentSales.map((s: any) => {
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
                          <div className="max-w-[140px] sm:max-w-none truncate">
                            {s.buyerName || s.buyer_name || 'Walk-in Customer'}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-normal">
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
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
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
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
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

      {/* Confirmation & Invoice Preview Modal */}
      {isConfirming && (
        <Modal
          title="Confirm Sale Invoice"
          eyebrow="Review Details Before Posting"
          onClose={() => setIsConfirming(false)}
        >
          <div className="space-y-4">
            <div className="printable-invoice relative p-3.5 sm:p-6 bg-white text-black rounded-lg border border-border overflow-hidden">
              <div className="relative flex flex-col sm:flex-row justify-between items-start border-b border-black/20 pb-3 sm:pb-4 mb-3 sm:mb-4 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 size={20} className="text-black shrink-0" />
                    <h1 className="text-base sm:text-xl font-bold uppercase tracking-wider text-black">
                      Zubair Traders
                    </h1>
                  </div>
                  <p className="text-[11px] sm:text-xs text-gray-600 mt-0.5 font-medium">
                    Bakery & General Traders Management
                  </p>
                </div>
                <div className="self-start sm:self-auto">
                  <span className="inline-block px-2.5 py-0.5 bg-black text-white text-[10px] sm:text-xs font-bold uppercase rounded">
                    Draft Invoice
                  </span>
                </div>
              </div>

              <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-2.5 sm:p-3 rounded border border-gray-200 text-xs mb-3 sm:mb-4">
                <div>
                  <p className="text-gray-500 uppercase text-[10px] font-bold">Customer Name</p>
                  <p className="font-bold text-black text-xs sm:text-sm">
                    {selectedBuyerObj?.name || 'Walk-in Customer'}
                  </p>
                  {selectedBuyerObj?.phone && (
                    <p className="text-gray-600 text-[11px]">{selectedBuyerObj.phone}</p>
                  )}
                </div>
                <div className="sm:text-right">
                  <p className="text-gray-500 uppercase text-[10px] font-bold">Transaction Date</p>
                  <p className="font-semibold text-black text-[11px] sm:text-xs">
                    {new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>

              <div className="border border-gray-200 rounded overflow-x-auto mb-3 sm:mb-4">
                <table className="w-full text-left text-xs min-w-[300px]">
                  <thead className="bg-gray-100 border-b border-gray-200 text-black font-bold uppercase text-[9px] sm:text-[10px]">
                    <tr>
                      <th className="p-1.5 sm:p-2">Item</th>
                      <th className="p-1.5 sm:p-2 text-center">Qty</th>
                      <th className="p-1.5 sm:p-2 text-right">Price</th>
                      <th className="p-1.5 sm:p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-[11px] sm:text-xs">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-1.5 sm:p-2 font-medium text-black max-w-[120px] truncate">{item.productName}</td>
                        <td className="p-1.5 sm:p-2 text-center">{item.quantity}</td>
                        <td className="p-1.5 sm:p-2 text-right">{money(item.unitPrice)}</td>
                        <td className="p-1.5 sm:p-2 text-right font-mono font-bold">{money(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="relative flex justify-end mb-3 sm:mb-4">
                <div className="w-full sm:w-64 space-y-1.5 bg-gray-50 border border-gray-200 p-2.5 sm:p-3 rounded text-xs">
                  <div className="flex justify-between text-gray-700">
                    <span>Total Amount:</span>
                    <span className="font-mono font-bold text-black">{money(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800">
                    <span>Paid Amount:</span>
                    <span className="font-mono font-bold">{money(paid)}</span>
                  </div>
                  <div className="flex justify-between text-red-700 border-t border-gray-300 pt-1 font-bold">
                    <span>Balance Due:</span>
                    <span className="font-mono">{money(due)}</span>
                  </div>
                </div>
              </div>

              {notes && (
                <div className="text-xs text-gray-600">
                  <strong className="text-black">Notes:</strong> {notes}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsConfirming(false)}
                className="flex items-center justify-center gap-1.5 h-10"
              >
                <Edit3 size={15} /> Edit Invoice
              </Button>
              <Button
                type="button"
                onClick={handleFinalSubmit}
                disabled={create.isPending}
                className="flex items-center justify-center gap-1.5 h-10 bg-emerald-800 hover:bg-emerald-900 text-white"
              >
                {create.isPending ? 'Saving Invoice...' : <><Check size={16} /> Confirm & Save Invoice</>}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Success Popup Modal */}
      {isSuccessModalOpen && (
        <Modal
          title="Success"
          eyebrow="System Notification"
          onClose={() => setIsSuccessModalOpen(false)}
        >
          <div className="flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-4">
            <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Record saved successfully
            </h3>
            <p className="text-xs text-muted-foreground">
              The sale record has been stored and inventory balances have been updated.
            </p>
            <div className="pt-2 w-full">
              <Button
                type="button"
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-full h-10 bg-emerald-800 hover:bg-emerald-900 text-white"
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add New Customer Modal */}
      {isCustomerModalOpen && (
        <Modal
          title="Add customer"
          eyebrow="CUSTOMER BOOK"
          onClose={() => setIsCustomerModalOpen(false)}
        >
          <form onSubmit={handleCreateCustomer} className="grid gap-3 sm:gap-4 pt-2">
            <Field
              label="Name"
              name="new-customer-name"
              value={newCustomerName}
              onChange={setNewCustomerName}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Phone"
                name="new-customer-phone"
                value={newCustomerPhone}
                onChange={setNewCustomerPhone}
                required
              />

              <Field
                label="CNIC"
                name="new-customer-cnic"
                value={newCustomerCnic}
                onChange={setNewCustomerCnic}
              />
            </div>

            <Field
              label="Address"
              name="new-customer-address"
              value={newCustomerAddress}
              onChange={setNewCustomerAddress}
            />

            {customerModalError && (
              <div className="flex items-center gap-2 rounded bg-destructive/10 p-2.5 text-xs font-semibold text-destructive">
                <AlertCircle size={15} className="shrink-0" />
                <span>{customerModalError}</span>
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" disabled={createBuyer.isPending} className="w-full h-11 bg-emerald-800 text-white hover:bg-emerald-900">
                {createBuyer.isPending ? 'Saving…' : 'Save customer'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reusable Invoice Detail Modal for Viewing Past Invoices */}
      {selectedInvoice && (
        <InvoiceModal 
          sale={selectedInvoice} 
          onClose={() => setSelectedInvoice(null)} 
          Modal={Modal}
          Button={Button}
          money={money}
        />
      )}

      {/* Viewport-Centered Stock Alert Error Dialog */}
      <ErrorDialog
        open={!!stockError}
        title="Stock Limit Exceeded"
        description={stockError}
        onClose={() => setStockError(null)}
      />
    </div>
  );
}