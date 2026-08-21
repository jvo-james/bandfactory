/* ==========================================================
   BAND FACTORY WHOLESALE BUILDER
   Mobile-first Flat / Twisted / Mixed wholesale ordering.
========================================================== */

/* ----------------------------------------------------------
   WHOLESALE PRICES — EDIT THESE VALUES WHEN YOUR PRICES CHANGE.
   Admin/Firestore prices still override these defaults when set.
---------------------------------------------------------- */
const DEFAULT_STANDARD = [
  { pieces: 10, price: 70 },   // STANDARD: 10 pieces = GH₵70
  { pieces: 30, price: 150 },  // STANDARD: 30 pieces
  { pieces: 50, price: 250 },  // STANDARD: 50 pieces
  { pieces: 100, price: 480 }, // STANDARD: 100 pieces
  { pieces: 200, price: 900 }  // STANDARD: 200 pieces
];

const DEFAULT_CUSTOM = [
  { pieces: 10, price: 100 },   // CUSTOM: 10 pieces = GH₵100
  { pieces: 30, price: 210 },   // CUSTOM: 30 pieces
  { pieces: 50, price: 350 },   // CUSTOM: 50 pieces
  { pieces: 100, price: 700 },  // CUSTOM: 100 pieces
  { pieces: 200, price: 1400 }  // CUSTOM: 200 pieces
];

/* ----------------------------------------------------------
   CUSTOM COLOUR LIMITS — EASY TO CHANGE LATER.

   maxPerColour = maximum pieces allowed for ONE colour.
   minColours   = minimum different colours required for a
                  single-style Custom order of that bundle size.
   maxColours   = maximum different colours a customer may select.

   Mixed orders calculate the minimum needed separately for the
   Flat and Twisted share, so even small splits remain possible.
---------------------------------------------------------- */
const CUSTOM_COLOUR_RULES = {
  10:  { maxPerColour: 2,  minColours: 5,  maxColours: 10 }, // EDIT 10-PIECE LIMITS HERE
  30:  { maxPerColour: 2,  minColours: 15,  maxColours: 20 }, // EDIT 30-PIECE LIMITS HERE
  50:  { maxPerColour: 3,  minColours: 17,  maxColours: 20 }, // EDIT 50-PIECE LIMITS HERE
  100: { maxPerColour: 7,  minColours: 15, maxColours: 20 }, // EDIT 100-PIECE LIMITS HERE
  200: { maxPerColour: 12, minColours: 17, maxColours: 20 }  // EDIT 200-PIECE LIMITS HERE (MAX 12 EACH)
};

/* ----------------------------------------------------------
   WHOLESALE-ONLY EXTRA COLOURS.
   Teal Blue is intentionally added here so you can use it in
   wholesale without forcing it into the retail shop catalogue.
---------------------------------------------------------- */
const WHOLESALE_EXTRA_COLOURS = [
  ['Teal Blue', '#017F7C'] // EDIT / REMOVE THIS COLOUR HERE
];

