const { isPreorder } = require('../../fulfilment');

const number = value => Number(value || 0);
const PRINT_IDS = new Set(['ribbed-cherry-milk', 'ribbed-navy-milk', 'ribbed-noir-gold']);

function cloneStyles(product = {}) {
  const styles = JSON.parse(JSON.stringify(product.styles || {}));
  for (const style of ['flat', 'twisted']) {
    styles[style] ||= { colors: {} };
    styles[style].colors ||= {};
    const legacy = product.colors || {};
    for (const [color, data] of Object.entries(legacy)) {
      if (!styles[style].colors[color]) styles[style].colors[color] = { ...data };
    }
  }
  return styles;
}

function cloneSizes(product = {}) {
  return JSON.parse(JSON.stringify(product.sizes || {}));
}

function cloneCatalog(product = {}) {
  return { items: JSON.parse(JSON.stringify(product.items || [])) };
}

function styleNeedForStandard(item, style) {
  const mult = Math.max(1, number(item.qty || 1));
  if (item.style === 'mixed') return number(item.styleAllocations?.[style] || 0) * mult;
  return item.style === style ? number(item.bundlePieces || 0) * mult : 0;
}

function orderUsesSmoothStock(order = {}) {
  return (order.items || []).some(item =>
    !isPreorder(item) &&
    (item.material || 'smooth') === 'smooth' &&
    (item.type === 'retail' || item.type === 'wholesale')
  );
}

function orderUsesRibbedStock(order = {}) {
  return (order.items || []).some(item =>
    !isPreorder(item) &&
    (
      (item.type === 'catalog' && item.category === 'ribbed') ||
      (item.type === 'wholesale' && item.material === 'ribbed') ||
      item.type === 'wholesale-product'
    )
  );
}

function orderUsesCatalogStock(order = {}) {
  return (order.items || []).some(item =>
    !isPreorder(item) && item.type === 'catalog' && item.category !== 'ribbed'
  );
}

function orderUsesApparelStock(order = {}) {
  return (order.items || []).some(item => item.type === 'apparel' && item.productId === 'spandex-tube-top');
}

function orderUsesManagedStock(order = {}) {
  return orderUsesSmoothStock(order) || orderUsesRibbedStock(order) || orderUsesCatalogStock(order) || orderUsesApparelStock(order);
}

function normalizeWholesale(product = {}) {
  const raw = product.wholesale || {};
  const tiers = (Array.isArray(raw.tiers) ? raw.tiers : [])
    .map(t => ({
      minQty: Math.max(1, Math.floor(number(t?.minQty))),
      price: Math.max(0, number(t?.price))
    }))
    .filter(t => t.minQty > 0 && t.price > 0)
    .sort((a, b) => a.minQty - b.minQty);

  return {
    enabled: raw.enabled === true,
    minQty: Math.max(1, Math.floor(number(raw.minQty || tiers[0]?.minQty || 1))),
    tiers
  };
}

function wholesalePrice(product, qty) {
  const w = normalizeWholesale(product);
  const n = Math.max(1, Math.floor(number(qty)));
  let selected = null;
  for (const tier of w.tiers) {
    if (n >= tier.minQty) selected = tier;
  }
  return selected?.price || 0;
}

function catalogVariant(product = {}, variantId = '') {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (!variants.length) return null;
  const wanted = String(variantId || '').trim().toLowerCase();
  return variants.find(v => String(v?.id || '').trim().toLowerCase() === wanted) || null;
}

function catalogInventoryTarget(product = {}, variantId = '') {
  const variant = catalogVariant(product, variantId);
  return variant ? { variant, isVariant: true } : { variant: product, isVariant: false };
}

function targetSizeData(product = {}, variantId = '', size = '') {
  const target = catalogInventoryTarget(product, variantId).variant || {};
  return { target, sizes: target.sizes && typeof target.sizes === 'object' ? target.sizes : {}, size: String(size || '') };
}

function selectedCatalogOptionAvailable(product = {}, variantId = '', size = '') {
  if (!product || product.deleted === true || product.available === false) return false;
  const { target, sizes } = targetSizeData(product, variantId, size);
  if (target.available === false) return false;
  if (Object.keys(sizes).length) return sizes[size]?.available !== false;
  return true;
}

