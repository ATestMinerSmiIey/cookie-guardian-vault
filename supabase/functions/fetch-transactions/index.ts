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
  value?: number;
}

// Cache Rolimons data for 5 minutes
let rolimonsCache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000;

async function getRolimonsData() {
  if (rolimonsCache && Date.now() - rolimonsCache.timestamp < CACHE_DURATION) {
    return rolimonsCache.data;
  }

  try {
    console.log('Fetching Rolimons data...');
    const response = await fetch('https://www.rolimons.com/api/items', {
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      rolimonsCache = { data, timestamp: Date.now() };
      console.log('Rolimons data cached, total items:', Object.keys(data.items || {}).length);
      return data;
    }
  } catch (e) {
    console.error('Failed to fetch Rolimons data:', e);
  }
  return null;
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

    // First fetch Rolimons data for accurate limited detection
    const rolimonsData = await getRolimonsData();
    const limitedIds = rolimonsData?.items ? new Set(Object.keys(rolimonsData.items).map(Number)) : new Set();
    console.log('Known limited items from Rolimons:', limitedIds.size);

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

    const transactions: Transaction[] = [];

    // Process each transaction
    for (const tx of transactionsData.data || []) {
      // Only process asset purchases (not game passes, etc)
      if (tx.details?.type === 'Asset' && tx.details?.id) {
        const assetId = tx.details.id;
        
        // Check if this is a limited using Rolimons data
        const isLimited = limitedIds.has(assetId);
        
        if (isLimited) {
          const rolimonsItem = rolimonsData?.items?.[assetId];
          // Rolimons item format: [name, acronym, rap, value, demand, trend, projected, hyped, rare]
          const rap = rolimonsItem?.[2] || 0;
          const value = rolimonsItem?.[3] || rap;
          const name = rolimonsItem?.[0] || tx.details.name || 'Unknown';

          transactions.push({
            id: tx.id,
            assetId,
            assetName: name,
            assetType: tx.details.type,
            robuxSpent: Math.abs(tx.currency?.amount || 0),
            created: tx.created,
            isLimited: true,
            currentRap: rap,
            value,
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
