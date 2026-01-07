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

// Helper to check if a specific color/size combo is in stock
export function isInStock(inventory, colorName, sizeName) {
  if (!inventory?.availableColors) return false;

  const color = inventory.availableColors.find(c => c.colorName === colorName);
  if (!color) return false;

  const size = color.sizes.find(s => s.size === sizeName);
  return size && size.qty > 0;
}

// Helper to get available sizes for a color
export function getAvailableSizes(inventory, colorName) {
  if (!inventory?.availableColors) return [];

  const color = inventory.availableColors.find(c => c.colorName === colorName);
  if (!color) return [];

  return color.sizes.map(s => s.size);
}

// Helper to filter product colors to only in-stock ones
export function filterInStockColors(product, inventory) {
  if (!inventory?.availableColors) return product.colors;

  const inStockColorNames = new Set(inventory.availableColors.map(c => c.colorName));

  return product.colors.filter(color => inStockColorNames.has(color.colorName));
}
