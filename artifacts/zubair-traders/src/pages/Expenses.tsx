import React, { useState } from 'react';
import { Plus, Wallet, FileText } from 'lucide-react';
import { 
  useGetExpenses, 
  getGetExpensesQueryKey, 
  useCreateExpense 
} from '../hooks/useSupabaseData';
import { useQueryClient } from '@tanstack/react-query';

export function Expenses({ PageIntro, Button, Field, Modal, Loading, Failed, Empty, money, timeDate }: any) {
  const q = useGetExpenses({ query: { queryKey: getGetExpensesQueryKey() } });
  const create = useCreateExpense();
  const qc = useQueryClient();

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'Utilities',
    notes: ''
  });

  const categories = ['Utilities', 'Rent', 'Salaries', 'Maintenance', 'Fuel', 'Supplies', 'Misc'];

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
          qc.invalidateQueries({ queryKey: getGetExpensesQueryKey() });
          setModal(false);
          setForm({ title: '', amount: '', category: 'Utilities', notes: '' });
        }
      }
    );
  };

  const totalExpense = q.data?.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0) || 0;

  return (
    <div className="animate-in">
      <PageIntro 
        eyebrow="Floor overhead & operational costs" 
        title="Expenses" 
        detail="Log everyday bakery costs to keep daily net profit accurate." 
        action={
          <Button onClick={() => setModal(true)} testId="button-add-expense">
            <Plus size={16} /> Log expense
          </Button>
        } 
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="panel rounded-xl p-4">
          <div className="text-xs font-bold uppercase text-muted-foreground">Total logged expenses</div>
          <div className="mt-2 font-mono text-2xl font-bold text-destructive">{money(totalExpense)}</div>
        </div>
        <div className="panel rounded-xl p-4">
          <div className="text-xs font-bold uppercase text-muted-foreground">Recorded entries</div>
          <div className="mt-2 font-mono text-2xl font-bold">{q.data?.length || 0}</div>
        </div>
      </div>

      <div className="panel mt-5 overflow-x-auto rounded-xl p-5">
        {q.isLoading ? (
          <Loading />
        ) : q.isError ? (
          <Failed onRetry={() => q.refetch()} />
        ) : q.data?.length ? (
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="pb-3">Title & Category</th>
                <th className="pb-3">Note</th>
                <th className="pb-3">Logged time</th>
                <th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {q.data.map((exp: any) => (
                <tr key={exp.id} data-testid={`row-expense-${exp.id}`}>
                  <td className="py-3">
                    <div className="font-semibold">{exp.title}</div>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {exp.category}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-muted-foreground">{exp.notes || '—'}</td>
                  <td className="py-3 font-mono text-xs text-muted-foreground">{timeDate(exp.created_at || exp.createdAt)}</td>
                  <td className="py-3 text-right font-mono font-bold text-destructive">
                    {money(exp.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty 
            title="No expenses logged" 
            detail="Keep track of fuel, electricity, repairs, and minor floor expenditures." 
            action={
              <Button onClick={() => setModal(true)} testId="button-empty-add-expense">
                <Plus size={15} /> Log expense
              </Button>
            } 
          />
        )}
      </div>

      {modal && (
        <Modal title="Log expense" eyebrow="Bakery floor costs" onClose={() => setModal(false)}>
          <form onSubmit={submit} className="grid gap-3">
            <Field 
              label="Title / Purpose" 
              name="expense-title" 
              value={form.title} 
              onChange={(v: string) => setForm({ ...form, title: v })} 
              placeholder="e.g. Electricity bill, Generator diesel"
              required 
            />
            <div className="grid grid-cols-2 gap-3">
              <Field 
                label="Amount" 
                name="expense-amount" 
                type="number" 
                value={form.amount} 
                onChange={(v: string) => setForm({ ...form, amount: v })} 
                required 
              />
              <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                Category
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-primary"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <Field 
              label="Notes (optional)" 
              name="expense-notes" 
              value={form.notes} 
              onChange={(v: string) => setForm({ ...form, notes: v })} 
              placeholder="Paid via cash drawer..."
            />
            <Button type="submit" disabled={create.isPending} testId="button-save-expense">
              {create.isPending ? 'Logging…' : 'Save expense'}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}