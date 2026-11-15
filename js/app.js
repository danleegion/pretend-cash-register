/**
 * Kids Pretend Cash Register Main Application Logic
 * Supports persistent items in localStorage, editing & deleting items,
 * Card machine payments, and responsive mobile-first UI.
 */

class CashRegisterApp {
  constructor() {
    this.cart = [];
    this.total = 0;
    this.currentInput = '';
    this.activeTab = 'items'; // 'items', 'card', 'keypad'
    this.scanner = null;

    // Standard preloaded fun kid items
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

    this.items = this.loadSavedItems();
    this.isProcessingCard = false;
    this.init();
  }

  init() {
    this.scanner = new window.KidScanner(this);
    this.renderQuickItems();
    this.bindEvents();
    this.updateDisplay();
    this.switchTab('items');

    document.addEventListener('pointerdown', () => {
      window.soundEngine.init();
    }, { once: true });
  }

  // --- LocalStorage Items Persistence ---

  loadSavedItems() {
    try {
      const saved = localStorage.getItem('kids_register_items_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load items from localStorage', e);
    }
    return JSON.parse(JSON.stringify(this.defaultItems));
  }

  saveItems() {
    try {
      localStorage.setItem('kids_register_items_v2', JSON.stringify(this.items));
    } catch (e) {
      console.warn('Could not save items to localStorage', e);
    }
  }

  resetDefaultItems() {
    this.items = JSON.parse(JSON.stringify(this.defaultItems));
    this.saveItems();
    this.renderQuickItems();
    this.closeCustomItemDialog();
    this.closeEditItemDialog();
    window.soundEngine.playKeypadClick(600);
    this.updateDisplay('Restored original 12 items! ⭐');
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

    const totalEl = document.getElementById('screen-total');
    if (totalEl) {
      totalEl.classList.remove('bounce-pop');
      void totalEl.offsetWidth;
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
    this.updateDisplay('Ready for next customer! 🛒');
    this.hideReceipt();
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
        msgEl.textContent = `Total is ${this.formatCurrency(this.total)}. Pay with Card! 💳`;
      }
    }

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

        cartListEl.scrollTop = cartListEl.scrollHeight;

