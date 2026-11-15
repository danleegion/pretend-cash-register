# 🛒 Kids Toy Cash Register — Project Documentation & Handover

> **Status:** Fully mobile-optimized, offline PWA with ZXing camera barcode scanner, card terminal, and persistent item editing.  
> **Last updated:** November 2026

---

## 📁 Project Structure

```
pretend-cash-register/
├── index.html          # Main HTML shell (3-tab UI, barcode viewfinder, modals)
├── manifest.json       # PWA manifest & home screen configuration
├── css/
│   └── styles.css      # Compact, kid-friendly mobile CSS (iPhone 13 Pro optimized)
├── js/
│   ├── app.js          # App controller: cart, localStorage items, POS terminal, tabs
│   ├── audio.js        # Web Audio API sound engine (5 random synth tracks + SFX)
│   ├── confetti.js     # Canvas celebratory confetti burst particle system
│   ├── scanner.js      # ZXing video stream barcode reader + OpenFoodFacts lookup
│   └── zxing.min.js    # Bundled standalone ZXing 1D/2D barcode decoder library
└── assets/
    ├── apple-touch-icon.png # 180x180 high-res home screen icon for iOS
    ├── icon-192.png    # 192x192 PWA launcher icon
    └── icon-512.png    # 512x512 PWA launcher icon
```

---

## ✅ Implemented Features

| Feature | Details | Status |
|---|---|---|
| **Compact Mobile Viewport** | Zero unnecessary vertical scroll on iPhone 13 Pro (390×844) | ✅ Done |
| **Navigation Tabs** | 3 clean tabs: 🍎 Items, 💳 Card Machine, 🔢 Keypad | ✅ Done |
| **Item Persistence** | Custom items, edits, and deletes saved to `localStorage` | ✅ Done |
| **Item Editing** | Small ✏️ button on each card to edit name, price, emoji, or delete | ✅ Done |
| **Reset Items** | One-tap button to restore original 12 default store items | ✅ Done |
| **Keypad Scoping** | Keypad only renders when Keypad tab is active (no background spill) | ✅ Done |
| **Card Terminal (POS)** | Compact tap pad, floating pretend card, chip & swipe buttons | ✅ Done |
| **Cart Collapse** | Cart list collapses on Card & Keypad tabs to optimize height | ✅ Done |
| **Randomized Music** | 5 joyful Web Audio tracks, randomly selected on play | ✅ Done |
| **Web Audio Stability** | Persistent gesture unlock + auto-wake on visibility changes | ✅ Done |
| **Barcode Scanner** | ZXing camera stream scanner + OpenFoodFacts online lookup | ✅ Done |
| **Thermal Receipt** | Animated slide-out receipt with tear button | ✅ Done |
| **iOS Home Icon** | High-res `apple-touch-icon.png` included for Safari home screen | ✅ Done |

---

## ⚠️ What Needs Attention / Known Issues

### 1. Missing PWA Icon (`icon-192.png`)
The `manifest.json` references `assets/icon-192.png` but only a shell script placeholder exists. The app works fine without it, but to avoid a browser console warning:

**Fix:** Create a simple 192×192 PNG with a shopping cart emoji and place it at `assets/icon-192.png`. Can use any online favicon generator.

### 2. Google Fonts loads from CDN
`index.html` loads `Fredoka` from `fonts.googleapis.com`. This requires internet access. On offline use, the browser will fall back to `Nunito → Comic Sans MS → cursive`.

**Fix if offline-first needed:** Download and self-host the Fredoka font files, then use `@font-face` in CSS.

### 3. `SFX` toggle button missing from HTML
The `styles.css` has a rule for `#sfx-toggle-btn` but that button ID is **not in `index.html`**. The SFX toggle must be added to the header controls.

