import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  MessageSquare,
  Building2,
  LogOut,
  Menu,
  AreaChart,
  Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import flexLogo from '@/assets/flex-logo.webp';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/reviews', label: 'Reviews', icon: MessageSquare },
  { href: '/dashboard/saved-reviews', label: 'Saved Reviews', icon: Bookmark },
  { href: '/dashboard/properties', label: 'Properties', icon: Building2 },
  { href: '/dashboard/analytics', label: 'Analytics', icon: AreaChart },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-secondary">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
            <img src={flexLogo} alt="Reviews HQ" className="h-10 w-auto" />
            <div>
              <p className="text-xs text-sidebar-foreground/60">Manager Dashboard</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-sidebar-border p-4">
            <div className="mb-3 flex items-center gap-3 px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold">
                {user?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.full_name}</p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{user?.role}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Log Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
