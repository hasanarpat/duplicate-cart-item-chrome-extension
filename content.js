const observer = new MutationObserver(() => {
  const items = document.querySelectorAll('[data-testid="quantity-selector"]');
  if (items.length > 0) {
    checkDuplicates(items);
  }
});

function getBasketRow(quantitySelectorEl) {
  let row = quantitySelectorEl;
  for (let i = 0; i < 8 && row; i++) row = row.parentElement;
  return row;
}

function unhighlight(row) {
  if (!row || !row.style) return;
  const svg = row.querySelector('.dupli-border-svg');
  const label = row.querySelector('.dupli-highlight-label');
  if (svg) svg.remove();
  if (label) label.remove();
  row.style.border = '';
  row.style.borderRadius = '';
  row.style.boxShadow = '';
  row.style.position = '';
  row.style.transition = '';
  row.style.animation = '';
}

function unhighlightAll() {
  document.querySelectorAll('.dupli-highlight-label').forEach((label) => {
    const row = label.parentElement;
    if (row) unhighlight(row);
  });
}

function runDuplicateCheck() {
  const items = document.querySelectorAll('[data-testid="quantity-selector"]');
  if (items.length === 0) return;
  unhighlightAll();
  checkDuplicates(items);
}

function checkDuplicates(items) {
  let hasDuplicate = false;
  items.forEach((item) => {
    const row = getBasketRow(item);
    if (!row) return;
    const value = Number(item.value) || 0;
    if (value > 1) {
      highlight(row);
      hasDuplicate = true;
    }
  });
  if (hasDuplicate) {
    showWarning();
  } else {
    removeWarning();
  }
}

function highlight(item) {
  // Apply a sophisticated border with a cut for a label on the top left
  Object.assign(item.style, {
    border: '2.5px solid #e53935',
    borderRadius: '15px',
    boxShadow:
      '0 0 0 4px rgba(229,57,53,0.14), 0 2px 16px rgba(229,57,53,0.11)',
    position: 'relative',
    transition:
      'box-shadow 0.35s cubic-bezier(.29,.8,.61,.99), border-color 0.3s',
    animation: 'dupliGlow 1.1s cubic-bezier(.77,0,.18,1) 0s 2',
  });

  // Inject border cutout and animated glow keyframes if not already present
  if (!document.getElementById('dupli-glow-label-style')) {
    const style = document.createElement('style');
    style.id = 'dupli-glow-label-style';
    style.textContent = `
      @keyframes dupliGlow {
        0%   { box-shadow: 0 0 0 0 rgba(229,57,53,0.18), 0 2px 6px 0 rgba(229,57,53,0); border-color: #e57373; }
        15%  { box-shadow: 0 0 10px 2px rgba(229,57,53,0.23), 0 4px 24px 2px rgba(229,57,53,0.19); border-color: #e53935; }
        60%  { box-shadow: 0 0 18px 7px rgba(229,57,53,0.28), 0 4px 16px 2px rgba(229,57,53,0.23); border-color: #ff8a65; }
        100% { box-shadow: 0 0 0 4px rgba(229,57,53,0.15), 0 2px 24px rgba(229,57,53,0.14); border-color: #e53935; }
      }
      .dupli-border-svg {
        position: absolute;
        pointer-events: none;
        z-index: 10001;
        top: 0; left: 0;
        width: 100%; height: 100%;
        border-radius: 15px;
        overflow: visible;
      }
      .dupli-highlight-label {
        position: absolute;
        left: 16px;
        top: -14px;
        background: linear-gradient(90deg, #fff6f7 65%, #ffe0e3 100%);
        color: #d32f2f;
        font-weight: 700;
        font-size: 13px;
        padding: 3.5px 17px 3.5px 17px;
        border-radius: 7px 7px 7px 0px;
        box-shadow: 0 2px 8px rgba(229,57,53,0.13);
        border: 1.5px solid #e57373;
        border-bottom: none;
        border-right: none;
        z-index: 10002;
        font-family: inherit, sans-serif;
        letter-spacing: 0.5px;
        user-select: none;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  // Avoid duplicate SVG border or label
  if (!item.querySelector('.dupli-border-svg')) {
    // Remove the border from the underlying element (we'll draw it with SVG)
    item.style.border = 'none';
    // Wait DOM update to get real size
    setTimeout(() => {
      const w = item.offsetWidth;
      const h = item.offsetHeight;
      // Cut width for label
      const labelPad = 34 + 84; // left + label width guess
      const dupliSVG = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      );
      dupliSVG.classList.add('dupli-border-svg');
      dupliSVG.setAttribute('width', w);
      dupliSVG.setAttribute('height', h);
      dupliSVG.setAttribute('style', `width:${w}px;height:${h}px;`);
      // Path with top border cut for label
      const borderRadius = 15,
        stroke = 2.5;
      const cutStart = 14,
        cutEnd = cutStart + 110;
      dupliSVG.innerHTML = `
        <path d="
          M ${borderRadius},${stroke / 2}
          H ${cutStart}
          M ${cutEnd},${stroke / 2}
          H ${w - borderRadius} 
          Q ${w - stroke / 2},${stroke / 2} ${w - stroke / 2},${borderRadius}
          V ${h - borderRadius}
          Q ${w - stroke / 2},${h - stroke / 2} ${w - borderRadius},${h - stroke / 2} 
          H ${borderRadius}
          Q ${stroke / 2},${h - stroke / 2} ${stroke / 2},${h - borderRadius}
          V ${borderRadius}
          Q ${stroke / 2},${stroke / 2} ${borderRadius},${stroke / 2}
        " 
          fill="none"
          stroke="#e53935"
          stroke-width="${stroke}"
          stroke-linecap="round"
        />
      `;
      item.appendChild(dupliSVG);
    }, 0);
  }
  if (!item.querySelector('.dupli-highlight-label')) {
    const label = document.createElement('div');
    label.className = 'dupli-highlight-label';
    label.textContent = 'Çoğaltılmış Ürün';
    item.appendChild(label);
  }
  // Make sure the element is relatively positioned
  if (getComputedStyle(item).position === 'static') {
    item.style.position = 'relative';
  }
}

function showWarning() {
  if (document.getElementById('duplicate-warning')) return;

  const box = document.createElement('div');
  box.id = 'duplicate-warning';
  box.innerText =
    '⚠️ Sepetinde aynı üründen birden fazla var. Satın almadan önce kontrol et.';

  // Daha çekici bir UI için stil ve animasyon ekle, marka ismini sona ekle
  Object.assign(box.style, {
    position: 'fixed',
    bottom: '28px',
    right: '28px',
    minWidth: '340px',
    maxWidth: '400px',
    background: 'linear-gradient(135deg, #fff6f7 60%, #ffe0e3 100%)',
    color: '#b71c1c',
    padding: '20px 28px 16px 20px',
    borderRadius: '14px',
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

  // Küçük marka etiketi (extension adı)
  const brand = document.createElement('span');
  brand.innerText = '🛒 Duplicheck Extension';
  Object.assign(brand.style, {
    marginTop: '7px',
    fontSize: '12px',
    color: '#e57373',
    letterSpacing: '0.5px',
    fontWeight: '400',
    opacity: '0.73',
    alignSelf: 'flex-end',
  });
  box.appendChild(brand);

  // Animasyon ekle (sadece bir defa eklenmesini sağla)
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
      const btn = e.target.closest(
        '[data-testid="quantity-button-decrement"], [data-testid="quantity-button-increment"]'
      );
      if (!btn) return;
      setTimeout(runDuplicateCheck, 350);
    },
    true
  );
}

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

initQuantityButtonListeners();
