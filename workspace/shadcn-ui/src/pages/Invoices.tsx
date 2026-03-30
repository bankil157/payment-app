import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Edit, Trash2, FileText, ChevronDown, Download } from 'lucide-react';
import { Invoice, Buyer, Broker } from '@/types';
import { getInvoices, saveInvoice, getBuyers, getBrokers, getBuyerById, getBrokerById, deleteInvoice, exportInvoicesToCSV } from '@/lib/storage';
import { generateInvoiceReference } from '@/lib/calculations';
import { useAuth } from '@/contexts/AuthContext';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState('');

  const { hasPermission } = useAuth();

  const [formData, setFormData] = useState({
    shippingBill: '',
    ocfNumber: '',
    buyerId: '',
    brokerIds: [] as string[],
    amount: '',
    dueDate: '',
    description: '',
  });

  useEffect(() => {
    loadInvoices();
    loadBuyers();
    loadBrokers();
  }, []);

  const loadInvoices = () => {
    setInvoices(getInvoices());
  };

  const loadBuyers = () => {
    setBuyers(getBuyers());
  };

  const loadBrokers = () => {
    setBrokers(getBrokers());
  };

  const resetForm = () => {
    setFormData({
      shippingBill: '',
      ocfNumber: '',
      buyerId: '',
      brokerIds: [],
      amount: '',
      dueDate: '',
      description: '',
    });
    setError('');
  };

  const handleCreateInvoice = () => {
    if (!formData.shippingBill || !formData.ocfNumber || !formData.buyerId || formData.brokerIds.length === 0 || !formData.amount || !formData.dueDate) {
      setError('Please fill in all required fields');
      return;
    }

    // Check for unique Shipping Bill
    const existingShippingBill = invoices.find(inv => inv.shippingBill === formData.shippingBill);
    if (existingShippingBill) {
      setError('Shipping Bill number already exists. Please use a unique number.');
      return;
    }

    // Check for unique OCF Number
    const existingOCF = invoices.find(inv => inv.ocfNumber === formData.ocfNumber);
    if (existingOCF) {
      setError('OCF Number already exists. Please use a unique number.');
      return;
    }

    const buyer = getBuyerById(formData.buyerId);
    const selectedBrokers = formData.brokerIds.map(id => getBrokerById(id)).filter(Boolean) as Broker[];

    if (!buyer || selectedBrokers.length === 0) {
      setError('Invalid buyer or broker selection');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      referenceNumber: generateInvoiceReference(),
      shippingBill: formData.shippingBill,
      ocfNumber: formData.ocfNumber,
      buyerId: formData.buyerId,
      buyerName: buyer.name,
      brokerIds: formData.brokerIds,
      brokerNames: selectedBrokers.map(broker => broker.name),
      amount,
      dueDate: formData.dueDate,
      status: 'pending',
      description: formData.description,
      paidAmount: 0,
      remainingAmount: amount,
    };

    saveInvoice(newInvoice);
    loadInvoices();
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleEditInvoice = () => {
    if (!editingInvoice || !formData.shippingBill || !formData.ocfNumber || !formData.buyerId || formData.brokerIds.length === 0 || !formData.amount || !formData.dueDate) {
      setError('Please fill in all required fields');
      return;
    }

    // Check for unique Shipping Bill (excluding current invoice)
    const existingShippingBill = invoices.find(inv => inv.shippingBill === formData.shippingBill && inv.id !== editingInvoice.id);
    if (existingShippingBill) {
      setError('Shipping Bill number already exists. Please use a unique number.');
      return;
    }

    // Check for unique OCF Number (excluding current invoice)
    const existingOCF = invoices.find(inv => inv.ocfNumber === formData.ocfNumber && inv.id !== editingInvoice.id);
    if (existingOCF) {
      setError('OCF Number already exists. Please use a unique number.');
      return;
    }

    const buyer = getBuyerById(formData.buyerId);
    const selectedBrokers = formData.brokerIds.map(id => getBrokerById(id)).filter(Boolean) as Broker[];

    if (!buyer || selectedBrokers.length === 0) {
      setError('Invalid buyer or broker selection');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const updatedInvoice: Invoice = {
      ...editingInvoice,
      shippingBill: formData.shippingBill,
      ocfNumber: formData.ocfNumber,
      buyerId: formData.buyerId,
      buyerName: buyer.name,
      brokerIds: formData.brokerIds,
      brokerNames: selectedBrokers.map(broker => broker.name),
      amount,
      dueDate: formData.dueDate,
      description: formData.description,
      remainingAmount: amount - editingInvoice.paidAmount,
    };

    saveInvoice(updatedInvoice);
    loadInvoices();
    setIsEditDialogOpen(false);
    setEditingInvoice(null);
    resetForm();
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      deleteInvoice(invoiceId);
      loadInvoices();
    }
  };

  const openEditDialog = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      shippingBill: invoice.shippingBill,
      ocfNumber: invoice.ocfNumber,
      buyerId: invoice.buyerId,
      brokerIds: invoice.brokerIds || [],
      amount: invoice.amount.toString(),
      dueDate: invoice.dueDate,
      description: invoice.description || '',
    });
    setError('');
    setIsEditDialogOpen(true);
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

  if (!hasPermission('invoices', 'view')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert className="max-w-md">
          <AlertDescription>
            You don't have permission to access invoices.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen pb-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage your invoices</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportInvoicesToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          {hasPermission('invoices', 'create') && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Create New Invoice</DialogTitle>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-6 py-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shippingBill" className="text-sm font-medium">Shipping Bill *</Label>
                      <Input
                        id="shippingBill"
                        value={formData.shippingBill}
                        onChange={(e) => setFormData(prev => ({ ...prev, shippingBill: e.target.value }))}
                        placeholder="Enter unique shipping bill number"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="ocfNumber" className="text-sm font-medium">OCF Number *</Label>
                      <Input
                        id="ocfNumber"
                        value={formData.ocfNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, ocfNumber: e.target.value }))}
                        placeholder="Enter unique OCF number"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="buyer" className="text-sm font-medium">Buyer *</Label>
                      <Select value={formData.buyerId} onValueChange={(value) => setFormData(prev => ({ ...prev, buyerId: value }))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select buyer" />
                        </SelectTrigger>
                        <SelectContent>
                          {buyers.map((buyer) => (
                            <SelectItem key={buyer.id} value={buyer.id}>
                              {buyer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Brokers *</Label>
                      <div className="mt-1 space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                        {brokers.map((broker) => (
                          <div key={broker.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`broker-${broker.id}`}
                              checked={formData.brokerIds.includes(broker.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData(prev => ({ ...prev, brokerIds: [...prev.brokerIds, broker.id] }));
                                } else {
                                  setFormData(prev => ({ ...prev, brokerIds: prev.brokerIds.filter(id => id !== broker.id) }));
                                }
                              }}
                              className="rounded"
                            />
                            <Label htmlFor={`broker-${broker.id}`} className="text-sm cursor-pointer">
                              {broker.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {formData.brokerIds.length > 0 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Selected: {formData.brokerIds.map(id => brokers.find(b => b.id === id)?.name).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount" className="text-sm font-medium">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="Enter amount"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="dueDate" className="text-sm font-medium">Due Date *</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Invoice description"
                      className="mt-1"
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t flex-shrink-0">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateInvoice}>Create Invoice</Button>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            <div>
              <h3 className="text-lg font-semibold">All Invoices</h3>
              <p className="text-sm text-muted-foreground">Track and manage invoices</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[120px]">Reference</TableHead>
                  <TableHead className="w-[130px]">Shipping Bill</TableHead>
                  <TableHead className="w-[120px]">OCF Number</TableHead>
                  <TableHead className="w-[150px]">Buyer</TableHead>
                  <TableHead className="w-[150px]">Brokers</TableHead>
                  <TableHead className="w-[100px]">Amount</TableHead>
                  <TableHead className="w-[110px]">Due Date</TableHead>
                  <TableHead className="w-[150px]">Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.referenceNumber}</TableCell>
                    <TableCell className="font-mono text-sm">{invoice.shippingBill}</TableCell>
                    <TableCell className="font-mono text-sm">{invoice.ocfNumber}</TableCell>
                    <TableCell>{invoice.buyerName}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {invoice.brokerNames?.map((name, index) => (
                          <div key={index} className="text-sm">
                            {name}
                          </div>
                        )) || (invoice as Invoice & { brokerName?: string }).brokerName}
                      </div>
                    </TableCell>
                    <TableCell>${invoice.amount.toLocaleString()}</TableCell>
                    <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(invoice.status)}
                        {hasPermission('invoices', 'edit') && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'pending')}>
                                Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'in-process')}>
                                In Process
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'completed')}>
                                Completed
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {hasPermission('invoices', 'edit') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(invoice)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission('invoices', 'delete') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteInvoice(invoice.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {invoices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No invoices found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Invoice Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Invoice</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-6 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-shippingBill" className="text-sm font-medium">Shipping Bill *</Label>
                  <Input
                    id="edit-shippingBill"
                    value={formData.shippingBill}
                    onChange={(e) => setFormData(prev => ({ ...prev, shippingBill: e.target.value }))}
                    placeholder="Enter unique shipping bill number"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-ocfNumber" className="text-sm font-medium">OCF Number *</Label>
                  <Input
                    id="edit-ocfNumber"
                    value={formData.ocfNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, ocfNumber: e.target.value }))}
                    placeholder="Enter unique OCF number"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-buyer" className="text-sm font-medium">Buyer *</Label>
                  <Select value={formData.buyerId} onValueChange={(value) => setFormData(prev => ({ ...prev, buyerId: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select buyer" />
                    </SelectTrigger>
                    <SelectContent>
                      {buyers.map((buyer) => (
                        <SelectItem key={buyer.id} value={buyer.id}>
                          {buyer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Brokers *</Label>
                  <div className="mt-1 space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                    {brokers.map((broker) => (
                      <div key={broker.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`edit-broker-${broker.id}`}
                          checked={formData.brokerIds.includes(broker.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({ ...prev, brokerIds: [...prev.brokerIds, broker.id] }));
                            } else {
                              setFormData(prev => ({ ...prev, brokerIds: prev.brokerIds.filter(id => id !== broker.id) }));
                            }
                          }}
                          className="rounded"
                        />
                        <Label htmlFor={`edit-broker-${broker.id}`} className="text-sm cursor-pointer">
                          {broker.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formData.brokerIds.length > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Selected: {formData.brokerIds.map(id => brokers.find(b => b.id === id)?.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-amount" className="text-sm font-medium">Amount *</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter amount"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-dueDate" className="text-sm font-medium">Due Date *</Label>
                  <Input
                    id="edit-dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-description" className="text-sm font-medium">Description</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Invoice description"
                  className="mt-1"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditInvoice}>Update Invoice</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}