function validateWholesaleItems(order = {}, catalogProduct = {}) {
  const catalog = Array.isArray(catalogProduct.items) ? catalogProduct.items : [];
  const errors = [];

  for (const item of order.items || []) {
    if (item.type !== 'wholesale-product') continue;

    const product = catalog.find(x => x.id === item.productId);
    if (!product || product.deleted === true || product.available === false) {
      errors.push(`${item.name || 'Wholesale product'} is no longer available.`);
      continue;
    }

    const w = normalizeWholesale(product);
    const qty = Math.max(0, Math.floor(number(item.qty)));
    const preorder = isPreorder(item) || isPreorder(product);

    if (!w.enabled || !w.tiers.length) {
      errors.push(`${product.name || item.name || 'This product'} is not currently available for wholesale.`);
      continue;
    }
    if (qty < w.minQty) {
      errors.push(`${product.name || item.name || 'This product'} has a minimum wholesale order of ${w.minQty} units.`);
      continue;
    }

    const expected = wholesalePrice(product, qty);
    if (!expected || Math.abs(number(item.price) - expected) > 0.001) {
      errors.push(`The wholesale price for ${product.name || item.name || 'this product'} has changed. Please add it to your Bag again.`);
      continue;
    }

    const variant = catalogVariant(product, item.variantId);
    if (Array.isArray(product.variants) && product.variants.length) {
      if (!variant) {
        errors.push(`${product.name || item.name || 'This product'} is no longer available in that colour.`);
        continue;
      }
      if (variant.available === false) {
        errors.push(`${product.name || item.name || 'This product'} is not available in the selected colour.`);
        continue;
      }
      const sizes = variant.sizes && typeof variant.sizes === 'object' ? variant.sizes : {};
      if (Object.keys(sizes).length) {
        const size = String(item.size || '');
        const sizeData = sizes[size];
        if (!sizeData || sizeData.available === false) {
          errors.push(`${product.name || item.name || 'This product'} is not available in the selected size.`);
          continue;
        }
        if (!preorder && number(sizeData.stock) < qty) {
          errors.push(`Only ${Math.max(0, number(sizeData.stock))} ${product.name || 'units'} are available in size ${size}.`);
        }
      } else if (!preorder && number(variant.stock) < qty) {
        errors.push(`Only ${Math.max(0, number(variant.stock))} ${product.name || 'units'} are available right now.`);
      }
      continue;
    }

    if (product.sizes && Object.keys(product.sizes).length) {
      const size = String(item.size || '');
      const data = product.sizes[size];
      if (!data || data.available === false) errors.push(`${product.name || item.name || 'This product'} is not available in the selected size.`);
      else if (!preorder && number(data.stock) < qty) errors.push(`Only ${Math.max(0, number(data.stock))} ${product.name || 'units'} are available in size ${size}.`);
    } else if (!preorder && number(product.stock) < qty) {
      errors.push(`Only ${Math.max(0, number(product.stock))} ${product.name || 'units'} are available right now.`);
    }
  }

  return errors;
}

