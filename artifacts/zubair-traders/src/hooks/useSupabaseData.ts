import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useGetDashboard(_options?: any) {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [{ data: sales }, { data: products }, { data: buyers }, { data: suppliers }] = await Promise.all([
        supabase.from('sales').select('*'),
        supabase.from('products').select('*'),
        supabase.from('buyers').select('*'),
        supabase.from('suppliers').select('*'),
      ]);

      const dailySales = sales?.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0) || 0;
      const buyerDebt = buyers?.reduce((acc, b) => acc + (Number(b.current_balance) || 0), 0) || 0;
      const supplierOwed = suppliers?.reduce((acc, s) => acc + (Number(s.current_balance) || 0), 0) || 0;
      const lowStock = products?.filter(p => p.stock_quantity <= p.min_stock_alert) || [];

      return {
        dailySales,
        todaysProfit: dailySales * 0.15,
        buyerDebt,
        supplierOwed,
        cashInDrawer: dailySales,
        salesTrend: [],
        lowStock: lowStock.map(p => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          stockQuantity: p.stock_quantity,
          minStockAlert: p.min_stock_alert,
        })),
        recentActivity: [],
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
        creditLimit: b.credit_limit,
        currentBalance: b.current_balance,
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
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
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
      const { data, error } = await supabase.from('sales').select('*, buyers(name)');
      if (error) throw error;
      return (data || []).map(s => ({
        id: s.id,
        invoiceNumber: s.invoice_number || `INV-${s.id}`,
        buyerName: s.buyers?.name || 'Walk-in',
        totalAmount: s.total_amount,
        paidAmount: s.paid_amount,
        dueAmount: s.total_amount - s.paid_amount,
        paymentStatus: s.payment_status,
        transactionTime: s.created_at,
      }));
    },
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      const { data: res, error } = await supabase.from('sales').insert([{
        buyer_id: data.buyerId,
        total_amount: data.totalAmount,
        paid_amount: data.paidAmount,
        payment_status: data.paymentStatus,
        notes: data.notes,
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
        address: data.address,
      }]).select();
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
        purchaseCost: p.purchase_cost,
        sellingPrice: p.selling_price,
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
        purchase_cost: data.purchaseCost,
        selling_price: data.sellingPrice,
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
        dateGiven: l.created_at,
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