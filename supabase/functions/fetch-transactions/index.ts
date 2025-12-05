import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Transaction {
  id: number;
  assetId: number;
  assetName: string;
  assetType: string;
  robuxSpent: number;
  created: string;
  isLimited: boolean;
  thumbnailUrl?: string;
  currentRap?: number;
}

interface RolimonsItem {
  name: string;
  rap: number;
  value: number;
}

// Rolimons data cache
let rolimonsCache: { data: Record<string, RolimonsItem> | null; timestamp: number } = {
  data: null,
  timestamp: 0
};

async function fetchRolimonsData(): Promise<Record<string, RolimonsItem>> {
  const now = Date.now();
  // Cache for 5 minutes
  if (rolimonsCache.data && (now - rolimonsCache.timestamp) < 300000) {
    console.log('Using cached Rolimons data');
    return rolimonsCache.data;
  }

  console.log('Fetching fresh Rolimons data...');
  try {
    const response = await fetch('https://www.rolimons.com/itemapi/itemdetails', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.error('Rolimons API error:', response.status);
      return rolimonsCache.data || {};
    }

    const data = await response.json();
    
    if (!data.success || !data.items) {
      console.error('Invalid Rolimons response');
      return rolimonsCache.data || {};
    }

    // Parse Rolimons data format: [Name, Acronym, Rap, Value, ...]
    const items: Record<string, RolimonsItem> = {};
    for (const [assetId, itemData] of Object.entries(data.items)) {
      if (Array.isArray(itemData) && itemData.length >= 4) {
        items[assetId] = {
          name: itemData[0] as string,
          rap: itemData[2] as number,
          value: itemData[3] as number
        };
      }
    }

    console.log(`Parsed ${Object.keys(items).length} limited items from Rolimons`);
    
    rolimonsCache = { data: items, timestamp: now };
    return items;
  } catch (error) {
    console.error('Failed to fetch Rolimons data:', error);
    return rolimonsCache.data || {};
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cookie, userId, cursor } = await req.json();

    if (!cookie || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cookie and userId are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const cleanCookie = cookie.trim();
    console.log('Fetching transactions for user:', userId);

    // Fetch Rolimons data first to know which items are limiteds
    const rolimonsItems = await fetchRolimonsData();
    console.log('Rolimons items loaded:', Object.keys(rolimonsItems).length);

    // Fetch transactions from Roblox API
    let url = `https://economy.roblox.com/v2/users/${userId}/transactions?transactionType=Purchase&limit=100`;
    if (cursor) {
      url += `&cursor=${cursor}`;
    }

    const response = await fetch(url, {
      headers: {
        'Cookie': `.ROBLOSECURITY=${cleanCookie}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Transactions API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch transactions: ${response.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    const transactionsData = await response.json();
    console.log('Found transactions:', transactionsData.data?.length || 0);

    // Filter for limited items using Rolimons data
    const transactions: Transaction[] = [];
    
    for (const tx of transactionsData.data || []) {
      if (tx.details?.type === 'Asset' && tx.details?.id) {
        const assetId = String(tx.details.id);
        const rolimonsItem = rolimonsItems[assetId];
        
        if (rolimonsItem) {
          // This is a limited item!
          transactions.push({
            id: tx.id,
            assetId: tx.details.id,
            assetName: rolimonsItem.name || tx.details.name || 'Unknown',
            assetType: tx.details.type,
            robuxSpent: Math.abs(tx.currency?.amount || 0),
            created: tx.created,
            isLimited: true,
            currentRap: rolimonsItem.rap,
          });
        }
      }
    }

    console.log('Limited transactions found:', transactions.length);

    // Get thumbnails for limited items
    if (transactions.length > 0) {
      const assetIds = transactions.map(tx => tx.assetId);
      
      try {
        const thumbnailResponse = await fetch(
          `https://thumbnails.roblox.com/v1/assets?assetIds=${assetIds.join(',')}&size=420x420&format=Png&isCircular=false`,
          { headers: { 'Accept': 'application/json' } }
        );
        
        if (thumbnailResponse.ok) {
          const thumbnailData = await thumbnailResponse.json();
          for (const thumb of thumbnailData.data || []) {
            const tx = transactions.find(t => t.assetId === thumb.targetId);
            if (tx) {
              tx.thumbnailUrl = thumb.imageUrl;
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch thumbnails:', e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        transactions,
        nextCursor: transactionsData.nextPageCursor || null,
        hasMore: !!transactionsData.nextPageCursor,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
