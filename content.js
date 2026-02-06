const SITE_CONFIG = {
  'www.trendyol.com': {
    quantitySelector: '[data-testid="quantity-selector"]',
    rowParentCount: 6,
    productNameSelector: '.product-details-name',
    productUrlSelector: 'a.product-details-name',
    quantityButtonSelectors:
      '[data-testid="quantity-button-decrement"], [data-testid="quantity-button-increment"]',
    checkoutButtonSelector: '[data-testid="checkout-button"]',
  },
  'www.hepsiburada.com': {
    quantitySelector: 'input[name="quantity"]',
    rowParentCount: 6,
    productNameSelector: '[class*="product_name"]',
    quantityButtonSelectors:
      'a[aria-label="Ürünü Azalt"], a[aria-label="Ürünü Arttır"]',
    checkoutButtonSelector: '#continue_step_btn',
  },
  'checkout.hepsiburada.com': {
    quantitySelector: 'input[name="quantity"]',
    rowParentCount: 6,
    productNameSelector: '[class*="product_name"]',
    quantityButtonSelectors:
      'a[aria-label="Ürünü Azalt"], a[aria-label="Ürünü Arttır"]',
    checkoutButtonSelector: '#continue_step_btn',
  },
  'www.trendyol-milla.com': {
    quantitySelector: '[data-testid="quantity-selector"]',
    rowParentCount: 6,
    productNameSelector: '.product-details-name',
    productUrlSelector: 'a.product-details-name',
    quantityButtonSelectors:
      '[data-testid="quantity-button-decrement"], [data-testid="quantity-button-increment"]',
    checkoutButtonSelector: '[data-testid="checkout-button"]',
  },
  'www.boyner.com.tr': {
    quantitySelector: 'input[class*="product-counter_productCounterInput"]',
    rowParentCount: 5,
    productNameSelector:
      '[class*="product-info_productInfoBoxTextWrapperTitle"]',
    quantityButtonSelectors: '[class*="product-counter_productCounterButton"]',
    checkoutButtonSelector: '[aria-label="SEPETİ ONAYLA"]',
    modalButton: {
      background: 'rgb(245, 9, 9)',
      hover: 'rgb(220, 8, 8)',
      textColor: '#fff',
      boxShadow: '0 4px 12px rgba(245,9,9,0.35)',
    },
  },
  'www.amazon.com.tr': {
    quantitySelector: '[data-a-selector="inner-value"]',
    rowParentCount: 11,
    productNameSelector: '.sc-product-title',
    quantityButtonSelectors:
      '[data-a-selector="decrement"], [data-a-selector="increment"]',
    checkoutButtonSelector: '[data-feature-id="proceed-to-checkout-action"]',
    modalButton: {
      background: '#ffce12',
      hover: '#e6b80f',
      textColor: '#111',
      boxShadow: '0 4px 12px rgba(255,206,18,0.4)',
    },
  },
  'www.teknosa.com': {
    quantitySelector: 'input[name="quantity"]',
    rowParentCount: 6,
    productNameSelector: '.prd-row-title-cart a',
    quantityButtonSelectors: '.quantity-left-minus, .quantity-right-plus',
    checkoutButtonSelector: '.js-checkout-controls',
  },
};

function getSiteConfig() {
  return SITE_CONFIG[location.hostname] || null;
}

const extensionStorage =
  (typeof chrome !== 'undefined' && chrome.storage) ||
  (typeof browser !== 'undefined' && browser.storage) ||
  null;

const SETTINGS_DEFAULTS = {
  duplicateGuardEnabled: true,
  minQuantityToWarn: 2,
  warnOnlySameSeller: false,
  snoozeUntil: 0,
};

const CHECKOUT_MODAL_SNOOZE_KEY = 'checkoutModalSnoozeUntil';

let settings = { ...SETTINGS_DEFAULTS };
let checkoutModalSnoozeUntil = 0;

function loadSettings() {
  if (!extensionStorage?.local?.get) return;
  const keys = { ...SETTINGS_DEFAULTS, [CHECKOUT_MODAL_SNOOZE_KEY]: 0 };
  extensionStorage.local.get(keys, (s) => {
    settings = { ...SETTINGS_DEFAULTS, ...s };
    checkoutModalSnoozeUntil = Number(s[CHECKOUT_MODAL_SNOOZE_KEY]) || 0;
  });
}

if (extensionStorage) {
  loadSettings();
  extensionStorage.onChanged.addListener(loadSettings);
}

