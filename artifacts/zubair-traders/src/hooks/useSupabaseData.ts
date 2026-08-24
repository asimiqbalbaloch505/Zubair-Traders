import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useGetDashboard(filter: string = 'this_month', customMonth?: string, _options?: any) {
  return useQuery({
    queryKey: ['dashboard', filter, customMonth],
    queryFn: async () => {
      const [
        { data: sales, error: errSales },
        { data: products },
        { data: buyers },
        { data: suppliers },
        { data: expenses },
        { data: purchases },
        { data: buyerPayments }
      ] = await Promise.all([
        supabase.from('sales_invoices').select(`
          *,
          buyers (name),
          sales_invoice_items (
            quantity,
            unit_price,
            unit_cost,
            products (default_purchase_cost)
          )
        `).gt('total_amount', 0),
        supabase.from('products').select('*'),
        supabase.from('buyers').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('purchase_invoices').select('*'),
        supabase.from('buyer_payments').select('*'),
      ]);

      if (errSales) console.error('Sales fetch error:', errSales);

      const now = new Date();
      
      const isWithinFilter = (dateString: string | Date | null) => {
        if (!dateString) return false;
        const d = new Date(dateString);
        
        if (filter === 'all_time') return true;
        if (filter === 'today') return d.toDateString() === now.toDateString();
        if (filter === 'this_week') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          return d >= sevenDaysAgo && d <= now;
        }
        if (filter === 'this_month') {
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        if (filter === 'last_month') {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
        }
        if (filter === 'this_year') return d.getFullYear() === now.getFullYear();
        if (filter === 'custom_month' && customMonth) {
          const [year, month] = customMonth.split('-').map(Number);
          return d.getFullYear() === year && (d.getMonth() + 1) === month;
        }
        return true;
      };

      const filteredSales = sales?.filter(s => isWithinFilter(s.created_at || s.transaction_time)) || [];
      const filteredExpenses = expenses?.filter(e => isWithinFilter(e.expense_date || e.created_at)) || [];
      const filteredPurchases = purchases?.filter(p => isWithinFilter(p.transaction_time || p.created_at)) || [];

      // 1. Total Sales Revenue
      const totalSales = filteredSales.reduce((acc, s) => acc + (Number(s.total_amount ?? s.totalAmount) || 0), 0);
      
      // 2. Cost of Goods Sold (COGS)
      const totalCogs = filteredSales.reduce((acc, s) => {
        const items = s.sales_invoice_items || [];
        const invoiceCogs = items.reduce((itemAcc: number, item: any) => {
          const qty = Number(item.quantity) || 0;
          const cost = Number(item.unit_cost ?? item.products?.default_purchase_cost ?? 0);
          return itemAcc + (qty * cost);
        }, 0);
        return acc + invoiceCogs;
      }, 0);

      // 3. Operational Expenses
      const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

      // 4. Profit Calculations
      const grossProfit = totalSales - totalCogs;
      const netProfit = grossProfit - totalExpenses;

      // Low Stock Items
      const lowStock = (products || [])
        .filter(p => (p.stock_quantity ?? p.stockQuantity ?? 0) <= (p.min_stock_alert ?? p.minStockAlert ?? 5))
        .map(p => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          stockQuantity: p.stock_quantity,
          minStockAlert: p.min_stock_alert,
        }));

      // Calculate true total buyer balance dynamically across all sales & payments
      const totalUnpaidSales = (sales || []).reduce((acc, s) => acc + (Number(s.due_amount ?? s.dueAmount ?? ((s.total_amount || 0) - (s.paid_amount || 0))) || 0), 0);
      const totalCollectedPayments = (buyerPayments || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      
      const totalBuyerReceivables = filter === 'all_time'
        ? Math.max(0, totalUnpaidSales - totalCollectedPayments)
        : filteredSales.reduce((acc, s) => acc + (Number(s.due_amount ?? s.dueAmount ?? ((s.total_amount || 0) - (s.paid_amount || 0))) || 0), 0);

      const totalSupplierPayables = filter === 'all_time'
        ? (suppliers?.reduce((acc, s) => acc + (Number(s.current_balance ?? s.currentBalance) || 0), 0) || 0)
        : filteredPurchases.reduce((acc, p) => acc + (Number(p.due_amount ?? p.dueAmount ?? ((p.total_amount || 0) - (p.paid_amount || 0))) || 0), 0);

      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const salesTrend = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        
        const dayLabel = daysOfWeek[d.getDay()];
        const dateString = `${d.getMonth() + 1}/${d.getDate()}`;
        
        const dayTotal = (sales || [])
          .filter(s => {
            const saleDate = new Date(s.created_at || s.transaction_time || Date.now());
            return saleDate.toDateString() === d.toDateString();
          })
          .reduce((acc, s) => acc + (Number(s.total_amount ?? s.totalAmount) || 0), 0);

        return { day: dayLabel, date: dateString, value: dayTotal };
      });

      // Construct dynamic Recent Activity stream
      const saleActivities = (sales || []).map(s => {
        const dateObj = new Date(s.transaction_time || s.created_at || Date.now());
        const invNum = s.invoice_number ? `INV-${s.invoice_number}` : `INV-${s.id}`;
        const buyerName = s.buyers?.name || 'Walk-in Customer';
        const amount = Number(s.total_amount || 0);

        return {
          id: `sale-${s.id}`,
          type: 'payment',
          title: `Sale Recorded (${invNum})`,
          detail: `${buyerName} • PKR ${amount.toLocaleString()}`,
          time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: dateObj.getTime(),
        };
      });

      const expenseActivities = (expenses || []).map(e => {
        const dateObj = new Date(e.expense_date || e.created_at || Date.now());
        const category = e.category || 'General';
        const amount = Number(e.amount || 0);

        return {
          id: `expense-${e.id}`,
          type: 'expense',
          title: `Expense logged (${category})`,
          detail: `${e.description || 'Shop expense'} • PKR ${amount.toLocaleString()}`,
          time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: dateObj.getTime(),
        };
      });

      const recentActivity = [...saleActivities, ...expenseActivities]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 8);

      return {
        totalSales,
        totalExpenses,
        totalCogs,
        grossProfit,
        netProfit,
        lowStock,
        totalBuyerReceivables,
        totalSupplierPayables,
        salesTrend,
        recentActivity,
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
        phone: b.phone || '',
        cnic: b.cnic || '',
        address: b.address || '',
        currentBalance: b.current_balance ?? b.currentBalance ?? 0,
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
        phone: data.phone || '',
        cnic: data.cnic || '', // Prevents NOT NULL violation when CNIC field is omitted
        address: data.address || '',
        current_balance: 0,
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
        phone: data.phone || '',
        cnic: data.cnic || '',
        address: data.address || '',
      }).eq('id', id).select();
      if (error) throw error;
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buyers'] }),
  });
}

