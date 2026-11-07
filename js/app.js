/**
 * Kids Pretend Cash Register Main Application Logic
 */

class CashRegisterApp {
  constructor() {
    this.cart = [];
    this.total = 0;
    this.currentInput = '';
    this.activeTab = 'items'; // 'items', 'card', 'cash', 'keypad'
    this.scanner = null;
    this.customItems = [];

    // Preloaded fun kid items
    this.defaultItems = [
      { id: 'apple', name: 'Apple', icon: '🍎', price: 1.00, color: '#FF5964' },
      { id: 'banana', name: 'Banana', icon: '🍌', price: 0.50, color: '#FFE066' },
      { id: 'icecream', name: 'Ice Cream', icon: '🍦', price: 2.00, color: '#F78888' },
      { id: 'pizza', name: 'Pizza', icon: '🍕', price: 2.50, color: '#FF9F1C' },
      { id: 'cookie', name: 'Cookie', icon: '🍪', price: 0.75, color: '#B07D62' },
      { id: 'milk', name: 'Milk', icon: '🥛', price: 1.50, color: '#90E0EF' },
      { id: 'teddy', name: 'Teddy Bear', icon: '🧸', price: 5.00, color: '#DDB892' },
      { id: 'toycar', name: 'Toy Car', icon: '🚗', price: 3.50, color: '#5BC0BE' },
      { id: 'donut', name: 'Donut', icon: '🍩', price: 1.25, color: '#F38181' },
      { id: 'juice', name: 'Juice Box', icon: '🧃', price: 1.25, color: '#95D5B2' },
      { id: 'balloon', name: 'Balloon', icon: '🎈', price: 1.00, color: '#F25F5C' },
      { id: 'lollipop', name: 'Lollipop', icon: '🍭', price: 0.50, color: '#A78BFA' }
    ];

    this.cashTendered = 0;
    this.isProcessingCard = false;
    this.init();
  }

  init() {
    this.scanner = new window.KidScanner(this);
    this.renderQuickItems();
    this.bindEvents();
    this.updateDisplay();
    this.switchTab('items');

    // Welcome voice announcement on first interaction
    document.addEventListener('pointerdown', () => {
      window.soundEngine.init();
    }, { once: true });
  }

  // --- Cart Management ---

  addItem(name, price, icon = '🛍️') {
    window.soundEngine.playScannerBeep();
    const existing = this.cart.find(item => item.name === name && item.price === price);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.push({
        id: Date.now() + Math.random(),
        name,
        price,
        icon,
        quantity: 1
      });
    }

    this.calculateTotal();
    this.updateDisplay(`Added ${name}!`);

    // Cute voice speech

