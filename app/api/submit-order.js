// Vercel Serverless Function - Submit Order to SS Activewear

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lineItems, shippingMethod, shippingAddress, poNumber, testOrder } = req.body;

  if (!lineItems || lineItems.length === 0) {
    return res.status(400).json({ error: 'No line items provided' });
  }

  if (!shippingAddress?.address || !shippingAddress?.city || !shippingAddress?.state || !shippingAddress?.zip) {
    return res.status(400).json({ error: 'Shipping address is incomplete' });
  }

  const username = process.env.SS_API_USERNAME;
  const password = process.env.SS_API_PASSWORD;

  if (!username || !password) {
    return res.status(500).json({ error: 'API credentials not configured' });
  }

  try {
    // Build the order payload for SS Activewear
    const orderPayload = {
      address: shippingAddress.address,
      city: shippingAddress.city,
      state: shippingAddress.state,
      zip: shippingAddress.zip,
      customer: shippingAddress.customer || '',
      attn: shippingAddress.attn || '',
      residential: shippingAddress.residential ?? true,
      shippingMethod: shippingMethod || 1, // Default to Ground
      testOrder: testOrder ?? false,
      poNumber: poNumber || `ICONIK-${Date.now()}`,
      lines: lineItems.map(item => ({
        sku: item.sku,
        qty: item.qty
      }))
    };

    const response = await fetch('https://api.ssactivewear.com/v2/orders/', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('SS Activewear API error:', data);
      return res.status(response.status).json({
        error: 'Failed to submit order to SS Activewear',
        details: data
      });
    }

    // Return the order confirmation
    return res.status(200).json({
      success: true,
      order: data,
      message: testOrder ? 'Test order submitted successfully' : 'Order submitted successfully'
    });

  } catch (error) {
    console.error('Submit order error:', error);
    return res.status(500).json({
      error: 'Failed to submit order',
      message: error.message
    });
  }
}
