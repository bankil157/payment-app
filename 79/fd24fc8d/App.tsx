import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { initializeSampleData } from './lib/storage';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import Allocation from './pages/Allocation';
import Reports from './pages/Reports';
import Buyers from './pages/Buyers';
import Brokers from './pages/Brokers';
import Users from './pages/Users';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

// Initialize default data on app start
initializeSampleData();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/allocation" element={<Allocation />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/buyers" element={<Buyers />} />
              <Route path="/brokers" element={<Brokers />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
