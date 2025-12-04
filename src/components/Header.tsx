import { Check, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  onLoginClick?: () => void;
}

export function Header({ onLoginClick }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
            <Check className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">VERIZON</h1>
            <p className="text-[10px] uppercase tracking-widest text-primary">Limited Sniper</p>
          </div>
        </div>

        {isAuthenticated && user ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/20 text-xs font-bold text-primary">
                {user.name.substring(0, 4)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{user.displayName}</p>
                <p className="text-xs text-muted-foreground">@{user.name}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <Button 
            onClick={onLoginClick}
            className="bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] font-semibold"
          >
            <Check className="h-4 w-4" />
            Login with Cookie
          </Button>
        )}
      </div>
    </header>
  );
}
