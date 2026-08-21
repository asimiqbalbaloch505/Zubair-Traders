import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useGetDashboard(_options?: any) {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [
        { data: sales, error: errSales },
        { data: products },
        { data: buyers },
        { data: suppliers },
        { data: expenses }
      ] = await Promise.all([
        supabase.from('sales_invoices').select('*'),
        supabase.from('products').select('*'),
        supabase.from('buyers').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('expenses').select('*'),
      ]);

      if (errSales) console.error('Sales fetch error:', errSales);

      // Calculations
      const totalSales = sales?.reduce((acc, s) => acc + (Number(s.total_amount ?? s.totalAmount) || 0), 0) || 0;
      const totalBuyerReceivables = buyers?.reduce((acc, b) => acc + (Number(b.current_balance ?? b.currentBalance) || 0), 0) || 0;
      const totalSupplierPayables = suppliers?.reduce((acc, s) => acc + (Number(s.current_balance ?? s.currentBalance) || 0), 0) || 0;
      const totalExpenses = expenses?.reduce((acc, e) => acc + (Number(e.amount) || 0), 0) || 0;

      // Net Profit = Total Sales - Total Expenses
      const netProfit = totalSales - totalExpenses;

      // Last 7 Days Calculation (Sunday - Saturday)
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const salesTrend = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        
        const dayLabel = daysOfWeek[d.getDay()];
        const dateString = `${d.getMonth() + 1}/${d.getDate()}`;
        
        // Sum matching day sales
        const dayTotal = sales
          ?.filter(s => {
            const saleDate = new Date(s.created_at || s.transaction_time || Date.now());
            return saleDate.toDateString() === d.toDateString();
          })
          .reduce((acc, s) => acc + (Number(s.total_amount ?? s.totalAmount) || 0), 0) || 0;

        return {
          day: dayLabel,
          date: dateString,
          value: dayTotal,
        };
      });

      return {
        totalSales,
        totalBuyerReceivables,
        totalSupplierPayables,
        totalExpenses,
        netProfit,
        salesTrend,
      };
    },
  });
}

export function useGetBuyers(_options?: any) {
  return useQuery({
    queryKey: ['buyers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('buyers').select('*');
      if (error) throw error;
      return (data || []).map(b => ({
        id: b.id,
        name: b.name,
        phone: b.phone,
        cnic: b.cnic,
        address: b.address,
        creditLimit: b.credit_limit ?? b.creditLimit,
        currentBalance: b.current_balance ?? b.currentBalance,
      }));
    },
  });
}

export function useCreateBuyer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      const { data: res, error } = await supabase.from('buyers').insert([{
        name: data.name,
        phone: data.phone,
        cnic: data.cnic,
        address: data.address,
        credit_limit: data.creditLimit,
      }]).select();
      if (error) throw error;
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buyers'] }),
  });
}

export function useUpdateBuyer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: any }) => {
      const { data: res, error } = await supabase.from('buyers').update({
        name: data.name,
        phone: data.phone,
        cnic: data.cnic,
        address: data.address,
        credit_limit: data.creditLimit,
      }).eq('id', id).select();
      if (error) throw error;
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buyers'] }),
  });
}

