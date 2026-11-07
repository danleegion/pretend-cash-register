/**
 * Scanner — Camera viewfinder, real barcode detection,
 * and two-API product lookup (Open Food Facts + UPC Item DB).
 *
 * Flow:
 *  Real camera barcode detected  →  lookupBarcode()  →  showProductCard()
 *  "BEEP!" button (pretend mode) →  add random fun item + confetti
 *  "Enter barcode" text input    →  lookupBarcode()  →  showProductCard()
 */

class KidScanner {
  constructor(app) {
    this.app = app;
    this.videoElement = null;
    this.stream = null;
    this.cameraActive = false;
    this.barcodeDetector = null;
    this.isDetecting = false;
    this.lookupCooldown = false; // prevent rapid double-scans

    if ('BarcodeDetector' in window) {
      try {
        this.barcodeDetector = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'itf']
        });
      } catch (e) {
        console.warn('BarcodeDetector init error:', e);
      }
    }
  }

  // ─── Modal lifecycle ────────────────────────────────────────────────────────

  openScannerModal() {
    const modal = document.getElementById('scanner-modal');
    if (!modal) return;
    this.hideProductCard();
    modal.classList.add('visible');
    this.startCamera();
  }

  closeScannerModal() {
    const modal = document.getElementById('scanner-modal');
    if (modal) modal.classList.remove('visible');
    this.hideProductCard();
    this.stopCamera();
  }

  // ─── Camera ────────────────────────────────────────────────────────────────

  async startCamera() {
    this.videoElement = document.getElementById('scanner-video');
    const fallbackBox = document.getElementById('scanner-fallback-box');
    const statusEl   = document.getElementById('scanner-status-label');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this._showFallback(fallbackBox, statusEl, '📷 No camera — use the barcode box below!');
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        this.videoElement.style.display = 'block';
        if (fallbackBox) fallbackBox.style.display = 'none';
        this.cameraActive = true;

        if (this.barcodeDetector) {
          if (statusEl) statusEl.textContent = '📷 Camera live — aim at a real barcode!';
          this.startDetectionLoop();
        } else {
          if (statusEl) statusEl.textContent = '📷 Camera on — tap BEEP or type a barcode below!';
        }
      }
    } catch (err) {
      console.log('Camera unavailable:', err.message);
      this._showFallback(fallbackBox, statusEl, '📷 Camera blocked — type a barcode below!');
    }
  }

  _showFallback(fallbackBox, statusEl, msg) {
    if (fallbackBox) fallbackBox.style.display = 'flex';
    if (this.videoElement) this.videoElement.style.display = 'none';
    if (statusEl) statusEl.textContent = msg;
  }

  stopCamera() {
    this.cameraActive = false;
    this.isDetecting  = false;
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }

  // ─── BarcodeDetector auto-scan loop ────────────────────────────────────────

  startDetectionLoop() {
    if (!this.barcodeDetector || !this.cameraActive || this.isDetecting) return;
    this.isDetecting = true;

    const detect = async () => {
      if (!this.cameraActive) { this.isDetecting = false; return; }

      try {
        if (this.videoElement && this.videoElement.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
          const results = await this.barcodeDetector.detect(this.videoElement);
          if (results.length > 0 && !this.lookupCooldown) {
            const barcode = results[0].rawValue;
            this.onRealBarcodeDetected(barcode);
            // 3-second cooldown so we don't fire 60fps
            this.lookupCooldown = true;
            setTimeout(() => { this.lookupCooldown = false; }, 3000);
          }
        }
      } catch (e) { /* detector error — keep looping */ }

      if (this.cameraActive) requestAnimationFrame(detect);
    };

    requestAnimationFrame(detect);
  }

  // ─── Real barcode detected from camera ─────────────────────────────────────

  async onRealBarcodeDetected(barcode) {
    window.soundEngine.playScannerBeep();
    this._flashTargetFrame();

    const barcodeInput = document.getElementById('barcode-manual-input');
    if (barcodeInput) barcodeInput.value = barcode;

    await this.lookupAndShow(barcode, '📡 Real barcode scanned!');
  }

  // ─── Manual barcode entry lookup ────────────────────────────────────────────

  async onManualBarcodeSubmit() {
    const input = document.getElementById('barcode-manual-input');
    const barcode = input ? input.value.trim().replace(/\D/g, '') : '';

    if (!barcode || barcode.length < 6) {
      this._setStatusLabel('⚠️ Enter a valid barcode number (8–13 digits)');
      return;
    }

    window.soundEngine.playScannerBeep();
    this._flashTargetFrame();
    await this.lookupAndShow(barcode, '🔍 Looking up barcode…');
  }

  // ─── Pretend "BEEP!" button — no lookup, random fun item ──────────────────

  handlePretendBeep() {
    window.soundEngine.playScannerBeep();
    this._flashTargetFrame();

    const surpriseItems = [
      { name: 'Apple',        icon: '🍎', price: 1.00 },
      { name: 'Banana',       icon: '🍌', price: 0.50 },
      { name: 'Juice Box',    icon: '🧃', price: 1.25 },
      { name: 'Cookie',       icon: '🍪', price: 0.75 },
      { name: 'Toy Dinosaur', icon: '🦖', price: 4.00 },
      { name: 'Milk',         icon: '🥛', price: 1.50 },
      { name: 'Ice Cream',    icon: '🍦', price: 2.00 },
      { name: 'Pizza',        icon: '🍕', price: 2.50 },
      { name: 'Lollipop',     icon: '🍭', price: 0.50 },
      { name: 'Cheese',       icon: '🧀', price: 1.75 },
      { name: 'Hot Dog',      icon: '🌭', price: 1.50 },
      { name: 'Toy Car',      icon: '🚗', price: 3.50 },
    ];

    const item = surpriseItems[Math.floor(Math.random() * surpriseItems.length)];
    this.app.addItem(item.name, item.price, item.icon);
    window.confettiFX.burst(window.innerWidth / 2, window.innerHeight * 0.4, 25);
  }

  // ─── Lookup pipeline ────────────────────────────────────────────────────────

  async lookupAndShow(barcode, initialMsg) {
    this.showLookupLoading(initialMsg);

    const product = await this.lookupBarcode(barcode);

    if (product) {
      this.showProductCard(product);
    } else {
      this.showProductNotFound(barcode);
    }
  }

  /**
   * Two-API lookup:
   *  1. Open Food Facts  — world.openfoodfacts.org  (free, no key, food/grocery)
   *  2. UPC Item DB      — api.upcitemdb.com         (free trial, general retail)
   */
  async lookupBarcode(barcode) {
    // ── API 1: Open Food Facts ────────────────────────────────────────────────
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);

      const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
        { signal: ctrl.signal }
      );
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (data.status === 1 && data.product) {
          const p = data.product;
          const name = (p.product_name_en || p.product_name || p.generic_name || '').trim();
          if (name) {
            return {
              barcode,
              name,
              brand:    (p.brands || '').split(',')[0].trim(),
              emoji:    this._categoryToEmoji(p.categories_tags || []),
              image:    p.image_front_small_url || p.image_url || null,
              quantity: p.quantity || '',
              source:   'Open Food Facts'
            };
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('OFF lookup error:', e.message);
    }

    // ── API 2: UPC Item DB ────────────────────────────────────────────────────
    try {
      const ctrl2 = new AbortController();
      const timer2 = setTimeout(() => ctrl2.abort(), 6000);

      const res2 = await fetch(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
        { signal: ctrl2.signal }
      );
      clearTimeout(timer2);

      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.code === 'OK' && data2.items && data2.items.length > 0) {
          const item = data2.items[0];
          const name = (item.title || item.description || '').trim();
          if (name) {
            return {
              barcode,
              name,
              brand:    item.brand || '',
              emoji:    this._categoryToEmoji(item.category ? [item.category.toLowerCase()] : []),
              image:    item.images && item.images[0] ? item.images[0] : null,
              price:    item.lowest_recorded_price || null,
              quantity: item.size || '',
              source:   'UPC Item DB'
            };
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('UPC ItemDB error:', e.message);
    }

    return null;
  }

  // ─── Map Open Food Facts category tags to a friendly emoji ─────────────────

  _categoryToEmoji(tags) {
    const tagStr = (tags || []).join(' ').toLowerCase();
    if (/fruit|apple|banana|berry|orange|mango/.test(tagStr))    return '🍎';
    if (/vegetable|carrot|broccoli|salad|tomato/.test(tagStr))   return '🥦';
    if (/cereal|grain|bread|pasta|rice/.test(tagStr))            return '🌾';
    if (/dairy|milk|cheese|yogurt|butter/.test(tagStr))          return '🥛';
    if (/meat|beef|chicken|pork|fish|seafood/.test(tagStr))      return '🍗';
    if (/snack|chip|crisp|pretzel|popcorn/.test(tagStr))         return '🍟';
    if (/sweet|candy|chocolate|cookie|cake|sugar/.test(tagStr))  return '🍫';
    if (/beverage|drink|juice|soda|water|tea|coffee/.test(tagStr)) return '🥤';
    if (/baby|infant/.test(tagStr))                              return '👶';
    if (/pet|dog|cat/.test(tagStr))                              return '🐾';
    if (/toy|game|play/.test(tagStr))                            return '🎮';
    if (/book|magazine/.test(tagStr))                            return '📚';
    if (/cleaning|soap|hygiene|cosmetic|beauty/.test(tagStr))    return '🧴';
    return '🏷️';
  }

  // ─── UI helpers ─────────────────────────────────────────────────────────────

  showLookupLoading(msg) {
    const card = document.getElementById('product-result-card');
    if (!card) return;
    card.className = 'product-result-card lookup-loading';
    card.innerHTML = `
      <div class="lookup-spinner"></div>
      <div class="lookup-status-text">${msg}</div>
      <div class="lookup-sub">Searching product database…</div>
    `;
    card.style.display = 'flex';
  }

  showProductCard(product) {
    const card = document.getElementById('product-result-card');
    if (!card) return;

    // Suggest a price: use API price, else a small random pretend price
    const suggestedPrice = product.price
      ? product.price.toFixed(2)
      : (Math.random() * 4 + 0.5).toFixed(2);

    const imgHtml = product.image
      ? `<img class="product-img" src="${product.image}" alt="Product image" onerror="this.style.display='none'">`
      : `<div class="product-img-placeholder">${product.emoji}</div>`;

    card.className = 'product-result-card product-found';
    card.innerHTML = `
      <div class="product-found-header">
        <span class="found-badge">✅ FOUND!</span>
        <span class="found-source">${product.source}</span>
      </div>
      <div class="product-found-body">
        ${imgHtml}
        <div class="product-info">
          <div class="product-name">${product.emoji} ${product.name}</div>
          ${product.brand ? `<div class="product-brand">${product.brand}</div>` : ''}
          ${product.quantity ? `<div class="product-qty">${product.quantity}</div>` : ''}
          <div class="product-barcode-num">Barcode: ${product.barcode}</div>
        </div>
      </div>
      <div class="product-price-row">
        <span class="price-label">Set price: $</span>
        <input type="number" id="product-price-input" class="product-price-input"
               value="${suggestedPrice}" step="0.25" min="0.01" max="999">
      </div>
      <button class="kid-btn product-add-btn" id="product-add-to-cart-btn">
        🛒 ADD TO CART
      </button>
    `;

    card.style.display = 'flex';

    // Bind add button
    document.getElementById('product-add-to-cart-btn').addEventListener('click', () => {
      const priceInput = document.getElementById('product-price-input');
      const price = Math.max(0.01, parseFloat(priceInput.value) || 1.00);
      const displayName = product.brand
        ? `${product.name} (${product.brand})`
        : product.name;

      this.app.addItem(displayName.substring(0, 30), price, product.emoji);
      window.confettiFX.burst(window.innerWidth / 2, window.innerHeight * 0.5, 40);
      this.hideProductCard();
    });
  }

  showProductNotFound(barcode) {
    const card = document.getElementById('product-result-card');
    if (!card) return;

    card.className = 'product-result-card product-not-found';
    card.innerHTML = `
      <div class="not-found-icon">🔍</div>
      <div class="not-found-title">Product Not Found</div>
      <div class="not-found-sub">Barcode <strong>${barcode}</strong> isn't in the database — add it as a custom item!</div>
      <div class="product-price-row">
        <span class="price-label">Set price: $</span>
        <input type="number" id="product-price-input" class="product-price-input"
               value="1.00" step="0.25" min="0.01" max="999">
      </div>
      <button class="kid-btn product-add-btn" id="product-add-to-cart-btn">
        🛒 ADD ANYWAY
      </button>
    `;

    card.style.display = 'flex';

    document.getElementById('product-add-to-cart-btn').addEventListener('click', () => {
      const priceInput = document.getElementById('product-price-input');
      const price = Math.max(0.01, parseFloat(priceInput.value) || 1.00);
      this.app.addItem(`Mystery Item #${barcode.slice(-4)}`, price, '🏷️');
      this.hideProductCard();
    });
  }

  hideProductCard() {
    const card = document.getElementById('product-result-card');
    if (card) { card.style.display = 'none'; card.innerHTML = ''; }
  }

  _setStatusLabel(msg) {
    const el = document.getElementById('scanner-status-label');
    if (el) el.textContent = msg;
  }

  _flashTargetFrame() {
    const frame = document.querySelector('.scanner-target-frame');
    if (!frame) return;
    frame.classList.add('scan-success-anim');
    setTimeout(() => frame.classList.remove('scan-success-anim'), 500);
  }
}

window.KidScanner = KidScanner;
