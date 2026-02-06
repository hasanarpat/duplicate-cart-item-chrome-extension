# Repository Report — Cart Duplicate Checker Extension

This document is a detailed technical and product overview for anyone reviewing this GitHub repository. The extension helps users avoid accidental duplicate items in their shopping carts on supported Turkish e-commerce sites.

---

## 1. Project overview

**Name:** Cart Duplicate Checker (Duplicheck)  
**Type:** Browser extension (Manifest V3)  
**Target users:** Shoppers on Turkish e-commerce sites (Trendyol, Hepsiburada, Amazon TR, Boyner, Teknosa, Trendyol Milla)  
**Language:** User-facing text is in **Turkish**.

The extension:

- Detects when the same product appears more than once in the cart (by URL, and optionally by seller).
- Shows a soft in-cart warning (amber border + label) on duplicate rows.
- When the user clicks **checkout** and duplicates exist, shows a **confirmation modal** (once per attempt) with options to reduce quantities or proceed anyway.
- Persists user preferences (enable/disable, min quantity, “same seller only”, snooze) in local storage and applies them in the content script.

No data is sent to any server; all logic runs in the browser.

---

## 2. Supported sites and injection

| Site | Content script runs on | Notes |
|------|------------------------|--------|
| **Trendyol** | `https://www.trendyol.com/*` | Cart + quantity selectors |
| **Hepsiburada** | `https://www.hepsiburada.com/*`, `https://checkout.hepsiburada.com/*` | Cart and checkout |
| **Trendyol Milla** | `https://www.trendyol-milla.com/*` | Same pattern as Trendyol |
| **Boyner** | `https://www.boyner.com.tr/*` | Uses `setQuantityViaButtons` for reliable updates |
| **Amazon TR** | `https://www.amazon.com.tr/*` | Quantity widget + optional dropdown selector |
| **Teknosa** | `https://www.teknosa.com/*` | Cart page |

The content script is injected only on these origins (see `manifest.json` → `content_scripts.matches`). There is no `*://*` or broad host permission.

---

## 3. Architecture

### 3.1 Manifest (MV3)

- **manifest_version:** 3  
- **Permissions:** `storage` only (for options and snooze state).  
- **Action:** Popup UI (`popup.html` + `popup.js`).  
- **Icons:** 16×16, 48×48, 128×128 (required for store listing).  
- **Firefox:** `browser_specific_settings.gecko` with `id`, `strict_min_version`, and **`data_collection_permissions: { "required": ["none"] }`** (no data collection).

### 3.2 Content script (`content.js`)

- **Site config:** A single `SITE_CONFIG` object keyed by `location.hostname` defines per-site selectors and options (quantity, product name, checkout button, optional quantity widget, delays, etc.).
- **Duplicate detection:**  
  - Collects cart rows via `quantitySelector` and groups items by product URL (pathname, no query), optional seller, and optional variant.  
  - A “duplicate group” is: same product (URL + seller + variant) with **total quantity > 1** or **multiple rows**.  
  - Results are filtered by user settings: minimum quantity to warn, and “warn only if same seller” (when enabled, only groups with a non-empty seller are considered).
- **UI behavior:**  
  - **In-cart:** Highlights duplicate rows (amber border + label “Bu ürün birden fazla kez eklenmiş”) and can show a small warning box (optional duplicate list).  
  - **On checkout click:** If duplicates exist and modal is not snoozed, the first click is intercepted; a modal is shown once per attempt.  
- **Modal:**  
  - Title/description in Turkish, list of duplicate products with quantity and a “1 adete düşür” (reduce to 1) button per product.  
  - **“Düzelt ve sepette kal”** (Fix and stay in cart): Reduces listed duplicate groups to quantity 1 and closes the modal **without** navigating to checkout (user stays on cart; site can persist changes).  
  - **“Biliyorum, yine de devam et”** (I know, continue anyway): Closes modal and triggers checkout; also starts a 24-hour snooze for the checkout modal.  
  - Disclaimer at bottom: cart responsibility and that the extension does not guarantee quantity corrections.  
  - Accessibility: focus trap, Escape to close, ARIA dialog.
- **Quantity changes:**  
  - For **input** fields: value is set and `input`/`change` events are dispatched.  
  - For **non-input** (e.g. Amazon’s span) or when `setQuantityViaButtons` is true (e.g. Boyner): the extension simulates clicks on decrement/increment buttons (with optional `quantityClickDelay` and `quantityWidgetSelector` for finding buttons).  
- **Performance:** MutationObserver runs only when the page has cart items (quantity selector matches); own DOM (modal, styles, highlights) is ignored to avoid feedback loops. Extension styles are injected once via a single helper.

### 3.3 Popup (`popup.html` + `popup.js`)

- **Settings (stored in `chrome.storage.local` / `browser.storage.local`):**  
  - Enable/disable duplicate guard  
  - Minimum quantity to warn (default 2)  
  - Warn only if same seller  
  - Snooze all warnings for 24 hours  
- **Checkout modal snooze:** If the user has chosen “I know, continue anyway,” the checkout modal is snoozed for 24 hours; the popup shows this state and a button to clear the snooze so the modal can appear again.
- All labels and buttons are in Turkish. No remote resources.