export function useCollectBuyerPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { buyerId?: string | number; buyer_id?: string | number; amount: number; notes?: string; paymentMethod?: string; payment_method?: string }) => {
      const targetBuyerId = payload.buyerId || payload.buyer_id;
      const parsedAmount = Number(payload.amount);

      if (!targetBuyerId) {
        throw new Error('Buyer ID is required.');
      }
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Please enter a valid payment amount.');
      }

      const { data: receipt, error: receiptError } = await supabase
        .from('buyer_payments')
        .insert([
          {
            buyer_id: String(targetBuyerId),
            amount: parsedAmount,
            payment_method: payload.paymentMethod || payload.payment_method || 'Cash',
            notes: payload.notes || 'Udhaar Payment Collected',
          },
        ])
        .select()
        .single();

      if (receiptError) {
        console.error('Error inserting payment receipt:', receiptError);
        throw receiptError;
      }

      const { data: currentBuyer, error: buyerError } = await supabase
        .from('buyers')
        .select('current_balance')
        .eq('id', targetBuyerId)
        .single();

      if (buyerError) {
        console.error('Error fetching buyer balance:', buyerError);
        throw buyerError;
      }

      const existingBalance = Number(currentBuyer?.current_balance || 0);
      const newBalance = Math.max(0, existingBalance - parsedAmount);

      const { error: updateError } = await supabase
        .from('buyers')
        .update({ current_balance: newBalance })
        .eq('id', targetBuyerId);

      if (updateError) {
        console.error('Error updating buyer balance:', updateError);
        throw updateError;
      }

      return receipt;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buyers'] });
      qc.invalidateQueries({ queryKey: ['buyer_payments'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      alert(`Payment Failed: ${error.message || 'Unknown database error'}`);
    },
  });
}

