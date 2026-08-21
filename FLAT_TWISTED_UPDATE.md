# Flat + Twisted product update

The storefront now models a hairband as **material + style + colour**.

- Material: Smooth / Ribbed
- Style: Flat / Twisted
- Colour: existing Band Factory colour palette

## Current availability
Smooth Flat and Smooth Twisted are customer-selectable. Ribbed Flat and Ribbed Twisted remain presented as out of stock until enabled.

## Image placeholders
Twisted and Ribbed use explicit SVG placeholders so Flat photography is never misrepresented as another style. See `IMAGE_REPLACEMENT_GUIDE.txt`.

## Backward compatibility
Legacy Firestore colour stock under `products/smooth.colors` is still read for both Smooth styles. New settings add separate Smooth Flat/Twisted availability and Twisted retail price while preserving older defaults. Existing cart items without a style are treated as Flat.