### 3.4 Storage keys

- `duplicateGuardEnabled`, `minQuantityToWarn`, `warnOnlySameSeller`, `snoozeUntil` (popup settings).  
- `checkoutModalSnoozeUntil` (timestamp until which the checkout modal is suppressed after “I know, continue anyway”).

The content script reads these on load and on `storage.onChanged` so that toggling options or clearing snooze in the popup applies without reloading the tab.

---

## 4. Duplicate detection rules (summary)

- **Same product** = same product URL (pathname only) + same seller (if present) + same variant (if present).  
- **Different seller or variant** → not treated as duplicate.  
- **Warn only if same seller:** When enabled, only groups with a non-empty seller are considered for warnings (no seller selector is defined for current sites, so this is for future use).  
- **Minimum quantity:** Only groups with `totalQuantity >= minQuantityToWarn` are shown in the modal and in-cart highlights.

---

## 5. Per-site configuration (SITE_CONFIG)

Each host entry can define:

- **quantitySelector** — CSS selector for the quantity element (input or span).  
- **rowParentCount** — How many parents to traverse from quantity element to get the “cart row” for grouping and highlighting.  
- **productNameSelector**, **productUrlSelector** — For display and grouping.  
- **quantityButtonSelectors** — Comma-separated: decrement, increment (for sites that use +/- buttons).  
- **checkoutButtonSelector** — Used to intercept checkout and show the modal.  
- **setQuantityViaButtons** — If true, quantity changes are done only via button clicks (e.g. Boyner).  
- **quantityWidgetSelector** — Optional container for finding +/- buttons (e.g. Amazon).  
- **quantityClickDelay** — Delay between simulated clicks (ms).  
- **modalButton** — Optional style overrides for the modal primary button.  
- **sellerSelector**, **variantSelector** — Optional; used for grouping when present.

Adding a new site requires adding a host key and the appropriate selectors; no backend or remote config.

---

## 6. Privacy and security

- **Data collection:** None. Firefox manifest declares `data_collection_permissions.required: ["none"]`.  
- **Storage:** Only `chrome.storage.local` / `browser.storage.local`; no sync, no analytics, no external requests.  
- **Code:** No `eval`, no remote scripts; all logic is in the repo (content.js, popup.js, popup.html).  
- **Permissions:** Only `storage` and the listed URL patterns for content script injection.

---

## 7. File structure

```
├── manifest.json       # MV3 manifest; content_scripts, popup, storage, gecko
├── content.js          # Site config, duplicate logic, modal, highlights, listeners
├── popup.html          # Popup UI (Turkish)
├── popup.js            # Load/save settings and checkout snooze
├── icon16.png          # 16×16
├── icon48.png          # 48×48
├── icon128.png         # 128×128
├── resize-icons.ps1    # Optional PowerShell script to resize icons from a source image
├── .gitignore
├── STORE_SUBMISSION_CHECKLIST.md   # Store submission notes (Turkish)
├── DEGISIKLIK_RAPORU.md            # Change log (Turkish)
└── REPO_REPORT.md                  # This report
```

For store packaging, include: `manifest.json`, `content.js`, `popup.html`, `popup.js`, `icon16.png`, `icon48.png`, `icon128.png`. Exclude docs, scripts, and version control.

---

## 8. How to run and test

- **Chrome:** Load unpacked from the repo folder (`chrome://extensions` → “Load unpacked”).  
- **Firefox:** `about:debugging` → “This Firefox” → “Load Temporary Add-on” → select `manifest.json`.  
- **Packaging:** Zip the files listed above (no extra top-level folder) for store upload.

Before packaging, ensure icons are exactly 16×16, 48×48, and 128×128 (e.g. run `resize-icons.ps1` if you have a high-resolution source).

---

## 9. Possible improvements (for contributors)

- Add **sellerSelector** (and optionally **variantSelector**) for marketplaces that show seller/variant in the cart DOM, so “warn only if same seller” is effective.  
- Harden **quantity reduction** on sites that use dropdowns or custom widgets (e.g. open dropdown and select “1” where +/- is not available).  
- Optional **i18n** (e.g. English) for popup and modal while keeping Turkish as default.  
- Unit tests or small test pages for duplicate grouping and filtering logic.  
- Document how to add a new site (selectors, rowParentCount, and any site-specific quirks).

---

## 10. Summary

This repository contains a **self-contained, privacy-respecting** browser extension that:

- Runs only on a fixed set of Turkish e-commerce origins.  
- Detects duplicate cart items by URL (and optional seller/variant), with configurable minimum quantity and “same seller only” behavior.  
- Shows in-cart highlights and a single confirmation modal at checkout, with options to fix quantities and stay on the cart or proceed and snooze the modal.  
- Keeps all settings and snooze state in local storage and declares no data collection for Firefox.  
- Is structured for review: one main content script, a small popup, and a single per-site config object that can be extended for new hosts or selectors.

If you are reviewing the repo for security, privacy, or maintainability, the main touchpoints are: `manifest.json` (permissions and hosts), `content.js` (SITE_CONFIG and DOM/event handling), and `popup.js` (storage usage). No external services or build step are required.