let standardBundles = [...DEFAULT_STANDARD];
let customBundles = [...DEFAULT_CUSTOM];
let productData = { colors: {} };
let wholesaleStyle = 'flat';
let orderType = 'standard';
let bundleIndex = 0;
let pendingStyle = null;
let activeColourStyle = 'flat';
let styleSplit = { flat: 5, twisted: 5 };
let selectedColors = { flat: [], twisted: [] };
let allocations = { flat: {}, twisted: {} };

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = n => `GH₵${Number(n || 0).toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;
const titleCase = value => String(value || '').replace(/^./, c => c.toUpperCase());
const styleLabel = style => style === 'mixed' ? 'Mixed' : style === 'twisted' ? 'Twisted' : 'Flat';
const modeLabel = () => orderType === 'custom' ? 'Custom Colour Mix' : 'Standard Mix';
const currentBundles = () => orderType === 'custom' ? customBundles : standardBundles;
const currentBundle = () => currentBundles()[bundleIndex] || currentBundles()[0];
const currentRule = () => CUSTOM_COLOUR_RULES[currentBundle().pieces] || { maxPerColour: currentBundle().pieces, minColours: 1, maxColours: 99 };
const styleImage = style => style === 'twisted' ? 'images/twisted.jpeg' : style === 'mixed' ? 'images/wholesale-bundle.webp' : 'images/flat.jpg';
const editStyle = () => wholesaleStyle === 'mixed' ? activeColourStyle : wholesaleStyle;
const activeStyles = () => wholesaleStyle === 'mixed' ? ['flat', 'twisted'] : [wholesaleStyle];
const styleTarget = style => wholesaleStyle === 'mixed' ? Number(styleSplit[style] || 0) : currentBundle().pieces;
const allocationTotal = style => Object.values(allocations[style] || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
const positiveColourCount = style => Object.values(allocations[style] || {}).filter(n => Number(n) > 0).length;
const allProgress = () => activeStyles().some(style => selectedColors[style].length || allocationTotal(style));

function allWholesaleColours() {
  const map = new Map([...(BF.colors || []), ...WHOLESALE_EXTRA_COLOURS]);
  return [...map.entries()];
}

function availableColors(style = editStyle()) {
  return allWholesaleColours().filter(([name]) => {
    const styleData = productData.styles?.[style]?.colors?.[name];
    const fallbackData = productData.colors?.[name];
    const data = styleData || fallbackData || {};
    return data.available !== false && Number(data.stock ?? 1) > 0;
  });
}

function resetColourState() {
  selectedColors = { flat: [], twisted: [] };
  allocations = { flat: {}, twisted: {} };
}

function resetStyleSplit() {
  const target = currentBundle().pieces;
  const flat = Math.ceil(target / 2);
  styleSplit = { flat, twisted: target - flat };
}

function requiredColours(style) {
  const target = styleTarget(style);
  if (!target) return 0;
  const rule = currentRule();
  if (wholesaleStyle === 'mixed') return Math.ceil(target / rule.maxPerColour);
  return Math.min(rule.minColours, target);
}

function validationForStyle(style) {
  const target = styleTarget(style);
  if (!target) return { ready: true, target: 0, total: 0, remaining: 0, required: 0, positive: 0 };
  const rule = currentRule();
  const total = allocationTotal(style);
  const positive = positiveColourCount(style);
  const required = requiredColours(style);
  const remaining = Math.max(0, target - total);
  const ready = total === target && positive >= required && selectedColors[style].length <= rule.maxColours;
  return { ready, target, total, remaining, required, positive };
}

function customReady() {
  if (orderType !== 'custom') return true;
  return activeStyles().every(style => validationForStyle(style).ready);
}

function bundleButton(bundle, index) {
  const each = bundle.pieces ? bundle.price / bundle.pieces : 0;
  const eachText = Number.isInteger(each) ? money(each) : `GH₵${each.toFixed(2)}`;
  return `<button class="bundle-choice ${index === bundleIndex ? 'active' : ''}" type="button" data-bundle="${index}" aria-pressed="${index === bundleIndex}"><strong>${bundle.pieces}</strong><span>pieces</span><b>${money(bundle.price)}</b><em>${eachText} each</em></button>`;
}

function renderBundles() {
  const bundles = currentBundles();
  if (bundleIndex > bundles.length - 1) bundleIndex = 0;
  $('#bundleChoices').innerHTML = bundles.map(bundleButton).join('');
  $$('[data-bundle]').forEach(btn => btn.onclick = () => {
    bundleIndex = Number(btn.dataset.bundle);
    resetColourState();
    resetStyleSplit();
    renderBundles();
    renderCustom();
    updateAll();
  });
}

function requestStyle(style) {
  if (style === wholesaleStyle) return;
  if (allProgress()) {
    pendingStyle = style;
    $('#confirmStyleName').textContent = styleLabel(style);
    $('#confirmStyleCopy').textContent = `Changing to ${styleLabel(style)} will reset the custom colour quantities you have started so the new style stays accurate.`;
    $('#styleConfirm').hidden = false;
    document.body.style.overflow = 'hidden';
    return;
  }
  applyStyle(style);
}

function applyStyle(style) {
  wholesaleStyle = ['flat', 'twisted', 'mixed'].includes(style) ? style : 'flat';
  activeColourStyle = wholesaleStyle === 'mixed' ? 'flat' : wholesaleStyle;
  pendingStyle = null;
  resetColourState();
  resetStyleSplit();
  $$('[data-wholesale-style]').forEach(btn => {
    const active = btn.dataset.wholesaleStyle === wholesaleStyle;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', String(active));
  });
  renderCustom();
  updateAll();
  BF.toast(`${styleLabel(wholesaleStyle)} wholesale selected`);
}

function closeStyleConfirm() {
  pendingStyle = null;
  $('#styleConfirm').hidden = true;
  document.body.style.overflow = '';
}

function setOrderType(type) {
  if (type === orderType) return;
  orderType = type;
  bundleIndex = 0;
  resetColourState();
  resetStyleSplit();
  $$('[data-order-type]').forEach(btn => {
    const active = btn.dataset.orderType === type;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', String(active));
  });
  $('#colour-stage').hidden = type !== 'custom';
  renderBundles();
  renderCustom();
  updateAll();
  $('#bundle-stage').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setActiveColourStyle(style) {
  if (wholesaleStyle !== 'mixed' || !['flat', 'twisted'].includes(style)) return;
  activeColourStyle = style;
  renderCustom();
  updateAll();
}

function renderColourTabs() {
  const tabs = $('#mixedColourTabs');
  tabs.hidden = wholesaleStyle !== 'mixed' || orderType !== 'custom';
  $$('[data-colour-style]').forEach(btn => {
    const active = btn.dataset.colourStyle === activeColourStyle;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  const flat = validationForStyle('flat');
  const twisted = validationForStyle('twisted');
  $('#flatTabProgress').textContent = `${flat.total}/${flat.target}`;
  $('#twistedTabProgress').textContent = `${twisted.total}/${twisted.target}`;
}

function renderCustom() {
  if (orderType !== 'custom') return;
  const style = editStyle();
  const colours = availableColors(style);
  const allowedNames = new Set(colours.map(([name]) => name));
  selectedColors[style] = selectedColors[style].filter(name => allowedNames.has(name));
  Object.keys(allocations[style]).forEach(name => {
    if (!selectedColors[style].includes(name)) delete allocations[style][name];
  });

  const selected = colours.filter(([name]) => selectedColors[style].includes(name));
  const unselected = colours.filter(([name]) => !selectedColors[style].includes(name));

  $('#colorPicker').innerHTML = [...selected, ...unselected].map(([name, color]) => `
    <button class="colour-pick ${selectedColors[style].includes(name) ? 'active' : ''}" type="button" data-colour="${name}" aria-pressed="${selectedColors[style].includes(name)}">
      <i style="background:${color}"></i><span>${name}</span>${selectedColors[style].includes(name) ? '<b>✓</b>' : ''}
    </button>`).join('');
  $$('[data-colour]').forEach(btn => btn.onclick = () => toggleColour(style, btn.dataset.colour));

  const rule = currentRule();
  $('#mixRows').innerHTML = selectedColors[style].map(name => {
    const color = (allWholesaleColours().find(x => x[0] === name) || [])[1] || '#ddd';
    const value = allocations[style][name] || '';
    return `<div class="mix-row">
      <div class="mix-row-main"><i class="mix-swatch" style="background:${color}"></i><strong>${name}</strong></div>
      <div class="qty-stack"><label class="qty-control"><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${value}" placeholder="0" data-qty="${name}" aria-label="Quantity for ${name}"></label><small class="qty-help">Max ${rule.maxPerColour}</small></div>
      <button type="button" class="remove-colour" data-remove="${name}">Remove</button>
    </div>`;
  }).join('');

  $('#mixEmpty').style.display = selectedColors[style].length ? 'none' : 'grid';
  $('#selectedColourCount').textContent = `${selectedColors[style].length} selected`;
  $$('[data-remove]').forEach(btn => btn.onclick = () => toggleColour(style, btn.dataset.remove));
  $$('[data-qty]').forEach(input => {
    input.oninput = () => {
      const digits = input.value.replace(/\D/g, '');
      if (input.value !== digits) input.value = digits;
      setAllocation(style, input.dataset.qty, digits);
    };
    input.onkeydown = e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(e.key)) return;
      if (!/^[0-9]$/.test(e.key)) e.preventDefault();
    };
  });

  renderColourTabs();
  updateAllocation();
}

function toggleColour(style, name) {
  const rule = currentRule();
  if (selectedColors[style].includes(name)) {
    selectedColors[style] = selectedColors[style].filter(c => c !== name);
    delete allocations[style][name];
  } else {
    if (selectedColors[style].length >= rule.maxColours) return BF.toast(`This bundle allows up to ${rule.maxColours} colours`);
    selectedColors[style].push(name);
    allocations[style][name] = 0;
  }
  renderCustom();
  updateAll();
}

function setAllocation(style, name, value) {
  const target = styleTarget(style);
  const rule = currentRule();
  const otherTotal = Object.entries(allocations[style]).reduce((sum, [key, n]) => key === name ? sum : sum + (Number(n) || 0), 0);
  const remainingCapacity = Math.max(0, target - otherTotal);
  const digits = String(value ?? '').replace(/\D/g, '');
  const requested = digits === '' ? 0 : Number(digits);
  const next = Math.min(rule.maxPerColour, remainingCapacity, Math.max(0, requested));
  allocations[style][name] = next;

  const input = document.querySelector(`[data-qty="${CSS.escape(name)}"]`);
  if (input && editStyle() === style) {
    const shown = next || '';
    if (input.value !== String(shown)) input.value = shown;
  }
  updateAll();
}

function updateAllocation() {
  if (orderType !== 'custom') return;
  const style = editStyle();
  const v = validationForStyle(style);
  const rule = currentRule();
  const minNeeded = v.required;
  const ready = v.ready;

  $('#remainingInline').textContent = ready ? 'Complete' : v.remaining;
  $('#allocatedCount').textContent = v.total;
  $('#bundleCount').textContent = v.target;

  const message = $('#builderMessage');
  if (!selectedColors[style].length) {
    message.textContent = `Choose at least ${minNeeded} colour${minNeeded === 1 ? '' : 's'} to build this ${v.target}-piece ${styleLabel(style)} mix.`;
  } else if (v.total === v.target && v.positive < minNeeded) {
    message.textContent = `Use at least ${minNeeded} colours with a quantity above zero.`;
  } else if (ready) {
    message.textContent = `${styleLabel(style)} colour mix complete.`;
  } else if (v.remaining > 0) {
    message.textContent = `${v.remaining} piece${v.remaining === 1 ? '' : 's'} left · max ${rule.maxPerColour} per colour.`;
  } else {
    message.textContent = `Adjust the mix to meet the ${minNeeded}-colour minimum.`;
  }
  message.className = ready ? 'good' : '';

  const ruleTitle = wholesaleStyle === 'mixed' ? `${styleLabel(style)} custom limits` : 'Custom mix limits';
  const ruleText = wholesaleStyle === 'mixed'
    ? `${styleLabel(style)} has ${v.target} pieces. Use at least ${minNeeded} colours, max ${rule.maxPerColour} pieces per colour. You may choose up to ${rule.maxColours} colours.`
    : `For ${currentBundle().pieces} pieces: choose at least ${rule.minColours} colours, max ${rule.maxPerColour} pieces per colour, and up to ${rule.maxColours} colours.`;
  $('#colourRuleTitle').textContent = ruleTitle;
  $('#colourRuleText').textContent = ruleText;
}

function splitEvenly() {
  const style = editStyle();
  const names = selectedColors[style];
  if (!names.length) return BF.toast('Choose colours first');
  const target = styleTarget(style);
  const rule = currentRule();
  const required = requiredColours(style);
  if (names.length < required) return BF.toast(`Choose at least ${required} colours for this mix`);

  const base = Math.floor(target / names.length);
  const remainder = target % names.length;
  if (base + (remainder ? 1 : 0) > rule.maxPerColour) return BF.toast(`Add more colours — maximum ${rule.maxPerColour} pieces per colour`);

  names.forEach((name, i) => allocations[style][name] = base + (i < remainder ? 1 : 0));
  renderCustom();
  updateAll();
}

function choosePreset(type) {
  const style = editStyle();
  const names = availableColors(style).map(([name]) => name);
  if (!names.length) return BF.toast('No colours are currently available');
  const exact = wanted => wanted.map(n => names.find(x => x.toLowerCase() === n.toLowerCase())).filter(Boolean);
  let preferred = [];
  if (type === 'neutral') preferred = exact(['Black', 'White', 'Ash', 'Nude', 'Dark Brown', 'Chocolate Brown', 'Light Brown']);
  if (type === 'balanced') preferred = exact(['Black', 'Nude', 'Pink', 'Baby Blue', 'Light Brown', 'White', 'Teal Blue', 'Burgundy']);
  if (type === 'colourful') preferred = exact(['Pink', 'Royal Blue', 'Burgundy', 'Army Green', 'Peach', 'Mustard', 'Teal Blue', 'Baby Blue']);

  const required = requiredColours(style);
  const desiredCount = Math.min(currentRule().maxColours, Math.max(required, 6));
  const extras = names.filter(n => !preferred.includes(n));
  selectedColors[style] = [...new Set([...preferred, ...extras])].slice(0, desiredCount);
  allocations[style] = {};
  selectedColors[style].forEach(name => allocations[style][name] = 0);
  splitEvenly();
}

function updateStyleSplit(style, value) {
  if (wholesaleStyle !== 'mixed') return;
  const target = currentBundle().pieces;
  const numeric = Math.round(Number(value) || 0);
  const clamped = Math.max(1, Math.min(target - 1, numeric));
  const other = style === 'flat' ? 'twisted' : 'flat';
  styleSplit[style] = clamped;
  styleSplit[other] = target - clamped;

  // Changing the split changes how many pieces each colour tab must total,
  // so clear custom quantities to prevent an invalid hidden allocation.
  resetColourState();
  activeColourStyle = style;
  renderCustom();
  updateAll();
}

function stepStyleSplit(style, step) {
  updateStyleSplit(style, Number(styleSplit[style] || 0) + Number(step || 0));
}

function splitStylesEvenly() {
  resetStyleSplit();
  resetColourState();
  activeColourStyle = 'flat';
  renderCustom();
  updateAll();
}

function updateSplitUI() {
  const mixed = wholesaleStyle === 'mixed';
  $('#mixed-split-stage').hidden = !mixed;
  $('#colourStageNumber').textContent = mixed ? '05' : '04';
  if (!mixed) return;

  const target = currentBundle().pieces;
  const flat = Number(styleSplit.flat || 0);
  const twisted = Number(styleSplit.twisted || 0);
  $('#flatSplitInput').max = String(target - 1);
  $('#twistedSplitInput').max = String(target - 1);
  $('#flatSplitInput').value = flat;
  $('#twistedSplitInput').value = twisted;
  $('#flatSplitValue').textContent = flat;
  $('#twistedSplitValue').textContent = twisted;
  $('#splitAllocated').textContent = flat + twisted;
  $('#splitTarget').textContent = target;
  $('#splitMessage').textContent = flat > 0 && twisted > 0 && flat + twisted === target ? 'Perfect split' : 'Adjust split';
}

function updateSticky() {
  const b = currentBundle();
  $('#stickyStyleImage').src = styleImage(wholesaleStyle);
  const splitText = wholesaleStyle === 'mixed' ? ` · ${styleSplit.flat}F/${styleSplit.twisted}T` : '';
  $('#stickyMain').textContent = `${styleLabel(wholesaleStyle)} · ${modeLabel()} · ${b.pieces} pieces${splitText}`;
  $('#stickyBundle').textContent = `${b.pieces} pieces`;
  $('#stickyPrice').textContent = money(b.price);
}

function updateProfit() {
  const b = currentBundle();
  const sell = Number($('#resalePrice')?.value || 0);
  const revenue = b.pieces * sell;
  const profit = revenue - b.price;
  $('#profitCost').textContent = money(b.price);
  $('#profitRevenue').textContent = money(revenue);
  $('#profitAmount').textContent = money(profit);
}

function colourSummaryHtml() {
  if (orderType !== 'custom') return '';
  return activeStyles().map(style => {
    const chips = selectedColors[style]
      .filter(name => Number(allocations[style][name]) > 0)
      .map(name => `<span class="summary-colour-chip"><b>${styleLabel(style)}</b> · ${name} × ${allocations[style][name]}</span>`)
      .join('');
    return chips;
  }).join('');
}

function updateSummary() {
  const b = currentBundle();
  const custom = orderType === 'custom';
  const ready = customReady();
  $('#summaryImage').src = styleImage(wholesaleStyle);
  $('#summaryImage').alt = `Selected ${styleLabel(wholesaleStyle)} wholesale hairbands`;
  $('#summaryStyleBadge').textContent = styleLabel(wholesaleStyle);
  $('#summaryPieces').textContent = b.pieces;
  $('#summaryStyle').textContent = styleLabel(wholesaleStyle);
  $('#summaryStyleRow').textContent = wholesaleStyle === 'mixed' ? `Mixed · ${styleSplit.flat} Flat + ${styleSplit.twisted} Twisted` : styleLabel(wholesaleStyle);
  $('#summaryModeRow').textContent = modeLabel();
  $('#summaryBundleRow').textContent = `${b.pieces} pieces`;
  $('#summaryTotalRow').textContent = money(b.price);

  if (custom) {
    $('#summaryDescription').textContent = wholesaleStyle === 'mixed'
      ? `Custom Colour Mix · Choose colours separately for your ${styleSplit.flat} Flat and ${styleSplit.twisted} Twisted hairbands.`
      : `Custom Colour Mix · Choose your colours within the per-colour limit for this ${styleLabel(wholesaleStyle)} bundle.`;
  } else {
    $('#summaryDescription').textContent = wholesaleStyle === 'mixed'
      ? `Standard Mix · Band Factory will select available colours for ${styleSplit.flat} Flat and ${styleSplit.twisted} Twisted hairbands.`
      : `Standard Mix · Band Factory will select a mixed colour assortment from available stock for your ${styleLabel(wholesaleStyle)} bundle.`;
  }

  const colourWrap = $('#summaryColours');
  const summaryHtml = colourSummaryHtml();
  if (custom && summaryHtml) {
    colourWrap.hidden = false;
    $('#summaryColourList').innerHTML = summaryHtml;
  } else {
    colourWrap.hidden = true;
    $('#summaryColourList').innerHTML = '';
  }

  if (custom && !ready) {
    const incomplete = activeStyles().filter(style => !validationForStyle(style).ready).map(styleLabel).join(' & ');
    $('#summaryNote').textContent = `Complete the ${incomplete} colour allocation before adding this bundle to your Bag.`;
  } else if (wholesaleStyle === 'mixed') {
    $('#summaryNote').textContent = `${b.pieces}-piece Mixed bundle: ${styleSplit.flat} Flat + ${styleSplit.twisted} Twisted.`;
  } else {
    $('#summaryNote').textContent = `Your ${b.pieces}-piece ${styleLabel(wholesaleStyle)} ${modeLabel()} bundle is ready.`;
  }
  $('#addWholesaleToBag').disabled = !ready;
}

function updateLabels() {
  const b = currentBundle();
  const styleText = wholesaleStyle === 'mixed' ? 'Mixed Flat + Twisted' : styleLabel(wholesaleStyle);
  $('#bundleHint').textContent = `Choose a ${modeLabel()} bundle for your ${styleText} hairbands.`;
  $('#colourStyleName').textContent = styleLabel(editStyle());
  $('#bundleCount').textContent = styleTarget(editStyle());
  $('#colour-title').innerHTML = wholesaleStyle === 'mixed'
    ? `Choose colours for <span id="colourStyleName">${styleLabel(editStyle())}</span>.`
    : `Build your <span id="colourStyleName">${styleLabel(editStyle())}</span> bundle.`;
  renderColourTabs();
}

function updateAll() {
  updateSplitUI();
  updateAllocation();
  updateSticky();
  updateProfit();
  updateSummary();
  updateLabels();
}

function addWholesaleToBag() {
  const b = currentBundle();
  if (orderType === 'custom' && !customReady()) return BF.toast('Complete your custom colour mix before adding this bundle');

  const styleAllocations = wholesaleStyle === 'mixed'
    ? { flat: styleSplit.flat, twisted: styleSplit.twisted }
    : { [wholesaleStyle]: b.pieces };

  if (orderType === 'custom') {
    const payload = wholesaleStyle === 'mixed'
      ? { flat: { ...allocations.flat }, twisted: { ...allocations.twisted } }
      : { ...allocations[wholesaleStyle] };
    BF.addWholesale({ ...b, wholesaleMode: 'custom' }, payload, 'custom', wholesaleStyle, 'smooth', styleAllocations);
  } else {
    BF.addWholesale({ ...b, wholesaleMode: 'standard' }, { 'Band Factory colour mix': b.pieces }, 'standard', wholesaleStyle, 'smooth', styleAllocations);
  }
}

async function initWholesale() {
  const [settings, products] = await Promise.all([
    BFStore.getDoc('settings/store', {}),
    BFStore.getDoc('products/smooth', { colors: {} })
  ]);
  productData = products || { colors: {} };

  standardBundles = DEFAULT_STANDARD.map(b => ({
    ...b,
    price: Number(settings[`standardWholesale${b.pieces}Price`] ?? settings[`wholesale${b.pieces}Price`] ?? b.price)
  }));
  customBundles = DEFAULT_CUSTOM.map(b => ({
    ...b,
    price: Number(settings[`customWholesale${b.pieces}Price`] ?? b.price)
  }));

  const params = new URLSearchParams(location.search);
  if (['flat', 'twisted', 'mixed'].includes(params.get('style'))) wholesaleStyle = params.get('style');
  if (params.get('type') === 'custom') orderType = 'custom';
  activeColourStyle = wholesaleStyle === 'mixed' ? 'flat' : wholesaleStyle;
  resetStyleSplit();

  $$('[data-wholesale-style]').forEach(btn => btn.onclick = () => requestStyle(btn.dataset.wholesaleStyle));
  $$('[data-order-type]').forEach(btn => btn.onclick = () => setOrderType(btn.dataset.orderType));
  $$('[data-preset]').forEach(btn => btn.onclick = () => choosePreset(btn.dataset.preset));
  $$('[data-colour-style]').forEach(btn => btn.onclick = () => setActiveColourStyle(btn.dataset.colourStyle));
  $$('[data-split-step]').forEach(btn => btn.onclick = () => stepStyleSplit(btn.dataset.splitStyle, btn.dataset.splitStep));
  $('#flatSplitInput').onchange = e => updateStyleSplit('flat', e.target.value);
  $('#twistedSplitInput').onchange = e => updateStyleSplit('twisted', e.target.value);
  $('#evenStyleSplit').onclick = splitStylesEvenly;
  $('#splitEvenly').onclick = splitEvenly;
  $('#changeStyle').onclick = () => $('#style-stage').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('#reviewStyle').onclick = () => $('#style-stage').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('#addWholesaleToBag').onclick = addWholesaleToBag;
  $('#resalePrice').oninput = updateProfit;

  $('#cancelStyle').onclick = closeStyleConfirm;
  $('#cancelStyleTop').onclick = closeStyleConfirm;
  $('#confirmStyle').onclick = () => {
    if (pendingStyle) applyStyle(pendingStyle);
    closeStyleConfirm();
  };
  $('#styleConfirm').onclick = e => { if (e.target.id === 'styleConfirm') closeStyleConfirm(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#styleConfirm').hidden) closeStyleConfirm(); });

  $$('[data-wholesale-style]').forEach(btn => {
    const active = btn.dataset.wholesaleStyle === wholesaleStyle;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', String(active));
  });
  $$('[data-order-type]').forEach(btn => {
    const active = btn.dataset.orderType === orderType;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', String(active));
  });

  $('#colour-stage').hidden = orderType !== 'custom';
  renderBundles();
  renderCustom();
  updateAll();
}

document.addEventListener('DOMContentLoaded', initWholesale);
