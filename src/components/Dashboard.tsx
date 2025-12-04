import { useState } from 'react';
import { Target, DollarSign, Wallet, TrendingUp, LayoutDashboard, Eye, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/StatsCard';
import { ProfitChart } from '@/components/ProfitChart';
import { SnipedItemsTable } from '@/components/SnipedItemsTable';
import { AddItemModal } from '@/components/AddItemModal';
import { useRobloxData } from '@/hooks/useRobloxData';
import { cn } from '@/lib/utils';

type Tab = 'dashboard' | 'watchlist' | 'settings';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { items, stats, addItem, removeItem, refreshItems } = useRobloxData();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshItems();
    setIsRefreshing(false);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'watchlist', label: 'Watchlist', icon: <Eye className="h-4 w-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <main className="min-h-screen px-6 pt-24 pb-12">
      <div className="mx-auto max-w-6xl">
        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard
            icon={<Target className="h-4 w-4" />}
            label="Total Snipes"
            value={stats.totalSnipes.toString()}
          />
          <StatsCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Total Invested"
            value={`R$ ${stats.totalInvested.toLocaleString()}`}
            variant="default"
          />
          <StatsCard
            icon={<Wallet className="h-4 w-4" />}
            label="Portfolio Value"
            value={`R$ ${stats.portfolioValue.toLocaleString()}`}
          />
          <StatsCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="All-Time Profit"
            value={`${stats.allTimeProfit >= 0 ? '+' : ''}R$ ${stats.allTimeProfit.toLocaleString()}`}
            subValue={`${stats.profitPercentage >= 0 ? '+' : ''}${stats.profitPercentage.toFixed(1)}%`}
            variant={stats.allTimeProfit >= 0 ? "success" : "loss"}
          />
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                activeTab === tab.id && "bg-primary text-primary-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <ProfitChart items={items} />
            <SnipedItemsTable 
              items={items} 
              onRefresh={handleRefresh}
              onAddClick={() => setIsAddModalOpen(true)}
              onRemove={removeItem}
              isRefreshing={isRefreshing}
            />
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Eye className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Watchlist Coming Soon</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Track your favorite items and get notified when prices drop
            </p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Settings className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Settings Coming Soon</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Configure your sniper settings and preferences
            </p>
          </div>
        )}
      </div>

      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addItem}
      />
    </main>
  );
}
