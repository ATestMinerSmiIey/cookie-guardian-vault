import { useState } from 'react';
import { X, History, Download, Check, Loader2, ExternalLink, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { robuxToGBP, formatGBP } from '@/lib/currency';

interface Transaction {
  id: number;
  assetId: number;
  assetName: string;
  robuxSpent: number;
  created: string;
  isLimited: boolean;
  thumbnailUrl?: string;
  currentRap?: number;
}

interface TransactionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transaction: Transaction) => Promise<{ success: boolean; error?: string }>;
  existingAssetIds: number[];
}

export function TransactionImportModal({ isOpen, onClose, onImport, existingAssetIds }: TransactionImportModalProps) {
  const { user, cookie } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set());
  const [showLimitedsOnly, setShowLimitedsOnly] = useState(false);

  const fetchTransactions = async (nextCursor?: string) => {
    if (!cookie || !user) {
      toast.error('Please login first');
      return;
    }

    setIsFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-transactions', {
        body: { 
          cookie, 
          userId: user.id,
          cursor: nextCursor 
        }
      });

      if (error || !data.success) {
        toast.error(data?.error || 'Failed to fetch transactions');
        return;
      }

      if (nextCursor) {
        setTransactions(prev => [...prev, ...data.transactions]);
      } else {
        setTransactions(data.transactions);
      }
      
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
      
      const limitedCount = data.transactions.filter((t: Transaction) => t.isLimited).length;
      toast.success(`Found ${data.transactions.length} purchases (${limitedCount} limiteds)`);
    } catch (err) {
      toast.error('Failed to fetch transactions');
    } finally {
      setIsFetching(false);
    }
  };

  const handleImport = async (tx: Transaction) => {
    setIsLoading(true);
    const result = await onImport(tx);
    setIsLoading(false);
    
    if (result.success) {
      setImportedIds(prev => new Set([...prev, tx.assetId]));
      toast.success(`Imported ${tx.assetName}`);
    } else {
      toast.error(result.error || 'Failed to import');
    }
  };

  const handleImportAll = async () => {
    setIsLoading(true);
    let imported = 0;
    
    const toImport = filteredTransactions.filter(
      tx => !existingAssetIds.includes(tx.assetId) && !importedIds.has(tx.assetId)
    );
    
    for (const tx of toImport) {
      const result = await onImport(tx);
      if (result.success) {
        setImportedIds(prev => new Set([...prev, tx.assetId]));
        imported++;
      }
    }
    
    setIsLoading(false);
    toast.success(`Imported ${imported} items`);
  };

  if (!isOpen) return null;

  const calculateProfit = (boughtFor: number, currentRap: number | undefined) => {
    if (!currentRap) return null;
    return currentRap - boughtFor;
  };

  const filteredTransactions = showLimitedsOnly 
    ? transactions.filter(tx => tx.isLimited)
    : transactions;

  const limitedCount = transactions.filter(t => t.isLimited).length;
  const importableCount = filteredTransactions.filter(
    tx => !existingAssetIds.includes(tx.assetId) && !importedIds.has(tx.assetId)
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] rounded-xl border border-border bg-card shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Import from Transactions</h2>
              <p className="text-xs text-muted-foreground">
                {transactions.length > 0 
                  ? `${transactions.length} purchases found (${limitedCount} limiteds)`
                  : 'Import purchased items from your Roblox history'
                }
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 border-b border-border flex gap-2 flex-wrap">
          <Button 
            onClick={() => fetchTransactions()} 
            disabled={isFetching}
            className="flex-1 min-w-[140px]"
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <History className="mr-2 h-4 w-4" />
            )}
            {transactions.length > 0 ? 'Refresh' : 'Scan Transactions'}
          </Button>
          
          {transactions.length > 0 && (
            <>
              <Button
                variant={showLimitedsOnly ? "default" : "outline"}
                onClick={() => setShowLimitedsOnly(!showLimitedsOnly)}
                className="min-w-[100px]"
              >
                <Filter className="mr-2 h-4 w-4" />
                {showLimitedsOnly ? 'Limiteds Only' : 'Show All'}
              </Button>
              
              <Button 
                onClick={handleImportAll} 
                disabled={isLoading || importableCount === 0}
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Import All ({importableCount})
              </Button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <History className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Click "Scan Transactions" to find your purchases</p>
              <p className="text-xs text-muted-foreground mt-2">
                This will scan your Roblox transaction history and identify limited items
              </p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No limited items found</p>
              <Button 
                variant="link" 
                onClick={() => setShowLimitedsOnly(false)}
                className="mt-2"
              >
                Show all purchases
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((tx) => {
                const isAlreadyAdded = existingAssetIds.includes(tx.assetId) || importedIds.has(tx.assetId);
                const profit = calculateProfit(tx.robuxSpent, tx.currentRap);
                const isProfit = profit !== null && profit > 0;

                return (
                  <div 
                    key={tx.id} 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border bg-secondary/30",
                      tx.isLimited ? "border-primary/50" : "border-border",
                      isAlreadyAdded && "opacity-50"
                    )}
                  >
                    {tx.thumbnailUrl ? (
                      <img 
                        src={tx.thumbnailUrl} 
                        alt={tx.assetName}
                        className="h-12 w-12 rounded-lg object-cover border border-border"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        {tx.assetName.substring(0, 4)}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://www.roblox.com/catalog/${tx.assetId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-medium text-foreground hover:text-primary text-sm truncate"
                        >
                          <span className="text-primary">{tx.assetName}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                        {tx.isLimited && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                            LIMITED
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Paid: R$ {tx.robuxSpent.toLocaleString()}</span>
                        {tx.currentRap !== undefined && tx.currentRap > 0 && (
                          <span>RAP: R$ {tx.currentRap.toLocaleString()}</span>
                        )}
                        {profit !== null && (
                          <>
                            <span className={isProfit ? "text-success" : "text-loss"}>
                              {isProfit ? '+' : ''}R$ {profit.toLocaleString()}
                            </span>
                            <span className={isProfit ? "text-success" : "text-loss"}>
                              ({isProfit ? '+' : ''}{formatGBP(robuxToGBP(profit))})
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isAlreadyAdded ? "ghost" : "default"}
                      onClick={() => handleImport(tx)}
                      disabled={isAlreadyAdded || isLoading}
                    >
                      {isAlreadyAdded ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              })}

              {hasMore && (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => fetchTransactions(cursor || undefined)}
                  disabled={isFetching}
                >
                  {isFetching ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Load More
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
