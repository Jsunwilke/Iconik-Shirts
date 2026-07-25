// Vercel Serverless Function - SS Activewear SKU lookup
// Returns colorName -> size -> SKU for a style, so the admin can turn saved
// orders (style/color/size) into the real SS SKUs needed for a Quick Order cart.
// Unlike /api/inventory this is NOT warehouse-filtered: it returns every SKU so
// a cart can still be built for an item that is momentarily out at Lockport.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { style } = req.query;

  if (!style) {
    return res.status(400).json({ error: 'Missing style parameter' });
  }

  const username = process.env.SS_API_USERNAME;
  const password = process.env.SS_API_PASSWORD;

  if (!username || !password) {
    return res.status(500).json({ error: 'API credentials not configured' });
  }

  try {
    const apiUrl = `https://api.ssactivewear.com/v2/products/?style=${encodeURIComponent(style)}&mediatype=json`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`SS API returned ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      return res.status(404).json({ error: 'Product not found', details: data.errors });
    }

    // Build { colorNameLower: { sizeName: sku } }. Color names are lowercased so
    // the admin lookup matches the same way the inventory helper does.
    const skus = {};
    data.forEach(item => {
      if (!item.sku || !item.colorName || !item.sizeName) return;
      const key = item.colorName.toLowerCase().trim();
      if (!skus[key]) skus[key] = {};
      skus[key][item.sizeName] = item.sku;
    });

    return res.status(200).json({ style, skus });

  } catch (error) {
    console.error('SKU API error:', error);
    return res.status(500).json({ error: 'Failed to fetch SKUs', message: error.message });
  }
}