    // Bouncy animation on total badge
    const totalEl = document.getElementById('screen-total');
    if (totalEl) {
      totalEl.classList.remove('bounce-pop');
      void totalEl.offsetWidth; // trigger reflow
      totalEl.classList.add('bounce-pop');
    }
  }

  removeItem(id) {
    window.soundEngine.playClearSound();
    this.cart = this.cart.filter(item => item.id !== id);
    this.calculateTotal();
    this.updateDisplay('Item removed');
  }

  clearCart() {
    window.soundEngine.playClearSound();
    this.cart = [];
    this.total = 0;
    this.currentInput = '';
    this.cashTendered = 0;
    this.updateDisplay('Ready for next customer! 🛒');
    this.hideReceipt();
    this.closeCashDrawer();
    this.resetCardReader();
  }

  calculateTotal() {
    this.total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  formatCurrency(amount) {
    return '$' + amount.toFixed(2);
  }

  // --- Display and UI Updates ---

  updateDisplay(statusMsg = null) {
    const totalEl = document.getElementById('screen-total');
    const countEl = document.getElementById('screen-item-count');
    const msgEl = document.getElementById('screen-status-msg');
    const cartListEl = document.getElementById('cart-items-list');

    if (totalEl) totalEl.textContent = this.formatCurrency(this.total);
    if (countEl) {
      const count = this.cart.reduce((sum, i) => sum + i.quantity, 0);
      countEl.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
    }

    if (msgEl) {
      if (statusMsg) {
        msgEl.textContent = statusMsg;
      } else if (this.cart.length === 0) {
        msgEl.textContent = 'Welcome! Tap items or scan to start 🍎';
      } else {
        msgEl.textContent = `Total is ${this.formatCurrency(this.total)}. Pay with Card or Cash! 💳💵`;
      }
    }

    // Render Mini Cart List inside screen
    if (cartListEl) {
      if (this.cart.length === 0) {
        cartListEl.innerHTML = '<div class="empty-cart-msg">Your cart is empty! Press any item button below ⬇️</div>';
      } else {
        cartListEl.innerHTML = this.cart.map(item => `
          <div class="cart-item-pill">
            <span class="item-icon">${item.icon}</span>
            <span class="item-desc">${item.name} ${item.quantity > 1 ? `x${item.quantity}` : ''}</span>
            <span class="item-cost">${this.formatCurrency(item.price * item.quantity)}</span>
            <button class="item-delete-btn" data-id="${item.id}" aria-label="Remove item">×</button>
          </div>
        `).join('');

        // Scroll to bottom of cart list
        cartListEl.scrollTop = cartListEl.scrollHeight;

        // Bind delete buttons
        cartListEl.querySelectorAll('.item-delete-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseFloat(btn.dataset.id);
            this.removeItem(id);
          });
        });
      }
    }

    // Update Pay button totals
    const cardPayAmount = document.getElementById('card-reader-amount');
    if (cardPayAmount) cardPayAmount.textContent = this.formatCurrency(this.total);

    const cashDueAmount = document.getElementById('cash-due-amount');
    if (cashDueAmount) cashDueAmount.textContent = this.formatCurrency(this.total);
  }

  // --- Render Item Grid ---

  renderQuickItems() {
    const grid = document.getElementById('quick-items-grid');
    if (!grid) return;

    const allItems = [...this.defaultItems, ...this.customItems];
    grid.innerHTML = allItems.map(item => `
      <button class="kid-btn item-btn" style="--item-color: ${item.color || '#48CAE4'}" data-name="${item.name}" data-price="${item.price}" data-icon="${item.icon}">
        <span class="item-btn-icon">${item.icon}</span>
        <span class="item-btn-name">${item.name}</span>
        <span class="item-btn-price">${this.formatCurrency(item.price)}</span>
      </button>
    `).join('') + `
      <button class="kid-btn item-btn add-custom-item-btn" id="open-custom-item-btn" style="--item-color: #A0C4FF">
        <span class="item-btn-icon">➕</span>
        <span class="item-btn-name">Add New</span>
        <span class="item-btn-price">Custom</span>
      </button>
    `;

    // Bind item click
    grid.querySelectorAll('.item-btn:not(.add-custom-item-btn)').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const price = parseFloat(btn.dataset.price);
        const icon = btn.dataset.icon;
        this.addItem(name, price, icon);
      });
    });

    const addBtn = document.getElementById('open-custom-item-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openCustomItemDialog());
    }
  }

  // --- Keypad Manual Entry ---

  handleKeypadPress(key) {
    window.soundEngine.playKeypadClick(400 + Math.random() * 200);

    const numDisplay = document.getElementById('keypad-input-display');
    if (key === 'C') {
      this.currentInput = '';
    } else if (key === 'ENTER') {
      if (this.currentInput && parseFloat(this.currentInput) > 0) {
        const price = parseFloat(this.currentInput);
        this.addItem('Custom Item', price, '🏷️');
        this.currentInput = '';
      }
    } else if (key === '.') {
      if (!this.currentInput.includes('.')) {
        this.currentInput = (this.currentInput || '0') + '.';
      }
    } else if (key === '00') {
      if (this.currentInput && this.currentInput !== '0' && this.currentInput.length <= 4) {
        this.currentInput += '00';
      }
    } else {
      // Numbers
      if (this.currentInput === '0' && key !== '0') {
        this.currentInput = key;
      } else if (this.currentInput.length < 6) {
        this.currentInput += key;
      }
    }

    if (numDisplay) {
      numDisplay.textContent = this.currentInput ? '$' + this.currentInput : '$0.00';
    }
  }

  // --- Pretend Credit Card Machine (POS Terminal) ---

  triggerCardPayment(method = 'TAP') {
    if (this.isProcessingCard) return;
    if (this.total <= 0) {
      this.updateDisplay('Scan items first! Cart is $0.00 🍎');
      return;
    }

    this.isProcessingCard = true;
    const terminalScreen = document.getElementById('pos-screen-text');
    const terminalIcon = document.getElementById('pos-status-icon');
    const leds = [
      document.getElementById('led-1'),
      document.getElementById('led-2'),
      document.getElementById('led-3'),
      document.getElementById('led-4')
    ];

    // Reset LEDs
    leds.forEach(led => led && led.classList.remove('active', 'success'));

    if (terminalScreen) terminalScreen.textContent = method === 'TAP' ? 'CARD DETECTED! HOLD STILL...' : 'READING CHIP...';
    if (terminalIcon) terminalIcon.textContent = '📶';

    // Play contactless 4-beep sequence with LED lighting
    window.soundEngine.playCardTapSequence((ledIndex) => {
      const led = leds[ledIndex - 1];
      if (led) led.classList.add(ledIndex === 4 ? 'success' : 'active');
    });

    // POS Machine Processing Sequence
    setTimeout(() => {
      if (terminalScreen) terminalScreen.textContent = 'AUTHORIZING... ⏳';
      if (terminalIcon) terminalIcon.textContent = '🔄';
    }, 450);

    // Approval Chime and Confetti!
    setTimeout(() => {
      if (terminalScreen) terminalScreen.textContent = 'APPROVED! ✔️';
      if (terminalIcon) terminalIcon.textContent = '🎉';
      leds.forEach(led => led && led.classList.add('success'));

      window.soundEngine.playApprovedChime();
      window.confettiFX.burst(window.innerWidth / 2, window.innerHeight * 0.45, 60);

      // Print Receipt!
      this.printReceipt('CARD (Tap-to-Pay)');

      this.isProcessingCard = false;
    }, 1250);
  }

  resetCardReader() {
    this.isProcessingCard = false;
    const terminalScreen = document.getElementById('pos-screen-text');
    const terminalIcon = document.getElementById('pos-status-icon');
    const leds = [
      document.getElementById('led-1'),
      document.getElementById('led-2'),
      document.getElementById('led-3'),
      document.getElementById('led-4')
    ];

    if (terminalScreen) terminalScreen.textContent = 'TAP, INSERT, OR SWIPE CARD';
    if (terminalIcon) terminalIcon.textContent = '💳';
    leds.forEach(led => led && led.classList.remove('active', 'success'));
  }

  // --- Pretend Cash Register Drawer ---

  openCashDrawer() {
    window.soundEngine.playKaChing();
    const drawer = document.getElementById('cash-drawer-section');
    if (drawer) {
      drawer.classList.add('drawer-open');
    }
    this.updateDisplay(`Cash drawer open! Cha-ching! 💵`);
  }

  closeCashDrawer() {
    const drawer = document.getElementById('cash-drawer-section');
    if (drawer) {
      drawer.classList.remove('drawer-open');
    }
  }

  handleCashPayment(amount) {
    if (this.total <= 0) {
      this.updateDisplay('Add items to cart first! 🛒');
      return;
    }

    if (amount === 'EXACT') {
      this.cashTendered = this.total;
    } else {
      this.cashTendered += parseFloat(amount);
      if (amount >= 1) {
        window.soundEngine.playKaChing();
      } else {
        window.soundEngine.playCoinDrop();
      }
    }

    this.calculateCashChange();
  }

  calculateCashChange() {
    const changeDue = this.cashTendered - this.total;
    const tenderedEl = document.getElementById('cash-tendered-val');
    const changeEl = document.getElementById('cash-change-val');
    const changeTipEl = document.getElementById('cash-change-tip');

    if (tenderedEl) tenderedEl.textContent = this.formatCurrency(this.cashTendered);

    if (changeDue >= 0) {
      if (changeEl) {
        changeEl.textContent = this.formatCurrency(changeDue);
        changeEl.classList.add('change-positive');
      }

      // Kid-friendly change breakdown
      const tipText = this.getChangeBreakdownText(changeDue);
      if (changeTipEl) changeTipEl.textContent = tipText;

      window.soundEngine.playApprovedChime();
      window.confettiFX.burst(window.innerWidth / 2, window.innerHeight * 0.45, 45);

      if (changeDue === 0) {
      } else {
      }

      // Print Receipt
      this.printReceipt(`CASH (Paid: ${this.formatCurrency(this.cashTendered)})`, changeDue);
    } else {
      const stillNeed = Math.abs(changeDue);
      if (changeEl) {
        changeEl.textContent = `Need ${this.formatCurrency(stillNeed)} more`;
        changeEl.classList.remove('change-positive');
      }
      if (changeTipEl) changeTipEl.textContent = `Put more bills or coins in the drawer! 💰`;
    }
  }

  getChangeBreakdownText(change) {
    if (change <= 0) return 'Exact change! No coins needed ⭐';

    let cents = Math.round(change * 100);
    const bills20 = Math.floor(cents / 2000); cents %= 2000;
    const bills10 = Math.floor(cents / 1000); cents %= 1000;
    const bills5 = Math.floor(cents / 500); cents %= 500;
    const bills1 = Math.floor(cents / 100); cents %= 100;
    const quarters = Math.floor(cents / 25); cents %= 25;
    const dimes = Math.floor(cents / 10); cents %= 10;
    const nickels = Math.floor(cents / 5); cents %= 5;
    const pennies = cents;

    const parts = [];
    if (bills20) parts.push(`${bills20} $20 bill${bills20 > 1 ? 's' : ''}`);
    if (bills10) parts.push(`${bills10} $10 bill${bills10 > 1 ? 's' : ''}`);
    if (bills5) parts.push(`${bills5} $5 bill${bills5 > 1 ? 's' : ''}`);
    if (bills1) parts.push(`${bills1} $1 bill${bills1 > 1 ? 's' : ''}`);
    if (quarters) parts.push(`${quarters} quarter${quarters > 1 ? 's' : ''}`);
    if (dimes) parts.push(`${dimes} dime${dimes > 1 ? 's' : ''}`);
    if (nickels) parts.push(`${nickels} nickel${nickels > 1 ? 's' : ''}`);
    if (pennies) parts.push(`${pennies} penny${pennies > 1 ? 'ies' : ''}`);

    return 'Give: ' + parts.join(', ');
  }

  // --- Receipt Printer ---

  printReceipt(payMethod, changeDue = 0) {
    window.soundEngine.playPrinterMotor();
    const receiptContainer = document.getElementById('receipt-container');
    const receiptBody = document.getElementById('receipt-body');

    if (!receiptContainer || !receiptBody) return;

    const dateStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let itemsHtml = this.cart.map(i => `
      <div class="receipt-row">
        <span>${i.name} x${i.quantity}</span>
        <span>${this.formatCurrency(i.price * i.quantity)}</span>
      </div>
    `).join('');

    receiptBody.innerHTML = `
      <div class="receipt-header">
        <div class="receipt-store-name">⭐ SUPERMART PLAY ⭐</div>
        <div>Order #${Math.floor(1000 + Math.random() * 9000)} | ${dateStr}</div>
      </div>
      <div class="receipt-divider">--------------------------------</div>
      <div class="receipt-items">
        ${itemsHtml}
      </div>
      <div class="receipt-divider">--------------------------------</div>
      <div class="receipt-row receipt-bold">
        <span>TOTAL:</span>
        <span>${this.formatCurrency(this.total)}</span>
      </div>
      <div class="receipt-row">
        <span>PAID WITH:</span>
        <span>${payMethod}</span>
      </div>
      ${changeDue > 0 ? `
      <div class="receipt-row">
        <span>CHANGE DUE:</span>
        <span>${this.formatCurrency(changeDue)}</span>
      </div>` : ''}
      <div class="receipt-divider">--------------------------------</div>
      <div class="receipt-footer">
        <div>THANK YOU FOR SHOPPING! 🛍️</div>
        <div>HAVE A MAGICAL DAY! 🌈</div>
        <div class="receipt-barcode">||| |||| | ||||| || |||</div>
      </div>
    `;

    // Slide out animation
    receiptContainer.classList.remove('receipt-hidden');
    receiptContainer.classList.add('receipt-printing');
  }

  hideReceipt() {
    const receiptContainer = document.getElementById('receipt-container');
    if (receiptContainer) {
      receiptContainer.classList.add('receipt-hidden');
      receiptContainer.classList.remove('receipt-printing');
    }
  }

  // --- Custom Item Modal ---

  openCustomItemDialog() {
    const modal = document.getElementById('custom-item-modal');
    if (modal) modal.classList.add('visible');
  }

  closeCustomItemDialog() {
    const modal = document.getElementById('custom-item-modal');
    if (modal) modal.classList.remove('visible');
  }

  saveCustomItem() {
    const nameInput = document.getElementById('custom-item-name');
    const priceInput = document.getElementById('custom-item-price');
    const emojiInput = document.getElementById('custom-item-emoji');

    const name = nameInput.value.trim() || 'My Toy';
    const price = Math.max(0.01, parseFloat(priceInput.value) || 1.00);
    const icon = emojiInput.value.trim() || '🎁';

    this.customItems.push({
      id: 'custom_' + Date.now(),
      name,
      price,
      icon,
      color: '#BDB2FF'
    });

    this.renderQuickItems();
    this.closeCustomItemDialog();
    window.soundEngine.playKeypadClick();
    this.addItem(name, price, icon);

    // reset fields
    nameInput.value = '';
    priceInput.value = '';
  }

  // --- Bind Event Listeners ---

  bindEvents() {
    // Mode Switcher Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.tab;
        this.switchTab(mode);
      });
    });

    // Scanner Gun button on header/dock
    const scannerGunBtn = document.getElementById('scanner-gun-btn');
    if (scannerGunBtn) {
      scannerGunBtn.addEventListener('click', () => {
        this.scanner.openScannerModal();
      });
    }

    // Modal close buttons
    const closeScannerBtn = document.getElementById('close-scanner-btn');
    if (closeScannerBtn) {
      closeScannerBtn.addEventListener('click', () => {
        this.scanner.closeScannerModal();
      });
    }

    // Scan Barcode Trigger inside modal — pretend "BEEP!" mode
    const triggerScanModalBtn = document.getElementById('trigger-scan-btn');
    if (triggerScanModalBtn) {
      triggerScanModalBtn.addEventListener('click', () => {
        this.scanner.handlePretendBeep();
      });
    }

    // Manual barcode lookup button
    const barcodeLookupBtn = document.getElementById('barcode-lookup-btn');
    if (barcodeLookupBtn) {
      barcodeLookupBtn.addEventListener('click', () => {
        this.scanner.onManualBarcodeSubmit();
      });
    }

    // Allow pressing Enter in the barcode input field too
    const barcodeInput = document.getElementById('barcode-manual-input');
    if (barcodeInput) {
      barcodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.scanner.onManualBarcodeSubmit();
        }
      });
    }

    // Pretend Card Tap Area (Large touch target)
    const cardTapPad = document.getElementById('card-tap-pad');
    if (cardTapPad) {
      cardTapPad.addEventListener('click', () => {
        this.triggerCardPayment('TAP');
      });
    }

    // Chip Insert Button
    const cardChipBtn = document.getElementById('card-chip-btn');
    if (cardChipBtn) {
      cardChipBtn.addEventListener('click', () => {
        this.triggerCardPayment('CHIP');
      });
    }

    // Card Swipe Slot
    const cardSwipeSlot = document.getElementById('card-swipe-slot');
    if (cardSwipeSlot) {
      cardSwipeSlot.addEventListener('click', () => {
        this.triggerCardPayment('SWIPE');
      });
    }

    // Pretend Card Drag/Hold interaction
    const draggableCard = document.getElementById('interactive-pretend-card');
    if (draggableCard) {
      draggableCard.addEventListener('click', () => {
        this.triggerCardPayment('TAP');
      });
    }

    // Cash Drawer Open Button
    const openDrawerBtn = document.getElementById('open-drawer-btn');
    if (openDrawerBtn) {
      openDrawerBtn.addEventListener('click', () => {
        this.openCashDrawer();
      });
    }

    // Cash Tender Buttons ($1, $5, $10, $20, Exact)
    document.querySelectorAll('.quick-cash-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const amount = btn.dataset.cash;
        this.handleCashPayment(amount);
      });
    });

    // Drawer Money items click (Bills & Coins in tray)
    document.querySelectorAll('.drawer-money-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const amount = parseFloat(btn.dataset.val);
        this.handleCashPayment(amount);
      });
    });

    // Keypad Buttons
    document.querySelectorAll('.keypad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        this.handleKeypadPress(key);
      });
    });

    // Clear / Reset Button
    const clearBtn = document.getElementById('clear-cart-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearCart();
      });
    }

    // Tear Receipt Button
    const tearReceiptBtn = document.getElementById('tear-receipt-btn');
    if (tearReceiptBtn) {
      tearReceiptBtn.addEventListener('click', () => {
        window.soundEngine.playKeypadClick(800);
        this.hideReceipt();
        this.clearCart();
      });
    }

    // Audio / Voice / Music Toggles
    const sfxToggle = document.getElementById('sfx-toggle-btn');
    if (sfxToggle) {
      sfxToggle.addEventListener('click', () => {
        window.soundEngine.sfxEnabled = !window.soundEngine.sfxEnabled;
        sfxToggle.classList.toggle('active', window.soundEngine.sfxEnabled);
        sfxToggle.textContent = window.soundEngine.sfxEnabled ? '🔊 SFX' : '🔇 SFX';
      });
    }

    const musicToggle = document.getElementById('music-toggle-btn');
    if (musicToggle) {
      musicToggle.addEventListener('click', () => {
        const isPlaying = window.soundEngine.toggleMusic();
        musicToggle.classList.toggle('active', isPlaying);
        musicToggle.textContent = isPlaying ? '🎵 Music: ON' : '🎵 Music';
      });
    }


    // Custom Item Modal actions
    const saveCustomBtn = document.getElementById('save-custom-item-btn');
    if (saveCustomBtn) {
      saveCustomBtn.addEventListener('click', () => this.saveCustomItem());
    }

    const cancelCustomBtn = document.getElementById('cancel-custom-item-btn');
    if (cancelCustomBtn) {
      cancelCustomBtn.addEventListener('click', () => this.closeCustomItemDialog());
    }
  }

  switchTab(tabId) {
    window.soundEngine.playKeypadClick(500);
    this.activeTab = tabId;

    const root = document.getElementById('app-root');
    if (root) root.dataset.activeTab = tabId;

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });

    // Auto-open cash drawer when switching to cash tab
    if (tabId === 'cash') {
      this.openCashDrawer();
    } else if (tabId === 'card') {
      this.resetCardReader();
    }
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new CashRegisterApp();
});
