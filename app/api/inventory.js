// Vercel Serverless Function - SS Activewear Inventory Check
// Filters to IL (Lockport, Illinois) warehouse only

export default async function handler(req, res) {
  // Enable CORS
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

    // Filter to IL warehouse only and qty > 0
    const WAREHOUSE = 'IL';

    // Build inventory map: { colorName: { sizeName: qty } }
    const inventory = {};
    const colorInfo = {};

    data.forEach(item => {
      // Find IL warehouse inventory
      const ilWarehouse = item.warehouses?.find(w => w.warehouseAbbr === WAREHOUSE);
      const qty = ilWarehouse?.qty || 0;

      if (qty > 0) {
        // Initialize color if not exists
        if (!inventory[item.colorName]) {
          inventory[item.colorName] = {};
          colorInfo[item.colorName] = {
            colorCode: item.colorCode,
            colorSwatchImage: item.colorSwatchImage,
            colorFrontImage: item.colorFrontImage,
            colorBackImage: item.colorBackImage,
            hexColor: item.color1
          };
        }

        // Add size with quantity
        inventory[item.colorName][item.sizeName] = qty;
      }
    });

    // Convert to array format
    const availableColors = Object.keys(inventory).map(colorName => ({
      colorName,
      ...colorInfo[colorName],
      sizes: Object.entries(inventory[colorName]).map(([size, qty]) => ({
        size,
        qty
      }))
    }));

    return res.status(200).json({
      style,
      warehouse: WAREHOUSE,
      availableColors,
      totalColors: availableColors.length
    });

  } catch (error) {
    console.error('Inventory API error:', error);
    return res.status(500).json({ error: 'Failed to fetch inventory', message: error.message });
  }
}
