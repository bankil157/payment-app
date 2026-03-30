import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, Filter } from 'lucide-react';
import { 
  PaymentAllocationReport, 
  InvoiceClosureReport, 
  Payment, 
  Invoice, 
  PaymentAllocation 
} from '@/types';
import { 
  getPayments, 
  getInvoices, 
  getPaymentAllocations, 
  getBuyerById,
  getBrokerById 
} from '@/lib/storage';
import { updatePaymentStatus, updateInvoiceStatus } from '@/lib/calculations';

export default function ReportsPage() {
  const [paymentReports, setPaymentReports] = useState<PaymentAllocationReport[]>([]);
  const [invoiceReports, setInvoiceReports] = useState<InvoiceClosureReport[]>([]);
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
  });
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = () => {
    const payments = getPayments().map(updatePaymentStatus);
    const invoices = getInvoices().map(updateInvoiceStatus);
    const allocations = getPaymentAllocations();

    // Generate Payment Allocation Reports
    const paymentReportsData: PaymentAllocationReport[] = payments.map(payment => {
      const paymentAllocations = allocations.filter(a => a.paymentId === payment.id);
      const allocationsWithInvoices = paymentAllocations.map(allocation => {
        const invoice = invoices.find(i => i.id === allocation.invoiceId);
        return { ...allocation, invoice: invoice! };
      }).filter(a => a.invoice);

      return {
        payment,
        allocations: allocationsWithInvoices,
      };
    });

    // Generate Invoice Closure Reports
    const invoiceReportsData: InvoiceClosureReport[] = invoices
      .filter(invoice => invoice.status === 'closed')
      .map(invoice => {
        const invoiceAllocations = allocations.filter(a => a.invoiceId === invoice.id);
        const allocationsWithPayments = invoiceAllocations.map(allocation => {
          const payment = payments.find(p => p.id === allocation.paymentId);
          return { ...allocation, payment: payment! };
        }).filter(a => a.payment);

        const buyer = getBuyerById(invoice.buyerId);
        const brokers = invoice.brokerIds.map(id => getBrokerById(id)).filter(Boolean);

        return {
          invoice,
          allocations: allocationsWithPayments,
          buyer: buyer!,
          brokers: brokers as any[],
        };
      });

    setPaymentReports(paymentReportsData);
    setInvoiceReports(invoiceReportsData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const exportToCSV = (data: any[], filename: string) => {
    // Simple CSV export - in a real app, you'd want a proper CSV library
    const csvContent = "data:text/csv;charset=utf-8," 
      + Object.keys(data[0]).join(",") + "\n"
      + data.map(row => Object.values(row).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPaymentReports = paymentReports.filter(report => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'allocated' && report.payment.allocatedAmount === 0) return false;
      if (statusFilter === 'unallocated' && report.payment.remainingAmount === 0) return false;
    }

    if (dateFilter.startDate && report.payment.receivedDate < dateFilter.startDate) return false;
    if (dateFilter.endDate && report.payment.receivedDate > dateFilter.endDate) return false;

    return true;
  });

  const filteredInvoiceReports = invoiceReports.filter(report => {
    if (dateFilter.startDate && report.invoice.closedDate && report.invoice.closedDate < dateFilter.startDate) return false;
    if (dateFilter.endDate && report.invoice.closedDate && report.invoice.closedDate > dateFilter.endDate) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Payment allocation and invoice closure reports</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div>
              <Label>Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="allocated">Allocated</SelectItem>
                  <SelectItem value="unallocated">Unallocated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={loadReports} variant="outline">
                Refresh Reports
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="payment-allocation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payment-allocation">Payment Allocation Reports</TabsTrigger>
          <TabsTrigger value="invoice-closure">Invoice Closure Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="payment-allocation" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payment Allocation Reports</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToCSV(
                  filteredPaymentReports.flatMap(report => 
                    report.allocations.map(allocation => ({
                      payment_reference: report.payment.referenceNumber,
                      payment_amount: report.payment.amount,
                      received_from: report.payment.receivedFrom,
                      received_date: report.payment.receivedDate,
                      invoice_number: allocation.invoice.invoiceNumber,
                      allocated_amount: allocation.allocatedAmount,
                      allocation_date: allocation.allocationDate,
                    }))
                  ),
                  'payment_allocation_report.csv'
                )}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {filteredPaymentReports.map((report) => (
                  <div key={report.payment.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{report.payment.referenceNumber}</h3>
                        <p className="text-muted-foreground">
                          {formatCurrency(report.payment.amount)} received from {report.payment.receivedFrom} 
                          on {new Date(report.payment.receivedDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          <span className="text-green-600">Allocated: {formatCurrency(report.payment.allocatedAmount)}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-orange-600">Remaining: {formatCurrency(report.payment.remainingAmount)}</span>
                        </p>
                      </div>
                    </div>

                    {report.allocations.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Buyer</TableHead>
                            <TableHead>Allocated Amount</TableHead>
                            <TableHead>Allocation Date</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.allocations.map((allocation) => {
                            const buyer = getBuyerById(allocation.invoice.buyerId);
                            return (
                              <TableRow key={allocation.id}>
                                <TableCell className="font-medium">{allocation.invoice.invoiceNumber}</TableCell>
                                <TableCell>{buyer?.name}</TableCell>
                                <TableCell>{formatCurrency(allocation.allocatedAmount)}</TableCell>
                                <TableCell>{new Date(allocation.allocationDate).toLocaleDateString()}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {allocation.notes || '-'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No allocations for this payment</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {filteredPaymentReports.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No payment reports found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice-closure" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Invoice Closure Reports</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToCSV(
                  filteredInvoiceReports.map(report => ({
                    invoice_number: report.invoice.invoiceNumber,
                    buyer: report.buyer.name,
                    invoice_amount: report.invoice.amount,
                    closing_reference: report.invoice.closingReferenceNumber,
                    closed_date: report.invoice.closedDate,
                    total_payments: report.allocations.length,
                  })),
                  'invoice_closure_report.csv'
                )}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {filteredInvoiceReports.map((report) => (
                  <div key={report.invoice.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{report.invoice.invoiceNumber}</h3>
                        <p className="text-muted-foreground">
                          {formatCurrency(report.invoice.amount)} - {report.buyer.name}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="default">Closed</Badge>
                          {report.invoice.closingReferenceNumber && (
                            <Badge variant="outline">Ref: {report.invoice.closingReferenceNumber}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          Closed on {report.invoice.closedDate ? new Date(report.invoice.closedDate).toLocaleDateString() : 'N/A'}
                        </p>
                        <p className="text-sm">
                          Brokers: {report.brokers.map(b => b.name).join(', ')}
                        </p>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment Reference</TableHead>
                          <TableHead>Received From</TableHead>
                          <TableHead>Allocated Amount</TableHead>
                          <TableHead>Allocation Date</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.allocations.map((allocation) => (
                          <TableRow key={allocation.id}>
                            <TableCell className="font-medium">{allocation.payment.referenceNumber}</TableCell>
                            <TableCell>{allocation.payment.receivedFrom}</TableCell>
                            <TableCell>{formatCurrency(allocation.allocatedAmount)}</TableCell>
                            <TableCell>{new Date(allocation.allocationDate).toLocaleDateString()}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {allocation.notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
              {filteredInvoiceReports.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No closed invoices found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}