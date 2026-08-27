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
    hero: 'images/placeholder-fashion.svg', // PLACEHOLDER: replace with a lifestyle image showing the wider Band Factory range.
    smooth: 'images/flat.jpg', // Existing smooth hairband category image.
    ribbed: 'images/IMG_3249.jpeg', // Existing ribbed hairband category image; replace if you want a stronger category shot.
    hairbands: 'images/IMG_3249.jpeg', // Existing hairband image.
    tops: 'images/placeholder-top.svg', // PLACEHOLDER: replace with a strong tops/category image.
    sets: 'images/placeholder-set.svg' // PLACEHOLDER: replace with a strong sets/category image.
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
    'ribbed-cherry-milk':'images/placeholder-ribbed-print.svg', // PLACEHOLDER: Cherry Milk (pink & white cheetah-style print).
    'ribbed-navy-milk':'images/placeholder-ribbed-print.svg', // PLACEHOLDER: Navy Milk (blue & white cheetah-style print).
    'ribbed-noir-gold':'images/placeholder-ribbed-print.svg', // PLACEHOLDER: Noir Gold (black & gold cheetah-style print).
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
    'spandex-tube-top':'images/new.jpeg', // Existing top already in the repo — maintained.
    'second-skin-tee':'images/placeholder-top.svg', // PLACEHOLDER: dark brown Second Skin Tee.
    'essential-vest-top':'images/placeholder-top.svg', // PLACEHOLDER: Essential Vest Top 3-piece pack (black/coral/white).
    'second-skin-long-sleeve':'images/placeholder-set.svg', // PLACEHOLDER: 3-piece long-sleeve set (white/blue black/nude).
    'second-set':'images/placeholder-set.svg' // PLACEHOLDER: white Second Set.
  }
};
window.BF_IMAGE = function(key, fallback='images/placeholder-product.svg'){
  return window.BF_IMAGES?.catalog?.[key] || fallback;
};
