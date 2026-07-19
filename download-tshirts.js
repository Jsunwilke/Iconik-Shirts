const fs = require('fs');
const https = require('https');
const path = require('path');

const BASE_URL = 'https://www.ssactivewear.com/';
const ROOT = __dirname;

const STYLES = [
  {
    styleId: 'comfortcolors-1717',
    styleName: 'Comfort Colors 1717',
    brandName: 'Comfort Colors',
    styleCode: 'Comfort Colors 1717',
    productType: 'tshirt',
    title: 'Garment-Dyed Heavyweight T-Shirt',
    raw: 'comfortcolors-1717-raw.json'
  },
  {
    styleId: 'bellacanvas-3001cvc',
    styleName: 'Bella + Canvas 3001CVC',
    brandName: 'BELLA + CANVAS',
    styleCode: 'Bella + Canvas 3001CVC',
    productType: 'tshirt',
    title: 'Unisex Soft Blend T-Shirt',
    raw: 'bellacanvas-3001cvc-raw.json'
  }
];

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    if (!url) return resolve(null);

    const get = (target, redirectsLeft) => {
      https.get(target, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          response.resume();
          if (redirectsLeft === 0) return reject(new Error('Too many redirects'));
          return get(response.headers.location, redirectsLeft - 1);
        }
        if (response.statusCode !== 200) {
          response.resume();
          return reject(new Error(`HTTP ${response.statusCode} for ${target}`));
        }
        const file = fs.createWriteStream(filepath);
        response.pipe(file);
        file.on('finish', () => file.close(() => resolve(filepath)));
        file.on('error', (err) => {
          fs.unlink(filepath, () => reject(err));
        });
      }).on('error', reject);
    };

    get(BASE_URL + url, 3);
  });
}

async function processStyle(style) {
  const productDir = path.join(ROOT, 'images', 'tshirts', style.styleId, 'product');
  const swatchDir = path.join(ROOT, 'images', 'tshirts', style.styleId, 'swatches');
  fs.mkdirSync(productDir, { recursive: true });
  fs.mkdirSync(swatchDir, { recursive: true });

  const data = JSON.parse(fs.readFileSync(path.join(ROOT, style.raw), 'utf8'));

  // One entry per color, keeping the first SKU that carries image data
  const colorMap = new Map();
  data.forEach(item => {
    if (!colorMap.has(item.colorName)) {
      colorMap.set(item.colorName, {
        colorName: item.colorName,
        colorCode: item.colorCode,
        colorSwatchImage: item.colorSwatchImage,
        colorFrontImage: item.colorFrontImage,
        hexColor: item.color1
      });
    }
  });

  const colors = Array.from(colorMap.values())
    .sort((a, b) => a.colorName.localeCompare(b.colorName));

  console.log(`\n=== ${style.styleName} (${colors.length} colors) ===`);
  const results = [];
  let failures = 0;

  for (const color of colors) {
    const safeName = sanitizeFilename(color.colorName);
    const colorData = {
      colorName: color.colorName,
      colorCode: color.colorCode,
      hexColor: color.hexColor,
      productImage: null,
      swatchImage: null
    };

    if (color.colorFrontImage) {
      try {
        const ext = path.extname(color.colorFrontImage) || '.jpg';
        await downloadImage(color.colorFrontImage, path.join(productDir, `${safeName}${ext}`));
        colorData.productImage = `product/${safeName}${ext}`;
      } catch (err) {
        failures++;
        console.log(`  ${color.colorName}: product image FAILED - ${err.message}`);
      }
    }

    if (color.colorSwatchImage) {
      try {
        const ext = path.extname(color.colorSwatchImage) || '.jpg';
        await downloadImage(color.colorSwatchImage, path.join(swatchDir, `${safeName}${ext}`));
        colorData.swatchImage = `swatches/${safeName}${ext}`;
      } catch (err) {
        failures++;
        console.log(`  ${color.colorName}: swatch image FAILED - ${err.message}`);
      }
    }

    results.push(colorData);
  }

  const product = {
    styleId: style.styleId,
    styleName: style.styleName,
    brandName: style.brandName,
    styleCode: style.styleCode,
    productType: style.productType,
    title: style.title,
    colors: results
  };

  // Write to both the source data dir and the app's public dir
  for (const dir of [path.join(ROOT, 'data'), path.join(ROOT, 'app', 'public', 'data')]) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${style.styleId}.json`), JSON.stringify(product, null, 2));
  }

  console.log(`  ${results.length} colors written, ${failures} image failure(s)`);
  return { style, results, failures };
}

async function main() {
  for (const style of STYLES) {
    await processStyle(style);
  }
  console.log('\nDone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
