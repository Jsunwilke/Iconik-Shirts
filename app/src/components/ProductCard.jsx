import { useState, useEffect } from 'react'
import ColorSwatch from './ColorSwatch'
import { getAvailableSizes } from '../lib/inventory'

const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL']

export default function ProductCard({
  product,
  imageBasePath,
  onSelect,
  isSelected,
  selectedInfo,
  showAddButton = true,
  inventory
}) {
  const [selectedColor, setSelectedColor] = useState(
    selectedInfo?.color || product.colors[0]
  )
  const [selectedSize, setSelectedSize] = useState(selectedInfo?.size || '')
  const [availableSizes, setAvailableSizes] = useState(SIZES)

  // Update available sizes when color changes or inventory loads
  useEffect(() => {
    if (inventory && selectedColor) {
      const sizes = getAvailableSizes(inventory, selectedColor.colorName)
      setAvailableSizes(sizes.length > 0 ? sizes : [])
      // Reset size if current selection is no longer available
      if (selectedSize && !sizes.includes(selectedSize)) {
        setSelectedSize('')
      }
    }
  }, [inventory, selectedColor, selectedSize])

  const getProductImage = (color) => {
    if (color.productImage) {
      return `${imageBasePath}/${color.productImage}`
    }
    return null
  }

  const getSwatchImage = (color) => {
    if (color.swatchImage) {
      return `${imageBasePath}/${color.swatchImage}`
    }
    return null
  }

  const handleAdd = () => {
    if (!selectedSize) {
      alert('Please select a size')
      return
    }
    onSelect({
      style: product.styleName,
      styleId: product.styleId,
      color: selectedColor.colorName,
      size: selectedSize,
      productImage: getProductImage(selectedColor),
      hexColor: selectedColor.hexColor
    })
  }

  const productImage = getProductImage(selectedColor)

  return (
    <div className={`
      bg-white rounded-lg shadow-md overflow-hidden
      ${isSelected ? 'ring-2 ring-green-500' : ''}
    `}>
      {/* Product Image */}
      <div className="aspect-square bg-gray-100 flex items-center justify-center p-4">
        {productImage ? (
          <img
            src={productImage}
            alt={`${product.styleName} - ${selectedColor.colorName}`}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div
            className="w-32 h-32 rounded-lg"
            style={{ backgroundColor: selectedColor.hexColor }}
          />
        )}
      </div>

      <div className="p-4">
        {/* Product Title */}
        <h3 className="font-semibold text-gray-800">{product.styleName}</h3>
        <p className="text-sm text-gray-600 mb-3">{product.title}</p>

        {/* Color Swatches */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">
            Color: {selectedColor.colorName}
          </p>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((color) => (
              <ColorSwatch
                key={color.colorCode}
                color={color}
                isSelected={selectedColor.colorCode === color.colorCode}
                onClick={() => setSelectedColor(color)}
                swatchPath={getSwatchImage(color)}
                size="small"
              />
            ))}
          </div>
        </div>

        {/* Size Selector */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">
            Size {inventory && <span className="text-green-600">(In Stock at IL Warehouse)</span>}
          </p>
          {availableSizes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`
                    px-3 py-2 text-sm font-medium rounded-md border transition-colors
                    ${selectedSize === size
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }
                  `}
                >
                  {size}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-red-600">No sizes available for this color</p>
          )}
        </div>

        {/* Add Button */}
        {showAddButton && (
          <button
            onClick={handleAdd}
            disabled={isSelected || availableSizes.length === 0}
            className={`
              w-full py-3 rounded-lg font-medium transition-colors
              ${isSelected
                ? 'bg-green-100 text-green-700 cursor-default'
                : availableSizes.length === 0
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              }
            `}
          >
            {isSelected ? '✓ Added' : availableSizes.length === 0 ? 'Out of Stock' : 'Add to Order'}
          </button>
        )}
      </div>
    </div>
  )
}
