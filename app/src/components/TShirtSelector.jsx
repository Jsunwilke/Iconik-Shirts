import { useState, useEffect } from 'react'
import ProductCard from './ProductCard'
import { fetchInventory, filterInStockColors } from '../lib/inventory'

export default function TShirtSelector({ selections, onUpdate, onNext, onBack }) {
  const [products, setProducts] = useState({ regular: null, vneck: null })
  const [inventoryData, setInventoryData] = useState({ regular: null, vneck: null })
  const [activeType, setActiveType] = useState('regular')
  const [loading, setLoading] = useState(true)
  const [inventoryLoading, setInventoryLoading] = useState(true)

  useEffect(() => {
    async function loadProducts() {
      try {
        // Load product data first (regular = 3600, vneck = 6240)
        const [regular, vneck] = await Promise.all([
          fetch('/data/nextlevel-3600.json').then(r => r.json()),
          fetch('/data/nextlevel-6240.json').then(r => r.json())
        ])

        // Show products immediately with loading state
        setProducts({ regular, vneck })
        setLoading(false)

        // Fetch live inventory from IL warehouse
        const [invRegular, invVneck] = await Promise.all([
          fetchInventory(regular.styleCode),
          fetchInventory(vneck.styleCode)
        ])

        // Store inventory data for size filtering
        setInventoryData({
          regular: invRegular,
          vneck: invVneck
        })

        // Filter products to only show in-stock colors
        const filteredRegular = invRegular ? {
          ...regular,
          colors: filterInStockColors(regular, invRegular)
        } : { ...regular, colors: [] }

        const filteredVneck = invVneck ? {
          ...vneck,
          colors: filterInStockColors(vneck, invVneck)
        } : { ...vneck, colors: [] }

        setProducts({ regular: filteredRegular, vneck: filteredVneck })
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

  const activeProduct = activeType === 'regular' ? products.regular : products.vneck
  const imagePath = activeType === 'regular'
    ? '/images/tshirts/nextlevel-3600'
    : '/images/tshirts/nextlevel-6240'

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
            <button
              onClick={() => setActiveType('regular')}
              className={`
                flex-1 py-3 rounded-md font-medium transition-colors
                ${activeType === 'regular'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                }
              `}
            >
              Regular T-Shirt
            </button>
            <button
              onClick={() => setActiveType('vneck')}
              className={`
                flex-1 py-3 rounded-md font-medium transition-colors
                ${activeType === 'vneck'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                }
              `}
            >
              V-Neck T-Shirt
            </button>
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
