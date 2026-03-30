export interface Broker {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface Buyer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  buyerId: string;
  brokerIds: string[];
  amount: number;
  issueDate: string;
  dueDate: string;
  description: string;
  status: 'open' | 'partial' | 'closed';
  paidAmount: number;
  remainingAmount: number;
  closingReferenceNumber?: string;
  closedDate?: string;
}

export interface Payment {
  id: string;
  referenceNumber: string;
  amount: number;
  receivedDate: string;
  receivedFrom: string; // buyer or broker name
  receivedFromType: 'buyer' | 'broker';
  receivedFromId: string;
  description?: string;
  allocatedAmount: number;
  remainingAmount: number;
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  allocatedAmount: number;
  allocationDate: string;
  notes?: string;
}

export interface PaymentAllocationReport {
  payment: Payment;
  allocations: (PaymentAllocation & { invoice: Invoice })[];
}

export interface InvoiceClosureReport {
  invoice: Invoice;
  allocations: (PaymentAllocation & { payment: Payment })[];
  buyer: Buyer;
  brokers: Broker[];
}