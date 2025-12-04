import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RobloxItem {
  id: string;
  assetId: number;
  name: string;
  boughtFor: number;
  currentRap: number | null;
  date: string;
  isLoading?: boolean;
}

export interface UserStats {
  totalSnipes: number;
  totalInvested: number;
  portfolioValue: number;
  allTimeProfit: number;
  profitPercentage: number;
}

export function useRobloxData() {
  const [items, setItems] = useState<RobloxItem[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalSnipes: 0,
    totalInvested: 0,
    portfolioValue: 0,
    allTimeProfit: 0,
    profitPercentage: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchItemRAP = async (assetId: number): Promise<number | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-roblox-item', {
        body: { assetId }
      });
      
      if (error || !data.success) {
        console.error('Error fetching RAP:', error || data.error);
        return null;
      }
      
      return data.rap;
    } catch (err) {
      console.error('Failed to fetch RAP:', err);
      return null;
    }
  };

  const loadItems = useCallback(async () => {
    // Load items from localStorage
    const storedItems = localStorage.getItem('sniped_items');
    if (storedItems) {
      const parsed: RobloxItem[] = JSON.parse(storedItems);
      setItems(parsed.map(item => ({ ...item, isLoading: true })));
      
      // Fetch current RAP for each item
      const updatedItems = await Promise.all(
        parsed.map(async (item) => {
          const rap = await fetchItemRAP(item.assetId);
          return { ...item, currentRap: rap, isLoading: false };
        })
      );
      
      setItems(updatedItems);
      localStorage.setItem('sniped_items', JSON.stringify(updatedItems));
      
      // Calculate stats
      const totalInvested = updatedItems.reduce((sum, item) => sum + item.boughtFor, 0);
      const portfolioValue = updatedItems.reduce((sum, item) => sum + (item.currentRap || 0), 0);
      const allTimeProfit = portfolioValue - totalInvested;
      
      setStats({
        totalSnipes: updatedItems.length,
        totalInvested,
        portfolioValue,
        allTimeProfit,
        profitPercentage: totalInvested > 0 ? (allTimeProfit / totalInvested) * 100 : 0,
      });
    }
  }, []);

  const addItem = useCallback(async (assetId: number, boughtFor: number) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-roblox-item', {
        body: { assetId }
      });
      
      if (error || !data.success) {
        throw new Error(data?.error || 'Failed to fetch item');
      }

      const newItem: RobloxItem = {
        id: `${Date.now()}`,
        assetId,
        name: data.name,
        boughtFor,
        currentRap: data.rap,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        isLoading: false,
      };

      const updatedItems = [...items, newItem];
      setItems(updatedItems);
      localStorage.setItem('sniped_items', JSON.stringify(updatedItems));
      
      // Recalculate stats
      const totalInvested = updatedItems.reduce((sum, item) => sum + item.boughtFor, 0);
      const portfolioValue = updatedItems.reduce((sum, item) => sum + (item.currentRap || 0), 0);
      const allTimeProfit = portfolioValue - totalInvested;
      
      setStats({
        totalSnipes: updatedItems.length,
        totalInvested,
        portfolioValue,
        allTimeProfit,
        profitPercentage: totalInvested > 0 ? (allTimeProfit / totalInvested) * 100 : 0,
      });

      return { success: true, item: newItem };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    } finally {
      setIsLoading(false);
    }
  }, [items]);

  const removeItem = useCallback((itemId: string) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    setItems(updatedItems);
    localStorage.setItem('sniped_items', JSON.stringify(updatedItems));
    
    const totalInvested = updatedItems.reduce((sum, item) => sum + item.boughtFor, 0);
    const portfolioValue = updatedItems.reduce((sum, item) => sum + (item.currentRap || 0), 0);
    const allTimeProfit = portfolioValue - totalInvested;
    
    setStats({
      totalSnipes: updatedItems.length,
      totalInvested,
      portfolioValue,
      allTimeProfit,
      profitPercentage: totalInvested > 0 ? (allTimeProfit / totalInvested) * 100 : 0,
    });
  }, [items]);

  const refreshItems = useCallback(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return {
    items,
    stats,
    isLoading,
    addItem,
    removeItem,
    refreshItems,
  };
}
