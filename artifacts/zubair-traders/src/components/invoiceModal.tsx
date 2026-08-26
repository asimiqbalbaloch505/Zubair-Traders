import React from 'react';
import { Printer } from 'lucide-react';

export interface InvoiceModalProps {
  sale: any;
  onClose: () => void;
  Modal: any;
  Button: any;
  money: (val: number | string) => string;
}

export function InvoiceModal({ sale, onClose, Modal, Button, money }: InvoiceModalProps) {
  if (!Modal || !sale) return null;

  // 1. Robust Date Extraction
  const rawDate = 
    sale.created_at || 
    sale.createdAt || 
    sale.transactionTime || 
    sale.transaction_date || 
    sale.date || 
    sale.timestamp;

  const formattedDate = rawDate 
    ? new Date(rawDate).toLocaleString('en-PK', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  // 2. Invoice Metadata & Type Checks
  const rawInv = sale.invoice_number || sale.invoiceNumber || sale.id || 'NEW';
  const cleanInvoiceNo = String(rawInv).replace(/^INV-?/i, '');
  
  const isPurchase = 
    sale.type === 'purchase' || 
    String(rawInv).startsWith('PUR') || 
    !!sale.supplier_name || 
    !!sale.supplierName;

  const isUdharCollection = 
    sale.type === 'udhar' || 
    sale.type === 'udhar_collection' || 
    String(rawInv).startsWith('REC') ||
    sale.isUdharPayment;

  // 3. Entity Name Resolution
  const entityLabel = isPurchase ? 'Supplier Name' : 'Customer Name';
  const entityName = 
    sale.supplier_name || 
    sale.supplierName || 
    sale.buyerName || 
    sale.buyer_name || 
    sale.customer_name || 
    sale.customerName || 
    'Walk-in Customer';

  // 4. Financial Calculations
  const total = sale.total_amount ?? sale.totalAmount ?? sale.amount ?? 0;
  const paid = sale.paid_amount ?? sale.paidAmount ?? total;
  const due = sale.due_amount ?? sale.dueAmount ?? Math.max(total - paid, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal title={`Invoice #${cleanInvoiceNo}`} eyebrow={isPurchase ? "Official Purchase Invoice" : "Official Sales Invoice"} onClose={onClose}>
      <div className="printable-invoice relative bg-white text-black rounded-lg flex flex-col justify-between p-4">
        
        {/* TOP SECTION */}
        <div>
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.04]">
            <span className="text-7xl font-extrabold uppercase tracking-widest text-black -rotate-12">
              ZUBAIR TRADERS
            </span>
          </div>

          {/* Header */}
          <div className="relative flex justify-between items-start border-b border-black/20 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <img 
                src="/gemini-svg.svg" 
                alt="Zubair Traders Logo" 
                className="h-10 w-10 object-contain shrink-0" 
              />
              <div>
                <h1 className="text-xl font-bold uppercase tracking-wider text-black leading-tight">
                  Zubair Traders
                </h1>
                <p className="text-xs text-gray-600 font-medium">
                  Bakery & General Traders Management
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-0.5 bg-black text-white text-[10px] font-bold uppercase rounded">
                {isPurchase ? 'Purchase Receipt' : isUdharCollection ? 'Payment Receipt' : 'Tax Invoice'}
              </span>
              <p className="text-xs text-gray-600 font-mono mt-1">
                Inv #: {cleanInvoiceNo}
              </p>
            </div>
          </div>

          {/* Customer / Supplier & Date Info */}
          <div className="relative grid grid-cols-2 gap-4 bg-gray-50 p-2.5 rounded border border-gray-200 text-xs mb-3">
            <div>
              <p className="text-gray-500 uppercase text-[10px] font-bold">
                {entityLabel}
              </p>
              <p className="font-bold text-black text-xs">
                {entityName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 uppercase text-[10px] font-bold">Transaction Date</p>
              <p className="font-semibold text-black text-xs">
                {formattedDate}
              </p>
            </div>
          </div>

          {/* Line Items Table or Udhar Payment Box */}
          {isUdharCollection ? (
            <div className="border border-gray-200 bg-gray-50 rounded p-3 mb-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Payment Description:</span>
                <span className="font-bold text-black">Udhar Payment Collected</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                <span className="font-medium text-gray-700">Collected Amount:</span>
                <span className="font-mono font-bold text-black text-sm">{money(total)}</span>
              </div>
            </div>
          ) : sale.items && sale.items.length > 0 ? (
            <div className="border border-gray-200 rounded overflow-hidden mb-3">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 border-b border-gray-200 text-black font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2">Item Description</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sale.items.map((item: any, idx: number) => {
                    const qty = Number(item.quantity ?? item.qty ?? 1);
                    
                    // Comprehensive Price Fallback (Sales + Purchase variations)
                    const uPrice = Number(
                      item.unitPrice ?? 
                      item.unit_price ?? 
                      item.price ?? 
                      item.unit_cost ?? 
                      item.unitCost ?? 
                      item.cost_price ?? 
                      item.costPrice ?? 
                      0
                    );
                    
                    const tPrice = Number(
                      item.totalPrice ?? 
                      item.total_price ?? 
                      item.amount ?? 
                      (qty * uPrice)
                    );

                    return (
                      <tr key={idx}>
                        <td className="p-2 font-medium text-black">
                          {item.productName || item.product_name || item.name || 'Product'}
                        </td>
                        <td className="p-2 text-center">{qty}</td>
                        <td className="p-2 text-right">{money(uPrice)}</td>
                        <td className="p-2 text-right font-mono font-bold">{money(tPrice)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded border bg-gray-50 p-2 text-center text-xs text-gray-500 mb-3">
              No itemized products linked to this invoice.
            </div>
          )}

          {/* Total Summary */}
          <div className="relative flex justify-end mb-3">
            <div className="w-56 space-y-1 bg-gray-50 border border-gray-200 p-2.5 rounded text-xs">
              <div className="flex justify-between text-gray-700">
                <span>Total Amount:</span>
                <span className="font-mono font-bold text-black">{money(total)}</span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>Paid Amount:</span>
                <span className="font-mono font-bold">{money(paid)}</span>
              </div>
              <div className="flex justify-between text-red-700 border-t border-gray-300 pt-1 font-bold">
                <span>Balance Due:</span>
                <span className="font-mono">{money(due)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION */}
        <div>
          {sale.notes && (
            <div className="text-xs text-gray-600 mb-2">
              <strong className="text-black">Notes:</strong> {sale.notes}
            </div>
          )}

          {/* Footer Stamp */}
          <div className="relative text-center border-t border-gray-200 pt-2">
            <p className="text-xs font-bold text-black">Thank you for your business!</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Zubair Traders • Authorized Computer Generated Receipt</p>
          </div>

          {/* Non-Printable Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 print:hidden border-t border-gray-200 mt-3">
            <Button variant="outline" testId="button-modal-print" onClick={handlePrint}>
              <Printer size={15} className="mr-1 inline" /> Print / Save PDF
            </Button>
            <Button testId="button-modal-close" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

      </div>
    </Modal>
  );
}