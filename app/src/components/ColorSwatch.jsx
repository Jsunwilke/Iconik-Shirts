export default function ColorSwatch({
  color,
  isSelected,
  onClick,
  swatchPath,
  size = 'normal'
}) {
  const sizeClasses = size === 'small'
    ? 'w-8 h-8'
    : 'w-12 h-12 md:w-14 md:h-14'

  return (
    <button
      onClick={onClick}
      className={`
        ${sizeClasses} rounded-full border-2 transition-all
        ${isSelected
          ? 'border-blue-600 ring-2 ring-blue-600 ring-offset-2'
          : 'border-gray-300 hover:border-gray-400'
        }
        overflow-hidden flex-shrink-0
      `}
      title={color.colorName}
      style={{ backgroundColor: color.hexColor }}
    >
      {swatchPath && (
        <img
          src={swatchPath}
          alt={color.colorName}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />
      )}
    </button>
  )
}