let extensionStylesInjected = false;

function ensureExtensionStylesInjected() {
  if (extensionStylesInjected) return;
  extensionStylesInjected = true;

  if (!document.getElementById('duplicate-warning-bounce')) {
    const style = document.createElement('style');
    style.id = 'duplicate-warning-bounce';
    style.textContent = `
      @keyframes bounceWarning {
        0%   { transform: translateY(0); }
        18%  { transform: translateY(-15px);}
        38%  { transform: translateY(2px);}
        52%  { transform: translateY(-7px);}
        68%  { transform: translateY(0);}
        100% { transform: translateY(0);}
      }
    `;
    document.head.appendChild(style);
  }

  if (!document.getElementById('duplicate-warning-list-style')) {
    const listStyle = document.createElement('style');
    listStyle.id = 'duplicate-warning-list-style';
    listStyle.textContent = `
      #duplicate-warning .duplicate-warning-list {
        list-style-type: disc !important;
        list-style-position: outside !important;
      }
      #duplicate-warning .duplicate-warning-list-wrapper {
        -webkit-overflow-scrolling: touch;
      }
    `;
    document.head.appendChild(listStyle);
  }

  if (!document.getElementById('duplicheck-modal-button-style')) {
    const modalStyle = document.createElement('style');
    modalStyle.id = 'duplicheck-modal-button-style';
    modalStyle.textContent =
      '#checkout-modal-overlay button { text-align: center !important; }';
    document.head.appendChild(modalStyle);
  }
}

function isOurOwnMutation(mutations) {
  for (const m of mutations) {
    for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      const el = n;
      if (el.id === 'duplicate-warning') return true;
      if (el.id === 'checkout-modal-overlay') return true;
      if (el.id === 'duplicate-warning-bounce') return true;
      if (el.id === 'duplicate-warning-list-style') return true;
      if (el.id === 'duplicheck-modal-button-style') return true;
      if (el.classList?.contains('dupli-highlight-label')) return true;
      if (el.classList?.contains('dupli-border-svg')) return true;
      if (el.classList?.contains('dupli-glow-label-style')) return true;
      if (
        el.querySelector?.(
          '.dupli-highlight-label, .dupli-border-svg, #duplicate-warning, #checkout-modal-overlay',
        )
      )
        return true;
    }
  }
  return false;
}

let duplicateCheckTimer = null;
const observer = new MutationObserver((mutations) => {
  if (isOurOwnMutation(mutations)) return;
  if (!settings.duplicateGuardEnabled || settings.snoozeUntil > Date.now())
    return;
  const config = getSiteConfig();
  if (!config) return;
  const items = document.querySelectorAll(config.quantitySelector);
  if (items.length === 0) return;
  if (duplicateCheckTimer) clearTimeout(duplicateCheckTimer);
  duplicateCheckTimer = setTimeout(() => {
    duplicateCheckTimer = null;
    const itemsNow = document.querySelectorAll(config.quantitySelector);
    if (itemsNow.length > 0) checkDuplicates(itemsNow, config);
  }, 200);
});

function getBasketRow(quantityEl, parentCount) {
  let row = quantityEl;
  for (let i = 0; i < parentCount && row; i++) row = row.parentElement;
  return row;
}

function unhighlight(row) {
  if (!row || !row.style) return;
  const label = row.querySelector('.dupli-highlight-label');
  if (label) label.remove();
  row.style.border = '';
  row.style.borderRadius = '';
  row.style.boxShadow = '';
  row.style.position = '';
}

function unhighlightAll() {
  document.querySelectorAll('.dupli-highlight-label').forEach((label) => {
    const row = label.parentElement;
    if (row) unhighlight(row);
  });
}

function runDuplicateCheck() {
  if (!settings.duplicateGuardEnabled || settings.snoozeUntil > Date.now())
    return;
  const config = getSiteConfig();
  if (!config) return;
  const items = document.querySelectorAll(config.quantitySelector);
  if (items.length === 0) return;
  unhighlightAll();
  checkDuplicates(items, config);
}

function getProductName(row, config) {
  if (config?.productNameSelector) {
    const nameEl = row.querySelector(config.productNameSelector);
    if (nameEl) {
      const text = (nameEl.textContent || '').trim();
      if (text) return text.length > 55 ? text.slice(0, 52) + '…' : text;
    }
  }
  const link = row.querySelector('a[href*="/p/"], a[href*="/product/"]');
  if (link) {
    const text = (link.textContent || link.getAttribute('title') || '').trim();
    if (text) return text.length > 55 ? text.slice(0, 52) + '…' : text;
  }
  return 'Ürün';
}