function applyOrderToStock(order = {}, smoothProduct = {}, apparelProduct = {}, catalogProduct = {}) {
  const styles = cloneStyles(smoothProduct);
  const sizes = cloneSizes(apparelProduct);
  const catalog = cloneCatalog(catalogProduct);
  const shortages = [];
  const deducted = {
    smooth: { flat: {}, twisted: {} },
    ribbed: {},
    catalog: {},
    apparel: { sizes: {} }
  };

  const addSmooth = (style, color, qty) => {
    deducted.smooth[style][color] = (deducted.smooth[style][color] || 0) + qty;
  };

  const consume = (style, color, qty, label = '') => {
    qty = number(qty);
    if (qty <= 0 || !color) return 0;
    styles[style] ||= { colors: {} };
    styles[style].colors ||= {};
    const current = styles[style].colors[color] || {};
    const stock = current.available === false ? 0 : Math.max(0, number(current.stock));
    const used = Math.min(stock, qty);
    styles[style].colors[color] = { ...current, stock: stock - used };
    if (used) addSmooth(style, color, used);
    if (used < qty) shortages.push(`${label || color + ' ' + style}: needed ${qty}, available ${stock}`);
    return used;
  };

  const consumeStandard = (style, qty, label) => {
    let remaining = number(qty);
    if (remaining <= 0) return;
    const candidates = Object.entries(styles[style]?.colors || {})
      .filter(([, d]) => d?.available !== false && number(d?.stock) > 0)
      .sort((a, b) => number(b[1]?.stock) - number(a[1]?.stock) || a[0].localeCompare(b[0]));
    for (const [color] of candidates) {
      if (remaining <= 0) break;
      const current = styles[style].colors[color] || {};
      const stock = Math.max(0, number(current.stock));
      const used = Math.min(stock, remaining);
      styles[style].colors[color] = { ...current, stock: stock - used };
      if (used) addSmooth(style, color, used);
      remaining -= used;
    }
    if (remaining > 0) shortages.push(`${label}: ${remaining} piece${remaining === 1 ? '' : 's'} could not be allocated from current stock`);
  };

  const variant = (item, style) => {
    item.styles ||= {};
    const legacy = { stock: number(item.stock), available: item.available !== false };
    return { ...(style === 'flat' ? legacy : { stock: 0, available: false }), ...(item.styles[style] || {}) };
  };

  const consumeRibbed = (id, style, qty, label) => {
    qty = Math.max(0, number(qty));
    if (!id || qty <= 0) return;
    style = style === 'twisted' ? 'twisted' : 'flat';
    const item = catalog.items.find(x => x.id === id);
    if (!item) {
      shortages.push(`${label || 'Ribbed hairband'}: inventory item not found`);
      return;
    }
    const current = variant(item, style);
    const stock = current.available === false ? 0 : Math.max(0, number(current.stock));
    const used = Math.min(stock, qty);
    item.styles[style] = { ...current, stock: stock - used };
    if (style === 'flat') {
      item.stock = item.styles.flat.stock;
      item.available = item.styles.flat.available !== false;
    }
    if (used) {
      deducted.ribbed[id] ||= { flat: 0, twisted: 0 };
      deducted.ribbed[id][style] += used;
    }
    if (used < qty) shortages.push(`${label || item.name}: needed ${qty}, available ${stock}`);
  };

  const consumeRibbedStandard = (style, qty, label) => {
    let remaining = Math.max(0, number(qty));
    const candidates = catalog.items
      .filter(x => x.category === 'ribbed' && !PRINT_IDS.has(x.id))
      .map(item => ({ item, v: variant(item, style) }))
      .filter(x => x.v.available !== false && number(x.v.stock) > 0)
      .sort((a, b) => number(b.v.stock) - number(a.v.stock) || String(a.item.name).localeCompare(String(b.item.name)));
    for (const { item } of candidates) {
      if (remaining <= 0) break;
      const current = variant(item, style);
      const used = Math.min(number(current.stock), remaining);
      consumeRibbed(item.id, style, used, `${item.name} ${style}`);
      remaining -= used;
    }
    if (remaining > 0) shortages.push(`${label}: ${remaining} ribbed piece${remaining === 1 ? '' : 's'} could not be allocated from current stock`);
  };

  const consumeCatalog = (id, size, qty, label, variantId = '') => {
    qty = Math.max(0, number(qty));
    const item = catalog.items.find(x => x.id === id);
    if (!item) {
      shortages.push(`${label || 'Product'}: inventory item not found`);
      return;
    }

    const { target, sizes: targetSizes } = targetSizeData(item, variantId, size);
    let stock = 0;
    let used = 0;

    if (Object.keys(targetSizes).length) {
      const current = targetSizes[size] || {};
      stock = current.available === false ? 0 : Math.max(0, number(current.stock));
      used = Math.min(stock, qty);
      target.sizes[size] = { ...current, stock: stock - used };
    } else {
      stock = target.available === false ? 0 : Math.max(0, number(target.stock));
      used = Math.min(stock, qty);
      target.stock = stock - used;
    }

    if (used) {
      deducted.catalog[id] ||= { sizes: {}, stock: 0, variants: {} };
      if (Array.isArray(item.variants) && variantId) {
        deducted.catalog[id].variants[variantId] ||= { sizes: {}, stock: 0 };
        if (Object.keys(targetSizes).length) deducted.catalog[id].variants[variantId].sizes[size] = (deducted.catalog[id].variants[variantId].sizes[size] || 0) + used;
        else deducted.catalog[id].variants[variantId].stock += used;
      } else if (Object.keys(targetSizes).length) {
        deducted.catalog[id].sizes[size] = (deducted.catalog[id].sizes[size] || 0) + used;
      } else {
        deducted.catalog[id].stock += used;
      }
    }

    if (used < qty) shortages.push(`${label || item.name}: needed ${qty}, available ${stock}`);
  };

  const consumeApparel = (size, qty) => {
    size = String(size || '').toUpperCase();
    qty = Math.max(0, number(qty));
    if (!size || qty <= 0) return;
    const current = sizes[size] || {};
    const stock = current.available === false ? 0 : Math.max(0, number(current.stock));
    const used = Math.min(stock, qty);
    sizes[size] = { ...current, stock: stock - used };
    if (used) deducted.apparel.sizes[size] = (deducted.apparel.sizes[size] || 0) + used;
    if (used < qty) shortages.push(`Spandex Tube Top size ${size}: needed ${qty}, available ${stock}`);
  };

  for (const item of order.items || []) {
    if (isPreorder(item)) continue;

    if (item.type === 'catalog') {
      if (item.category === 'ribbed') consumeRibbed(item.productId, item.style, number(item.qty), `${item.color || item.name || 'Ribbed'} ${item.style || 'flat'}`);
      else consumeCatalog(item.productId, item.size, number(item.qty), item.name, item.variantId || '');
      continue;
    }

    if (item.type === 'apparel' && item.productId === 'spandex-tube-top') {
      consumeApparel(item.size, number(item.qty));
      continue;
    }

    if (item.type === 'wholesale' && item.material === 'ribbed') {
      const mult = Math.max(1, number(item.qty || 1));
      if (item.wholesaleProductId) {
        consumeRibbed(item.wholesaleProductId, 'flat', number(item.bundlePieces) * mult, item.wholesaleProductName || item.name);
        continue;
      }
      if (item.wholesaleMode === 'custom' && item.allocations) {
        if (item.style === 'mixed') {
          for (const style of ['flat', 'twisted']) {
            for (const [color, qty] of Object.entries(item.allocations?.[style] || {})) {
              const product = catalog.items.find(x => x.category === 'ribbed' && !PRINT_IDS.has(x.id) && String(x.color || '').toLowerCase() === String(color).toLowerCase());
              if (product) consumeRibbed(product.id, style, number(qty) * mult, `${color} ${style}`);
              else shortages.push(`${color} ${style}: inventory item not found`);
            }
          }
        } else {
          const style = item.style === 'twisted' ? 'twisted' : 'flat';
          for (const [color, qty] of Object.entries(item.allocations || {})) {
            const product = catalog.items.find(x => x.category === 'ribbed' && !PRINT_IDS.has(x.id) && String(x.color || '').toLowerCase() === String(color).toLowerCase());
            if (product) consumeRibbed(product.id, style, number(qty) * mult, `${color} ${style}`);
            else shortages.push(`${color} ${style}: inventory item not found`);
          }
        }
      } else {
        for (const style of ['flat', 'twisted']) {
          const need = styleNeedForStandard(item, style);
          if (need > 0) consumeRibbedStandard(style, need, `${item.name || 'Ribbed wholesale'} (${style})`);
        }
      }
      continue;
    }

    if (item.type === 'wholesale-product') {
      consumeCatalog(item.productId, item.size, number(item.qty), item.name || 'Wholesale product', item.variantId || '');
      continue;
    }

    if ((item.material || 'smooth') !== 'smooth') continue;

    if (item.type === 'retail') consume(item.style === 'twisted' ? 'twisted' : 'flat', item.color, number(item.qty), `${item.color} ${item.style || 'flat'}`);

    if (item.type === 'wholesale') {
      const mult = Math.max(1, number(item.qty || 1));
      if (item.wholesaleMode === 'custom' && item.allocations) {
        if (item.style === 'mixed') {
          for (const style of ['flat', 'twisted']) {
            for (const [color, qty] of Object.entries(item.allocations?.[style] || {})) consume(style, color, number(qty) * mult, `${color} ${style}`);
          }
        } else {
          const style = item.style === 'twisted' ? 'twisted' : 'flat';
          for (const [color, qty] of Object.entries(item.allocations || {})) consume(style, color, number(qty) * mult, `${color} ${style}`);
        }
      } else {
        for (const style of ['flat', 'twisted']) {
          const need = styleNeedForStandard(item, style);
          if (need > 0) consumeStandard(style, need, `${item.name || 'Standard wholesale'} (${style})`);
        }
      }
    }
  }

  return { styles, sizes, catalog, shortages, deducted };
}

