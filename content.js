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

function isOurOwnMutation(mutations) {
  for (const m of mutations) {
    for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      const el = n;
      if (el.id === 'duplicate-warning') return true;
      if (el.classList?.contains('dupli-highlight-label')) return true;
      if (el.classList?.contains('dupli-border-svg')) return true;
      if (el.classList?.contains('dupli-glow-label-style')) return true;
      if (el.id === 'duplicate-warning-bounce') return true;
      if (
        el.querySelector?.(
          '.dupli-highlight-label, .dupli-border-svg, #duplicate-warning',
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
  const config = getSiteConfig();
  if (!config) return;
  if (duplicateCheckTimer) clearTimeout(duplicateCheckTimer);
  duplicateCheckTimer = setTimeout(() => {
    duplicateCheckTimer = null;
    const items = document.querySelectorAll(config.quantitySelector);
    if (items.length > 0) {
      checkDuplicates(items, config);
    }
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
  const duplicateGroups = getDuplicateGroups(items, config);
  const duplicateList = [];

  duplicateGroups.forEach((group) => {
    group.entries.forEach(({ row }) => highlight(row));
    duplicateList.push({
      name: group.productName,
      count: group.totalQuantity,
    });
  });

  if (duplicateList.length > 0) {
    showWarning(duplicateList);
  } else if (items.length > 0) {
    removeWarning();
  }
}

function highlight(item) {
  if (!item || !item.style) return;
  Object.assign(item.style, {
    position: 'relative',
    border: '2px solid #e53935',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(229,57,53,0.2)',
  });
  if (item.querySelector('.dupli-highlight-label')) return;
  const label = document.createElement('div');
  label.className = 'dupli-highlight-label';
  label.textContent = 'Çoğaltılmış Ürün';
  Object.assign(label.style, {
    position: 'absolute',
    top: '-10px',
    left: '12px',
    background: '#fff5f5',
    color: '#c62828',
    fontSize: '12px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid #e57373',
    zIndex: 10,
  });
  item.appendChild(label);
}

function showWarning(duplicateList) {
  removeWarning();

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
  brand.innerText = '🛒 Duplicheck Extension';
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

  if (!document.getElementById('duplicate-warning-bounce')) {
    const style = document.createElement('style');
    style.id = 'duplicate-warning-bounce';
    style.innerHTML = `
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

function showCheckoutModal() {
  if (checkoutModalAlreadyShown) return;
  const existing = document.getElementById('checkout-modal-overlay');
  if (existing) return;

  checkoutModalAlreadyShown = true;

  const overlay = document.createElement('div');
  overlay.id = 'checkout-modal-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.5)',
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
    padding: '28px 24px',
    maxWidth: '380px',
    width: '100%',
    boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
    textAlign: 'center',
  });

  const icon = document.createElement('div');
  icon.textContent = '🛒';
  icon.style.cssText = 'font-size: 48px; margin-bottom: 12px;';

  const title = document.createElement('div');
  title.textContent = 'Ödeme butonuna tıklandı';
  title.style.cssText =
    'font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px;';

  const message = document.createElement('p');
  message.textContent =
    'Sepetinizde aynı üründen birden çok defa var, devam etmeden önce gözden geçirin.';
  message.style.cssText =
    'font-size: 14px; color: #555; line-height: 1.5; margin: 0 0 24px;';

  const config = getSiteConfig();
  const defaultModalBtn = {
    background: 'linear-gradient(135deg, #f27a24 0%, #e06d1a 100%)',
    hover: 'linear-gradient(135deg, #e06d1a 0%, #c96118 100%)',
    textColor: '#fff',
    boxShadow: '0 4px 12px rgba(242,122,36,0.35)',
  };
  const btnStyle = config?.modalButton
    ? { ...defaultModalBtn, ...config.modalButton }
    : defaultModalBtn;

  const btn = document.createElement('button');
  btn.textContent = 'Tamam';
  btn.type = 'button';
  Object.assign(btn.style, {
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
  });
  btn.addEventListener('click', () => overlay.remove());
  btn.addEventListener('mouseenter', () => {
    btn.style.background = btnStyle.hover;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = btnStyle.background;
  });

  modal.append(icon, title, message, btn);
  overlay.appendChild(modal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  if (!document.getElementById('duplicheck-modal-button-style')) {
    const style = document.createElement('style');
    style.id = 'duplicheck-modal-button-style';
    style.textContent =
      '#checkout-modal-overlay button { text-align: center !important; }';
    document.head.appendChild(style);
  }

  document.body.appendChild(overlay);
}

function initCheckoutButtonListener() {
  document.body.addEventListener(
    'click',
    (e) => {
      const config = getSiteConfig();
      if (!config?.checkoutButtonSelector) return;
      const btn = e.target.closest(config.checkoutButtonSelector);
      if (!btn) return;
      if (checkoutModalAlreadyShown) return;
      e.preventDefault();
      e.stopPropagation();
      showCheckoutModal();
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
