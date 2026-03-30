import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  CreditCard, 
  DollarSign, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { getInvoices, getPayments, getPaymentAllocations, initializeSampleData } from '@/lib/storage';
import { updateInvoiceStatus, updatePaymentStatus } from '@/lib/calculations';
import { Invoice, Payment } from '@/types';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalInvoices: 0,
    openInvoices: 0,
    partialInvoices: 0,
    closedInvoices: 0,
    totalPayments: 0,
    totalInvoiceAmount: 0,
    totalPaymentAmount: 0,
    totalAllocatedAmount: 0,
  });

  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);

  useEffect(() => {
    // Initialize sample data
    initializeSampleData();
    
    // Load and calculate stats
    const invoices = getInvoices().map(updateInvoiceStatus);
    const payments = getPayments().map(updatePaymentStatus);
    const allocations = getPaymentAllocations();

    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaymentAmount = payments.reduce((sum, pay) => sum + pay.amount, 0);
    const totalAllocatedAmount = allocations.reduce((sum, alloc) => sum + alloc.allocatedAmount, 0);

    setStats({
      totalInvoices: invoices.length,
      openInvoices: invoices.filter(i => i.status === 'open').length,
      partialInvoices: invoices.filter(i => i.status === 'partial').length,
      closedInvoices: invoices.filter(i => i.status === 'closed').length,
      totalPayments: payments.length,
      totalInvoiceAmount,
      totalPaymentAmount,
      totalAllocatedAmount,
    });

    // Get recent invoices and payments
    setRecentInvoices(invoices.slice(-5).reverse());
    setRecentPayments(payments.slice(-5).reverse());
  }, []);

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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
            <div className="text-xs text-muted-foreground mt-1">
              <span className="text-red-600">{stats.openInvoices} open</span> • 
              <span className="text-yellow-600 ml-1">{stats.partialInvoices} partial</span> • 
              <span className="text-green-600 ml-1">{stats.closedInvoices} closed</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPayments}</div>
            <p className="text-xs text-muted-foreground">
              Received payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoice Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalInvoiceAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Total invoice value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPaymentAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Total received
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/invoices">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentInvoices.length > 0 ? (
                recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {new Date(invoice.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                      {getStatusBadge(invoice.status)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No invoices yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Payments</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/payments">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments.length > 0 ? (
                recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{payment.referenceNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        From: {payment.receivedFrom}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.receivedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No payments yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild className="h-20">
              <Link to="/invoices?action=create" className="flex flex-col">
                <FileText className="h-6 w-6 mb-2" />
                Create Invoice
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20">
              <Link to="/payments?action=create" className="flex flex-col">
                <CreditCard className="h-6 w-6 mb-2" />
                Record Payment
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20">
              <Link to="/allocation" className="flex flex-col">
                <DollarSign className="h-6 w-6 mb-2" />
                Allocate Payment
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}