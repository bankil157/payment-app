import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Eye, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Invoice, Buyer, Broker } from '@/types';
import { getInvoices, saveInvoice, getBuyers, getBrokers, getBuyerById, getBrokerById } from '@/lib/storage';
import { updateInvoiceStatus, generateInvoiceNumber, generateClosingReference } from '@/lib/calculations';
import { useSearchParams } from 'react-router-dom';

export default function InvoicesPage() {
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    buyerId: '',
    brokerIds: [] as string[],
    amount: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    description: '',
  });

  useEffect(() => {
    loadData();
    if (searchParams.get('action') === 'create') {
      setIsCreateDialogOpen(true);
    }
  }, [searchParams]);

  const loadData = () => {
    const loadedInvoices = getInvoices().map(updateInvoiceStatus);
    const loadedBuyers = getBuyers();
    const loadedBrokers = getBrokers();
    
    setInvoices(loadedInvoices);
    setBuyers(loadedBuyers);
    setBrokers(loadedBrokers);
  };

  const handleCreateInvoice = () => {
    if (!formData.buyerId || !formData.amount || formData.brokerIds.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      invoiceNumber: formData.invoiceNumber || generateInvoiceNumber(),
      buyerId: formData.buyerId,
      brokerIds: formData.brokerIds,
      amount: parseFloat(formData.amount),
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      description: formData.description,
      status: 'open',
      paidAmount: 0,
      remainingAmount: parseFloat(formData.amount),
    };

    saveInvoice(newInvoice);
    loadData();
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: '',
      buyerId: '',
      brokerIds: [],
      amount: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      description: '',
    });
  };

  const handleBrokerToggle = (brokerId: string) => {
    setFormData(prev => ({
      ...prev,
      brokerIds: prev.brokerIds.includes(brokerId)
        ? prev.brokerIds.filter(id => id !== brokerId)
        : [...prev.brokerIds, brokerId]
    }));
  };

  const closeInvoice = (invoice: Invoice) => {
    const closingRef = generateClosingReference(invoice.invoiceNumber);
    const updatedInvoice = {
      ...invoice,
      status: 'closed' as const,
      closingReferenceNumber: closingRef,
      closedDate: new Date().toISOString().split('T')[0],
    };
    
    saveInvoice(updatedInvoice);
    loadData();
    setSelectedInvoice(null);
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getBuyerById(invoice.buyerId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'in-process':
        return <Badge variant="default">In Process</Badge>;
      case 'completed':
        return <Badge variant="destructive">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleStatusChange = (invoiceId: string, newStatus: 'pending' | 'in-process' | 'completed') => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      const updatedInvoice = { ...invoice, status: newStatus };
      saveInvoice(updatedInvoice);
      loadInvoices();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Manage your sales invoices</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  placeholder="Auto-generated if empty"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="buyer">Buyer *</Label>
                <Select value={formData.buyerId} onValueChange={(value) => setFormData(prev => ({ ...prev, buyerId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select buyer" />
                  </SelectTrigger>
                  <SelectContent>
                    {buyers.map(buyer => (
                      <SelectItem key={buyer.id} value={buyer.id}>{buyer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Brokers *</Label>
                <div className="border rounded-md p-3 max-h-32 overflow-y-auto">
                  {brokers.map(broker => (
                    <div key={broker.id} className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id={broker.id}
                        checked={formData.brokerIds.includes(broker.id)}
                        onCheckedChange={() => handleBrokerToggle(broker.id)}
                      />
                      <Label htmlFor={broker.id} className="text-sm">{broker.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvoice}>Create Invoice</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Invoices</CardTitle>
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Brokers</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => {
                const buyer = getBuyerById(invoice.buyerId);
                const invoiceBrokers = invoice.brokerIds.map(id => getBrokerById(id)).filter(Boolean);
                
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{buyer?.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {invoiceBrokers.map(broker => (
                          <Badge key={broker?.id} variant="outline" className="text-xs">
                            {broker?.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>{formatCurrency(invoice.paidAmount)}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Invoice Number</Label>
                  <p className="font-medium">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
                <div>
                  <Label>Buyer</Label>
                  <p>{getBuyerById(selectedInvoice.buyerId)?.name}</p>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p className="font-medium">{formatCurrency(selectedInvoice.amount)}</p>
                </div>
                <div>
                  <Label>Paid Amount</Label>
                  <p className="font-medium text-green-600">{formatCurrency(selectedInvoice.paidAmount)}</p>
                </div>
                <div>
                  <Label>Remaining</Label>
                  <p className="font-medium text-red-600">{formatCurrency(selectedInvoice.remainingAmount)}</p>
                </div>
                <div>
                  <Label>Issue Date</Label>
                  <p>{new Date(selectedInvoice.issueDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <p>{new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div>
                <Label>Brokers</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedInvoice.brokerIds.map(id => {
                    const broker = getBrokerById(id);
                    return broker ? (
                      <Badge key={id} variant="outline">{broker.name}</Badge>
                    ) : null;
                  })}
                </div>
              </div>

              {selectedInvoice.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.description}</p>
                </div>
              )}

              {selectedInvoice.closingReferenceNumber && (
                <div>
                  <Label>Closing Reference</Label>
                  <p className="font-medium">{selectedInvoice.closingReferenceNumber}</p>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                {selectedInvoice.status === 'partial' && selectedInvoice.remainingAmount === 0 && (
                  <Button onClick={() => closeInvoice(selectedInvoice)}>
                    Close Invoice
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}