**Fix:** Add this to `index.html` inside `.header-controls`, alongside the other pill buttons:
```html
<button id="sfx-toggle-btn" class="header-pill-btn" aria-label="Toggle SFX">
  🔊 SFX
</button>
```
Then bind it in `app.js` (the `bindEvents()` method already has the handler — it just won't fire without the DOM element).

### 4. Cash tendered reset between sessions
When the user switches tabs and comes back to Cash, `cashTendered` is NOT reset. Currently calling `clearCart()` does reset it. This is intentional for the pretend play flow, but could be confusing.

**Fix if needed:** Call `this.cashTendered = 0` in `switchTab('cash')` within `app.js`.

### 5. Receipt paper CSS uses `aspect-ratio: 4/3` for scanner viewfinder
Works in all modern iOS/Android browsers (iOS 15+, Chrome 88+). No polyfill needed.

---

## 🚀 GitHub Pages Deployment

1. Push the repo to GitHub (the `main` branch)
2. Go to **Settings → Pages**
3. Set Source to `main` branch, root `/`
4. The app will be live at `https://<username>.github.io/<repo-name>/`

No build step, no bundler, no npm — it's pure static HTML/CSS/JS.

---

## 🎨 Design Tokens (CSS Variables in `styles.css`)

```css
--brand-pink:   #FF6B9D
--brand-purple: #C77DFF
--brand-blue:   #48CAE4
--brand-green:  #52B788
--brand-yellow: #FFD166
--brand-orange: #FF9F1C
--brand-red:    #FF5964
--screen-bg:    #0d2b17   /* Register LCD background */
--screen-green: #39FF14   /* Neon green LCD text */
```

---

## 🔊 Audio Architecture (`js/audio.js`)

The `SoundEngine` class uses the **Web Audio API** with zero external dependencies:

| Method | Sound |
|---|---|
| `playKeypadClick()` | Button press blip (triangle wave) |
| `playScannerBeep()` | Supermarket barcode scanner chirp |
| `playCardTapSequence()` | 4-stage contactless card LED sequence |
| `playApprovedChime()` | C-E-G-C arpeggio approval fanfare |
| `playKaChing()` | Full KA-CHING with drawer latch + bell + coins |
| `playCoinDrop()` | Coin drop tones |
| `playPrinterMotor()` | Receipt printer stepper motor chirp |
| `playClearSound()` | Swoosh down on clear/reset |
| `startMusic()` / `stopMusic()` | Pentatonic music-box loop via `setInterval` |
| `speak(text)` | `SpeechSynthesisUtterance` with high pitch |

> **iOS Note:** Web Audio context must be resumed on first user interaction. This is handled by the `pointerdown` listener in `app.js → init()`.

---

## 📱 Mobile Considerations

- **Touch targets:** All interactive buttons are `min-height: 54px–90px` — well above the 44px Apple HIG minimum
- **Viewport:** `maximum-scale=1.0, user-scalable=no` to prevent double-tap zoom during pretend play
- **Safe areas:** `env(safe-area-inset-*)` applied to header, bottom dock, and modal padding
- **Scroll:** Only the cart list inside the screen and the items grid scroll — the rest is sticky/fixed
- **Vibration:** `navigator.vibrate()` called on button presses for tactile feedback on Android (not available on iOS)

---

## 🧩 Key Architecture Points

- **`window.app`** — global `CashRegisterApp` instance accessible from onclick attributes in HTML
- **`window.soundEngine`** — global `SoundEngine` instance
- **`window.confettiFX`** — global `ConfettiFX` canvas overlay instance
- All state lives in `CashRegisterApp` (no localStorage yet)
- Scanner modal opens camera via `getUserMedia` or falls back to pretend-viewfinder with animated red laser
- `BarcodeDetector` API (Chrome/Edge) auto-scans real boxes when camera is active

---

## 💡 Suggested Next Steps / Enhancements

1. **Add SFX button to HTML** (see known issue #3 above)
2. **GitHub Actions CI** — add `.github/workflows/pages.yml` for auto-deploy on push
3. **localStorage persistence** — save custom items and settings between sessions
4. **Sound volume sliders** — parent-friendly way to control audio levels
5. **More items** — emoji picker for the custom item form
6. **Printer receipt share** — `navigator.share()` or `window.print()` for the receipt
7. **Coin animation** — flying coin CSS animation from tray to total on click
8. **Drawer slide sound** — currently uses KA-CHING; could add a separate drawer-roll sound
9. **Tax mode** — toggle to add 8% simulated sales tax
10. **Multi-language** — `lang` attribute + translated strings object
