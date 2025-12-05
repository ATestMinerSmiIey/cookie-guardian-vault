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
    // Using the economy transactions API
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
      console.error('Transactions API error:', response.status);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch transactions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    const transactionsData = await response.json();
    console.log('Found transactions:', transactionsData.data?.length || 0);

    const transactions: Transaction[] = [];
    const assetIds: number[] = [];

    // Process each transaction
    for (const tx of transactionsData.data || []) {
      // Only process asset purchases (not game passes, etc)
      if (tx.details?.type === 'Asset' && tx.details?.id) {
        assetIds.push(tx.details.id);
        transactions.push({
          id: tx.id,
          assetId: tx.details.id,
          assetName: tx.details.name || 'Unknown',
          assetType: tx.details.type,
          robuxSpent: Math.abs(tx.currency?.amount || 0),
          created: tx.created,
          isLimited: false, // Will be updated below
        });
      }
    }

    // Check which assets are limiteds and get their RAP
    if (assetIds.length > 0) {
      // Fetch item details in batches
      const limitedChecks = await Promise.all(
        transactions.map(async (tx) => {
          try {
            const detailsResponse = await fetch(
              `https://economy.roblox.com/v2/assets/${tx.assetId}/details`,
              { headers: { 'Accept': 'application/json' } }
            );
            
            if (detailsResponse.ok) {
              const details = await detailsResponse.json();
              return {
                assetId: tx.assetId,
                isLimited: details.IsLimited || details.IsLimitedUnique,
                rap: details.RecentAveragePrice || 0,
              };
            }
            return { assetId: tx.assetId, isLimited: false, rap: 0 };
          } catch {
            return { assetId: tx.assetId, isLimited: false, rap: 0 };
          }
        })
      );

      // Update transactions with limited status
      for (const check of limitedChecks) {
        const tx = transactions.find(t => t.assetId === check.assetId);
        if (tx) {
          tx.isLimited = check.isLimited;
          tx.currentRap = check.rap;
        }
      }

      // Get thumbnails for limited items
      const limitedAssetIds = transactions
        .filter(tx => tx.isLimited)
        .map(tx => tx.assetId);

      if (limitedAssetIds.length > 0) {
        try {
          const thumbnailResponse = await fetch(
            `https://thumbnails.roblox.com/v1/assets?assetIds=${limitedAssetIds.join(',')}&size=420x420&format=Png&isCircular=false`,
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
    }

    // Filter to only return limiteds
    const limitedTransactions = transactions.filter(tx => tx.isLimited);
    console.log('Limited transactions found:', limitedTransactions.length);

    return new Response(
      JSON.stringify({
        success: true,
        transactions: limitedTransactions,
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
