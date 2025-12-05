import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache Rolimons data for 5 minutes
let rolimonsCache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000;

async function getRolimonsData() {
  if (rolimonsCache && Date.now() - rolimonsCache.timestamp < CACHE_DURATION) {
    return rolimonsCache.data;
  }

  try {
    const response = await fetch('https://www.rolimons.com/api/items', {
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      rolimonsCache = { data, timestamp: Date.now() };
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
    const { assetId } = await req.json();

    if (!assetId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Asset ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Fetching item data for asset:', assetId);

    // First check Rolimons for accurate RAP and limited status
    const rolimonsData = await getRolimonsData();
    let rolimonsItem = null;
    let isLimited = false;
    let rap = 0;

    if (rolimonsData?.items?.[assetId]) {
      const item = rolimonsData.items[assetId];
      isLimited = true;
      // Rolimons item format: [name, acronym, rap, value, demand, trend, projected, hyped, rare]
      rap = item[2] || 0;
      rolimonsItem = {
        name: item[0],
        rap: item[2] || 0,
        value: item[3] || 0,
        demand: item[4],
        trend: item[5],
      };
      console.log('Rolimons data found:', rolimonsItem.name, 'RAP:', rap);
    }

    // Fetch item details from Roblox API for additional info
    const detailsResponse = await fetch(
      `https://economy.roblox.com/v2/assets/${assetId}/details`,
      { headers: { 'Accept': 'application/json' } }
    );

    let itemData: any = null;
    let thumbnailUrl = '';

    if (detailsResponse.ok) {
      itemData = await detailsResponse.json();
      console.log('Item data:', itemData.Name);
      
      // Use Roblox's limited status as fallback if not in Rolimons
      if (!isLimited) {
        isLimited = itemData.IsLimited || itemData.IsLimitedUnique || false;
        rap = itemData.RecentAveragePrice || 0;
      }
    } else {
      // Try alternative endpoint
      const catalogResponse = await fetch(
        `https://catalog.roblox.com/v1/catalog/items/details`,
        {
          method: 'POST',
          headers: { 
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            items: [{ itemType: 'Asset', id: assetId }]
          })
        }
      );

      if (catalogResponse.ok) {
        const catalogData = await catalogResponse.json();
        const item = catalogData.data?.[0];

        if (item) {
          itemData = {
            AssetId: item.id,
            Name: item.name,
            Description: item.description,
            PriceInRobux: item.price,
            Creator: { Name: item.creatorName },
          };

          if (!isLimited) {
            isLimited = item.itemRestrictions?.includes('Limited') || item.itemRestrictions?.includes('LimitedUnique') || false;
          }
        }
      }
    }

    if (!itemData && !rolimonsItem) {
      return new Response(
        JSON.stringify({ success: false, error: 'Item not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Fetch thumbnail
    try {
      const thumbResponse = await fetch(
        `https://thumbnails.roblox.com/v1/assets?assetIds=${assetId}&size=420x420&format=Png&isCircular=false`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (thumbResponse.ok) {
        const thumbData = await thumbResponse.json();
        thumbnailUrl = thumbData.data?.[0]?.imageUrl || '';
      }
    } catch (e) {
      console.error('Failed to fetch thumbnail:', e);
    }

    const name = rolimonsItem?.name || itemData?.Name || 'Unknown';

    return new Response(
      JSON.stringify({
        success: true,
        assetId: assetId,
        name,
        rap: rolimonsItem?.rap ?? rap,
        value: rolimonsItem?.value || rap,
        price: itemData?.PriceInRobux || 0,
        isLimited,
        description: itemData?.Description,
        creator: itemData?.Creator?.Name,
        thumbnailUrl,
        demand: rolimonsItem?.demand,
        trend: rolimonsItem?.trend,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching item:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
