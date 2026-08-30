import React, { useState, useEffect } from 'react';
import { Plus, PackagePlus, AlertTriangle, RefreshCw } from 'lucide-react';
import { 
  useGetProducts, 
  getGetProductsQueryKey, 
  useCreateProduct,
  useGetSuppliers,
  useCreatePurchase,
  getGetSuppliersQueryKey
} from '../hooks/useSupabaseData';
import { useQueryClient } from '@tanstack/react-query';

export function Products({ PageIntro, Button, Field, Modal, Loading, Failed, Empty, money }: any) {
  const qc = useQueryClient();
  const q = useGetProducts({ query: { queryKey: getGetProductsQueryKey() } });
  const suppliersQuery = useGetSuppliers({ query: { queryKey: getGetSuppliersQueryKey() } });
  
  const createProduct = useCreateProduct();
  const createPurchase = useCreatePurchase();

  // Modal States
  const [addProductModal, setAddProductModal] = useState(false);
  const [restockModal, setRestockModal] = useState(false);

  // Form State for Add Product
  const [productForm, setProductForm] = useState({
    name: '',
    unit: 'pcs',
    purchaseCost: '',
    sellingPrice: '',
    stockQuantity: '',
    minStockAlert: ''
  });

  // Form State for Restock
  const [restockForm, setRestockForm] = useState({
    supplierId: '',
    productId: '',
    purchaseCost: '',
    sellingPrice: '',
    quantity: '1',
    paidAmount: '',
    notes: ''
  });

  // Compute Total Cost dynamically: Quantity * Purchase Cost
  const computedTotalCost = (Number(restockForm.quantity) || 0) * (Number(restockForm.purchaseCost) || 0);

  // Auto-sync Paid Amount whenever Quantity or Purchase Cost changes
  useEffect(() => {
    setRestockForm(prev => ({
      ...prev,
      paidAmount: String(computedTotalCost)
    }));
  }, [restockForm.quantity, restockForm.purchaseCost]);

  // Handle Product Select in Restock Modal (Pre-fills default prices & auto-calculates paid amount)
  const handleSelectProductForRestock = (productId: string) => {
    const selectedProd = q.data?.find((p: any) => String(p.id) === String(productId));
    if (selectedProd) {
      const cost = Number(selectedProd.purchaseCost ?? 0);
      const qty = Number(restockForm.quantity) || 1;
      const initialTotal = qty * cost;

      setRestockForm(prev => ({
        ...prev,
        productId,
        purchaseCost: String(cost),
        sellingPrice: String(selectedProd.sellingPrice ?? ''),
        paidAmount: String(initialTotal)
      }));
    } else {
      setRestockForm(prev => ({ ...prev, productId }));
    }
  };

  // Open Restock Modal directly for a specific row item
  const openRestockForProduct = (product: any) => {
    const cost = Number(product.purchaseCost ?? 0);
    const initialQty = 1;
    const initialTotal = initialQty * cost;

    setRestockForm({
      supplierId: suppliersQuery.data?.[0]?.id || '',
      productId: String(product.id),
      purchaseCost: String(cost),
      sellingPrice: String(product.sellingPrice ?? ''),
      quantity: String(initialQty),
      paidAmount: String(initialTotal),
      notes: ''
    });
    setRestockModal(true);
  };

  // Handle Add Product Submission
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProduct.mutate(
      {
        data: {
          ...productForm,
          purchaseCost: Number(productForm.purchaseCost),
          sellingPrice: Number(productForm.sellingPrice),
          stockQuantity: Number(productForm.stockQuantity || 0),
          minStockAlert: Number(productForm.minStockAlert || 5)
        }
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });
          setAddProductModal(false);
          setProductForm({
            name: '',
            unit: 'pcs',
            purchaseCost: '',
            sellingPrice: '',
            stockQuantity: '',
            minStockAlert: ''
          });
        }
      }
    );
  };

  // Handle Restock Submission
  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(restockForm.quantity) || 0;
    const cost = Number(restockForm.purchaseCost) || 0;
    const sell = Number(restockForm.sellingPrice) || 0;
    const totalAmount = computedTotalCost;
    const paidAmount = Math.max(0, Number(restockForm.paidAmount) || 0);

    createPurchase.mutate(
      {
        data: {
          supplierId: restockForm.supplierId,
          totalAmount,
          paidAmount,
          notes: restockForm.notes || 'Stock Restock',
          items: [
            {
              productId: restockForm.productId,
              quantity: qty,
              unitCost: cost,
              unitPrice: sell,
              subtotal: totalAmount
            }
          ]
        }
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });
          setRestockModal(false);
          setRestockForm({
            supplierId: '',
            productId: '',
            purchaseCost: '',
            sellingPrice: '',
            quantity: '1',
            paidAmount: '',
            notes: ''
          });
        }
      }
    );
  };

  const totalStockValue = q.data?.reduce(
    (a: number, p: any) => a + (p.stockQuantity || 0) * (p.purchaseCost || 0), 
    0
  );

  const lowStockCount = q.data?.filter(
    (p: any) => p.stockQuantity <= p.minStockAlert
  ).length || 0;

  return (
    <div className="animate-in">
      <PageIntro 
        eyebrow="The bake, counted" 
        title="Stock & Inventory" 
        detail="Inventory with enough signal to keep production moving." 
        action={
          <div className="flex items-center gap-2">
            <Button onClick={() => setRestockModal(true)} variant="outline" testId="button-restock-stock">
              <RefreshCw size={16} /> Purchase New Stock
            </Button>
            <Button onClick={() => setAddProductModal(true)} testId="button-add-product">
              <PackagePlus size={16} /> Add New product
            </Button>
          </div>
        } 
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel rounded-xl p-4">
          <div className="text-xs font-bold uppercase text-muted-foreground">Catalog items</div>
          <div className="mt-2 font-mono text-2xl font-bold">{q.data?.length || 0}</div>
        </div>
        <div className="panel rounded-xl p-4">
          <div className="text-xs font-bold uppercase text-muted-foreground">Needs restock</div>
          <div className="mt-2 font-mono text-2xl font-bold text-accent">{lowStockCount}</div>
        </div>
        <div className="panel rounded-xl p-4">
          <div className="text-xs font-bold uppercase text-muted-foreground">Stock value</div>
          <div className="mt-2 font-mono text-2xl font-bold">{money(totalStockValue)}</div>
        </div>
      </div>

      <div className="panel mt-5 overflow-x-auto rounded-xl p-5">
        {q.isLoading ? (
          <Loading />
        ) : q.isError ? (
          <Failed onRetry={() => q.refetch()} />
        ) : q.data?.length ? (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="pb-3">Product</th>
                <th className="pb-3">Unit</th>
                <th className="pb-3">Cost</th>
                <th className="pb-3">Sell</th>
                <th className="pb-3">Stock</th>
                <th className="pb-3">Signal</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {q.data.map((p: any) => {
                const low = p.stockQuantity <= p.minStockAlert;
                return (
                  <tr key={p.id} data-testid={`row-product-${p.id}`}>
                    <td className="py-3 font-semibold">{p.name}</td>
                    <td className="py-3 text-muted-foreground">{p.unit}</td>
                    <td className="py-3 font-mono">{money(p.purchaseCost)}</td>
                    <td className="py-3 font-mono font-bold">{money(p.sellingPrice)}</td>
                    <td className="py-3 font-mono">{p.stockQuantity}</td>
                    <td className="py-3">
                      {low ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-accent">
                          <AlertTriangle size={14} /> Restock
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700">Healthy</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => openRestockForProduct(p)}
                        testId={`button-restock-${p.id}`}
                      >
                        <RefreshCw size={13} className="mr-1 inline" /> Purchase New Stock
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Empty 
            title="No products in the catalog" 
            detail="Add the things that come out of your ovens and off your shelves." 
            action={
              <Button onClick={() => setAddProductModal(true)} testId="button-empty-add-product">
                <Plus size={15} /> Add product
              </Button>
            } 
          />
        )}
      </div>

      {/* Add Product Modal */}
      {addProductModal && (
        <Modal title="Add product" eyebrow="Product catalog" onClose={() => setAddProductModal(false)}>
          <form onSubmit={handleAddProductSubmit} className="grid gap-3">
            <Field 
              label="Product name" 
              name="product-name" 
              value={productForm.name} 
              onChange={(v: string) => setProductForm({ ...productForm, name: v })} 
              required 
            />
            <div className="grid grid-cols-2 gap-3">
              <Field 
                label="Unit" 
                name="product-unit" 
                value={productForm.unit} 
                onChange={(v: string) => setProductForm({ ...productForm, unit: v })} 
              />
              <Field 
                label="Stock in " 
                name="product-stock" 
                type="number" 
                value={productForm.stockQuantity} 
                onChange={(v: string) => setProductForm({ ...productForm, stockQuantity: v })} 
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field 
                label="Purchase cost" 
                name="product-cost" 
                type="number" 
                value={productForm.purchaseCost} 
                onChange={(v: string) => setProductForm({ ...productForm, purchaseCost: v })} 
                required 
              />
              <Field 
                label="Selling price" 
                name="product-price" 
                type="number" 
                value={productForm.sellingPrice} 
                onChange={(v: string) => setProductForm({ ...productForm, sellingPrice: v })} 
                required 
              />
            </div>
            <Field 
              label="Low stock alert at" 
              name="product-alert" 
              type="number" 
              value={productForm.minStockAlert} 
              onChange={(v: string) => setProductForm({ ...productForm, minStockAlert: v })} 
              required 
            />
            <Button type="submit" disabled={createProduct.isPending} testId="button-save-product">
              {createProduct.isPending ? 'Saving…' : 'Save product'}
            </Button>
          </form>
        </Modal>
      )}

      {/* Restock Modal */}
      {restockModal && (
        <Modal title="Restock Product" eyebrow="Inventory Management" onClose={() => setRestockModal(false)}>
          <form onSubmit={handleRestockSubmit} className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">Supplier</label>
              <select 
                className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-primary"
                value={restockForm.supplierId}
                onChange={(e) => setRestockForm({ ...restockForm, supplierId: e.target.value })}
              >
                <option value="">Walk-in / Cash Purchase (No Supplier)</option>
                {suppliersQuery.data?.map((sup: any) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name} {sup.companyName ? `(${sup.companyName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">Product</label>
              <select 
                className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-primary"
                value={restockForm.productId}
                onChange={(e) => handleSelectProductForRestock(e.target.value)}
                required
              >
                <option value="">Select Product</option>
                {q.data?.map((prod: any) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.name} (Current Stock: {prod.stockQuantity})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field 
                label="Restock Quantity" 
                name="restock-qty" 
                type="number" 
                min="1"
                value={restockForm.quantity} 
                onChange={(v: string) => setRestockForm({ ...restockForm, quantity: v })} 
                required 
              />
              <Field 
                label="Purchase Cost (PKR)" 
                name="restock-cost" 
                type="number" 
                min="0"
                value={restockForm.purchaseCost} 
                onChange={(v: string) => setRestockForm({ ...restockForm, purchaseCost: v })} 
                required 
              />
            </div>

            {/* REALTIME TOTAL PURCHASE COST BANNER */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-emerald-950 flex justify-between items-center">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Total Purchase Cost</div>
                <div className="text-xs text-emerald-800">
                  {restockForm.quantity || 0} units × PKR {Number(restockForm.purchaseCost || 0).toLocaleString()}
                </div>
              </div>
              <div className="text-xl font-extrabold font-mono text-emerald-800">
                {money(computedTotalCost)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field 
                label="Selling Price (PKR)" 
                name="restock-sell" 
                type="number" 
                min="0"
                value={restockForm.sellingPrice} 
                onChange={(v: string) => setRestockForm({ ...restockForm, sellingPrice: v })} 
                required 
              />
              <div>
                <Field 
                  label="Amount Paid to Supplier" 
                  name="restock-paid" 
                  type="number" 
                  min="0"
                  max={computedTotalCost}
                  value={restockForm.paidAmount} 
                  onChange={(v: string) => setRestockForm({ ...restockForm, paidAmount: v })} 
                />
                {Number(restockForm.paidAmount) < computedTotalCost && (
                  <div className="mt-1 text-[11px] font-semibold text-amber-600">
                    Remaining Balance: {money(computedTotalCost - Number(restockForm.paidAmount))}
                  </div>
                )}
              </div>
            </div>

            <Field 
              label="Notes" 
              name="restock-notes" 
              value={restockForm.notes} 
              onChange={(v: string) => setRestockForm({ ...restockForm, notes: v })} 
            />

            <Button type="submit" disabled={createPurchase.isPending} testId="button-save-restock">
              {createPurchase.isPending ? 'Processing...' : 'Confirm Restock'}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}