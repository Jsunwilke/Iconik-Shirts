// Inventory API helper - fetches live stock from SS Activewear via our API route

const inventoryCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchInventory(styleName) {
  // Check cache first
  const cached = inventoryCache.get(styleName);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await fetch(`/api/inventory?style=${encodeURIComponent(styleName)}`);

    if (!response.ok) {
      console.error('Inventory API error:', response.status);
      return null;
    }

    const data = await response.json();

    // Cache the result
    inventoryCache.set(styleName, {
      data,
      timestamp: Date.now()
    });

    return data;

  } catch (error) {
    console.error('Failed to fetch inventory:', error);
    return null;
  }
}

// Helper to normalize color names for comparison (case-insensitive)
function normalizeColorName(name) {
  return name?.toLowerCase().trim() || '';
}

// Helper to check if a specific color/size combo is in stock
export function isInStock(inventory, colorName, sizeName) {
  if (!inventory?.availableColors) return false;

  const normalizedColorName = normalizeColorName(colorName);
  const color = inventory.availableColors.find(c =>
    normalizeColorName(c.colorName) === normalizedColorName
  );
  if (!color) return false;

  const size = color.sizes.find(s => s.size === sizeName);
  return size && size.qty > 0;
}

// Helper to get available sizes for a color
export function getAvailableSizes(inventory, colorName) {
  if (!inventory?.availableColors) return [];

  const normalizedColorName = normalizeColorName(colorName);
  const color = inventory.availableColors.find(c =>
    normalizeColorName(c.colorName) === normalizedColorName
  );
  if (!color) return [];

  return color.sizes.map(s => s.size);
}

// Helper to filter product colors to only in-stock ones
export function filterInStockColors(product, inventory) {
  // If no inventory data, return empty array (not all colors!)
  if (!inventory?.availableColors) return [];

  // Build a set of normalized in-stock color names for efficient lookup
  const inStockColorNames = new Set(
    inventory.availableColors.map(c => normalizeColorName(c.colorName))
  );

  return product.colors.filter(color =>
    inStockColorNames.has(normalizeColorName(color.colorName))
  );
}
