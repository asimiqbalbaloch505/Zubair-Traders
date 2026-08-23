import React, { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Truck } from 'lucide-react';
import { 
  useGetSuppliers, 
  getGetSuppliersQueryKey, 
  useCreateSupplier, 
  useUpdateSupplier 
} from '../hooks/useSupabaseData';
import { useQueryClient } from '@tanstack/react-query';

export function Suppliers({ PageIntro, Stat, Button, Field, Modal, Loading, Failed, Empty, money }: any) {
  const q = useGetSuppliers({ query: { queryKey: getGetSuppliersQueryKey() } });
  const create = useCreateSupplier();
  const update = useUpdateSupplier();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [modal, setModal] = useState(false);

  const blank = { name: '', phone: '', company: '', address: '' };
  const [form, setForm] = useState(blank);

  const list = useMemo(() => {
    return (q.data || []).filter((s: any) => {
      const company = s.companyName || s.company_name || s.company || '';
      return `${s.name} ${s.phone || ''} ${company}`.toLowerCase().includes(search.toLowerCase());
    });
  }, [q.data, search]);

  const totalPayables = useMemo(() => {
    return (q.data || []).reduce((acc: number, s: any) => acc + Number(s.currentBalance ?? s.current_balance ?? 0), 0);
  }, [q.data]);

  const open = (s?: any) => {
    setEditing(s || null);
    setForm(
      s 
        ? { 
            name: s.name || '', 
            phone: s.phone || '', 
            company: s.companyName || s.company_name || s.company || '', 
            address: s.address || '' 
          } 
        : blank
    );
    setModal(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      companyName: form.company, // Sends both variants for hook compatibility
    };

    const finish = () => {
      qc.invalidateQueries({ queryKey: getGetSuppliersQueryKey() });
      setModal(false);
    };

    if (editing) {
      update.mutate({ id: editing.id, data: payload }, { onSuccess: finish });
    } else {
      create.mutate({ data: payload }, { onSuccess: finish });
    }
  };

  return (
    <div className="animate-in">
      <PageIntro 
        eyebrow="Raw ingredients and supplies" 
        title="Suppliers" 
        detail="Track who feeds your bakery floor and what you owe them." 
        action={
          <Button onClick={() => open()} testId="button-add-supplier">
            <Plus size={16} /> Add supplier
          </Button>
        } 
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Stat ? (
          <Stat 
            label="SUPPLIER PAYABLES" 
            value={money(totalPayables)} 
            note="Total balance owed to vendors" 
            icon={Truck} 
            tone="blue" 
          />
        ) : (
          <div className="panel rounded-xl p-5">
            <div className="text-xs font-bold uppercase text-muted-foreground">SUPPLIER PAYABLES</div>
            <div className="mt-2 text-2xl font-bold text-amber-600">{money(totalPayables)}</div>
          </div>
        )}
      </div>

      <div className="panel rounded-xl p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input 
              data-testid="input-search-suppliers" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search supplier, company or phone…" 
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" 
            />
          </div>
          <div className="font-mono text-xs text-muted-foreground">{list.length} suppliers</div>
        </div>

        {q.isLoading ? (
          <Loading />
        ) : q.isError ? (
          <Failed onRetry={() => q.refetch()} />
        ) : list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-3">Supplier</th>
                  <th className="pb-3">Company</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Current balance</th>
                  <th className="pb-3 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {list.map((s: any) => {
                  const company = s.companyName ?? s.company_name ?? s.company ?? '—';
                  const balance = s.currentBalance ?? s.current_balance ?? 0;

                  return (
                    <tr key={s.id} data-testid={`row-supplier-${s.id}`}>
                      <td className="py-3">
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-[11px] text-muted-foreground">{s.address || 'No address'}</div>
                      </td>
                      <td className="py-3 font-medium">{company}</td>
                      <td className="py-3 font-mono text-xs">{s.phone || '-'}</td>
                      <td className="py-3">
                        <span className={`font-mono font-bold ${balance > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                          {money(balance)}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button 
                          data-testid={`button-edit-supplier-${s.id}`} 
                          onClick={() => open(s)} 
                          className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty 
            title={search ? 'No suppliers match that search' : 'No suppliers registered'} 
            detail="Keep track of vendors who deliver flour, sugar, packaging, and fuel." 
            action={!search && (
              <Button onClick={() => open()} testId="button-empty-add-supplier">
                <Plus size={15} /> Add supplier
              </Button>
            )} 
          />
        )}
      </div>

      {modal && (
        <Modal title={editing ? 'Edit supplier' : 'Add supplier'} eyebrow="Supplier directory" onClose={() => setModal(false)}>
          <form onSubmit={submit} className="grid gap-3">
            <Field label="Supplier Name" name="supplier-name" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} required />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" name="supplier-phone" value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} required />
              <Field label="Company" name="supplier-company" value={form.company} onChange={(v: string) => setForm({ ...form, company: v })} />
            </div>
            <Field label="Address" name="supplier-address" value={form.address} onChange={(v: string) => setForm({ ...form, address: v })} />
            <Button type="submit" disabled={create.isPending || update.isPending} testId="button-save-supplier">
              {create.isPending || update.isPending ? 'Saving…' : 'Save supplier'}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}