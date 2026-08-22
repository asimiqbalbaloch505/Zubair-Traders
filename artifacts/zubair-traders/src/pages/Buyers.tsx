import React, { useState, useMemo } from 'react';
import { Plus, Search, Pencil, CreditCard, HandCoins, FileText } from 'lucide-react';
import { 
  useGetBuyers, 
  getGetBuyersQueryKey, 
  useCreateBuyer, 
  useUpdateBuyer,
  useCollectBuyerPayment
} from '../hooks/useSupabaseData';
import { useQueryClient } from '@tanstack/react-query';

export function Buyers({ 
  PageIntro, 
  Stat, 
  Button, 
  Field, 
  Modal, 
  Loading, 
  Failed, 
  Empty, 
  money, 
  onNavigateToLedger 
}: any) {
  const q = useGetBuyers({ query: { queryKey: getGetBuyersQueryKey() } });
  const create = useCreateBuyer();
  const update = useUpdateBuyer();
  const collectPayment = useCollectBuyerPayment();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [modal, setModal] = useState(false);

  // Payment Modal State
  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', notes: '', paymentMethod: 'Cash' });

  const blank = { name: '', phone: '', cnic: '', address: '', creditLimit: '' };
  const [form, setForm] = useState(blank);

  const list = useMemo(() => {
    return (q.data || []).filter((b: any) => 
      `${b.name} ${b.phone}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [q.data, search]);

  const totalReceivables = useMemo(() => {
    return (q.data || []).reduce((acc: number, b: any) => acc + Number(b.currentBalance ?? b.current_balance ?? 0), 0);
  }, [q.data]);

  const open = (b?: any) => {
    setEditing(b || null);
    setForm(
      b 
        ? { 
            name: b.name, 
            phone: b.phone || '', 
            cnic: b.cnic || '', 
            address: b.address || '', 
            creditLimit: String(b.creditLimit ?? b.credit_limit ?? '') 
          } 
        : blank
    );
    setModal(true);
  };

  const openPaymentModal = (buyer: any) => {
    setSelectedBuyer(buyer);
    setPaymentForm({ amount: '', notes: 'Udhaar Payment Collected', paymentMethod: 'Cash' });
    setPaymentModal(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { 
      name: form.name,
      phone: form.phone,
      cnic: form.cnic,
      address: form.address,
      credit_limit: Number(form.creditLimit || 0),
      creditLimit: Number(form.creditLimit || 0)
    };
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

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuyer || !paymentForm.amount) return;

    collectPayment.mutate(
      {
        buyerId: selectedBuyer.id,
        buyer_id: selectedBuyer.id,
        amount: Number(paymentForm.amount),
        notes: paymentForm.notes,
        paymentMethod: paymentForm.paymentMethod,
        payment_method: paymentForm.paymentMethod
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetBuyersQueryKey() });
          setPaymentModal(false);
          setSelectedBuyer(null);
          setPaymentForm({ amount: '', notes: '', paymentMethod: 'Cash' });
        },
      }
    );
  };

  return (
    <div className="animate-in">
      <PageIntro 
        eyebrow="People who keep the business moving" 
        title="Customers" 
        detail="Know who owes, what they buy, and where to reach them." 
        action={
          <Button onClick={() => open()} testId="button-add-buyer">
            <Plus size={16} /> Add customer
          </Button>
        } 
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Stat ? (
          <Stat 
            label="BUYER RECEIVABLES" 
            value={money(totalReceivables)} 
            note="Total outstanding customer balance" 
            icon={CreditCard} 
            tone="accent" 
          />
        ) : (
          <div className="panel rounded-xl p-5">
            <div className="text-xs font-bold uppercase text-muted-foreground">BUYER RECEIVABLES</div>
            <div className="mt-2 text-2xl font-bold text-accent">{money(totalReceivables)}</div>
          </div>
        )}
      </div>

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
          <div className="font-mono text-xs text-muted-foreground">{list.length} customers</div>
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
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Credit limit</th>
                  <th className="pb-3">Current udhaar</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {list.map((b: any) => {
                  const balance = b.currentBalance ?? b.current_balance ?? 0;
                  const limit = b.creditLimit ?? b.credit_limit ?? 0;

                  return (
                    <tr key={b.id} data-testid={`row-buyer-${b.id}`}>
                      <td className="py-3">
                        <div className="font-semibold">{b.name}</div>
                        <div className="text-[11px] text-muted-foreground">{b.address || 'No address'}</div>
                      </td>
                      <td className="py-3 font-mono text-xs">{b.phone || '-'}</td>
                      <td className="py-3 font-mono">{money(limit)}</td>
                      <td className="py-3">
                        <span className={`font-mono font-bold ${balance > 0 ? 'text-accent' : 'text-emerald-700'}`}>
                          {money(balance)}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onNavigateToLedger && onNavigateToLedger(b.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80"
                            title="View Customer Ledger"
                          >
                            <FileText size={14} /> Ledger
                          </button>
                          {balance > 0 && (
                            <button
                              data-testid={`button-collect-payment-${b.id}`}
                              onClick={() => openPaymentModal(b)}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                              title="Collect Payment"
                            >
                              <HandCoins size={14} /> Receive
                            </button>
                          )}
                          <button 
                            data-testid={`button-edit-buyer-${b.id}`} 
                            onClick={() => open(b)} 
                            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                            title="Edit Customer"
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty 
            title={search ? 'No customers match that search' : 'Your customer book is empty'} 
            detail="Add your first wholesale customer to start tracking udhaar." 
            action={!search && (
              <Button onClick={() => open()} testId="button-empty-add-buyer">
                <Plus size={15} /> Add customer
              </Button>
            )} 
          />
        )}
      </div>

      {modal && (
        <Modal title={editing ? 'Edit customer' : 'Add customer'} eyebrow="Customer book" onClose={() => setModal(false)}>
          <form onSubmit={submit} className="grid gap-3">
            <Field label="Name" name="buyer-name" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} required />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" name="buyer-phone" value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} required />
              <Field label="CNIC" name="buyer-cnic" value={form.cnic} onChange={(v: string) => setForm({ ...form, cnic: v })} />
            </div>
            <Field label="Address" name="buyer-address" value={form.address} onChange={(v: string) => setForm({ ...form, address: v })} />
            <Field label="Credit limit" name="buyer-limit" type="number" value={form.creditLimit} onChange={(v: string) => setForm({ ...form, creditLimit: v })} required />
            <Button type="submit" disabled={create.isPending || update.isPending} testId="button-save-buyer">
              {create.isPending || update.isPending ? 'Saving…' : 'Save customer'}
            </Button>
          </form>
        </Modal>
      )}

      {/* Collect Payment Modal */}
      {paymentModal && selectedBuyer && (
        <Modal 
          title={`Collect Payment - ${selectedBuyer.name}`} 
          eyebrow="Outstanding balance payment" 
          onClose={() => setPaymentModal(false)}
        >
          <form onSubmit={submitPayment} className="grid gap-3">
            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="text-xs text-muted-foreground">Current Udhaar Balance</div>
              <div className="text-lg font-bold text-accent font-mono">
                {money(selectedBuyer.currentBalance ?? selectedBuyer.current_balance ?? 0)}
              </div>
            </div>

            <Field 
              label="Amount Received (PKR)" 
              name="payment-amount" 
              type="number" 
              value={paymentForm.amount} 
              onChange={(v: string) => setPaymentForm({ ...paymentForm, amount: v })} 
              required 
            />

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Payment Method</label>
              <select 
                value={paymentForm.paymentMethod} 
                onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <Field 
              label="Notes / Reference" 
              name="payment-notes" 
              value={paymentForm.notes} 
              onChange={(v: string) => setPaymentForm({ ...paymentForm, notes: v })} 
            />

            <Button 
              type="submit" 
              disabled={collectPayment.isPending || !paymentForm.amount} 
              testId="button-submit-payment"
            >
              {collectPayment.isPending ? 'Processing…' : 'Confirm Payment'}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}