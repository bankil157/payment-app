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

// Initialize with sample data
export const initializeSampleData = (): void => {
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