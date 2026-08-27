/*
 * BAND FACTORY IMAGE DIRECTORY
 * ------------------------------------------------------------------
 * Replace image paths here when the final photography is ready.
 * Product/category pages read from this file so you do not need to
 * hunt through the HTML/JavaScript to swap photos.
 *
 * PLACEHOLDER means a real image was not present in the repo (or the
 * current image was too hairband-specific for the expanded brand).
 */
window.BF_IMAGES = {
  brand: {
    monogram: 'images/brand-monogram.jpg', // Existing brand monogram.
    logoPink: 'images/brand-logo-pink.jpg' // Existing social/share image.
  },
  home: {
    hero: 'images/hero.webp', // Existing hero image.
    hero1: 'images/hero.webp', // HOMEPAGE SLIDE 1: replace with your main campaign image.
    hero2: 'images/IMG_3249.jpeg', // HOMEPAGE SLIDE 2: replace with a Ribbed campaign image if preferred.
    hero3: 'images/second-set.jpg', // Homepage slide 3: Second Set.
    smooth: 'images/flat.jpg', // Existing smooth hairband category image.
    ribbed: 'images/IMG_3249.jpeg', // Existing ribbed hairband category image; replace if you want a stronger category shot.
    hairbands: 'images/IMG_3249.jpeg', // Existing hairband image.
    tops: 'images/second-skin-tee.jpg', // Tops category: Second Skin Tee.
    sets: 'images/second-skin-long-sleeve.jpg' // Sets category: Second Skin Long Sleeve.
  },
  smoothFlat: {
    'Pink':'images/fpinkk.jpg','Black':'images/black.jpg','White':'images/white.jpg','Gray':'images/gray.jpg','Ash':'images/ash.jpg','Red':'images/red.jpg',
    'Blue Black':'images/blue-black.jpg','Ocean Blue':'images/ob.png','Baby Blue':'images/baby-blue.jpg','Royal Blue':'images/royal-blue.jpg','Nude':'images/nude.jpg',
    'Light Brown':'images/light-brown.jpg','Mint':'images/mint.jpg','Mustard':'images/mustard.jpg','Dark Brown':'images/dark-brown.jpg','Chocolate Brown':'images/chocolate-brown.jpg',
    'Army Green':'images/army-green.jpg','Peach':'images/new-peach.jpg','Burgundy':'images/new-b.jpg','Teal Blue':'images/new-tblue.jpg'
  },
  smoothTwisted: {
    'Pink':'images/pinkk.jpg','Black':'images/twisted-black.jpg','White':'images/twist-white.jpg','Gray':'images/twisted-gray.jpg','Ash':'images/twisted-ash.jpg','Red':'images/tred.jpg',
    'Blue Black':'images/twisted-blueblack.jpg','Ocean Blue':'images/tob.png','Baby Blue':'images/twisted-babyblue.jpg','Royal Blue':'images/twisted-royalblue.jpg','Nude':'images/twisted-nude.jpg',
    'Light Brown':'images/twisted-lightbrown.jpg','Mint':'images/twisted-mint.jpg','Mustard':'images/twisted-mustard.jpg','Dark Brown':'images/twisted-darkbrown.jpg','Chocolate Brown':'images/twisted-chocolatebrown.jpg',
    'Army Green':'images/twisted-armygreen.jpg','Peach':'images/new-peach-twisted.jpg','Burgundy':'images/new-b-t.jpg','Teal Blue':'images/new-tblue-t.jpg'
  },
  catalog: {
    'ribbed-cherry-milk':'images/cherry-milk.jpg', // Cherry Milk: pink and white printed Ribbed Hairband.
    'ribbed-navy-milk':'images/navy-milk.jpg', // Navy Milk: blue and white printed Ribbed Hairband.
    'ribbed-noir-gold':'images/noir-gold.jpg', // Noir Gold: black and gold printed Ribbed Hairband.
    'ribbed-black':'images/ribbed-placeholder.svg', // PLACEHOLDER: black ribbed hairband.
    'ribbed-white':'images/ribbed-placeholder.svg', // PLACEHOLDER: white ribbed hairband.
    'ribbed-yellow':'images/ribbed-placeholder.svg', // PLACEHOLDER: yellow ribbed hairband.
    'ribbed-baby-pink':'images/ribbed-placeholder.svg', // PLACEHOLDER: baby pink ribbed hairband.
    'ribbed-hot-pink':'images/ribbed-placeholder.svg', // PLACEHOLDER: hot pink ribbed hairband.
    'ribbed-olive':'images/ribbed-placeholder.svg', // PLACEHOLDER: olive ribbed hairband.
    'ribbed-teal':'images/ribbed-placeholder.svg', // PLACEHOLDER: teal ribbed hairband.
    'ribbed-orange':'images/ribbed-placeholder.svg', // PLACEHOLDER: orange ribbed hairband.
    'ribbed-burgundy':'images/ribbed-placeholder.svg', // PLACEHOLDER: burgundy ribbed hairband.
    'ribbed-mustard':'images/ribbed-placeholder.svg', // PLACEHOLDER: mustard ribbed hairband.
    'ribbed-flamingo':'images/ribbed-placeholder.svg', // PLACEHOLDER: flamingo ribbed hairband.
    'spandex-tube-top':'images/new.jpeg', // Existing top already in the repo - maintained.
    'second-skin-tee':'images/second-skin-tee.jpg', // Second Skin Tee: dark brown.
    'essential-vest-top':'images/essential-vest-top.jpg', // Essential Vest Top: black, coral and white 3-piece set.
    'second-skin-long-sleeve':'images/second-skin-long-sleeve.jpg', // Second Skin Long Sleeve: white, blue black and nude 3-piece set.
    'second-set':'images/second-set.jpg' // Second Set: white.
  }
};
window.BF_IMAGE = function(key, fallback='images/placeholder-product.svg'){
  return window.BF_IMAGES?.catalog?.[key] || fallback;
};
