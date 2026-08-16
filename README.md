# ⚡ TTD FastFill Pro

A free, lightweight, privacy-focused Chrome Extension (Manifest V3) built to automate form filling on Tirumala Tirupati Devasthanams (TTD) booking portals. It bypasses framework reactivity barriers (Angular / React) to instantly populate pilgrim details during high-demand quota releases.

---

## 🚀 Key Features

* **SPA Framework-Aware Injection:** Uses native prototype setter overrides and dispatches standard DOM events (`input`, `change`, `blur`) to ensure modern reactive forms register values instantly.
* **Multi-Pilgrim Support:** Pre-configure details for up to 6 devotees (Name, Age, Gender, Photo ID Type, and ID Number).
* **NRI / International Ready:** Dedicated toggles for Passport Number, Country of Residence, and Visa/OCI details.
* **Profile Management:** Create and switch between presets (e.g., *Family Trip*, *Parents Only*), with JSON Export and Import capabilities for quick backups.
* **Multiple Fast Triggers:**
  * Floating **⚡ FastFill TTD** action button directly on supported pages.
  * Global keyboard shortcut (`Ctrl + Shift + A` on Windows / `Cmd + Shift + A` on Mac).
  * One-click action via the extension popup.
* **100% Offline & Private:** All data is stored locally in `chrome.storage.local`. No external APIs, no tracking, and zero telemetry.

---

## 🛠️ Tech Stack & Architecture

* **Platform:** Chrome Extension (Manifest V3)
* **Core Languages:** Vanilla JavaScript (ES6+), HTML5, CSS3
* **Storage Engine:** Chrome Local Storage API (`chrome.storage.local`)
* **Target Domains:**
  * `https://*.tirupatibalaji.ap.gov.in/*`
  * `https://*.ttdsevaonline.com/*`
  * `https://ttdevasthanams.ap.gov.in/*`

---

## 📦 Installation & Setup

1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git)
   cd YOUR_REPO_NAME
