import React, { useState, useMemo } from 'react';
import { Plus, Search, Pencil } from 'lucide-react';
import { 
  useGetBuyers, 
  getGetBuyersQueryKey, 
  useCreateBuyer, 
  useUpdateBuyer 
} from '../hooks/useSupabaseData';
import { useQueryClient } from '@tanstack/react-query';

export function Buyers({ PageIntro, Button, Field, Modal, Loading, Failed, Empty, money }: any) {
  const q = useGetBuyers({ query: { queryKey: getGetBuyersQueryKey() } });
  const create = useCreateBuyer();
  const update = useUpdateBuyer();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [modal, setModal] = useState(false);

  const blank = { name: '', phone: '', cnic: '', address: '', creditLimit: '' };
  const [form, setForm] = useState(blank);

  const list = useMemo(() => {
    return (q.data || []).filter((b: any) => 
      `${b.name} ${b.phone}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [q.data, search]);

  const open = (b?: any) => {
    setEditing(b || null);
    setForm(
      b 
        ? { name: b.name, phone: b.phone, cnic: b.cnic || '', address: b.address || '', creditLimit: String(b.creditLimit || '') } 
        : blank
    );
    setModal(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...form, creditLimit: Number(form.creditLimit) };
    const finish = () => {
      qc.invalidateQueries({ queryKey: getGetBuyersQueryKey() });
      setModal(false);
    };

    if (editing) {
      update.mutate({ id: editing.id, data }, { onSuccess: finish });
    } else {
      create.mutate({ data }, { onSuccess: finish });
    }
  };

  return (
    <div className="animate-in">
      <PageIntro 
        eyebrow="People who keep the ovens moving" 
        title="Buyers" 
        detail="Know who owes, what they buy, and where to reach them." 
        action={
          <Button onClick={() => open()} testId="button-add-buyer">
            <Plus size={16} /> Add buyer
          </Button>
        } 
      />

      <div className="panel rounded-xl p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input 
              data-testid="input-search-buyers" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search name or phone…" 
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" 
            />
          </div>
          <div className="font-mono text-xs text-muted-foreground">{list.length} buyers</div>
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
                  <th className="pb-3">Buyer</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Credit limit</th>
                  <th className="pb-3">Current udhaar</th>
                  <th className="pb-3 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {list.map((b: any) => (
                  <tr key={b.id} data-testid={`row-buyer-${b.id}`}>
                    <td className="py-3">
                      <div className="font-semibold">{b.name}</div>
                      <div className="text-[11px] text-muted-foreground">{b.address || 'No address'}</div>
                    </td>
                    <td className="py-3 font-mono text-xs">{b.phone}</td>
                    <td className="py-3 font-mono">{money(b.creditLimit)}</td>
                    <td className="py-3">
                      <span className={`font-mono font-bold ${b.currentBalance > 0 ? 'text-accent' : 'text-emerald-700'}`}>
                        {money(b.currentBalance)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button 
                        data-testid={`button-edit-buyer-${b.id}`} 
                        onClick={() => open(b)} 
                        className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty 
            title={search ? 'No buyers match that search' : 'Your buyer book is empty'} 
            detail="Add your first wholesale buyer to start tracking udhaar." 
            action={!search && (
              <Button onClick={() => open()} testId="button-empty-add-buyer">
                <Plus size={15} /> Add buyer
              </Button>
            )} 
          />
        )}
      </div>

      {modal && (
        <Modal title={editing ? 'Edit buyer' : 'Add buyer'} eyebrow="Buyer book" onClose={() => setModal(false)}>
          <form onSubmit={submit} className="grid gap-3">
            <Field label="Name" name="buyer-name" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} required />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" name="buyer-phone" value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} required />
              <Field label="CNIC" name="buyer-cnic" value={form.cnic} onChange={(v: string) => setForm({ ...form, cnic: v })} />
            </div>
            <Field label="Address" name="buyer-address" value={form.address} onChange={(v: string) => setForm({ ...form, address: v })} />
            <Field label="Credit limit" name="buyer-limit" type="number" value={form.creditLimit} onChange={(v: string) => setForm({ ...form, creditLimit: v })} required />
            <Button type="submit" disabled={create.isPending || update.isPending} testId="button-save-buyer">
              {create.isPending || update.isPending ? 'Saving…' : 'Save buyer'}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}