import React, { useState, useMemo } from 'react';
import { Plus, Filter, Calendar } from 'lucide-react';
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

  // Filter States: 'this_month' | 'all' | 'month' | 'date'
  const [filterType, setFilterType] = useState<'this_month' | 'all' | 'month' | 'date'>('this_month');
  
  // Default selected month to current month index (0-11)
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  // Default selected date to today (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const categories = ['Utilities', 'Rent', 'Salaries', 'Maintenance', 'Fuel', 'Supplies', 'Misc'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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

  // Filtered expenses based on selection
  const filteredExpenses = useMemo(() => {
    if (!q.data) return [];

    const now = new Date();
    const currentYear = now.getFullYear();

    return q.data.filter((item: any) => {
      const itemDate = new Date(item.created_at || item.createdAt);
      if (isNaN(itemDate.getTime())) return false;

      if (filterType === 'all') {
        return true;
      }

      if (filterType === 'this_month') {
        // From 1st of current month up to current date/year
        return itemDate.getFullYear() === currentYear && itemDate.getMonth() === now.getMonth();
      }

      if (filterType === 'month') {
        // Selected month of current year
        return itemDate.getFullYear() === currentYear && itemDate.getMonth() === Number(selectedMonth);
      }

      if (filterType === 'date') {
        // Specific exact date (YYYY-MM-DD)
        const itemDateStr = itemDate.toISOString().split('T')[0];
        return itemDateStr === selectedDate;
      }

      return true;
    });
  }, [q.data, filterType, selectedMonth, selectedDate]);

  // Recalculate total expense dynamically based on filtered data
  const totalExpense = useMemo(() => {
    return filteredExpenses.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
  }, [filteredExpenses]);

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

      {/* FILTER CONTROL BAR */}
      <div className="panel mb-5 rounded-xl p-3.5 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
            <Filter size={15} className="text-primary" />
            <span>Filter Expenses</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterType}
              onChange={(e: any) => setFilterType(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground outline-none focus:border-primary cursor-pointer"
            >
              <option value="this_month">This Month</option>
              <option value="all">All Time</option>
              <option value="month">Select Month</option>
              <option value="date">Select Date</option>
            </select>

            {/* Sub-filter dropdown for Month Selection */}
            {filterType === 'month' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground outline-none focus:border-primary cursor-pointer"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m} ({new Date().getFullYear()})
                  </option>
                ))}
              </select>
            )}

            {/* Sub-filter input for Specific Date Selection */}
            {filterType === 'date' && (
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground outline-none focus:border-primary"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="panel rounded-xl p-4">
          <div className="text-xs font-bold uppercase text-muted-foreground">Total logged expenses</div>
          <div className="mt-2 font-mono text-2xl font-bold text-destructive">{money(totalExpense)}</div>
        </div>
        <div className="panel rounded-xl p-4">
          <div className="text-xs font-bold uppercase text-muted-foreground">Recorded entries</div>
          <div className="mt-2 font-mono text-2xl font-bold">{filteredExpenses.length}</div>
        </div>
      </div>

      <div className="panel mt-5 overflow-x-auto rounded-xl p-5">
        {q.isLoading ? (
          <Loading />
        ) : q.isError ? (
          <Failed onRetry={() => q.refetch()} />
        ) : filteredExpenses.length ? (
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
              {filteredExpenses.map((exp: any) => (
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
            detail="No expense records found matching the active filter selection." 
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