import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Building2, Users } from 'lucide-react';
import { Payment, Buyer, Broker } from '@/types';
import { getPayments, savePayment, getBuyers, getBrokers, getBuyerById, getBrokerById } from '@/lib/storage';
import { updatePaymentStatus, generatePaymentReference } from '@/lib/calculations';
import { useSearchParams } from 'react-router-dom';

export default function PaymentsPage() {
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    referenceNumber: '',
    amount: '',
    receivedDate: new Date().toISOString().split('T')[0],
    receivedFromType: 'buyer' as 'buyer' | 'broker',
    receivedFromId: '',
    description: '',
  });

  useEffect(() => {
    loadData();
    if (searchParams.get('action') === 'create') {
      setIsCreateDialogOpen(true);
    }
  }, [searchParams]);

  const loadData = () => {
    const loadedPayments = getPayments().map(updatePaymentStatus);
    const loadedBuyers = getBuyers();
    const loadedBrokers = getBrokers();
    
    setPayments(loadedPayments);
    setBuyers(loadedBuyers);
    setBrokers(loadedBrokers);
  };

  const handleCreatePayment = () => {
    if (!formData.receivedFromId || !formData.amount) {
      alert('Please fill in all required fields');
      return;
    }

    const receivedFromEntity = formData.receivedFromType === 'buyer' 
      ? getBuyerById(formData.receivedFromId)
      : getBrokerById(formData.receivedFromId);

    if (!receivedFromEntity) {
      alert('Invalid payer selected');
      return;
    }

    const amount = parseFloat(formData.amount);

    const newPayment: Payment = {
      id: Date.now().toString(),
      referenceNumber: formData.referenceNumber || generatePaymentReference(),
      amount,
      receivedDate: formData.receivedDate,
      receivedFrom: receivedFromEntity.name,
      receivedFromType: formData.receivedFromType,
      receivedFromId: formData.receivedFromId,
      description: formData.description,
      allocatedAmount: 0,
      remainingAmount: amount,
    };

    savePayment(newPayment);
    loadData();
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      referenceNumber: '',
      amount: '',
      receivedDate: new Date().toISOString().split('T')[0],
      receivedFromType: 'buyer',
      receivedFromId: '',
      description: '',
    });
  };

  const filteredPayments = payments.filter(payment =>
    payment.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.receivedFrom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getPayerOptions = () => {
    return formData.receivedFromType === 'buyer' ? buyers : brokers;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Track received payments</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Record New Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="referenceNumber">Reference Number</Label>
                <Input
                  id="referenceNumber"
                  placeholder="Auto-generated if empty"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
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
                <Label htmlFor="receivedDate">Received Date</Label>
                <Input
                  id="receivedDate"
                  type="date"
                  value={formData.receivedDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, receivedDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Received From Type *</Label>
                <Select value={formData.receivedFromType} onValueChange={(value: 'buyer' | 'broker') => setFormData(prev => ({ ...prev, receivedFromType: value, receivedFromId: '' }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="broker">Broker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="receivedFrom">Received From *</Label>
                <Select value={formData.receivedFromId} onValueChange={(value) => setFormData(prev => ({ ...prev, receivedFromId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${formData.receivedFromType}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {getPayerOptions().map(entity => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {formData.receivedFromType === 'buyer' ? (
                          <div className="flex items-center">
                            <Building2 className="w-4 h-4 mr-2" />
                            {entity.name}
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            {entity.name}
                          </div>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
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
              <Button onClick={handleCreatePayment}>Record Payment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Payments</CardTitle>
            <Input
              placeholder="Search payments..."
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
                <TableHead>Reference #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Allocated</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.referenceNumber}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell className="text-green-600">{formatCurrency(payment.allocatedAmount)}</TableCell>
                  <TableCell className={payment.remainingAmount > 0 ? "text-orange-600" : "text-gray-500"}>
                    {formatCurrency(payment.remainingAmount)}
                  </TableCell>
                  <TableCell>{payment.receivedFrom}</TableCell>
                  <TableCell>
                    <Badge variant={payment.receivedFromType === 'buyer' ? 'default' : 'secondary'}>
                      {payment.receivedFromType === 'buyer' ? (
                        <><Building2 className="w-3 h-3 mr-1" />Buyer</>
                      ) : (
                        <><Users className="w-3 h-3 mr-1" />Broker</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(payment.receivedDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPayment(payment)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Reference Number</Label>
                  <p className="font-medium">{selectedPayment.referenceNumber}</p>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p className="font-medium">{formatCurrency(selectedPayment.amount)}</p>
                </div>
                <div>
                  <Label>Allocated</Label>
                  <p className="font-medium text-green-600">{formatCurrency(selectedPayment.allocatedAmount)}</p>
                </div>
                <div>
                  <Label>Remaining</Label>
                  <p className={`font-medium ${selectedPayment.remainingAmount > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                    {formatCurrency(selectedPayment.remainingAmount)}
                  </p>
                </div>
                <div>
                  <Label>Received From</Label>
                  <div className="flex items-center">
                    {selectedPayment.receivedFromType === 'buyer' ? (
                      <Building2 className="w-4 h-4 mr-2" />
                    ) : (
                      <Users className="w-4 h-4 mr-2" />
                    )}
                    <span>{selectedPayment.receivedFrom}</span>
                  </div>
                </div>
                <div>
                  <Label>Received Date</Label>
                  <p>{new Date(selectedPayment.receivedDate).toLocaleDateString()}</p>
                </div>
              </div>

              {selectedPayment.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm text-muted-foreground">{selectedPayment.description}</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedPayment(null)}>
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