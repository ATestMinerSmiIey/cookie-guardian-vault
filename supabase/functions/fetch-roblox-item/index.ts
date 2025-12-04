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

    // Fetch item details from Roblox API
    const detailsResponse = await fetch(
      `https://economy.roblox.com/v2/assets/${assetId}/details`,
      {
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!detailsResponse.ok) {
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

      if (!catalogResponse.ok) {
        console.error('Failed to fetch from both endpoints');
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch item details' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      const catalogData = await catalogResponse.json();
      const item = catalogData.data?.[0];

      if (!item) {
        return new Response(
          JSON.stringify({ success: false, error: 'Item not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          assetId: item.id,
          name: item.name,
          rap: item.recentAveragePrice || 0,
          price: item.price || 0,
          isLimited: item.itemRestrictions?.includes('Limited') || item.itemRestrictions?.includes('LimitedUnique'),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const itemData = await detailsResponse.json();
    console.log('Item data:', itemData.Name);

    return new Response(
      JSON.stringify({
        success: true,
        assetId: itemData.AssetId,
        name: itemData.Name,
        rap: itemData.RecentAveragePrice || 0,
        price: itemData.PriceInRobux || 0,
        isLimited: itemData.IsLimited || itemData.IsLimitedUnique,
        description: itemData.Description,
        creator: itemData.Creator?.Name,
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
