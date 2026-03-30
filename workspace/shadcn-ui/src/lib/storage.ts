import { Invoice, Payment, PaymentAllocation, Buyer, Broker, User, UserPermissions } from '@/types';

const STORAGE_KEYS = {
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  ALLOCATIONS: 'payment_allocations',
  BUYERS: 'buyers',
  BROKERS: 'brokers',
};

// Generic storage functions
const getFromStorage = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveToStorage = <T>(key: string, data: T[]): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Invoice functions
export const getInvoices = (): Invoice[] => getFromStorage<Invoice>(STORAGE_KEYS.INVOICES);

export const saveInvoice = (invoice: Invoice): void => {
  const invoices = getInvoices();
  const existingIndex = invoices.findIndex(i => i.id === invoice.id);
  
  if (existingIndex >= 0) {
    invoices[existingIndex] = invoice;
  } else {
    invoices.push(invoice);
  }
  
  saveToStorage(STORAGE_KEYS.INVOICES, invoices);
};

export const getInvoiceById = (id: string): Invoice | undefined => {
  return getInvoices().find(i => i.id === id);
};

// Payment functions
export const getPayments = (): Payment[] => getFromStorage<Payment>(STORAGE_KEYS.PAYMENTS);

export const savePayment = (payment: Payment): void => {
  const payments = getPayments();
  const existingIndex = payments.findIndex(p => p.id === payment.id);
  
  if (existingIndex >= 0) {
    payments[existingIndex] = payment;
  } else {
    payments.push(payment);
  }
  
  saveToStorage(STORAGE_KEYS.PAYMENTS, payments);
};

export const getPaymentById = (id: string): Payment | undefined => {
  return getPayments().find(p => p.id === id);
};

// Payment Allocation functions
export const getPaymentAllocations = (): PaymentAllocation[] => getFromStorage<PaymentAllocation>(STORAGE_KEYS.ALLOCATIONS);

export const savePaymentAllocation = (allocation: PaymentAllocation): void => {
  const allocations = getPaymentAllocations();
  const existingIndex = allocations.findIndex(a => a.id === allocation.id);
  
  if (existingIndex >= 0) {
    allocations[existingIndex] = allocation;
  } else {
    allocations.push(allocation);
  }
  
  saveToStorage(STORAGE_KEYS.ALLOCATIONS, allocations);
  
  // Auto-update payment and invoice statuses with debug logging
  console.log('Saving allocation:', allocation);
  console.log('Updating payment status for:', allocation.paymentId);
  console.log('Updating invoice status for:', allocation.invoiceId);
  
  updatePaymentStatus(allocation.paymentId);
  updateInvoiceStatus(allocation.invoiceId);
};

// CSV Export Functions
export const exportInvoicesToCSV = () => {
  const invoices = getInvoices();
  const headers = [
    'Reference Number',
    'Shipping Bill',
    'OCF Number',
    'Buyer Name',
    'Broker Names',
    'Amount',
    'Due Date',
    'Status',
    'Paid Amount',
    'Remaining Amount',
    'Description'
  ];
  
  const csvContent = [
    headers.join(','),
    ...invoices.map(invoice => [
      invoice.referenceNumber,
      invoice.shippingBill,
      invoice.ocfNumber,
      invoice.buyerName,
      invoice.brokerNames?.join('; ') || (invoice as Invoice & { brokerName?: string }).brokerName || '',
      invoice.amount,
      invoice.dueDate,
      invoice.status,
      invoice.paidAmount || 0,
      invoice.remainingAmount || invoice.amount,
      `"${(invoice.description || '').replace(/"/g, '""')}"`
    ].join(','))
  ].join('\n');
  
  downloadCSV(csvContent, 'invoices.csv');
};

export const exportPaymentsToCSV = () => {
  const payments = getPayments();
  const headers = [
    'Reference Number',
    'Buyer Name',
    'Amount',
    'Payment Date',
    'Status',
    'Description'
  ];
  
  const csvContent = [
    headers.join(','),
    ...payments.map(payment => [
      payment.referenceNumber,
      payment.buyerName,
      payment.amount,
      payment.paymentDate,
      payment.status,
      `"${(payment.description || '').replace(/"/g, '""')}"`
    ].join(','))
  ].join('\n');
  
  downloadCSV(csvContent, 'payments.csv');
};

