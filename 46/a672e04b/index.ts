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
  referenceNumber: string;
  shippingBill: string; // Key field - unique identifier
  ocfNumber: string; // OCF Number - unique identifier
  buyerId: string;
  buyerName: string;
  brokerId: string;
  brokerName: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'partial' | 'paid';
  description?: string;
  paidAmount: number;
  remainingAmount: number;
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

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'manager' | 'accountant' | 'viewer';
  permissions: UserPermissions;
  createdDate: string;
  isActive: boolean;
}

export interface UserPermissions {
  invoices: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  payments: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  allocations: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  reports: {
    view: boolean;
    export: boolean;
  };
  buyers: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  brokers: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  users: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
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