/**
 * Normalize product URL: pathname only, no query params. Same URL = same product (same page).
 */
function getProductUrl(row, config) {
  let link = null;
  if (config?.productUrlSelector) {
    link = row.querySelector(config.productUrlSelector);
  }
  if (!link && config?.productNameSelector) {
    const el = row.querySelector(config.productNameSelector);
    if (el?.tagName === 'A' && el.href) link = el;
  }
  if (!link) {
    link = row.querySelector(
      'a[href*="/p/"], a[href*="/product/"], a[href*="-p-"], a[href*="/gp/product/"], a[href*="/brand/"], a.product-details-name[href], a.prd-row-link[href]'
    );
  }
  if (!link || !link.href) return '';
  try {
    const url = new URL(link.href, location.origin);
    return url.pathname;
  } catch {
    const href = link.getAttribute('href') || '';
    return href.split('?')[0].split('#')[0];
  }
}

/**
 * Seller id/name if present. Different seller = NOT duplicate.
 */
function getSeller(row, config) {
  if (!config?.sellerSelector) return '';
  const el = row.querySelector(config.sellerSelector);
  if (!el) return '';
  return (el.textContent || el.getAttribute('data-seller-id') || '').trim();
}

/**
 * Variant (size/color etc.) if detectable. Different variant = NOT duplicate.
 */
function getVariant(row, config) {
  if (!config?.variantSelector) return '';
  const el = row.querySelector(config.variantSelector);
  if (!el) return '';
  return (el.textContent || '').trim();
}

/**
 * Build a stable key for grouping: same key = same product (same URL + seller + variant).
 */
function getItemKey(row, config) {
  const url = getProductUrl(row, config);
  const seller = getSeller(row, config);
  const variant = getVariant(row, config);
  return [url, seller, variant].join('|');
}

/**
 * Get quantity value from quantity element (input.value or textContent for span).
 */
function getQuantityValue(quantityEl) {
  return (
    Number(quantityEl.value ?? String(quantityEl.textContent || '').trim()) || 0
  );
}

/**
 * Set quantity in a cart row to a target value. Works with input or +/- button UI.
 */
