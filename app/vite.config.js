import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// SS Activewear API credentials for local development
const SS_API_USERNAME = '827653'
const SS_API_PASSWORD = '77d3c48e-2f07-4109-80e7-12b5db61b5fb'

// Custom plugin to handle API routes locally
function apiPlugin() {
  return {
    name: 'api-plugin',
    configureServer(server) {
      // Handle /api/submit-order
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/submit-order' && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => body += chunk)
          req.on('end', async () => {
            try {
              const { lineItems, shippingMethod, shippingAddress, testOrder, poNumber } = JSON.parse(body)

              if (!lineItems || lineItems.length === 0) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'No line items provided' }))
                return
              }

              const auth = Buffer.from(`${SS_API_USERNAME}:${SS_API_PASSWORD}`).toString('base64')

              const orderPayload = {
                address: shippingAddress.address,
                city: shippingAddress.city,
                state: shippingAddress.state,
                zip: shippingAddress.zip,
                customer: shippingAddress.customer || '',
                attn: shippingAddress.attn || '',
                residential: shippingAddress.residential ?? true,
                shippingMethod: shippingMethod || 1,
                testOrder: testOrder ?? false,
                poNumber: poNumber || `ICONIK-${Date.now()}`,
                lines: lineItems.map(item => ({
                  sku: item.identifier,
                  qty: item.qty
                }))
              }

              const response = await fetch('https://api.ssactivewear.com/v2/orders/', {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${auth}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderPayload)
              })

              const data = await response.json()

              if (!response.ok) {
                res.statusCode = response.status
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Failed to submit order', details: data }))
                return
              }

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                success: true,
                order: data,
                message: testOrder ? 'Test order submitted' : 'Order submitted'
              }))

            } catch (error) {
              console.error('Submit order error:', error)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Failed to submit order', message: error.message }))
            }
          })
          return
        }

        // Handle /api/inventory
        if (!req.url.startsWith('/api/inventory')) {
          return next()
        }

        const url = new URL(req.url, 'http://localhost')
        const style = url.searchParams.get('style')

        if (!style) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing style parameter' }))
          return
        }

        try {
          const apiUrl = `https://api.ssactivewear.com/v2/products/?style=${encodeURIComponent(style)}&mediatype=json`
          const auth = Buffer.from(`${SS_API_USERNAME}:${SS_API_PASSWORD}`).toString('base64')

          const response = await fetch(apiUrl, {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            throw new Error(`SS API returned ${response.status}`)
          }

          const data = await response.json()

          if (data.errors) {
            res.statusCode = 404
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Product not found', details: data.errors }))
            return
          }

          // Filter to IL warehouse only and qty > 0
          const WAREHOUSE = 'IL'
          const inventory = {}
          const colorInfo = {}

          data.forEach(item => {
            const ilWarehouse = item.warehouses?.find(w => w.warehouseAbbr === WAREHOUSE)
            const qty = ilWarehouse?.qty || 0

            if (qty > 0) {
              if (!inventory[item.colorName]) {
                inventory[item.colorName] = {}
                colorInfo[item.colorName] = {
                  colorCode: item.colorCode,
                  colorSwatchImage: item.colorSwatchImage,
                  colorFrontImage: item.colorFrontImage,
                  colorBackImage: item.colorBackImage,
                  hexColor: item.color1
                }
              }
              inventory[item.colorName][item.sizeName] = qty
            }
          })

          const availableColors = Object.keys(inventory).map(colorName => ({
            colorName,
            ...colorInfo[colorName],
            sizes: Object.entries(inventory[colorName]).map(([size, qty]) => ({
              size,
              qty
            }))
          }))

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            style,
            warehouse: WAREHOUSE,
            availableColors,
            totalColors: availableColors.length
          }))

        } catch (error) {
          console.error('Inventory API error:', error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Failed to fetch inventory', message: error.message }))
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiPlugin()],
})
