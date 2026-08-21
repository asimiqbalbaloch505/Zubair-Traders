import React, { useState } from 'react';
import { Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { 
  useGetLoans, 
  getGetLoansQueryKey, 
  useCreateLoan 
} from '../hooks/useSupabaseData';
import { useQueryClient } from '@tanstack/react-query';

export function Loans({ PageIntro, Button, Field, Modal, Loading, Failed, Empty, money, shortDate }: any) {
  const q = useGetLoans({ query: { queryKey: getGetLoansQueryKey() } });
  const create = useCreateLoan();
  const qc = useQueryClient();

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    personName: '',
    phone: '',
    loanType: 'lent',
    amount: '',
    description: ''
  });

  const outstanding = q.data?.reduce((a: number, l: any) => a + Number(l.balanceRemaining || 0), 0) || 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      {
        data: {
          ...form,
          amount: Number(form.amount)
        }
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetLoansQueryKey() });
          setModal(false);
          setForm({ personName: '', phone: '', loanType: 'lent', amount: '', description: '' });
        }
      }
    );
  };

  return (
    <div className="animate-in">
      <PageIntro 
        eyebrow="Money outside the drawer" 
        title="Loans" 
        detail="Borrowed or lent, every rupee gets a clear line back." 
        action={
          <Button onClick={() => setModal(true)} testId="button-add-loan">
            <Plus size={16} /> Add loan
          </Button>
        } 
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <div className="panel rounded-xl p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Outstanding balance</div>
          <div className="mt-2 font-mono text-2xl font-bold text-accent">{money(outstanding)}</div>
        </div>
        <div className="panel rounded-xl p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Open records</div>
          <div className="mt-2 font-mono text-2xl font-bold">
            {q.data?.filter((l: any) => l.balanceRemaining > 0).length || 0}
          </div>
        </div>
      </div>

      <div className="panel overflow-x-auto rounded-xl p-5">
        {q.isLoading ? (
          <Loading />
        ) : q.isError ? (
          <Failed onRetry={() => q.refetch()} />
        ) : q.data?.length ? (
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="pb-3">Person</th>
                <th className="pb-3">Direction</th>
                <th className="pb-3">Given</th>
                <th className="pb-3">Remaining</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {q.data.map((l: any) => (
                <tr key={l.id} data-testid={`row-loan-${l.id}`}>
                  <td className="py-3 font-semibold">
                    {l.personName}
                    <div className="text-[11px] text-muted-foreground">{l.phone || 'No phone'}</div>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${l.loanType === 'lent' ? 'text-accent' : 'text-primary'}`}>
                      {l.loanType === 'lent' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {l.loanType}
                    </span>
                  </td>
                  <td className="py-3 font-mono">{money(l.amount)}</td>
                  <td className="py-3 font-mono font-bold">{money(l.balanceRemaining)}</td>
                  <td className="py-3 font-mono text-xs text-muted-foreground">
                    {shortDate ? shortDate(l.dateGiven || l.created_at) : (l.dateGiven || '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty 
            title="No loans on the books" 
            detail="Keep borrowed and lent money visible, even when it feels small." 
            action={
              <Button onClick={() => setModal(true)} testId="button-empty-add-loan">
                <Plus size={15} /> Add loan
              </Button>
            } 
          />
        )}
      </div>

      {modal && (
        <Modal title="Add loan" eyebrow="Money trail" onClose={() => setModal(false)}>
          <form onSubmit={submit} className="grid gap-3">
            <Field 
              label="Person / business" 
              name="loan-person" 
              value={form.personName} 
              onChange={(v: string) => setForm({ ...form, personName: v })} 
              required 
            />
            <div className="grid grid-cols-2 gap-3">
              <Field 
                label="Phone" 
                name="loan-phone" 
                value={form.phone} 
                onChange={(v: string) => setForm({ ...form, phone: v })} 
              />
              <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                Direction
                <select 
                  data-testid="select-loan-type" 
                  value={form.loanType} 
                  onChange={e => setForm({ ...form, loanType: e.target.value })} 
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-primary"
                >
                  <option value="lent">I lent</option>
                  <option value="borrowed">I borrowed</option>
                </select>
              </label>
            </div>
            <Field 
              label="Amount" 
              name="loan-amount" 
              type="number" 
              value={form.amount} 
              onChange={(v: string) => setForm({ ...form, amount: v })} 
              required 
            />
            <Field 
              label="Description" 
              name="loan-description" 
              value={form.description} 
              onChange={(v: string) => setForm({ ...form, description: v })} 
            />
            <Button type="submit" disabled={create.isPending} testId="button-save-loan">
              {create.isPending ? 'Saving…' : 'Save loan'}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}