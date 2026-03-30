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
import { Plus, Edit, Trash2, DollarSign, ChevronDown } from 'lucide-react';
import { Payment, Buyer, Broker } from '@/types';
import { getPayments, savePayment, getBuyers, getBrokers, getBuyerById, getBrokerById, deletePayment } from '@/lib/storage';
import { generatePaymentReference } from '@/lib/calculations';
import { useAuth } from '@/contexts/AuthContext';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [error, setError] = useState('');

  const { hasPermission } = useAuth();

  const [formData, setFormData] = useState({
    amount: '',
    receivedDate: '',
    receivedFromType: 'buyer' as 'buyer' | 'broker',
    receivedFromId: '',
    status: 'pending' as 'pending' | 'in-process' | 'completed',
    description: '',
  });

  useEffect(() => {
    loadPayments();
    loadBuyers();
    loadBrokers();
  }, []);

  const loadPayments = () => {
    setPayments(getPayments());
  };

  const loadBuyers = () => {
    setBuyers(getBuyers());
  };

  const loadBrokers = () => {
    setBrokers(getBrokers());
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      receivedDate: '',
      receivedFromType: 'buyer',
      receivedFromId: '',
      status: 'pending',
      description: '',
    });
    setError('');
  };

  const handleCreatePayment = () => {
    if (!formData.amount || !formData.receivedDate || !formData.receivedFromId) {
      setError('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const receivedFromEntity = formData.receivedFromType === 'buyer' 
      ? getBuyerById(formData.receivedFromId)
      : getBrokerById(formData.receivedFromId);

    if (!receivedFromEntity) {
      setError('Invalid payer selected');
      return;
    }

    const receivedFromName = receivedFromEntity.name;

    const newPayment: Payment = {
      id: Date.now().toString(),
      referenceNumber: generatePaymentReference(),
      amount,
      receivedDate: formData.receivedDate,
      receivedFrom: receivedFromName,
      receivedFromType: formData.receivedFromType,
      receivedFromId: formData.receivedFromId,
      status: formData.status,
      description: formData.description,
      allocatedAmount: 0,
      remainingAmount: amount,
    };

    savePayment(newPayment);
    loadPayments();
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleEditPayment = () => {
    if (!editingPayment || !formData.amount || !formData.receivedDate || !formData.receivedFromId) {
      setError('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const receivedFromEntity = formData.receivedFromType === 'buyer' 
      ? getBuyerById(formData.receivedFromId)
      : getBrokerById(formData.receivedFromId);

    if (!receivedFromEntity) {
      setError('Invalid payer selected');
      return;
    }

    const receivedFromName = receivedFromEntity.name;

    const updatedPayment: Payment = {
      ...editingPayment,
      amount,
      receivedDate: formData.receivedDate,
      receivedFrom: receivedFromName,
      receivedFromType: formData.receivedFromType,
      receivedFromId: formData.receivedFromId,
      status: formData.status,
      description: formData.description,
      remainingAmount: amount - editingPayment.allocatedAmount,
    };

    savePayment(updatedPayment);
    loadPayments();
    setIsEditDialogOpen(false);
    setEditingPayment(null);
    resetForm();
  };

  const handleDeletePayment = (paymentId: string) => {
    if (confirm('Are you sure you want to delete this payment?')) {
      deletePayment(paymentId);
      loadPayments();
    }
  };

  const openEditDialog = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      amount: payment.amount.toString(),
      receivedDate: payment.receivedDate,
      receivedFromType: payment.receivedFromType,
      receivedFromId: payment.receivedFromId,
      status: payment.status,
      description: payment.description || '',
    });
    setError('');
    setIsEditDialogOpen(true);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'buyer':
        return <Badge variant="default">Buyer</Badge>;
      case 'broker':
        return <Badge variant="secondary">Broker</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
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

  const handleStatusChange = (paymentId: string, newStatus: 'pending' | 'in-process' | 'completed') => {
    const payment = payments.find(pay => pay.id === paymentId);
    if (payment) {
      const updatedPayment = { ...payment, status: newStatus };
      savePayment(updatedPayment);
      loadPayments();
    }
  };

  if (!hasPermission('payments', 'view')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert className="max-w-md">
          <AlertDescription>
            You don't have permission to access payments.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen pb-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground mt-1">Track and manage payments</p>
        </div>
        {hasPermission('payments', 'create') && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Record New Payment</DialogTitle>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-6 py-2">
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
                      <Label htmlFor="receivedDate" className="text-sm font-medium">Received Date *</Label>
                      <Input
                        id="receivedDate"
                        type="date"
                        value={formData.receivedDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, receivedDate: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="receivedFromType" className="text-sm font-medium">Received From Type *</Label>
                      <Select value={formData.receivedFromType} onValueChange={(value: 'buyer' | 'broker') => setFormData(prev => ({ ...prev, receivedFromType: value, receivedFromId: '' }))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buyer">Buyer</SelectItem>
                          <SelectItem value="broker">Broker</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="receivedFromId" className="text-sm font-medium">Received From *</Label>
                      <Select value={formData.receivedFromId} onValueChange={(value) => setFormData(prev => ({ ...prev, receivedFromId: value }))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={`Select ${formData.receivedFromType}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {(formData.receivedFromType === 'buyer' ? buyers : brokers).map((entity) => (
                            <SelectItem key={entity.id} value={entity.id}>
                              {entity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="status" className="text-sm font-medium">Status *</Label>
                    <Select value={formData.status} onValueChange={(value: 'pending' | 'in-process' | 'completed') => setFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-process">In Process</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Payment description"
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
                <Button onClick={handleCreatePayment}>Record Payment</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Payments Table */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            <div>
              <h3 className="text-lg font-semibold">All Payments</h3>
              <p className="text-sm text-muted-foreground">Track received payments</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[120px]">Reference</TableHead>
                  <TableHead className="w-[100px]">Amount</TableHead>
                  <TableHead className="w-[150px]">Received From</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[110px]">Date</TableHead>
                  <TableHead className="w-[150px]">Status</TableHead>
                  <TableHead className="w-[100px]">Remaining</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.referenceNumber}</TableCell>
                    <TableCell>${payment.amount.toLocaleString()}</TableCell>
                    <TableCell>{payment.receivedFrom}</TableCell>
                    <TableCell>{getTypeBadge(payment.receivedFromType)}</TableCell>
                    <TableCell>{new Date(payment.receivedDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(payment.status)}
                        {hasPermission('payments', 'edit') && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleStatusChange(payment.id, 'pending')}>
                                Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(payment.id, 'in-process')}>
                                In Process
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(payment.id, 'completed')}>
                                Completed
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>${payment.remainingAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {hasPermission('payments', 'edit') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(payment)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission('payments', 'delete') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePayment(payment.id)}
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
            {payments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No payments found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Payment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-amount">Amount *</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter amount"
              />
            </div>

            <div>
              <Label htmlFor="edit-receivedDate">Received Date *</Label>
              <Input
                id="edit-receivedDate"
                type="date"
                value={formData.receivedDate}
                onChange={(e) => setFormData(prev => ({ ...prev, receivedDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="edit-receivedFromType">Received From Type *</Label>
              <Select value={formData.receivedFromType} onValueChange={(value: 'buyer' | 'broker') => setFormData(prev => ({ ...prev, receivedFromType: value, receivedFromId: '' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="broker">Broker</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-receivedFromId">Received From *</Label>
              <Select value={formData.receivedFromId} onValueChange={(value) => setFormData(prev => ({ ...prev, receivedFromId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${formData.receivedFromType}`} />
                </SelectTrigger>
                <SelectContent>
                  {(formData.receivedFromType === 'buyer' ? buyers : brokers).map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-status">Status *</Label>
              <Select value={formData.status} onValueChange={(value: 'pending' | 'in-process' | 'completed') => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-process">In Process</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Payment description"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditPayment}>Update Payment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}