export const exportPaymentAllocationsToCSV = () => {
  const allocations = getPaymentAllocations();
  const payments = getPayments();
  const invoices = getInvoices();
  
  const headers = [
    'Payment Reference',
    'Invoice Reference',
    'Buyer Name',
    'Allocation Amount',
    'Allocation Date',
    'Notes'
  ];
  
  const csvContent = [
    headers.join(','),
    ...allocations.map(allocation => {
      const payment = payments.find(p => p.id === allocation.paymentId);
      const invoice = invoices.find(i => i.id === allocation.invoiceId);
      
      return [
        payment?.referenceNumber || '',
        invoice?.referenceNumber || '',
        payment?.buyerName || '',
        allocation.amount,
        allocation.createdAt ? new Date(allocation.createdAt).toLocaleDateString() : '',
        `"${(allocation.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    })
  ].join('\n');
  
  downloadCSV(csvContent, 'payment-allocations.csv');
};

const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Auto-update payment status based on allocations
export const updatePaymentStatus = (paymentId: string): void => {
  const payment = getPaymentById(paymentId);
  if (!payment) {
    console.log('Payment not found:', paymentId);
    return;
  }

  const allocations = getAllocationsForPayment(paymentId);
  console.log('Allocations for payment:', allocations);
  
  const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
  console.log('Total allocated:', totalAllocated, 'Payment amount:', payment.amount);
  
  let newStatus: 'pending' | 'in-process' | 'completed' = 'pending';
  
  if (totalAllocated > 0 && totalAllocated < payment.amount) {
    newStatus = 'in-process';
  } else if (totalAllocated >= payment.amount) {
    newStatus = 'completed';
  }
  
  console.log('Current status:', payment.status, 'New status:', newStatus);
  
  if (payment.status !== newStatus) {
    const updatedPayment = {
      ...payment,
      status: newStatus,
      allocatedAmount: totalAllocated,
      remainingAmount: payment.amount - totalAllocated
    };
    console.log('Updating payment:', updatedPayment);
    savePayment(updatedPayment);
  }
};

// Auto-update invoice status based on payments
export const updateInvoiceStatus = (invoiceId: string): void => {
  const invoice = getInvoiceById(invoiceId);
  if (!invoice) return;

  const allocations = getAllocationsForInvoice(invoiceId);
  const totalPaid = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
  
  let newStatus: 'pending' | 'in-process' | 'completed' = 'pending';
  
  if (totalPaid > 0 && totalPaid < invoice.amount) {
    newStatus = 'in-process';
  } else if (totalPaid >= invoice.amount) {
    newStatus = 'completed';
  }
  
  if (invoice.status !== newStatus) {
    const updatedInvoice = {
      ...invoice,
      status: newStatus,
      paidAmount: totalPaid,
      remainingAmount: invoice.amount - totalPaid
    };
    saveInvoice(updatedInvoice);
  }
};

export const getAllocationsForPayment = (paymentId: string): PaymentAllocation[] => {
  return getPaymentAllocations().filter(a => a.paymentId === paymentId);
};

export const getAllocationsForInvoice = (invoiceId: string): PaymentAllocation[] => {
  return getPaymentAllocations().filter(a => a.invoiceId === invoiceId);
};

// Buyer functions
export const getBuyers = (): Buyer[] => getFromStorage<Buyer>(STORAGE_KEYS.BUYERS);

export const saveBuyer = (buyer: Buyer): void => {
  const buyers = getBuyers();
  const existingIndex = buyers.findIndex(b => b.id === buyer.id);
  
  if (existingIndex >= 0) {
    buyers[existingIndex] = buyer;
  } else {
    buyers.push(buyer);
  }
  
  saveToStorage(STORAGE_KEYS.BUYERS, buyers);
};

export const getBuyerById = (id: string): Buyer | undefined => {
  return getBuyers().find(b => b.id === id);
};

// Broker functions
export const getBrokers = (): Broker[] => getFromStorage<Broker>(STORAGE_KEYS.BROKERS);

export const saveBroker = (broker: Broker): void => {
  const brokers = getBrokers();
  const existingIndex = brokers.findIndex(b => b.id === broker.id);
  
  if (existingIndex >= 0) {
    brokers[existingIndex] = broker;
  } else {
    brokers.push(broker);
  }
  
  saveToStorage(STORAGE_KEYS.BROKERS, brokers);
};

export const getBrokerById = (id: string): Broker | undefined => {
  return getBrokers().find(b => b.id === id);
};

export const deleteInvoice = (invoiceId: string): void => {
  const invoices = getInvoices();
  const filteredInvoices = invoices.filter(invoice => invoice.id !== invoiceId);
  saveToStorage(STORAGE_KEYS.INVOICES, filteredInvoices);
};

export const deletePayment = (paymentId: string): void => {
  const payments = getPayments();
  const filteredPayments = payments.filter(payment => payment.id !== paymentId);
  saveToStorage(STORAGE_KEYS.PAYMENTS, filteredPayments);
};

export const deleteBuyer = (buyerId: string): void => {
  const buyers = getBuyers();
  const filteredBuyers = buyers.filter(buyer => buyer.id !== buyerId);
  saveToStorage(STORAGE_KEYS.BUYERS, filteredBuyers);
};

export const deleteBroker = (brokerId: string): void => {
  const brokers = getBrokers();
  const filteredBrokers = brokers.filter(broker => broker.id !== brokerId);
  saveToStorage(STORAGE_KEYS.BROKERS, filteredBrokers);
};

// Initialize with sample data
export const initializeSampleData = (): void => {
  // Initialize default admin user first
  initializeDefaultUser();
  
  // Only initialize if no data exists
  if (getBuyers().length === 0) {
    const sampleBuyers: Buyer[] = [
      { id: '1', name: 'ABC Corporation', email: 'abc@corp.com', address: '123 Business St' },
      { id: '2', name: 'XYZ Industries', email: 'contact@xyz.com', address: '456 Industrial Ave' },
    ];
    sampleBuyers.forEach(saveBuyer);
  }

  if (getBrokers().length === 0) {
    const sampleBrokers: Broker[] = [
      { id: '1', name: 'John Broker', email: 'john@broker.com', phone: '555-0101' },
      { id: '2', name: 'Jane Agent', email: 'jane@agent.com', phone: '555-0102' },
      { id: '3', name: 'Mike Intermediary', email: 'mike@inter.com', phone: '555-0103' },
    ];
    sampleBrokers.forEach(saveBroker);
  }
};

// Initialize default admin user
export const initializeDefaultUser = (): void => {
  const users = localStorage.getItem('users');
  if (!users) {
    const defaultAdmin: User = {
      id: '1',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      permissions: getFullPermissions(),
      createdDate: new Date().toISOString().split('T')[0],
      isActive: true,
    };
    localStorage.setItem('users', JSON.stringify([defaultAdmin]));
    console.log('Default admin user created:', defaultAdmin);
  }
};
// User Management
export const getUsers = (): User[] => {
  const users = localStorage.getItem('users');
  if (!users) {
    // Create default admin user
    const defaultAdmin: User = {
      id: '1',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      permissions: getFullPermissions(),
      createdDate: new Date().toISOString().split('T')[0],
      isActive: true,
    };
    saveUser(defaultAdmin);
    return [defaultAdmin];
  }
  return JSON.parse(users);
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  const existingIndex = users.findIndex(u => u.id === user.id);
  
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  
  localStorage.setItem('users', JSON.stringify(users));
};

export const deleteUser = (userId: string): void => {
  const users = getUsers();
  const filteredUsers = users.filter(user => user.id !== userId);
  localStorage.setItem('users', JSON.stringify(filteredUsers));
};

export const getUserById = (id: string): User | undefined => {
  const users = getUsers();
  return users.find(user => user.id === id);
};

export const authenticateUser = (username: string, password: string): User | null => {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password && u.isActive);
  return user || null;
};

// Permission Templates
export const getFullPermissions = (): UserPermissions => ({
  invoices: { view: true, create: true, edit: true, delete: true },
  payments: { view: true, create: true, edit: true, delete: true },
  allocations: { view: true, create: true, edit: true, delete: true },
  reports: { view: true, export: true },
  buyers: { view: true, create: true, edit: true, delete: true },
  brokers: { view: true, create: true, edit: true, delete: true },
  users: { view: true, create: true, edit: true, delete: true },
});

export const getManagerPermissions = (): UserPermissions => ({
  invoices: { view: true, create: true, edit: true, delete: false },
  payments: { view: true, create: true, edit: true, delete: false },
  allocations: { view: true, create: true, edit: true, delete: false },
  reports: { view: true, export: true },
  buyers: { view: true, create: true, edit: true, delete: false },
  brokers: { view: true, create: true, edit: true, delete: false },
  users: { view: false, create: false, edit: false, delete: false },
});

export const getAccountantPermissions = (): UserPermissions => ({
  invoices: { view: true, create: false, edit: false, delete: false },
  payments: { view: true, create: true, edit: true, delete: false },
  allocations: { view: true, create: true, edit: true, delete: false },
  reports: { view: true, export: true },
  buyers: { view: true, create: false, edit: false, delete: false },
  brokers: { view: true, create: false, edit: false, delete: false },
  users: { view: false, create: false, edit: false, delete: false },
});

export const getViewerPermissions = (): UserPermissions => ({
  invoices: { view: true, create: false, edit: false, delete: false },
  payments: { view: true, create: false, edit: false, delete: false },
  allocations: { view: true, create: false, edit: false, delete: false },
  reports: { view: true, export: false },
  buyers: { view: true, create: false, edit: false, delete: false },
  brokers: { view: true, create: false, edit: false, delete: false },
  users: { view: false, create: false, edit: false, delete: false },
});
