import { useState, useEffect } from 'react'
import ProductCard from './ProductCard'
import { fetchInventory, filterInStockColors } from '../lib/inventory'

// The two shirts employees choose between. Adding a third is just another entry.
const STYLES = [
  {
    key: 'comfortcolors',
    dataFile: '/data/comfortcolors-1717.json',
    imagePath: '/images/tshirts/comfortcolors-1717',
    label: 'Comfort Colors 1717',
    sublabel: 'Garment-Dyed Heavyweight'
  },
  {
    key: 'bellacanvas',
    dataFile: '/data/bellacanvas-3001cvc.json',
    imagePath: '/images/tshirts/bellacanvas-3001cvc',
    label: 'Bella + Canvas 3001CVC',
    sublabel: 'Soft Blend'
  }
]

export default function TShirtSelector({ selections, onUpdate, onNext, onBack }) {
  const [products, setProducts] = useState({})
  const [inventoryData, setInventoryData] = useState({})
  const [activeType, setActiveType] = useState(STYLES[0].key)
  const [loading, setLoading] = useState(true)
  const [inventoryLoading, setInventoryLoading] = useState(true)

  useEffect(() => {
    async function loadProducts() {
      try {
        // Load product data first so the page can render while stock is checked
        const loaded = await Promise.all(
          STYLES.map(s => fetch(s.dataFile).then(r => r.json()))
        )

        const byKey = Object.fromEntries(
          STYLES.map((s, i) => [s.key, loaded[i]])
        )
        setProducts(byKey)
        setLoading(false)

        // Fetch live inventory from the IL (Lockport) warehouse
        const inventories = await Promise.all(
          STYLES.map((s, i) => fetchInventory(loaded[i].styleCode))
        )

        // Store inventory data for per-color size filtering
        setInventoryData(
          Object.fromEntries(STYLES.map((s, i) => [s.key, inventories[i]]))
        )

        // Filter to in-stock colors only. If inventory is unavailable, show
        // NO colors rather than falsely offering everything.
        setProducts(Object.fromEntries(STYLES.map((s, i) => {
          const product = loaded[i]
          const inv = inventories[i]
          return [s.key, inv
            ? { ...product, colors: filterInStockColors(product, inv) }
            : { ...product, colors: [] }
          ]
        })))
        setInventoryLoading(false)
      } catch (err) {
        console.error('Failed to load products:', err)
        setLoading(false)
        setInventoryLoading(false)
      }
    }
    loadProducts()
  }, [])

  const handleSelect = (item) => {
    if (selections.length >= 3) {
      alert('You can only select 3 t-shirts. Remove one to add another.')
      return
    }
    onUpdate([...selections, item])
  }

  const handleRemove = (index) => {
    onUpdate(selections.filter((_, i) => i !== index))
  }

  const isSelected = (styleId, colorName) => {
    return selections.some(s => s.styleId === styleId && s.color === colorName)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  const activeStyle = STYLES.find(s => s.key === activeType)
  const activeProduct = products[activeType]
  const imagePath = activeStyle.imagePath

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white shadow-sm z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Back
            </button>
            <div className="text-center">
              <h2 className="font-semibold text-gray-800">Select T-Shirts</h2>
              <p className="text-sm text-gray-500">{selections.length} of 3 selected</p>
            </div>
            <div className="w-16"></div>
          </div>
        </div>

        {/* Type Toggle */}
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {STYLES.map((style) => (
              <button
                key={style.key}
                onClick={() => setActiveType(style.key)}
                className={`
                  flex-1 py-2 px-2 rounded-md transition-colors
                  ${activeType === style.key
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                  }
                `}
              >
                <span className="block font-medium text-sm leading-tight">{style.label}</span>
                <span className="block text-xs text-gray-500 leading-tight">{style.sublabel}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Items */}
      {selections.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Your Selections</h3>
            <div className="flex flex-wrap gap-2">
              {selections.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-gray-100 rounded-full pl-3 pr-1 py-1"
                >
                  <div
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: item.hexColor }}
                  />
                  <span className="text-sm">{item.style} - {item.color} ({item.size})</span>
                  <button
                    onClick={() => handleRemove(index)}
                    className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Product */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="max-w-md mx-auto">
          {activeProduct && (
            <ProductCard
              product={activeProduct}
              imageBasePath={imagePath}
              onSelect={handleSelect}
              isSelected={false}
              inventory={inventoryData[activeType]}
              inventoryLoading={inventoryLoading}
            />
          )}
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={onNext}
            disabled={selections.length !== 3}
            className={`
              w-full py-4 rounded-lg font-semibold text-lg transition-colors
              ${selections.length === 3
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {selections.length === 3
              ? 'Continue to Outerwear'
              : `Select ${3 - selections.length} more t-shirt${3 - selections.length !== 1 ? 's' : ''}`
            }
          </button>
        </div>
      </div>
    </div>
  )
}