        cartListEl.querySelectorAll('.item-delete-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseFloat(btn.dataset.id);
            this.removeItem(id);
          });
        });
      }
    }

    const cardPayAmount = document.getElementById('card-reader-amount');
    if (cardPayAmount) cardPayAmount.textContent = this.formatCurrency(this.total);
  }

  // --- Render Item Grid with Edit Buttons ---

  renderQuickItems() {
    const grid = document.getElementById('quick-items-grid');
    if (!grid) return;

    grid.innerHTML = this.items.map(item => `
      <div class="item-card-wrapper" style="--item-color: ${item.color || '#48CAE4'}">
        <button class="kid-btn item-btn" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-icon="${item.icon}">
          <span class="item-btn-icon">${item.icon}</span>
          <span class="item-btn-name">${item.name}</span>
          <span class="item-btn-price">${this.formatCurrency(item.price)}</span>
        </button>
        <button class="item-edit-btn" data-id="${item.id}" aria-label="Edit ${item.name}" title="Edit Item">✏️</button>
      </div>
    `).join('') + `
      <div class="item-card-wrapper add-new-wrapper">
        <button class="kid-btn item-btn add-custom-item-btn" id="open-custom-item-btn" style="--item-color: #A0C4FF">
          <span class="item-btn-icon">➕</span>
          <span class="item-btn-name">Add New</span>
          <span class="item-btn-price">Custom</span>
        </button>
      </div>
    `;

    // Item click -> add to cart
    grid.querySelectorAll('.item-btn:not(.add-custom-item-btn)').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const price = parseFloat(btn.dataset.price);
        const icon = btn.dataset.icon;
        this.addItem(name, price, icon);
      });
    });

    // Small edit button click -> open edit dialog
    grid.querySelectorAll('.item-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        this.openEditItemDialog(id);
      });
    });

    const addBtn = document.getElementById('open-custom-item-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openCustomItemDialog());
    }
  }

  // --- Edit & Delete Item Modal ---

  openEditItemDialog(id) {
    const item = this.items.find(i => String(i.id) === String(id));
    if (!item) return;

    const modal = document.getElementById('edit-item-modal');
    if (!modal) return;

    document.getElementById('edit-item-id').value = item.id;
    document.getElementById('edit-item-name').value = item.name;
    document.getElementById('edit-item-price').value = item.price.toFixed(2);
    document.getElementById('edit-item-emoji').value = item.icon || '🎁';

    modal.classList.add('visible');
    window.soundEngine.playKeypadClick(480);
  }

  closeEditItemDialog() {
    const modal = document.getElementById('edit-item-modal');
    if (modal) modal.classList.remove('visible');
  }

  saveEditedItem() {
    const id = document.getElementById('edit-item-id').value;
    const nameInput = document.getElementById('edit-item-name');
    const priceInput = document.getElementById('edit-item-price');
    const emojiInput = document.getElementById('edit-item-emoji');

    const item = this.items.find(i => String(i.id) === String(id));
    if (!item) return;

    item.name = nameInput.value.trim() || item.name;
    item.price = Math.max(0.01, parseFloat(priceInput.value) || 1.00);
    item.icon = emojiInput.value.trim() || item.icon;

    this.saveItems();
    this.renderQuickItems();
    this.closeEditItemDialog();
    window.soundEngine.playApprovedChime();
    this.updateDisplay(`Updated ${item.name}! ⭐`);
  }

  deleteItem(id) {
    const item = this.items.find(i => String(i.id) === String(id));
    const itemName = item ? item.name : 'Item';

    this.items = this.items.filter(i => String(i.id) !== String(id));
    this.saveItems();
    this.renderQuickItems();
    this.closeEditItemDialog();
    window.soundEngine.playClearSound();
    this.updateDisplay(`Deleted ${itemName} 🗑️`);
  }

  // --- Add Custom Item Modal ---

  openCustomItemDialog() {
    const modal = document.getElementById('custom-item-modal');
    if (modal) modal.classList.add('visible');
    window.soundEngine.playKeypadClick(480);
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

    const newItem = {
      id: 'custom_' + Date.now(),
      name,
      price,
      icon,
      color: '#BDB2FF'
    };

    this.items.push(newItem);
    this.saveItems();
    this.renderQuickItems();
    this.closeCustomItemDialog();
    window.soundEngine.playApprovedChime();
    this.addItem(name, price, icon);

    nameInput.value = '';
    priceInput.value = '';
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

    leds.forEach(led => led && led.classList.remove('active', 'success'));

    if (terminalScreen) terminalScreen.textContent = method === 'TAP' ? 'CARD DETECTED! HOLD STILL...' : 'READING CHIP...';
    if (terminalIcon) terminalIcon.textContent = '📶';

    window.soundEngine.playCardTapSequence((ledIndex) => {
      const led = leds[ledIndex - 1];
      if (led) led.classList.add(ledIndex === 4 ? 'success' : 'active');
    });

    setTimeout(() => {
      if (terminalScreen) terminalScreen.textContent = 'AUTHORIZING... ⏳';
      if (terminalIcon) terminalIcon.textContent = '🔄';
    }, 450);

    setTimeout(() => {
      if (terminalScreen) terminalScreen.textContent = 'APPROVED! ✔️';
      if (terminalIcon) terminalIcon.textContent = '🎉';
      leds.forEach(led => led && led.classList.add('success'));

      window.soundEngine.playApprovedChime();
      window.confettiFX.burst(window.innerWidth / 2, window.innerHeight * 0.45, 60);

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

  // --- Receipt Printer ---

  printReceipt(payMethod) {
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
      <div class="receipt-divider">--------------------------------</div>
      <div class="receipt-footer">
        <div>THANK YOU FOR SHOPPING! 🛍️</div>
        <div>HAVE A MAGICAL DAY! 🌈</div>
        <div class="receipt-barcode">||| |||| | ||||| || |||</div>
      </div>
    `;

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

  // --- Event Bindings ---

  bindEvents() {
    // Mode Switcher Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.tab;
        this.switchTab(mode);
      });
    });

    // Bottom Dock Action Button (toggles Card Machine <-> Items)
    const dockActionBtn = document.getElementById('dock-action-btn');
    if (dockActionBtn) {
      dockActionBtn.addEventListener('click', () => {
        if (this.activeTab === 'card') {
          this.switchTab('items');
        } else {
          this.switchTab('card');
        }
      });
    }

    // Scanner Gun button on header
    const scannerGunBtn = document.getElementById('scanner-gun-btn');
    if (scannerGunBtn) {
      scannerGunBtn.addEventListener('click', () => {
        this.scanner.openScannerModal();
      });
    }

    const closeScannerBtn = document.getElementById('close-scanner-btn');
    if (closeScannerBtn) {
      closeScannerBtn.addEventListener('click', () => {
        this.scanner.closeScannerModal();
      });
    }

    const triggerScanModalBtn = document.getElementById('trigger-scan-btn');
    if (triggerScanModalBtn) {
      triggerScanModalBtn.addEventListener('click', () => {
        this.scanner.handlePretendBeep();
      });
    }

    const barcodeLookupBtn = document.getElementById('barcode-lookup-btn');
    if (barcodeLookupBtn) {
      barcodeLookupBtn.addEventListener('click', () => {
        this.scanner.onManualBarcodeSubmit();
      });
    }

    const barcodeInput = document.getElementById('barcode-manual-input');
    if (barcodeInput) {
      barcodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.scanner.onManualBarcodeSubmit();
        }
      });
    }

    // Card Tap Pad
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

    // Pretend Card Widget
    const draggableCard = document.getElementById('interactive-pretend-card');
    if (draggableCard) {
      draggableCard.addEventListener('click', () => {
        this.triggerCardPayment('TAP');
      });
    }

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

    // Audio SFX Toggle
    const sfxToggle = document.getElementById('sfx-toggle-btn');
    if (sfxToggle) {
      sfxToggle.addEventListener('click', () => {
        window.soundEngine.sfxEnabled = !window.soundEngine.sfxEnabled;
        sfxToggle.classList.toggle('active', window.soundEngine.sfxEnabled);
        sfxToggle.textContent = window.soundEngine.sfxEnabled ? '🔊 SFX' : '🔇 SFX';
      });
    }

    // Music Toggle (random tracks)
    const musicToggle = document.getElementById('music-toggle-btn');
    if (musicToggle) {
      musicToggle.addEventListener('click', async () => {
        const track = await window.soundEngine.toggleMusic();
        if (track) {
          musicToggle.classList.add('active');
          musicToggle.textContent = '🎵 Music: ON';
          this.updateDisplay(`Now playing: ${track.name} 🎶`);
        } else {
          musicToggle.classList.remove('active');
          musicToggle.textContent = '🎵 Music';
        }
      });
    }

    // Add Custom Item Modal
    const saveCustomBtn = document.getElementById('save-custom-item-btn');
    if (saveCustomBtn) {
      saveCustomBtn.addEventListener('click', () => this.saveCustomItem());
    }

    const cancelCustomBtn = document.getElementById('cancel-custom-item-btn');
    if (cancelCustomBtn) {
      cancelCustomBtn.addEventListener('click', () => this.closeCustomItemDialog());
    }

    const resetDefaultsBtn = document.getElementById('reset-defaults-btn');
    if (resetDefaultsBtn) {
      resetDefaultsBtn.addEventListener('click', () => {
        if (confirm('Restore the original 12 store items?')) {
          this.resetDefaultItems();
        }
      });
    }

    // Edit Item Modal
    const saveEditBtn = document.getElementById('save-edit-item-btn');
    if (saveEditBtn) {
      saveEditBtn.addEventListener('click', () => this.saveEditedItem());
    }

    const deleteItemBtn = document.getElementById('delete-item-btn');
    if (deleteItemBtn) {
      deleteItemBtn.addEventListener('click', () => {
        const id = document.getElementById('edit-item-id').value;
        this.deleteItem(id);
      });
    }

    const cancelEditBtn = document.getElementById('cancel-edit-item-btn');
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => this.closeEditItemDialog());
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

    // Update bottom dock button state
    const dockBtn = document.getElementById('dock-action-btn');
    if (dockBtn) {
      if (tabId === 'card') {
        dockBtn.textContent = '🍎 BACK TO ITEMS';
        dockBtn.classList.add('back-items-mode');
      } else {
        dockBtn.textContent = '💳 CARD MACHINE';
        dockBtn.classList.remove('back-items-mode');
      }
    }

    if (tabId === 'card') {
      this.resetCardReader();
    }
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new CashRegisterApp();
});