export function useGetSales(_options?: any) {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sales_invoices').select('*, buyers(name)');
      if (error) throw error;
      return (data || []).map(s => {
        let mappedStatus = 'unpaid';
        if (s.payment_status === 'PAID') mappedStatus = 'paid';
        else if (s.payment_status === 'PARTIALLY_PAID') mappedStatus = 'partial';
        else if (s.payment_status === 'DUE') mappedStatus = 'unpaid';
        else if (s.payment_status) mappedStatus = String(s.payment_status).toLowerCase();

        return {
          id: s.id,
          invoiceNumber: s.invoice_number ? `INV-${s.invoice_number}` : `INV-${s.id}`,
          buyerName: s.buyers?.name || 'Walk-in',
          totalAmount: s.total_amount,
          paidAmount: s.paid_amount,
          dueAmount: s.due_amount ?? ((s.total_amount || 0) - (s.paid_amount || 0)),
          paymentStatus: mappedStatus,
          transactionTime: s.transaction_time || s.created_at,
        };
      });
    },
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      let dbStatus = 'DUE';
      const rawStatus = String(data.paymentStatus || data.payment_status || '').toUpperCase();
      
      if (rawStatus === 'PAID') {
        dbStatus = 'PAID';
      } else if (rawStatus === 'PARTIAL' || rawStatus === 'PARTIALLY_PAID') {
        dbStatus = 'PARTIALLY_PAID';
      } else if (rawStatus === 'UNPAID' || rawStatus === 'DUE') {
        dbStatus = 'DUE';
      }

      const total = Number(data.totalAmount ?? data.total_amount ?? 0);
      const paid = Number(data.paidAmount ?? data.paid_amount ?? 0);

      const { data: res, error } = await supabase.from('sales_invoices').insert([{
        buyer_id: data.buyerId || data.buyer_id,
        total_amount: total,
        paid_amount: paid,
        due_amount: total - paid,
        payment_status: dbStatus,
        notes: data.notes || null,
      }]).select();

      if (error) throw error;
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useGetSuppliers(_options?: any) {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('*');
      if (error) throw error;
      return (data || []).map(s => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        companyName: s.company_name,
        currentBalance: s.current_balance,
      }));
    },
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      const { data: res, error } = await supabase.from('suppliers').insert([{
        name: data.name,
        phone: data.phone,
        company_name: data.companyName,
        cnic: data.cnic,
        address: data.address,
      }]).select();
      if (error) throw error;
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: any }) => {
      const { data: res, error } = await supabase.from('suppliers').update({
        name: data.name,
        phone: data.phone,
        company_name: data.companyName,
        cnic: data.cnic,
        address: data.address,
      }).eq('id', id).select();
      if (error) throw error;
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useGetProducts(_options?: any) {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return (data || []).map(p => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        purchaseCost: p.default_purchase_cost,
        sellingPrice: p.default_selling_price,
        stockQuantity: p.stock_quantity,
        minStockAlert: p.min_stock_alert,
      }));
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      const { data: res, error } = await supabase.from('products').insert([{
        name: data.name,
        unit: data.unit,
        default_purchase_cost: data.purchaseCost,
        default_selling_price: data.sellingPrice,
        stock_quantity: data.stockQuantity,
        min_stock_alert: data.minStockAlert,
      }]).select();
      if (error) throw error;
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useGetExpenses(_options?: any) {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('*');
      if (error) throw error;
      return (data || []).map(e => ({
        id: e.id,
        category: e.category,
        amount: e.amount,
        description: e.description,
        expenseDate: e.expense_date,
      }));
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      const { data: res, error } = await supabase.from('expenses').insert([{
        category: data.category,
        amount: data.amount,
        description: data.description,
        expense_date: data.expenseDate,
      }]).select();
      if (error) throw error;
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useGetLoans(_options?: any) {
  return useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('loans').select('*');
      if (error) throw error;
      return (data || []).map(l => ({
        id: l.id,
        personName: l.person_name,
        phone: l.phone,
        loanType: l.loan_type,
        amount: l.amount,
        balanceRemaining: l.balance_remaining,
        dateGiven: l.date_given || l.created_at,
      }));
    },
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      const { data: res, error } = await supabase.from('loans').insert([{
        person_name: data.personName,
        phone: data.phone,
        loan_type: data.loanType,
        amount: data.amount,
        balance_remaining: data.amount,
        description: data.description,
      }]).select();
      if (error) throw error;
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
}

export function useHealthCheck(_options?: any) {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { error } = await supabase.from('buyers').select('id').limit(1);
      if (error) throw error;
      return { status: 'ok' };
    },
  });
}

export const getGetDashboardQueryKey = () => ['dashboard'];
export const getGetBuyersQueryKey = () => ['buyers'];
export const getGetSalesQueryKey = () => ['sales'];
export const getGetSuppliersQueryKey = () => ['suppliers'];
export const getGetProductsQueryKey = () => ['products'];
export const getGetExpensesQueryKey = () => ['expenses'];
export const getGetLoansQueryKey = () => ['loans'];
export const getHealthCheckQueryKey = () => ['health'];