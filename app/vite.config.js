import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// SS Activewear API credentials for local development
const SS_API_USERNAME = '827653'
const SS_API_PASSWORD = '77d3c48e-2f07-4109-80e7-12b5db61b5fb'

// Custom plugin to handle /api/inventory locally
function inventoryApiPlugin() {
  return {
    name: 'inventory-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
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
  plugins: [react(), inventoryApiPlugin()],
})
