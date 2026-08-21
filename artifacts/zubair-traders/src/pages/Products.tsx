import React, { useState } from 'react';
import { Plus, PackagePlus, AlertTriangle } from 'lucide-react';
import { 
  useGetProducts, 
  getGetProductsQueryKey, 
  useCreateProduct 
} from '../hooks/useSupabaseData';
import { useQueryClient } from '@tanstack/react-query';

export function Products({ PageIntro, Button, Field, Modal, Loading, Failed, Empty, money }: any) {
  const q = useGetProducts({ query: { queryKey: getGetProductsQueryKey() } });
  const create = useCreateProduct();
  const qc = useQueryClient();

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    unit: 'pcs',
    purchaseCost: '',
    sellingPrice: '',
    stockQuantity: '',
    minStockAlert: ''
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      {
        data: {
          ...form,
          purchaseCost: Number(form.purchaseCost),
          sellingPrice: Number(form.sellingPrice),
          stockQuantity: Number(form.stockQuantity),
          minStockAlert: Number(form.minStockAlert)
        }
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });
          setModal(false);
          setForm({
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

  const totalStockValue = q.data?.reduce(
    (a: number, p: any) => a + p.stockQuantity * p.purchaseCost, 
    0
  );

  const lowStockCount = q.data?.filter(
    (p: any) => p.stockQuantity <= p.minStockAlert
  ).length || 0;

  return (
    <div className="animate-in">
      <PageIntro 
        eyebrow="The bake, counted" 
        title="Products" 
        detail="Inventory with enough signal to keep production moving." 
        action={
          <Button onClick={() => setModal(true)} testId="button-add-product">
            <PackagePlus size={16} /> Add product
          </Button>
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
              <Button onClick={() => setModal(true)} testId="button-empty-add-product">
                <Plus size={15} /> Add product
              </Button>
            } 
          />
        )}
      </div>

      {modal && (
        <Modal title="Add product" eyebrow="Product catalog" onClose={() => setModal(false)}>
          <form onSubmit={submit} className="grid gap-3">
            <Field 
              label="Product name" 
              name="product-name" 
              value={form.name} 
              onChange={(v: string) => setForm({ ...form, name: v })} 
              required 
            />
            <div className="grid grid-cols-2 gap-3">
              <Field 
                label="Unit" 
                name="product-unit" 
                value={form.unit} 
                onChange={(v: string) => setForm({ ...form, unit: v })} 
              />
              <Field 
                label="Opening stock" 
                name="product-stock" 
                type="number" 
                value={form.stockQuantity} 
                onChange={(v: string) => setForm({ ...form, stockQuantity: v })} 
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field 
                label="Purchase cost" 
                name="product-cost" 
                type="number" 
                value={form.purchaseCost} 
                onChange={(v: string) => setForm({ ...form, purchaseCost: v })} 
                required 
              />
              <Field 
                label="Selling price" 
                name="product-price" 
                type="number" 
                value={form.sellingPrice} 
                onChange={(v: string) => setForm({ ...form, sellingPrice: v })} 
                required 
              />
            </div>
            <Field 
              label="Low stock alert at" 
              name="product-alert" 
              type="number" 
              value={form.minStockAlert} 
              onChange={(v: string) => setForm({ ...form, minStockAlert: v })} 
              required 
            />
            <Button type="submit" disabled={create.isPending} testId="button-save-product">
              {create.isPending ? 'Saving…' : 'Save product'}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}