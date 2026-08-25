import React, { useState, useMemo } from 'react';
import { useGetExpenses, useCreateExpense } from '../hooks/useSupabaseData';
import { Plus, Search, Calendar, Filter, DollarSign, Tag, FileText } from 'lucide-react';

export function Expenses() {
  const { data: rawExpenses = [], isLoading, error } = useGetExpenses();
  const createExpenseMutation = useCreateExpense();

  // 1. Controls State with Defaults
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  const [filterMode, setFilterMode] = useState<'all' | 'today' | 'this_month' | 'custom_month' | 'custom_date'>('this_month');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayStr);

  // 2. Filter Logic with Safe Fallbacks
  const filteredExpenses = useMemo(() => {
    return rawExpenses.filter((exp: any) => {
      // Safe Date Extraction
      const rawDateStr = exp.expenseDate || exp.expense_date || exp.created_at;
      const dateObj = rawDateStr ? new Date(rawDateStr) : new Date();
      
      // Text Search
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        (exp.category || '').toLowerCase().includes(query) ||
        (exp.description || exp.notes || '').toLowerCase().includes(query) ||
        (exp.amount || '').toString().includes(query);

      if (!matchesSearch) return false;

      // Filter Mode Checks
      if (filterMode === 'all') return true;

      if (filterMode === 'today') {
        const todayObj = new Date();
        return (
          dateObj.getDate() === todayObj.getDate() &&
          dateObj.getMonth() === todayObj.getMonth() &&
          dateObj.getFullYear() === todayObj.getFullYear()
        );
      }

      if (filterMode === 'this_month') {
        const todayObj = new Date();
        return (
          dateObj.getMonth() === todayObj.getMonth() &&
          dateObj.getFullYear() === todayObj.getFullYear()
        );
      }

      if (filterMode === 'custom_month' && selectedMonth) {
        const [year, month] = selectedMonth.split('-').map(Number);
        return dateObj.getFullYear() === year && dateObj.getMonth() + 1 === month;
      }

      if (filterMode === 'custom_date' && selectedDate) {
        const [year, month, day] = selectedDate.split('-').map(Number);
        return (
          dateObj.getFullYear() === year &&
          dateObj.getMonth() + 1 === month &&
          dateObj.getDate() === day
        );
      }

      return true;
    });
  }, [rawExpenses, filterMode, selectedMonth, selectedDate, searchQuery]);

  // Calculations
  const totalExpenseAmount = useMemo(() => {
    return filteredExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) return;

    try {
      await createExpenseMutation.mutateAsync({
        data: {
          category,
          amount: parseFloat(amount),
          description,
          expenseDate: new Date(expenseDate).toISOString(),
        },
      });
      setIsModalOpen(false);
      setCategory('');
      setAmount('');
      setDescription('');
      setExpenseDate(todayStr);
    } catch (err: any) {
      alert(`Failed to add expense: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses Tracker</h1>
          <p className="text-sm text-gray-500">Monitor and log business operational operational costs</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" /> Record Expense
        </button>
      </div>

      {/* Side-by-Side Control Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search expense or note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Filter Mode Dropdown */}
        <div className="relative">
          <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <select
            value={filterMode}
            onChange={(e: any) => setFilterMode(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="this_month">This Month</option>
            <option value="custom_month">Specific Month</option>
            <option value="custom_date">Specific Date</option>
          </select>
        </div>

        {/* Month Selector (Always Visible) */}
        <div>
          <input
            type="month"
            value={selectedMonth}
            disabled={filterMode !== 'custom_month'}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
              filterMode !== 'custom_month' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        {/* Date Picker (Always Visible) */}
        <div>
          <input
            type="date"
            value={selectedDate}
            disabled={filterMode !== 'custom_date'}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
              filterMode !== 'custom_date' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between">
        <span className="text-sm font-medium text-indigo-900">Total Filtered Expenses</span>
        <span className="text-xl font-bold text-indigo-700">PKR {totalExpenseAmount.toLocaleString()}</span>
      </div>

      {/* Expenses Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading expenses...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">Error fetching expenses data.</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No expense records match your filter.</div>
        ) : (
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Description / Note</th>
                <th className="px-6 py-3 text-right">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.map((exp: any) => {
                const dateObj = exp.expenseDate || exp.expense_date ? new Date(exp.expenseDate || exp.expense_date) : null;
                const formattedDate = dateObj ? dateObj.toLocaleDateString() : 'N/A';
                return (
                  <tr key={exp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{formattedDate}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{exp.category}</td>
                    <td className="px-6 py-4">{exp.description || exp.notes || '-'}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      PKR {Number(exp.amount || 0).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Record New Expense</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Rent, Electricity, Tea"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Amount (PKR)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createExpenseMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createExpenseMutation.isPending ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}