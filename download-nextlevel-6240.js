const fs = require('fs');
const https = require('https');
const path = require('path');

const BASE_URL = 'https://www.ssactivewear.com/';
const PRODUCT_DIR = 'E:/Jason Desktop/Iconik Software/Web apps/Iconik-Shirts/images/tshirts/nextlevel-6240/product';
const SWATCH_DIR = 'E:/Jason Desktop/Iconik Software/Web apps/Iconik-Shirts/images/tshirts/nextlevel-6240/swatches';

// Read the raw data
const data = JSON.parse(fs.readFileSync('E:/Jason Desktop/Iconik Software/Web apps/Iconik-Shirts/nextlevel-6240-raw.json', 'utf8'));

console.log('Style:', data[0]?.styleName, '-', data[0]?.brandName);

// Extract unique colors
const colorMap = new Map();
data.forEach(item => {
  if (!colorMap.has(item.colorName)) {
    colorMap.set(item.colorName, {
      colorName: item.colorName,
      colorCode: item.colorCode,
      colorSwatchImage: item.colorSwatchImage,
      colorFrontImage: item.colorFrontImage,
      colorBackImage: item.colorBackImage,
      color1: item.color1
    });
  }
});

const colors = Array.from(colorMap.values());
console.log('Total unique colors:', colors.length);

// Create directories
fs.mkdirSync(PRODUCT_DIR, { recursive: true });
fs.mkdirSync(SWATCH_DIR, { recursive: true });

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve(null);
      return;
    }

    const fullUrl = BASE_URL + url;
    const file = fs.createWriteStream(filepath);

    https.get(fullUrl, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(filepath);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(filepath);
        https.get(response.headers.location, (res2) => {
          const file2 = fs.createWriteStream(filepath);
          res2.pipe(file2);
          file2.on('finish', () => {
            file2.close();
            resolve(filepath);
          });
        }).on('error', reject);
      } else {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`Failed to download ${fullUrl}: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(filepath);
      reject(err);
    });
  });
}

async function downloadAll() {
  const results = [];

  for (const color of colors) {
    const safeName = sanitizeFilename(color.colorName);
    console.log(`Downloading images for: ${color.colorName}`);

    const colorData = {
      colorName: color.colorName,
      colorCode: color.colorCode,
      hexColor: color.color1,
      productImage: null,
      swatchImage: null
    };

    // Download product front image
    if (color.colorFrontImage) {
      try {
        const ext = path.extname(color.colorFrontImage) || '.jpg';
        const productPath = path.join(PRODUCT_DIR, `${safeName}${ext}`);
        await downloadImage(color.colorFrontImage, productPath);
        colorData.productImage = `product/${safeName}${ext}`;
        console.log(`  - Product image: OK`);
      } catch (err) {
        console.log(`  - Product image: FAILED - ${err.message}`);
      }
    } else {
      console.log(`  - Product image: NO IMAGE AVAILABLE`);
    }

    // Download swatch image
    if (color.colorSwatchImage) {
      try {
        const ext = path.extname(color.colorSwatchImage) || '.jpg';
        const swatchPath = path.join(SWATCH_DIR, `${safeName}${ext}`);
        await downloadImage(color.colorSwatchImage, swatchPath);
        colorData.swatchImage = `swatches/${safeName}${ext}`;
        console.log(`  - Swatch image: OK`);
      } catch (err) {
        console.log(`  - Swatch image: FAILED - ${err.message}`);
      }
    }

    results.push(colorData);
  }

  // Save the organized color data
  const outputPath = 'E:/Jason Desktop/Iconik Software/Web apps/Iconik-Shirts/data/nextlevel-6240.json';
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    styleId: "nextlevel-6240",
    styleName: "Next Level 6240",
    brandName: "Next Level",
    productType: "tshirt",
    title: "CVC V-Neck T-Shirt",
    colors: results
  }, null, 2));

  console.log(`\nDone! Downloaded images for ${results.length} colors.`);
  console.log(`Product data saved to: ${outputPath}`);
}

downloadAll().catch(console.error);