function setQuantityInRow(row, targetValue, config) {
  const quantityEl = row.querySelector(config.quantitySelector);
  if (!quantityEl) return;
  const current = getQuantityValue(quantityEl);
  if (current === targetValue) return;
  if (quantityEl.tagName === 'INPUT' || quantityEl.getAttribute?.('contenteditable') === 'true') {
    quantityEl.value = String(targetValue);
    quantityEl.dispatchEvent(new Event('input', { bubbles: true }));
    quantityEl.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  const decrementSel = config.quantityButtonSelectors?.split(',')[0]?.trim();
  const incrementSel = config.quantityButtonSelectors?.split(',')[1]?.trim();
  const decBtn = decrementSel ? row.querySelector(decrementSel) : null;
  const incBtn = incrementSel ? row.querySelector(incrementSel) : null;
  const clicks = current - targetValue;
  if (clicks > 0 && decBtn) {
    for (let i = 0; i < clicks; i++) {
      setTimeout(() => decBtn.click(), i * 120);
    }
  } else if (clicks < 0 && incBtn) {
    for (let i = 0; i < -clicks; i++) {
      setTimeout(() => incBtn.click(), i * 120);
    }
  }
}

/**
 * Reduce a duplicate group to total quantity 1: first row = 1, others = 0.
 */
function reduceGroupTo1(group, config) {
  const entries = group.entries || [];
  if (entries.length === 0) return;
  setQuantityInRow(entries[0].row, 1, config);
  for (let i = 1; i < entries.length; i++) {
    setQuantityInRow(entries[i].row, 0, config);
  }
}

/**
 * Improved duplicate detection. Products are duplicates ONLY if:
 * - Product URL (without query params) is the same
 * - Seller is the same (if seller info exists)
 * - Quantity > 1 OR same item appears in multiple rows
 * Different sellers or different variants = NOT duplicate.
 *
 * @param {NodeListOf<Element>} items - Quantity elements (from config.quantitySelector)
 * @param {Object} config - Site config (rowParentCount, productUrlSelector, sellerSelector, variantSelector optional)
 * @returns {Array<{ productUrl: string, seller: string, variant: string, productName: string, entries: Array<{ row: Element, quantity: number }>, totalQuantity: number }>}
 *   List of duplicate groups. Each group has same product (url+seller+variant) with totalQuantity > 1 or multiple rows.
 */
function getDuplicateGroups(items, config) {
  const parentCount = config.rowParentCount ?? 8;
  const groupsByKey = new Map();

  items.forEach((quantityEl, index) => {
    const row = getBasketRow(quantityEl, parentCount);
    if (!row) return;
    const quantity = getQuantityValue(quantityEl);
    const productUrl = getProductUrl(row, config);
    const key = productUrl
      ? getItemKey(row, config)
      : `_no_url_${index}`;

    if (!groupsByKey.has(key)) {
      groupsByKey.set(key, {
        productUrl: productUrl || '',
        seller: getSeller(row, config),
        variant: getVariant(row, config),
        productName: getProductName(row, config),
        entries: [],
        totalQuantity: 0,
      });
    }
    const group = groupsByKey.get(key);
    group.entries.push({ row, quantity });
    group.totalQuantity += quantity;
  });

  return [...groupsByKey.values()].filter(
    (g) => g.totalQuantity > 1 || g.entries.length > 1
  );
}

function checkDuplicates(items, config) {
  const filtered = getFilteredDuplicateGroups(items, config);
  const duplicateList = [];

  filtered.forEach((group) => {
    group.entries.forEach(({ row }) => highlight(row));
    duplicateList.push({
      name: group.productName,
      count: group.totalQuantity,
    });
  });

  if (duplicateList.length === 0 && items.length > 0) {
    removeWarning();
  }
}

function highlight(item) {
  if (!item || !item.style) return;
  Object.assign(item.style, {
    position: 'relative',
    border: '1px solid #f59e0b',
    borderRadius: '8px',
    boxShadow: '0 0 0 1px rgba(245,158,11,0.15)',
  });
  if (item.querySelector('.dupli-highlight-label')) return;
  const label = document.createElement('div');
  label.className = 'dupli-highlight-label';
  label.textContent = 'Bu ürün birden fazla kez eklenmiş';
  Object.assign(label.style, {
    position: 'absolute',
    top: '-10px',
    left: '12px',
    background: '#fffbeb',
    color: '#b45309',
    fontSize: '11px',
    fontWeight: '500',
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid #fcd34d',
    zIndex: 10,
  });
  item.appendChild(label);
}

function showWarning(duplicateList) {
  removeWarning();
  ensureExtensionStylesInjected();

  const box = document.createElement('div');
  box.id = 'duplicate-warning';

  Object.assign(box.style, {
    position: 'fixed',
    bottom: '28px',
    right: '28px',
    minWidth: '340px',
    maxWidth: '400px',
    background: 'linear-gradient(135deg, #fff6f7 60%, #ffe0e3 100%)',
    color: '#b71c1c',
    padding: '20px 28px 16px 20px',
    borderRadius: '7px',
    fontSize: '16px',
    fontWeight: '500',
    zIndex: 9999,
    boxShadow: '0 8px 24px rgba(183,28,28,0.13)',
    border: '1.5px solid #ff8484',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '10px',
    animation: 'bounceWarning 1.2s cubic-bezier(.77,0,.18,1) 0s 3',
  });

  const title = document.createElement('div');
  title.textContent =
    '⚠️ Sepetinde aynı üründen birden fazla var. Satın almadan önce kontrol et.';
  title.style.marginBottom = '4px';
  box.appendChild(title);

  const listTitle = document.createElement('div');
  listTitle.textContent = 'Adet fazlası olan ürünler:';
  listTitle.style.cssText =
    'fontSize: 13px; fontWeight: 600; color: #c62828; marginTop: 6px;';
  box.appendChild(listTitle);

  const listWrapper = document.createElement('div');
  listWrapper.className = 'duplicate-warning-list-wrapper';
  listWrapper.style.cssText =
    'max-height: 180px; overflow-y: auto; overflow-x: hidden; margin-top: 6px; flex-shrink: 0;';

  const list = document.createElement('ul');
  list.className = 'duplicate-warning-list';
  list.style.cssText =
    'margin: 0; padding-left: 22px; font-size: 14px; line-height: 1.5; color: #b71c1c;';
  duplicateList.forEach(({ name, count }) => {
    const li = document.createElement('li');
    li.textContent = `${name} — ${count} adet`;
    li.style.marginBottom = '4px';
    list.appendChild(li);
  });
  listWrapper.appendChild(list);
  box.appendChild(listWrapper);

  const brand = document.createElement('span');
  brand.innerText = '🛒 Duplicheck Eklentisi';
  Object.assign(brand.style, {
    marginTop: '10px',
    fontSize: '12px',
    color: '#e57373',
    letterSpacing: '0.5px',
    fontWeight: '400',
    opacity: '0.73',
    alignSelf: 'flex-end',
  });
  box.appendChild(brand);

  document.body.appendChild(box);
}

function removeWarning() {
  const box = document.getElementById('duplicate-warning');
  if (box) box.remove();
}

function initQuantityButtonListeners() {
  document.body.addEventListener(
    'click',
    (e) => {
      const config = getSiteConfig();
      if (!config?.quantityButtonSelectors) return;
      const btn = e.target.closest(config.quantityButtonSelectors);
      if (!btn) return;
      setTimeout(runDuplicateCheck, 400);
      setTimeout(runDuplicateCheck, 850);
    },
    true,
  );
}

function initQuantityChangeListener() {
  const runOnQuantityChange = (e) => {
    const config = getSiteConfig();
    if (!config) return;
    if (
      typeof e.target.matches === 'function' &&
      e.target.matches(config.quantitySelector)
    ) {
      setTimeout(runDuplicateCheck, 200);
    }
  };
  document.body.addEventListener('change', runOnQuantityChange, true);
  document.body.addEventListener('input', runOnQuantityChange, true);
}

let checkoutModalAlreadyShown = false;
let checkoutProceedingProgrammatically = false;

/**
 * Show confirmation modal when checkout is clicked and duplicates exist.
 * @param {Array} filteredGroups - from getFilteredDuplicateGroups
 * @param {Element} checkoutButton - the button that was clicked
 * @param {Object} config - site config
 */
function showCheckoutDuplicateModal(filteredGroups, checkoutButton, config) {
  if (checkoutModalAlreadyShown) return;
  const existing = document.getElementById('checkout-modal-overlay');
  if (existing) return;
  if (!filteredGroups?.length) return;

  checkoutModalAlreadyShown = true;

  const overlay = document.createElement('div');
  overlay.id = 'checkout-modal-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.45)',
    zIndex: 10001,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  });

  const modal = document.createElement('div');
  Object.assign(modal.style, {
    background: '#fff',
    borderRadius: '14px',
    padding: '24px 22px',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
    textAlign: 'left',
  });

  const title = document.createElement('h2');
  title.textContent = 'Bir saniye';
  Object.assign(title.style, {
    margin: '0 0 8px',
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a1a1a',
  });

  const description = document.createElement('p');
  description.textContent =
    'Bazı ürünleri birden fazla kez eklenmiş olabilirsiniz.';
  Object.assign(description.style, {
    margin: '0 0 18px',
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.45',
  });

  const list = document.createElement('div');
  list.style.cssText =
    'max-height: 200px; overflow-y: auto; margin-bottom: 20px; border: 1px solid #eee; border-radius: 8px; padding: 8px;';

  filteredGroups.forEach((group) => {
    const row = document.createElement('div');
    row.style.cssText =
      'display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 8px; border-bottom: 1px solid #f0f0f0;';
    if (filteredGroups.indexOf(group) === filteredGroups.length - 1)
      row.style.borderBottom = 'none';

    const left = document.createElement('div');
    left.style.cssText = 'flex: 1; minWidth: 0;';
    const name = document.createElement('div');
    name.textContent = group.productName || 'Ürün';
    name.style.cssText = 'fontSize: 13px; fontWeight: 500; color: #333; overflow: hidden; textOverflow: ellipsis; whiteSpace: nowrap;';
    const qty = document.createElement('div');
    qty.textContent = `Adet: ${group.totalQuantity}`;
    qty.style.cssText = 'fontSize: 12px; color: #666; marginTop: 2px;';
    left.append(name, qty);

    const reduceBtn = document.createElement('button');
    reduceBtn.textContent = '1 adete düşür';
    reduceBtn.type = 'button';
    Object.assign(reduceBtn.style, {
      padding: '6px 12px',
      fontSize: '12px',
      fontWeight: '500',
      color: '#b45309',
      background: '#fffbeb',
      border: '1px solid #fcd34d',
      borderRadius: '6px',
      cursor: 'pointer',
      flexShrink: '0',
    });
    reduceBtn.addEventListener('click', () => {
      reduceGroupTo1(group, config);
      qty.textContent = 'Adet: 1';
      reduceBtn.disabled = true;
      reduceBtn.style.opacity = '0.6';
    });

    row.append(left, reduceBtn);
    list.appendChild(row);
  });

  const defaultModalBtn = {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    hover: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    textColor: '#fff',
    boxShadow: '0 4px 12px rgba(245,158,11,0.35)',
  };
  const btnStyle = config?.modalButton
    ? { ...defaultModalBtn, ...config.modalButton }
    : defaultModalBtn;

  const primaryBtn = document.createElement('button');
  primaryBtn.textContent = 'Düzelt ve devam et';
  primaryBtn.type = 'button';
  Object.assign(primaryBtn.style, {
    width: '100%',
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: '600',
    color: btnStyle.textColor,
    background: btnStyle.background,
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    boxShadow: btnStyle.boxShadow,
    textAlign: 'center',
    display: 'block',
    marginBottom: '10px',
  });

  const focusables = () =>
    overlay.querySelectorAll(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      closeModal();
      e.preventDefault();
      return;
    }
    if (e.key !== 'Tab') return;
    const list = focusables();
    if (list.length === 0) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }

  function cleanupOverlay() {
    overlay.removeEventListener('keydown', handleKeydown);
    overlay.remove();
    checkoutModalAlreadyShown = false;
  }

  function closeModal() {
    cleanupOverlay();
  }

  const closeAndProceed = () => {
    cleanupOverlay();
    checkoutProceedingProgrammatically = true;
    checkoutButton.click();
  };

  primaryBtn.addEventListener('click', () => {
    filteredGroups.forEach((g) => reduceGroupTo1(g, config));
    closeAndProceed();
  });
  primaryBtn.addEventListener('mouseenter', () => {
    primaryBtn.style.background = btnStyle.hover;
  });
  primaryBtn.addEventListener('mouseleave', () => {
    primaryBtn.style.background = btnStyle.background;
  });

  const secondaryBtn = document.createElement('button');
  secondaryBtn.textContent = 'Biliyorum, yine de devam et';
  secondaryBtn.type = 'button';
  Object.assign(secondaryBtn.style, {
    width: '100%',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#555',
    background: 'transparent',
    border: '1px solid #ccc',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'center',
    display: 'block',
  });
  secondaryBtn.addEventListener('click', () => {
    const until = Date.now() + 24 * 60 * 60 * 1000;
    checkoutModalSnoozeUntil = until;
    if (extensionStorage?.local?.set) {
      extensionStorage.local.set({ [CHECKOUT_MODAL_SNOOZE_KEY]: until });
    }
    closeAndProceed();
  });
  secondaryBtn.addEventListener('mouseenter', () => {
    secondaryBtn.style.background = '#f5f5f5';
  });
  secondaryBtn.addEventListener('mouseleave', () => {
    secondaryBtn.style.background = 'transparent';
  });

  modal.append(title, description, list, primaryBtn, secondaryBtn);
  overlay.appendChild(modal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  ensureExtensionStylesInjected();
  document.body.appendChild(overlay);

  const firstFocusable = focusables()[0];
  if (firstFocusable) firstFocusable.focus();

  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', title.id || 'duplicheck-modal-title');
  if (!title.id) title.id = 'duplicheck-modal-title';

  overlay.addEventListener('keydown', handleKeydown);
}