function restoreDeductions(smoothProduct = {}, apparelProduct = {}, catalogProduct = {}, deducted = {}) {
  const styles = cloneStyles(smoothProduct);
  const sizes = cloneSizes(apparelProduct);
  const catalog = cloneCatalog(catalogProduct);
  const smooth = deducted.smooth || deducted;

  for (const style of ['flat', 'twisted']) {
    for (const [color, qty] of Object.entries(smooth?.[style] || {})) {
      styles[style] ||= { colors: {} };
      styles[style].colors ||= {};
      const current = styles[style].colors[color] || {};
      styles[style].colors[color] = { ...current, stock: Math.max(0, number(current.stock)) + Math.max(0, number(qty)) };
    }
  }

  for (const [id, byStyle] of Object.entries(deducted.ribbed || {})) {
    const item = catalog.items.find(x => x.id === id);
    if (!item) continue;
    item.styles ||= {};
    for (const style of ['flat', 'twisted']) {
      const qty = Math.max(0, number(byStyle?.[style]));
      if (!qty) continue;
      const current = item.styles[style] || (style === 'flat' ? { stock: number(item.stock), available: item.available !== false } : { stock: 0, available: false });
      item.styles[style] = { ...current, stock: Math.max(0, number(current.stock)) + qty };
    }
    if (item.styles.flat) {
      item.stock = item.styles.flat.stock;
      item.available = item.styles.flat.available !== false;
    }
  }

  for (const [id, data] of Object.entries(deducted.catalog || {})) {
    const item = catalog.items.find(x => x.id === id);
    if (!item) continue;

    if (data.stock) item.stock = Math.max(0, number(item.stock)) + number(data.stock);

    for (const [size, qty] of Object.entries(data.sizes || {})) {
      item.sizes ||= {};
      const current = item.sizes[size] || {};
      item.sizes[size] = { ...current, stock: Math.max(0, number(current.stock)) + number(qty) };
    }

    for (const [variantId, variantData] of Object.entries(data.variants || {})) {
      const target = catalogVariant(item, variantId);
      if (!target) continue;
      if (variantData.stock) target.stock = Math.max(0, number(target.stock)) + number(variantData.stock);
      target.sizes ||= {};
      for (const [size, qty] of Object.entries(variantData.sizes || {})) {
        const current = target.sizes[size] || {};
        target.sizes[size] = { ...current, stock: Math.max(0, number(current.stock)) + number(qty) };
      }
    }
  }

  for (const [size, qty] of Object.entries(deducted.apparel?.sizes || {})) {
    const current = sizes[size] || {};
    sizes[size] = { ...current, stock: Math.max(0, number(current.stock)) + Math.max(0, number(qty)) };
  }

  return { styles, sizes, catalog };
}

module.exports = {
  number,
  applyOrderToStock,
  restoreDeductions,
  orderUsesManagedStock,
  orderUsesSmoothStock,
  orderUsesRibbedStock,
  orderUsesCatalogStock,
  orderUsesApparelStock,
  validateWholesaleItems,
  selectedCatalogOptionAvailable
};
