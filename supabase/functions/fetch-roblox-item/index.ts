import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Fetch resale data for RAP (this only works for limiteds)
    let rap = 0;
    let isLimited = false;
    
    try {
      const resaleResponse = await fetch(
        `https://economy.roblox.com/v1/assets/${assetId}/resale-data`,
        { headers: { 'Accept': 'application/json' } }
      );
      
      if (resaleResponse.ok) {
        const resaleData = await resaleResponse.json();
        rap = resaleData.recentAveragePrice || 0;
        isLimited = true; // If resale-data endpoint works, it's a limited
        console.log('Resale data - RAP:', rap);
      }
    } catch (e) {
      console.log('No resale data (not a limited):', e);
    }

    // Fetch item details from Roblox API
    const detailsResponse = await fetch(
      `https://economy.roblox.com/v2/assets/${assetId}/details`,
      { headers: { 'Accept': 'application/json' } }
    );

    let itemData: any = null;
    let thumbnailUrl = '';

    if (detailsResponse.ok) {
      itemData = await detailsResponse.json();
      console.log('Item data:', itemData.Name);
      
      // Fallback to Roblox's limited status if resale-data didn't confirm
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

    if (!itemData) {
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

    return new Response(
      JSON.stringify({
        success: true,
        assetId: itemData.AssetId,
        name: itemData.Name,
        rap,
        price: itemData.PriceInRobux || 0,
        isLimited,
        description: itemData.Description,
        creator: itemData.Creator?.Name,
        thumbnailUrl,
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
