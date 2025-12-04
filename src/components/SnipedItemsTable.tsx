import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SnipedItem {
  id: string;
  name: string;
  assetId: string;
  boughtFor: number;
  currentRap: number | null;
  date: string;
}

const mockItems: SnipedItem[] = [
  {
    id: '1',
    name: 'BFF Lock',
    assetId: '16652251',
    boughtFor: 18,
    currentRap: null,
    date: 'Jan 15, 2024',
  },
  {
    id: '2',
    name: 'Dominus Empyreus',
    assetId: '1365767',
    boughtFor: 125000,
    currentRap: 185000,
    date: 'Jan 20, 2024',
  },
  {
    id: '3',
    name: 'Clockwork Shades',
    assetId: '48545806',
    boughtFor: 8500,
    currentRap: 12000,
    date: 'Feb 1, 2024',
  },
];

export function SnipedItemsTable() {
  const calculateProfit = (boughtFor: number, currentRap: number | null) => {
    if (currentRap === null) return { amount: -boughtFor, percentage: -100 };
    const profit = currentRap - boughtFor;
    const percentage = ((profit / boughtFor) * 100);
    return { amount: profit, percentage };
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h3 className="font-semibold text-foreground">Sniped Items</h3>
          <p className="text-xs text-muted-foreground">Your trading history</p>
        </div>
        <Button variant="ghost" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="p-4">Item</th>
              <th className="p-4">Bought For</th>
              <th className="p-4">Current RAP</th>
              <th className="p-4">Profit/Loss</th>
              <th className="p-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {mockItems.map((item) => {
              const profit = calculateProfit(item.boughtFor, item.currentRap);
              const isProfit = profit.amount > 0;
              const isLoading = item.currentRap === null;

              return (
                <tr key={item.id} className="border-b border-border/50 last:border-0">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-secondary text-[10px] font-bold">
                        <span className="text-foreground">{item.name.split(' ')[0]}</span>
                        <span className="text-muted-foreground">{item.name.split(' ')[1]}</span>
                        <div className={cn(
                          "mt-1 h-1.5 w-1.5 rounded-full",
                          isLoading ? "bg-loss animate-pulse" : isProfit ? "bg-success" : "bg-loss"
                        )} />
                      </div>
                      <div>
                        <a 
                          href={`https://www.roblox.com/catalog/${item.assetId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {item.name}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <p className="text-xs text-muted-foreground">#{item.assetId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-sm text-foreground">
                    R$ {item.boughtFor.toLocaleString()}
                  </td>
                  <td className="p-4 font-mono text-sm">
                    {isLoading ? (
                      <span className="text-muted-foreground">Loading...</span>
                    ) : (
                      <span className="text-foreground">R$ {item.currentRap?.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-lg",
                        isProfit ? "text-success" : "text-loss"
                      )}>
                        ↗
                      </span>
                      <div>
                        <p className={cn(
                          "font-mono text-sm font-medium",
                          isProfit ? "text-success" : "text-loss"
                        )}>
                          {isProfit ? '+' : ''}R$ {profit.amount.toLocaleString()}
                        </p>
                        <p className={cn(
                          "text-xs",
                          isProfit ? "text-success/80" : "text-loss/80"
                        )}>
                          {profit.percentage > 0 ? '+' : ''}{profit.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {item.date}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
