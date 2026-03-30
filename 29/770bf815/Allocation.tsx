import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRightLeft, Plus, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Payment, Invoice, PaymentAllocation, Buyer } from '@/types';
import { 
  getPayments, 
  getInvoices, 
  getPaymentAllocations, 
  savePaymentAllocation, 
  savePayment, 
  saveInvoice,
  getBuyerById 
} from '@/lib/storage';
import { 
  updatePaymentStatus, 
  updateInvoiceStatus, 
  generateClosingReference 
} from '@/lib/calculations';

export default function AllocationPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    paymentId: '',
    invoiceId: '',
    allocatedAmount: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedPayments = getPayments().map(updatePaymentStatus);
    const loadedInvoices = getInvoices().map(updateInvoiceStatus);
    const loadedAllocations = getPaymentAllocations();
    
    setPayments(loadedPayments);
    setInvoices(loadedInvoices);
    setAllocations(loadedAllocations);
  };

  const handleCreateAllocation = () => {
    if (!formData.paymentId || !formData.invoiceId || !formData.allocatedAmount) {
      alert('Please fill in all required fields');
      return;
    }

    const payment = payments.find(p => p.id === formData.paymentId);
    const invoice = invoices.find(i => i.id === formData.invoiceId);
    const allocatedAmount = parseFloat(formData.allocatedAmount);

    if (!payment || !invoice) {
      alert('Invalid payment or invoice selected');
      return;
    }

    if (allocatedAmount > payment.remainingAmount) {
      alert('Allocated amount cannot exceed remaining payment amount');
      return;
    }

    if (allocatedAmount > invoice.remainingAmount) {
      alert('Allocated amount cannot exceed remaining invoice amount');
      return;
    }

    const newAllocation: PaymentAllocation = {
      id: Date.now().toString(),
      paymentId: formData.paymentId,
      invoiceId: formData.invoiceId,
      allocatedAmount,
      allocationDate: new Date().toISOString().split('T')[0],
      notes: formData.notes,
    };

    savePaymentAllocation(newAllocation);

    // Update payment and invoice status
    const updatedPayment = updatePaymentStatus(payment);
    const updatedInvoice = updateInvoiceStatus(invoice);

    // Auto-close invoice if fully paid
    if (updatedInvoice.remainingAmount === 0 && updatedInvoice.status !== 'closed') {
      updatedInvoice.status = 'closed';
      updatedInvoice.closingReferenceNumber = generateClosingReference(updatedInvoice.invoiceNumber);
      updatedInvoice.closedDate = new Date().toISOString().split('T')[0];
    }

    savePayment(updatedPayment);
    saveInvoice(updatedInvoice);

    loadData();
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      paymentId: '',
      invoiceId: '',
      allocatedAmount: '',
      notes: '',
    });
  };

  const getAvailablePayments = () => {
    return payments.filter(p => p.remainingAmount > 0);
  };

  const getAvailableInvoices = () => {
    const payment = payments.find(p => p.id === formData.paymentId);
    if (!payment) return [];

    return invoices.filter(invoice => {
      // Only show invoices with remaining amount
      if (invoice.remainingAmount <= 0) return false;
      
      // Check if payment is from buyer - invoice must have same buyer
      if (payment.receivedFromType === 'buyer') {
        return invoice.buyerId === payment.receivedFromId;
      }
      
      // Check if payment is from broker - invoice must contain this broker
      if (payment.receivedFromType === 'broker') {
        return invoice.brokerIds.includes(payment.receivedFromId);
      }
      
      return false;
    });
  };

  const selectedPayment = payments.find(p => p.id === formData.paymentId);
  const selectedInvoice = invoices.find(i => i.id === formData.invoiceId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Open</Badge>;
      case 'partial':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
      case 'closed':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Payment Allocation</h1>
          <p className="text-muted-foreground">Allocate payments to invoices</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Allocation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Payment Allocation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="payment">Payment *</Label>
                <Select value={formData.paymentId} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailablePayments().map(payment => (
                      <SelectItem key={payment.id} value={payment.id}>
                        {payment.referenceNumber} - {formatCurrency(payment.remainingAmount)} available
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPayment && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: {formatCurrency(selectedPayment.remainingAmount)} from {selectedPayment.receivedFrom}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="invoice">Invoice *</Label>
                <Select value={formData.invoiceId} onValueChange={(value) => setFormData(prev => ({ ...prev, invoiceId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableInvoices().map(invoice => {
                      const buyer = getBuyerById(invoice.buyerId);
                      return (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber} - {buyer?.name} - {formatCurrency(invoice.remainingAmount)} due
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedInvoice && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Due: {formatCurrency(selectedInvoice.remainingAmount)} from {getBuyerById(selectedInvoice.buyerId)?.name}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="allocatedAmount">Allocated Amount *</Label>
                <Input
                  id="allocatedAmount"
                  type="number"
                  step="0.01"
                  value={formData.allocatedAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, allocatedAmount: e.target.value }))}
                  max={Math.min(selectedPayment?.remainingAmount || 0, selectedInvoice?.remainingAmount || 0)}
                />
                {selectedPayment && selectedInvoice && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Max: {formatCurrency(Math.min(selectedPayment.remainingAmount, selectedInvoice.remainingAmount))}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAllocation}>Create Allocation</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Recent Allocations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Allocations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Payment Ref</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations
                .sort((a, b) => new Date(b.allocationDate).getTime() - new Date(a.allocationDate).getTime())
                .slice(0, 10)
                .map((allocation) => {
                  const payment = payments.find(p => p.id === allocation.paymentId);
                  const invoice = invoices.find(i => i.id === allocation.invoiceId);
                  const buyer = invoice ? getBuyerById(invoice.buyerId) : null;
                  
                  return (
                    <TableRow key={allocation.id}>
                      <TableCell>{new Date(allocation.allocationDate).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{payment?.referenceNumber}</TableCell>
                      <TableCell className="font-medium">{invoice?.invoiceNumber}</TableCell>
                      <TableCell>{buyer?.name}</TableCell>
                      <TableCell>{formatCurrency(allocation.allocatedAmount)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {allocation.notes || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
          {allocations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No allocations created yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowRightLeft className="w-5 h-5 mr-2" />
              Available Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getAvailablePayments().slice(0, 5).map(payment => (
                <div key={payment.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{payment.referenceNumber}</p>
                    <p className="text-xs text-muted-foreground">{payment.receivedFrom}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">{formatCurrency(payment.remainingAmount)}</p>
                    <p className="text-xs text-muted-foreground">available</p>
                  </div>
                </div>
              ))}
              {getAvailablePayments().length === 0 && (
                <p className="text-muted-foreground text-center py-4">No unallocated payments</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowRightLeft className="w-5 h-5 mr-2" />
              Outstanding Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getAvailableInvoices().slice(0, 5).map(invoice => {
                const buyer = getBuyerById(invoice.buyerId);
                return (
                  <div key={invoice.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{buyer?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600">{formatCurrency(invoice.remainingAmount)}</p>
                      <p className="text-xs text-muted-foreground">due</p>
                    </div>
                  </div>
                );
              })}
              {getAvailableInvoices().length === 0 && (
                <p className="text-muted-foreground text-center py-4">No outstanding invoices</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}