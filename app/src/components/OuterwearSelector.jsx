import { useState, useEffect } from 'react'
import ProductCard from './ProductCard'

export default function OuterwearSelector({ selection, onUpdate, onNext, onBack }) {
  const [products, setProducts] = useState({ crewneck: null, hoodie: null })
  const [activeType, setActiveType] = useState('crewneck')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProducts() {
      try {
        const [crewneck, hoodie] = await Promise.all([
          fetch('/data/gildan-18000.json').then(r => r.json()),
          fetch('/data/gildan-18500.json').then(r => r.json())
        ])
        setProducts({ crewneck, hoodie })
      } catch (err) {
        console.error('Failed to load products:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  const handleSelect = (item) => {
    onUpdate({
      ...item,
      type: activeType
    })
  }

  const activeProduct = activeType === 'crewneck' ? products.crewneck : products.hoodie
  const imagePath = activeType === 'crewneck'
    ? '/images/crewneck/gildan-18000'
    : '/images/hoodie/gildan-18500'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

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
              <h2 className="font-semibold text-gray-800">Select Outerwear</h2>
              <p className="text-sm text-gray-500">Choose 1 crew neck or hoodie</p>
            </div>
            <div className="w-16"></div>
          </div>
        </div>

        {/* Type Toggle */}
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveType('crewneck')}
              className={`
                flex-1 py-3 rounded-md font-medium transition-colors
                ${activeType === 'crewneck'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                }
              `}
            >
              Crew Neck
            </button>
            <button
              onClick={() => setActiveType('hoodie')}
              className={`
                flex-1 py-3 rounded-md font-medium transition-colors
                ${activeType === 'hoodie'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                }
              `}
            >
              Hoodie
            </button>
          </div>
        </div>
      </div>

      {/* Current Selection */}
      {selection && (
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Your Selection</h3>
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full border border-gray-300"
                style={{ backgroundColor: selection.hexColor }}
              />
              <span>
                {selection.type === 'crewneck' ? 'Crew Neck' : 'Hoodie'} - {selection.color} ({selection.size})
              </span>
              <button
                onClick={() => onUpdate(null)}
                className="ml-auto text-red-600 hover:text-red-700 text-sm"
              >
                Remove
              </button>
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
              isSelected={selection?.type === activeType}
            />
          )}
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={onNext}
            disabled={!selection}
            className={`
              w-full py-4 rounded-lg font-semibold text-lg transition-colors
              ${selection
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {selection ? 'Review Order' : 'Select an item to continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
