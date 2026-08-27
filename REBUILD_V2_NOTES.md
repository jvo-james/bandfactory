# Band Factory rebuild v2

This pass restores the original visual language while keeping the expanded catalogue.

## Key structure
- `index.html`: restored full homepage with a 3-slide background-image hero, category discovery, editorial sections, reviews, services and the full footer.
- `smooth.html`: restored the original Smooth Hairband product-grid behaviour with Flat/Twisted switching, family filters and quick add.
- `ribbed.html`, `tops.html`, `sets.html`: dedicated collection pages with individual background-image heroes and large category switch buttons.
- `item.html`: full product-detail layout for Ribbed, Tops and Sets products.
- `images.js`: central replacement directory for homepage, category and catalogue images.

## Size guides
Garment size guides now open in a modal table. Width and length values can be entered from Admin for catalogue products. The existing Spandex Tube Top also has admin-managed measurement fields.

## Wholesale
- Smooth keeps its existing Standard and Custom Colour builder.
- Ribbed has one style only.
- Ribbed wholesale colour allocation uses the 11 solid colours.
- Ribbed Standard defaults to the Smooth Custom price tier.
- Ribbed Custom has a separate higher price tier and is guarded to remain above Ribbed Standard.
- All Smooth and Ribbed wholesale price tiers can be changed in Admin.

## Admin
Inventory & Products is divided into four tabs: Smooth Hairbands, Ribbed Hairbands, Tops and Sets. Catalogue cards include product images. Ribbed, Tops and Sets support adding new catalogue products. Sized products support adding sizes plus width and length size-guide measurements.
