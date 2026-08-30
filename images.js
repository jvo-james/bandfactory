
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
    sets: 'images/second-set.jpg' // Sets category: Second Skin Long Sleeve.
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
    'ribbed-cherry-milk':'images/cm.jpg', // Cherry Milk: pink and white printed Ribbed Hairband.
    'ribbed-navy-milk':'images/nm.jpg', // Navy Milk: blue and white printed Ribbed Hairband.
    'ribbed-noir-gold':'images/ng.jpg', // Noir Gold: black and gold printed Ribbed Hairband.
    'ribbed-black':'images/rblack.jpg', // PLACEHOLDER: black ribbed hairband.
    'ribbed-white':'images/rwhite.jpg', // PLACEHOLDER: white ribbed hairband.
    'ribbed-yellow':'images/ryellow.jpg', // PLACEHOLDER: yellow ribbed hairband.
    'ribbed-baby-pink':'images/rbpink.jpg', // PLACEHOLDER: baby pink ribbed hairband.
    'ribbed-hot-pink':'images/rhpink.jpg', // PLACEHOLDER: hot pink ribbed hairband.
    'ribbed-olive':'images/rolive.jpg', // Chartreuse ribbed hairband (legacy key kept so existing stock/image data still works).
    'ribbed-teal':'images/rgreen.jpg', // Green ribbed hairband (legacy key retained for existing inventory).
    'ribbed-new-teal':'images/rtea.jpg', // Teal ribbed hairband.
    'ribbed-royal-blue':'images/rb.jpg', // Royal Blue ribbed hairband: replace with the final product photo when available.
    'ribbed-orange':'images/rorange.jpg', // PLACEHOLDER: orange ribbed hairband.
    'ribbed-burgundy':'images/rburgundy.jpg', // PLACEHOLDER: burgundy ribbed hairband.
    'ribbed-mustard':'images/rmustard.jpg', // Caramel ribbed hairband (legacy key kept so existing stock/image data still works).
    'ribbed-flamingo':'images/rflamingo.jpg', // PLACEHOLDER: flamingo ribbed hairband.
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
