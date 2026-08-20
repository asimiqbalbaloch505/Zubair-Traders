import { Router, type IRouter } from "express";

type Buyer = { id: number; name: string; phone: string; cnic: string; address: string; creditLimit: number; currentBalance: number; createdAt: string };
type Supplier = { id: number; name: string; phone: string; companyName: string; address: string; currentBalance: number; createdAt: string };
type Product = { id: number; name: string; unit: string; purchaseCost: number; sellingPrice: number; stockQuantity: number; minStockAlert: number };
type Sale = { id: number; invoiceNumber: string; buyerName: string; totalAmount: number; paidAmount: number; dueAmount: number; paymentStatus: string; transactionTime: string };
type Expense = { id: number; category: string; amount: number; description: string; expenseDate: string };
type Loan = { id: number; personName: string; phone: string; loanType: string; amount: number; balanceRemaining: number; description: string; dateGiven: string };

const now = () => new Date().toISOString();
let buyerId = 4, supplierId = 3, productId = 6, saleId = 4, expenseId = 4, loanId = 3;
const buyers: Buyer[] = [
  { id: 1, name: "Al-Madina Bakers", phone: "0300 1234567", cnic: "35202-1234567-1", address: "Gulshan Market, Lahore", creditLimit: 150000, currentBalance: 48250, createdAt: now() },
  { id: 2, name: "New Lahore Sweets", phone: "0321 7654321", cnic: "35202-7654321-9", address: "Johar Town, Lahore", creditLimit: 100000, currentBalance: 12600, createdAt: now() },
  { id: 3, name: "Raza General Store", phone: "0333 1112233", cnic: "35202-1122334-7", address: "Model Town Link Road", creditLimit: 75000, currentBalance: 27800, createdAt: now() },
];
const suppliers: Supplier[] = [
  { id: 1, name: "Punjab Flour Mills", phone: "042 35789012", companyName: "Punjab Flour Mills", address: "Sheikhupura Road", currentBalance: 85500, createdAt: now() },
  { id: 2, name: "Fresh Dairy Co.", phone: "0300 5550987", companyName: "Fresh Dairy Co.", address: "Ferozepur Road", currentBalance: 24000, createdAt: now() },
];
const products: Product[] = [
  { id: 1, name: "Plain Naan", unit: "piece", purchaseCost: 18, sellingPrice: 25, stockQuantity: 420, minStockAlert: 100 },
  { id: 2, name: "Milk Bread", unit: "loaf", purchaseCost: 90, sellingPrice: 125, stockQuantity: 84, minStockAlert: 30 },
  { id: 3, name: "Almond Rusk", unit: "kg", purchaseCost: 420, sellingPrice: 600, stockQuantity: 12, minStockAlert: 15 },
  { id: 4, name: "Butter Croissant", unit: "piece", purchaseCost: 110, sellingPrice: 165, stockQuantity: 38, minStockAlert: 20 },
  { id: 5, name: "Cream Cake 1lb", unit: "piece", purchaseCost: 650, sellingPrice: 950, stockQuantity: 7, minStockAlert: 10 },
];
const sales: Sale[] = [
  { id: 1, invoiceNumber: "ZT-1048", buyerName: "Al-Madina Bakers", totalAmount: 24800, paidAmount: 24800, dueAmount: 0, paymentStatus: "PAID", transactionTime: now() },
  { id: 2, invoiceNumber: "ZT-1047", buyerName: "New Lahore Sweets", totalAmount: 12600, paidAmount: 5000, dueAmount: 7600, paymentStatus: "PARTIALLY_PAID", transactionTime: now() },
  { id: 3, invoiceNumber: "ZT-1046", buyerName: "Raza General Store", totalAmount: 27800, paidAmount: 0, dueAmount: 27800, paymentStatus: "DUE", transactionTime: now() },
];
const expenses: Expense[] = [
  { id: 1, category: "Electricity", amount: 18500, description: "Monthly electricity bill", expenseDate: now() },
  { id: 2, category: "Fuel", amount: 4200, description: "Delivery van fuel", expenseDate: now() },
  { id: 3, category: "Tea & Food", amount: 1650, description: "Staff refreshments", expenseDate: now() },
];
const loans: Loan[] = [
  { id: 1, personName: "Usman (Driver)", phone: "0301 2233445", loanType: "LENT", amount: 20000, balanceRemaining: 12000, description: "Emergency advance", dateGiven: now() },
  { id: 2, personName: "Bilal Traders", phone: "0322 6543210", loanType: "BORROWED", amount: 50000, balanceRemaining: 50000, description: "Short-term working capital", dateGiven: now() },
];

const asNumber = (value: unknown) => Number(value ?? 0);
const router: IRouter = Router();

router.get("/dashboard", (_req, res) => {
  const dailySales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const buyerDebt = buyers.reduce((sum, buyer) => sum + buyer.currentBalance, 0);
  const supplierOwed = suppliers.reduce((sum, supplier) => sum + supplier.currentBalance, 0);
  const expensesTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  res.json({
    dailySales, todaysProfit: dailySales * 0.23 - expensesTotal, buyerDebt, supplierOwed,
    cashInDrawer: sales.reduce((sum, sale) => sum + sale.paidAmount, 0) - expensesTotal,
    lowStock: products.filter((product) => product.stockQuantity <= product.minStockAlert),
    salesTrend: [{ label: "Mon", value: 45200 }, { label: "Tue", value: 62800 }, { label: "Wed", value: 51800 }, { label: "Thu", value: 73400 }, { label: "Fri", value: 64200 }, { label: "Sat", value: 78200 }, { label: "Sun", value: dailySales }],
    recentActivity: [
      { id: 1, title: "Invoice ZT-1048 paid", detail: "Al-Madina Bakers · PKR 24,800", time: "12 min ago", type: "sale" },
      { id: 2, title: "Low stock alert", detail: "Almond Rusk is below threshold", time: "34 min ago", type: "alert" },
      { id: 3, title: "Expense recorded", detail: "Electricity · PKR 18,500", time: "1 hr ago", type: "expense" },
    ],
  });
});

const listAndCreate = <T extends { id: number }>(path: string, items: T[], nextId: () => number) => {
  router.get(`/${path}`, (_req, res) => res.json(items));
  router.post(`/${path}`, (req, res) => {
    const item = { id: nextId(), ...req.body, createdAt: now(), transactionTime: now(), expenseDate: req.body.expenseDate ?? now(), dateGiven: now() } as T;
    items.unshift(item);
    res.status(201).json(item);
  });
};
listAndCreate("buyers", buyers, () => buyerId++);
listAndCreate("suppliers", suppliers, () => supplierId++);
listAndCreate("products", products, () => productId++);
listAndCreate("sales", sales, () => saleId++);
listAndCreate("expenses", expenses, () => expenseId++);
listAndCreate("loans", loans, () => loanId++);

router.patch("/buyers/:id", (req, res) => {
  const buyer = buyers.find((item) => item.id === Number(req.params.id));
  if (!buyer) {
    res.status(404).json({ error: "Buyer not found" });
    return;
  }
  Object.assign(buyer, req.body);
  res.json(buyer);
});

export default router;