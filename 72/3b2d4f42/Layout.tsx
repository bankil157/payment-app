import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import { 
  FileText, 
  CreditCard, 
  ArrowRightLeft, 
  BarChart3, 
  Users, 
  Home,
  Building2,
  LogOut,
  User
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Allocation', href: '/allocation', icon: ArrowRightLeft },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Buyers', href: '/buyers', icon: Building2 },
  { name: 'Brokers', href: '/brokers', icon: Users },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { isAuthenticated, currentUser, logout, hasPermission } = useAuth();

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  // Filter navigation based on user permissions
  const filteredNavigation = navigation.filter(item => {
    if (item.name === 'Dashboard') return true;
    if (item.name === 'Users') return hasPermission('users', 'read');
    return hasPermission(item.name.toLowerCase(), 'read');
  });

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900">Invoice Accounting</h1>
        </div>
        <nav className="mt-6">
          <div className="px-3">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link key={item.name} to={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start mb-1",
                      isActive && "bg-blue-50 text-blue-700 border-blue-200"
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User info and logout */}
        <div className="absolute bottom-0 left-0 right-0 w-64 p-4 border-t bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">{currentUser?.username}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Role: {currentUser?.role}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
            </h2>
            <div className="text-sm text-gray-600">
              Welcome, {currentUser?.username}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}