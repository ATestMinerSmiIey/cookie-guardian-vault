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

async function getResaleData(assetId: number): Promise<{ rap: number; isLimited: boolean }> {
  try {
    const response = await fetch(
      `https://economy.roblox.com/v1/assets/${assetId}/resale-data`,
      { headers: { 'Accept': 'application/json' } }
    );
    
    if (response.ok) {
      const data = await response.json();
      return {
        rap: data.recentAveragePrice || 0,
        isLimited: true // If resale-data exists, it's a limited
      };
    }
    return { rap: 0, isLimited: false };
  } catch {
    return { rap: 0, isLimited: false };
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

    // Collect all asset purchases first
    const assetPurchases: { tx: any; assetId: number }[] = [];
    
    for (const tx of transactionsData.data || []) {
      if (tx.details?.type === 'Asset' && tx.details?.id) {
        assetPurchases.push({ tx, assetId: tx.details.id });
      }
    }

    console.log('Asset purchases to check:', assetPurchases.length);

    // Check each asset for limited status using resale-data API
    const transactions: Transaction[] = [];
    
    // Process in batches of 10 to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < assetPurchases.length; i += batchSize) {
      const batch = assetPurchases.slice(i, i + batchSize);
      
      const results = await Promise.all(
        batch.map(async ({ tx, assetId }) => {
          const resaleData = await getResaleData(assetId);
          return { tx, assetId, ...resaleData };
        })
      );

      for (const result of results) {
        if (result.isLimited) {
          transactions.push({
            id: result.tx.id,
            assetId: result.assetId,
            assetName: result.tx.details.name || 'Unknown',
            assetType: result.tx.details.type,
            robuxSpent: Math.abs(result.tx.currency?.amount || 0),
            created: result.tx.created,
            isLimited: true,
            currentRap: result.rap,
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
