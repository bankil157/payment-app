import { Invoice, Payment, PaymentAllocation } from '@/types';
import { getPaymentAllocations, getAllocationsForInvoice, getAllocationsForPayment } from './storage';

export const calculateInvoiceStatus = (invoice: Invoice): { status: 'open' | 'partial' | 'closed', paidAmount: number, remainingAmount: number } => {
  const allocations = getAllocationsForInvoice(invoice.id);
  const paidAmount = allocations.reduce((sum, allocation) => sum + allocation.allocatedAmount, 0);
  const remainingAmount = invoice.amount - paidAmount;

  let status: 'open' | 'partial' | 'closed';
  if (paidAmount === 0) {
    status = 'open';
  } else if (remainingAmount > 0) {
    status = 'partial';
  } else {
    status = 'closed';
  }

  return { status, paidAmount, remainingAmount };
};

export const calculatePaymentStatus = (payment: Payment): { allocatedAmount: number, remainingAmount: number } => {
  const allocations = getAllocationsForPayment(payment.id);
  const allocatedAmount = allocations.reduce((sum, allocation) => sum + allocation.allocatedAmount, 0);
  const remainingAmount = payment.amount - allocatedAmount;

  return { allocatedAmount, remainingAmount };
};

export const updateInvoiceStatus = (invoice: Invoice): Invoice => {
  const { status, paidAmount, remainingAmount } = calculateInvoiceStatus(invoice);
  
  return {
    ...invoice,
    status,
    paidAmount,
    remainingAmount,
    closedDate: status === 'closed' && !invoice.closedDate ? new Date().toISOString().split('T')[0] : invoice.closedDate,
  };
};

export const updatePaymentStatus = (payment: Payment): Payment => {
  const { allocatedAmount, remainingAmount } = calculatePaymentStatus(payment);
  
  return {
    ...payment,
    allocatedAmount,
    remainingAmount,
  };
};

export const generateInvoiceNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const time = now.getTime().toString().slice(-4);
  
  return `INV-${year}${month}${day}-${time}`;
};

export const generatePaymentReference = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const time = now.getTime().toString().slice(-4);
  
  return `PAY-${year}${month}${day}-${time}`;
};

export const generateClosingReference = (invoiceNumber: string): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  return `CLOSE-${invoiceNumber.replace('INV-', '')}-${year}${month}${day}`;
};