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

  const formattedDate = sale.created_at || sale.transactionTime 
    ? new Date(sale.created_at || sale.transactionTime).toLocaleString('en-PK', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  const rawInv = sale.invoice_number || sale.invoiceNumber || sale.id || 'NEW';
  const cleanInvoiceNo = String(rawInv).replace(/^INV-?/i, '');
  const total = sale.total_amount ?? sale.totalAmount ?? 0;
  const paid = sale.paid_amount ?? sale.paidAmount ?? 0;
  const due = sale.due_amount ?? sale.dueAmount ?? Math.max(total - paid, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal title={`Invoice #${cleanInvoiceNo}`} eyebrow="Official Sales Invoice" onClose={onClose}>
      <div className="printable-invoice relative bg-white text-black rounded-lg flex flex-col justify-between">
        
        {/* TOP SECTION */}
        <div>
          {/* Zubair Traders Background Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.04]">
            <span className="text-7xl font-extrabold uppercase tracking-widest text-black -rotate-12">
              ZUBAIR TRADERS
            </span>
          </div>

          {/* Professional Header with Logo */}
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
                Tax Invoice
              </span>
              <p className="text-xs text-gray-600 font-mono mt-1">
                Inv #: {cleanInvoiceNo}
              </p>
            </div>
          </div>

          {/* Customer & Date Info */}
          <div className="relative grid grid-cols-2 gap-4 bg-gray-50 p-2.5 rounded border border-gray-200 text-xs mb-3">
            <div>
              <p className="text-gray-500 uppercase text-[10px] font-bold">
                Customer Name
              </p>
              <p className="font-bold text-black text-xs">
                {sale.buyerName || sale.buyer_name || 'Walk-in Customer'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 uppercase text-[10px] font-bold">Transaction Date</p>
              <p className="font-semibold text-black text-xs">
                {formattedDate}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          {sale.items && sale.items.length > 0 ? (
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
                    const uPrice = Number(item.unitPrice ?? item.unit_price ?? item.price ?? 0);
                    const tPrice = Number(item.totalPrice ?? item.total_price ?? (qty * uPrice));

                    return (
                      <tr key={idx}>
                        <td className="p-2 font-medium text-black">
                          {item.productName || item.product_name || 'Product'}
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

          {/* Invoice Footer Stamp */}
          <div className="relative text-center border-t border-gray-200 pt-2">
            <p className="text-xs font-bold text-black">Thank you for your business!</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Zubair Traders • Authorized Computer Generated Receipt</p>
          </div>

          {/* Non-Printable Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 print:hidden border-t mt-3">
            <Button variant="outline" testId="button-modal-print" onClick={handlePrint}>
              <Printer size={15} /> Print / Save PDF
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