export function useGetBuyerPayments(buyerId?: string | number) {
  return useQuery({
    queryKey: ['buyer_payments', buyerId],
    queryFn: async () => {
      let query = supabase.from('buyer_payments').select(`
        *,
        buyers (name)
      `).order('created_at', { ascending: false });

      if (buyerId) {
        query = query.eq('buyer_id', String(buyerId));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useGetSales() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select(`
          *,
          buyers(name),
          sales_invoice_items(
            *,
            products(name)
          )
        `)
        .gt('total_amount', 0)
        .order('transaction_time', { ascending: false });

      if (error) {
        console.error("Sales query error:", error);
        throw error;
      }

      return (data || []).map((s: any) => {
        let status = String(s.payment_status || 'unpaid').toLowerCase();
        if (status === 'partially_paid' || status === 'partially paid') status = 'partial';
        if (status === 'due') status = 'unpaid';

        const mappedItems = (s.sales_invoice_items || []).map((item: any) => {
          const pName = item.products?.name || item.product_name || 'Item';
          return {
            id: item.id,
            productId: item.product_id,
            product_id: item.product_id,
            productName: pName,
            product_name: pName,
            name: pName,
            quantity: item.quantity,
            qty: item.quantity,
            unitPrice: item.unit_price,
            unit_price: item.unit_price,
            price: item.unit_price,
            unitCost: item.unit_cost,
            unit_cost: item.unit_cost,
            subtotal: item.subtotal || (item.quantity * item.unit_price),
            total_price: item.subtotal || (item.quantity * item.unit_price)
          };
        });

        return {
          id: s.id,
          invoiceNumber: s.invoice_number ? `INV-${s.invoice_number}` : `INV-${s.id}`,
          invoice_number: s.invoice_number,
          buyerId: s.buyer_id,
          buyer_id: s.buyer_id,
          buyerName: s.buyers?.name || 'Walk-in',
          totalAmount: s.total_amount,
          total_amount: s.total_amount,
          paidAmount: s.paid_amount,
          paid_amount: s.paid_amount,
          dueAmount: s.due_amount ?? ((s.total_amount || 0) - (s.paid_amount || 0)),
          due_amount: s.due_amount ?? ((s.total_amount || 0) - (s.paid_amount || 0)),
          paymentStatus: status,
          payment_status: status,
          transactionTime: s.transaction_time || s.created_at,
          transaction_time: s.transaction_time || s.created_at,
          notes: s.notes,
          
          items: mappedItems,
          sales_items: mappedItems,
          sale_items: mappedItems,
          sales_invoice_items: mappedItems
        };
      });
    }
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
      const due = total - paid;
      const buyerId = data.buyerId || data.buyer_id;

      // 1. Insert Sales Invoice
      const { data: resInvoice, error: invError } = await supabase.from('sales_invoices').insert([{
        buyer_id: buyerId,
        total_amount: total,
        paid_amount: paid,
        due_amount: due,
        payment_status: dbStatus,
        notes: data.notes || null,
      }]).select().single();

      if (invError) throw invError;

      // 2. Insert Invoice Items (Database trigger will handle stock deduction)
      if (data.items && data.items.length > 0) {
        const lineItems = data.items.map((item: any) => ({
          invoice_id: resInvoice.id,
          product_id: item.productId || item.product_id,
          quantity: Number(item.quantity || item.qty || 1),
          unit_price: Number(item.unitPrice || item.unit_price || 0),
          unit_cost: Number(item.unitCost || item.unit_cost || 0),
          subtotal: Number(item.subtotal || item.totalPrice || (item.quantity * item.unitPrice) || 0)
        }));

        const { error: itemsError } = await supabase.from('sales_invoice_items').insert(lineItems);
        if (itemsError) throw itemsError;
      }

      // 3. Update Buyer Balance
      if (buyerId && due > 0) {
        const { data: currentBuyer, error: buyerErr } = await supabase
          .from('buyers')
          .select('current_balance')
          .eq('id', buyerId)
          .single();

        if (buyerErr) throw buyerErr;

        if (currentBuyer) {
          const updatedBalance = Number(currentBuyer.current_balance || 0) + due;
          const { error: updateBuyerErr } = await supabase
            .from('buyers')
            .update({ current_balance: updatedBalance })
            .eq('id', buyerId);

          if (updateBuyerErr) throw updateBuyerErr;
        }
      }

      return resInvoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['buyers'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useGetPurchases() {
  return useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select(`
          *,
          suppliers (
            name,
            company_name
          ),
          purchase_invoice_items (
            *,
            products (
              name
            )
          )
        `)
        .order('transaction_time', { ascending: false });

      if (error) {
        console.error('Purchases fetch error:', error);
        throw error;
      }

      return (data || []).map((p: any) => {
  let status = String(p.payment_status || 'unpaid').toLowerCase();
  if (status === 'partially_paid' || status === 'partially paid') status = 'partial';
  if (status === 'due') status = 'unpaid';

  const mappedItems = (p.purchase_invoice_items || []).map((item: any) => {
    const pName = item.products?.name || item.product_name || 'Item';
    return {
      id: item.id,
      productId: item.product_id,
      product_id: item.product_id,
      productName: pName,
      product_name: pName,
      name: pName,
      quantity: item.quantity,
      qty: item.quantity,
      unitCost: item.purchase_cost,
      unit_cost: item.purchase_cost,
      subtotal: item.subtotal || (item.quantity * item.purchase_cost),
    };
  });

  return {
    id: p.id,
    // Add purchaseNumber mapping:
    purchaseNumber: p.purchase_number ? `PUR-${p.purchase_number}` : `PUR-${p.id}`,
    purchase_number: p.purchase_number,
    supplierId: p.supplier_id,
    supplier_id: p.supplier_id,
    supplierName: p.suppliers?.name || p.suppliers?.company_name || 'General Supplier',
    totalAmount: p.total_amount,
    total_amount: p.total_amount,
    paidAmount: p.paid_amount,
    paid_amount: p.paid_amount,
    dueAmount: p.due_amount ?? ((p.total_amount || 0) - (p.paid_amount || 0)),
    due_amount: p.due_amount ?? ((p.total_amount || 0) - (p.paid_amount || 0)),
    paymentStatus: status,
    payment_status: status,
    transactionTime: p.transaction_time || p.created_at,
    transaction_time: p.transaction_time || p.created_at,
    created_at: p.transaction_time || p.created_at,
    notes: p.notes,
    items: mappedItems,
    purchase_invoice_items: mappedItems
  };
});
    },
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      const rawSupplierId = data.supplierId || data.supplier_id;
      const supplierId = rawSupplierId && String(rawSupplierId).trim() !== '' ? rawSupplierId : null;

      let calculatedTotal = Number(data.totalAmount ?? data.total_amount ?? 0);
      if (data.items && data.items.length > 0) {
        calculatedTotal = data.items.reduce((sum: number, item: any) => {
          const qty = Number(item.quantity || item.qty || 1);
          const cost = Number(item.unitCost || item.purchase_cost || 0);
          return sum + (qty * cost);
        }, 0);
      }

      const paid = Number(data.paidAmount ?? data.paid_amount ?? 0);
      const due = Math.max(0, calculatedTotal - paid);

      let paymentStatus = 'DUE';
      if (paid >= calculatedTotal && calculatedTotal > 0) {
        paymentStatus = 'PAID';
      } else if (paid > 0) {
        paymentStatus = 'PARTIALLY_PAID';
      }

      const { data: purchase, error: purchaseError } = await supabase.from('purchase_invoices').insert([{
        supplier_id: supplierId,
        total_amount: calculatedTotal,
        paid_amount: paid,
        due_amount: due,
        payment_status: paymentStatus,
        notes: data.notes || null,
        transaction_time: new Date().toISOString(),
      }]).select().single();

      if (purchaseError) {
        console.error('purchase_invoices insert error detail:', purchaseError);
        throw purchaseError;
      }

      if (data.items && data.items.length > 0) {
        const lineItems = data.items.map((item: any) => {
          const qty = Number(item.quantity || item.qty || 1);
          const cost = Number(item.unitCost || item.purchase_cost || 0);
          const rawProdId = item.productId || item.product_id;
          
          return {
            purchase_id: purchase.id,
            product_id: isNaN(Number(rawProdId)) ? rawProdId : Number(rawProdId),
            quantity: qty,
            purchase_cost: cost,
            subtotal: Number(item.subtotal || item.totalPrice || (qty * cost))
          };
        });

        const { error: purchaseItemsError } = await supabase.from('purchase_invoice_items').insert(lineItems);
        if (purchaseItemsError) {
          console.error('purchase_invoice_items insert error detail:', purchaseItemsError);
          throw purchaseItemsError;
        }

        for (const item of data.items) {
          const prodId = item.productId || item.product_id;
          const qtyPurchased = Number(item.quantity || item.qty || 1);
          const newCost = Number(item.unitCost || item.purchase_cost || 0);
          const newSell = Number(item.unitPrice || item.unit_price || 0);

          const { data: currentProd, error: prodErr } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', prodId)
            .single();

          if (prodErr) throw prodErr;

          if (currentProd) {
            const newStock = Number(currentProd.stock_quantity || 0) + qtyPurchased;
            
            const updatePayload: any = { stock_quantity: newStock };
            if (newCost > 0) updatePayload.default_purchase_cost = newCost;
            if (newSell > 0) updatePayload.default_selling_price = newSell;

            const { error: updateStockErr } = await supabase
              .from('products')
              .update(updatePayload)
              .eq('id', prodId);

            if (updateStockErr) throw updateStockErr;
          }
        }
      }

      if (supplierId && due > 0) {
        const { data: currentSupplier, error: supplierErr } = await supabase
          .from('suppliers')
          .select('current_balance')
          .eq('id', supplierId)
          .single();

        if (supplierErr) throw supplierErr;

        if (currentSupplier) {
          const updatedBalance = Number(currentSupplier.current_balance || 0) + due;
          const { error: updateSupplierErr } = await supabase
            .from('suppliers')
            .update({ current_balance: updatedBalance })
            .eq('id', supplierId);

          if (updateSupplierErr) throw updateSupplierErr;
        }
      }

      return purchase;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      alert(`Restock Failed: ${error.message || 'Database validation error'}`);
    }
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
        currentBalance: s.current_balance || 0,
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
        current_balance: 0,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
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

// Query Key Helpers
export const getGetDashboardQueryKey = () => ['dashboard'];
export const getGetBuyersQueryKey = () => ['buyers'];
export const getGetSalesQueryKey = () => ['sales'];
export const getGetPurchasesQueryKey = () => ['purchases'];
export const getGetBuyerPaymentsQueryKey = (buyerId?: string | number) => ['buyer_payments', buyerId];
export const getGetSuppliersQueryKey = () => ['suppliers'];
export const getGetProductsQueryKey = () => ['products'];
export const getGetExpensesQueryKey = () => ['expenses'];
export const getGetLoansQueryKey = () => ['loans'];
export const getHealthCheckQueryKey = () => ['health'];