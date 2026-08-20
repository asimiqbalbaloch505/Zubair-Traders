import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const buyers = pgTable("buyers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  cnic: text("cnic").notNull(),
  address: text("address").notNull(),
  creditLimit: numeric("credit_limit").notNull().default("0"),
  currentBalance: numeric("current_balance").notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  companyName: text("company_name").notNull().default(""),
  address: text("address").notNull().default(""),
  currentBalance: numeric("current_balance").notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  purchaseCost: numeric("purchase_cost").notNull(),
  sellingPrice: numeric("selling_price").notNull(),
  stockQuantity: numeric("stock_quantity").notNull().default("0"),
  minStockAlert: numeric("min_stock_alert").notNull().default("10"),
});

export const sales = pgTable("sales_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  buyerId: serial("buyer_id").notNull(),
  buyerName: text("buyer_name").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  paidAmount: numeric("paid_amount").notNull(),
  dueAmount: numeric("due_amount").notNull(),
  paymentStatus: text("payment_status").notNull(),
  notes: text("notes").notNull().default(""),
  transactionTime: timestamp("transaction_time", { withTimezone: true }).defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  amount: numeric("amount").notNull(),
  description: text("description").notNull(),
  expenseDate: timestamp("expense_date", { withTimezone: true }).defaultNow().notNull(),
});

export const loans = pgTable("loans", {
  id: serial("id").primaryKey(),
  personName: text("person_name").notNull(),
  phone: text("phone").notNull(),
  loanType: text("loan_type").notNull(),
  amount: numeric("amount").notNull(),
  balanceRemaining: numeric("balance_remaining").notNull(),
  description: text("description").notNull(),
  dateGiven: timestamp("date_given", { withTimezone: true }).defaultNow().notNull(),
});

export const insertBuyerSchema = createInsertSchema(buyers);
export const insertSupplierSchema = createInsertSchema(suppliers);
export const insertProductSchema = createInsertSchema(products);
export const insertSaleSchema = createInsertSchema(sales);
export const insertExpenseSchema = createInsertSchema(expenses);
export const insertLoanSchema = createInsertSchema(loans);