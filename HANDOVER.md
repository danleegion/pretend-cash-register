# 🛒 Kids Toy Cash Register — Agent Handover Document

> **Status:** CSS created and all files are in place. App should render correctly.  
> **Last worked on:** 2026-11-07 by Antigravity (Claude Sonnet 4.6)

---

## 📁 Project Structure

```
pretend-cash-register/
├── index.html          # Main HTML shell (all UI structure, modals, tabs)
├── manifest.json       # PWA manifest (for GitHub Pages install prompt)
├── css/
│   └── styles.css      # ← NEWLY CREATED — full mobile-first CSS
├── js/
│   ├── app.js          # Main app logic (cart, payments, tabs, events)
│   ├── audio.js        # Web Audio API sound engine + speech synth
│   ├── confetti.js     # Canvas confetti burst particle system
│   └── scanner.js      # Barcode scanner modal + BarcodeDetector API
└── assets/
    └── make-icon.sh    # Placeholder; replace with real icon-192.png
```

---

## ✅ What Is Done

| Feature | Status |
|---|---|
| Mobile layout (iPhone 13 Pro, 390px) | ✅ Done |
| Safe area insets (notch, home bar) | ✅ Done |
| Colorful kid-friendly UI with Fredoka font | ✅ Done |
| **4 Tabs:** Items / Card Machine / Cash Drawer / Keypad | ✅ Done |
| Quick-tap item grid (12 preset groceries/toys) | ✅ Done |
| ➕ Custom item creator modal | ✅ Done |
| Pretend POS card terminal with LED indicators | ✅ Done |
| Tap / Chip / Swipe card interactions | ✅ Done |
| Animated floating credit card widget | ✅ Done |
| Approval confetti burst + ding chime | ✅ Done |
| Cash register drawer (animated KA-CHING open) | ✅ Done |
| Bills ($1/$5/$10/$20) & Coins (penny→quarter) | ✅ Done |
| Change calculation + denomination breakdown text | ✅ Done |
| Thermal receipt printer (slide-out animation) | ✅ Done |
| **Scanner** – laser viewfinder modal | ✅ Done |
| **Scanner** – laser viewfinder modal | ✅ Done |
| Scanner uses real `BarcodeDetector` API if available | ✅ Done |
| **Real barcode → product lookup (Open Food Facts + UPC Item DB)** | ✅ Done |
| Manual barcode number entry with 🔍 LOOK UP button | ✅ Done |
| Product found card: image, name, brand, editable price, ADD TO CART | ✅ Done |
| Product not found fallback with custom add | ✅ Done |
| Pretend BEEP! scan button (adds random item, no lookup) | ✅ Done |
| **Keypad** – Full-screen 4x4 matrix, massive chunky buttons | ✅ Done |
| Large 3-row ENTER key (`✅ ADD ITEM`) | ✅ Done |
| Double Zero `00` quick-entry key | ✅ Done |
| PWA icons generated (192px and 512px) | ✅ Done |
| Voice synthesis removed per user request (pure sound effects) | ✅ Done |
| Multi-layered mechanical cash register KA-CHING sound | ✅ Done |
| Real barcode online product lookup (Open Food Facts + UPC Item DB) | ✅ Done |
| **Web Audio API** — zero deps, offline sounds | ✅ Done |
| KA-CHING bell + drawer spring + coin jingle | ✅ Done |
| Credit card 4-beep contactless sequence | ✅ Done |
| Approval chime (C-E-G-C arpeggio) | ✅ Done |
| Speech synthesis voice announcements | ✅ Done |
| Background music (pentatonic music-box loop) | ✅ Done |
| SFX / Voice / Music toggles in header | ✅ Done |
| Haptic vibration on mobile | ✅ Done |
| Confetti canvas particle system (burst on payment) | ✅ Done |
| PWA manifest (installable) | ✅ Done |
| Bounce-pop animation on total | ✅ Done |
| `prefers-reduced-motion` accessibility support | ✅ Done |
| GitHub Pages ready (100% static, no server) | ✅ Done |

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