function getFilteredDuplicateGroups(items, config) {
  const groups = getDuplicateGroups(items, config);
  const minQty = Math.max(1, Number(settings.minQuantityToWarn) || 2);
  return groups.filter(
    (g) =>
      g.totalQuantity >= minQty &&
      (!settings.warnOnlySameSeller || (g.seller && g.seller.trim() !== ''))
  );
}

function initCheckoutButtonListener() {
  document.body.addEventListener(
    'click',
    (e) => {
      if (!settings.duplicateGuardEnabled || settings.snoozeUntil > Date.now())
        return;
      const config = getSiteConfig();
      if (!config?.checkoutButtonSelector) return;
      const btn = e.target.closest(config.checkoutButtonSelector);
      if (!btn) return;

      if (checkoutProceedingProgrammatically) {
        checkoutProceedingProgrammatically = false;
        return;
      }

      const items = document.querySelectorAll(config.quantitySelector);
      const filtered = getFilteredDuplicateGroups(items, config);
      if (filtered.length > 0) {
        if (Date.now() < checkoutModalSnoozeUntil) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        showCheckoutDuplicateModal(filtered, btn, config);
      }
    },
    true,
  );
}

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

initQuantityButtonListeners();
initQuantityChangeListener();
initCheckoutButtonListener();
