# Band Factory catalog rebuild

## New storefront structure
Shop → Hairbands → Smooth / Ribbed; Shop → Basics → Tops / Sets. Wholesale remains available from the main navigation and the wholesale builder now supports Smooth or Ribbed.

## Ribbed Hairbands
Signature prints are listed first: Cherry Milk (Pink & White), Navy Milk (Blue & White), Noir Gold (Black & Gold). The print SVGs are intentional placeholders for real product photography.
Solid colours: Black, White, Yellow, Baby Pink, Hot Pink, Olive, Teal, Orange, Burgundy, Mustard, Flamingo.
Ribbed wholesale uses the Smooth Custom Colour wholesale price tiers.

## Basics defaults
- Second Skin Tee — Dark Brown — S/M/L/XL/2XL — 2 each — GHS 70.
- Essential Vest Top — 3-piece set (Black/Coral/White) — S/M/L/XL — 3 each — GHS 150.
- Second Skin Long Sleeve — 3-piece set (White/Blue Black/Nude) — S/M/L/XL — 2 each — GHS 200.
- Second Set — White — GHS 160.

## Admin
Inventory & Products now includes a Catalog editor for Ribbed and Basics. The admin can edit names, descriptions, prices, availability, stock, colours, and sizes, and can add/remove sizes.

## Stock behavior
Exact size stock is not printed on the storefront. Out-of-stock sizes are disabled; if a shopper increases a cart quantity beyond inventory, the site reports the available limit. Netlify checkout reservations also manage the new catalog stock.

## Recommended launch step
Replace the three generated Ribbed print placeholders with real product photography using the same filenames in /images, or update their image paths in catalog.js / Firestore products/catalog.
