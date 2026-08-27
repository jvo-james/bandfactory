# Band Factory catalog rebuild

## What changed
- Shop is organized into Smooth, Ribbed, Tops and Sets.
- Shop dropdown is generated in `script.js` for desktop and hamburger menus.
- All new/replaceable photography paths live in `images.js`.
- Placeholder SVGs are intentionally included for products without confirmed photos.
- Ribbed collection starts with Cherry Milk, Navy Milk and Noir Gold, then the requested solid colours.
- Basics cannot be quick-added from category pages; every product opens its product page first.
- Product pages support size selection, hidden size descriptions, quantity checks and cart addition.
- Admin can edit Ribbed/Tops/Sets names, descriptions, prices, availability, stock, sizes and add new sizes.
- Existing Spandex Tube Top is maintained.
- Homepage now presents Band Factory as a multi-category brand rather than a hairband-only store.

## Image replacement
Edit only `images.js`. Every placeholder is marked with a comment.

## Important
The existing Firebase settings and live catalog data override defaults where present. New defaults are used when a catalog document has not been created yet. Saving the new admin catalog panel creates/updates `products/catalog`.
