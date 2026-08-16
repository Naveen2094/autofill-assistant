/**
 * TTD FastFill Pro - Content Script Injection Engine
 */

(function () {
  if (window.__TTD_FASTFILL_INJECTED__) return;
  window.__TTD_FASTFILL_INJECTED__ = true;

  console.log('⚡ TTD FastFill Pro engine initialized on:', window.location.href);

  // ----------------------------------------------------
  // 1. Native Property Setter Overrides for SPA Frameworks
  // ----------------------------------------------------
  function setNativeInputValue(element, value) {
    if (!element || value === undefined || value === null) return;
    try {
      element.focus();
      const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      const prototypeValueSetter = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value')?.set;

      if (valueSetter && valueSetter !== prototypeValueSetter) {
        valueSetter.call(element, value);
      } else if (prototypeValueSetter) {
        prototypeValueSetter.call(element, value);
      } else {
        element.value = value;
      }

      // Dispatch full reactive event sequence for Angular / React / Vue
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', code: 'Enter' }));
      element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter', code: 'Enter' }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
    } catch (e) {
      console.warn('FastFill: Could not set native value for element:', element, e);
      element.value = value;
    }
  }

  function setNativeSelectValue(selectEl, targetValue) {
    if (!selectEl) return;
    try {
      selectEl.focus();
      const options = Array.from(selectEl.options || []);
      const normTarget = String(targetValue).toLowerCase().replace(/[^a-z0-9]/g, '');

      let matchedIndex = -1;
      
      // 1. Exact match on option value or text
      matchedIndex = options.findIndex(opt => 
        opt.value.toLowerCase() === String(targetValue).toLowerCase() ||
        opt.text.toLowerCase().trim() === String(targetValue).toLowerCase().trim()
      );

      // 2. Normalized contains match
      if (matchedIndex === -1) {
        matchedIndex = options.findIndex(opt => {
          const optValNorm = opt.value.toLowerCase().replace(/[^a-z0-9]/g, '');
          const optTextNorm = opt.text.toLowerCase().replace(/[^a-z0-9]/g, '');
          return optValNorm.includes(normTarget) || optTextNorm.includes(normTarget) || normTarget.includes(optTextNorm);
        });
      }

      if (matchedIndex !== -1) {
        selectEl.selectedIndex = matchedIndex;
        const selectSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
        if (selectSetter) {
          selectSetter.call(selectEl, options[matchedIndex].value);
        }
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        selectEl.dispatchEvent(new Event('input', { bubbles: true }));
        selectEl.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    } catch (e) {
      console.warn('FastFill: Could not set native select value:', selectEl, e);
    }
  }

  // ----------------------------------------------------
  // 2. DOM Discovery & Attribute Heuristics
  // ----------------------------------------------------
  function findScopedInput(container, attributes, labels) {
    if (!container) return null;

    // Search by attributes
    for (const attr of attributes) {
      const selectors = [
        `input[name*="${attr}" i]`,
        `input[id*="${attr}" i]`,
        `input[formcontrolname*="${attr}" i]`,
        `input[placeholder*="${attr}" i]`,
        `input[data-field*="${attr}" i]`
      ];
      for (const sel of selectors) {
        const el = container.querySelector(sel);
        if (el) return el;
      }
    }

    // Search by nearby label text
    if (labels && labels.length > 0) {
      const allLabels = Array.from(container.querySelectorAll('label, span, div.label'));
      for (const lbl of allLabels) {
        const text = lbl.textContent.toLowerCase();
        if (labels.some(l => text.includes(l.toLowerCase()))) {
          const associatedInput = container.querySelector(`#${lbl.htmlFor}`) ||
                                   lbl.querySelector('input') ||
                                   lbl.nextElementSibling?.querySelector('input') ||
                                   (lbl.nextElementSibling?.tagName === 'INPUT' ? lbl.nextElementSibling : null);
          if (associatedInput) return associatedInput;
        }
      }
    }

    return null;
  }

  function findScopedSelect(container, attributes, labels) {
    if (!container) return null;

    for (const attr of attributes) {
      const selectors = [
        `select[name*="${attr}" i]`,
        `select[id*="${attr}" i]`,
        `select[formcontrolname*="${attr}" i]`,
        `select[data-field*="${attr}" i]`
      ];
      for (const sel of selectors) {
        const el = container.querySelector(sel);
        if (el) return el;
      }
    }

    if (labels && labels.length > 0) {
      const allLabels = Array.from(container.querySelectorAll('label, span'));
      for (const lbl of allLabels) {
        const text = lbl.textContent.toLowerCase();
        if (labels.some(l => text.includes(l.toLowerCase()))) {
          const associatedSelect = container.querySelector(`#${lbl.htmlFor}`) ||
                                    lbl.querySelector('select') ||
                                    lbl.nextElementSibling?.querySelector('select') ||
                                    (lbl.nextElementSibling?.tagName === 'SELECT' ? lbl.nextElementSibling : null);
          if (associatedSelect) return associatedSelect;
        }
      }
    }

    return null;
  }

  // ----------------------------------------------------
  // 3. Main Autofill Engine
  // ----------------------------------------------------
  function executeAutofill(profileData) {
    if (!profileData) {
      showInPageNotification('FastFill: No profile data found!', true);
      return;
    }

    let filledCount = 0;

    // Detect Pilgrim Cards / Rows on TTD Page
    const pilgrimCardSelectors = [
      '.pilgrim-card', '.devotee-card', '.pilgrim-row', '.devotee-row',
      'tr.pilgrim', 'tr.devotee', 'div[formarrayname="pilgrims"] > div',
      'fieldset.pilgrim-section', '.card-pilgrim', '[data-pilgrim-index]'
    ];

    let cards = [];
    for (const sel of pilgrimCardSelectors) {
      const found = Array.from(document.querySelectorAll(sel));
      if (found.length > 0) {
        cards = found;
        break;
      }
    }

    const pilgrimsToFill = profileData.pilgrims.slice(0, profileData.pilgrimCount || 1);

    if (cards.length > 0) {
      // Map Pilgrim i -> Card i
      pilgrimsToFill.forEach((p, idx) => {
        if (cards[idx] && p.name) {
          const card = cards[idx];
          
          const nameEl = findScopedInput(card, ['name', 'devoteename', 'fullname', 'pilgrimname'], ['Name']);
          if (nameEl) setNativeInputValue(nameEl, p.name);

          const ageEl = findScopedInput(card, ['age'], ['Age']);
          if (ageEl) setNativeInputValue(ageEl, p.age);

          const genderEl = findScopedSelect(card, ['gender', 'sex'], ['Gender']);
          if (genderEl) {
            setNativeSelectValue(genderEl, p.gender);
          } else {
            // Radio button check fallback
            const radio = card.querySelector(`input[type="radio"][value="${p.gender}" i]`);
            if (radio) {
              radio.click();
              radio.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }

          const idTypeEl = findScopedSelect(card, ['idtype', 'prooftype', 'idproof', 'proof'], ['ID Proof', 'Photo ID']);
          if (idTypeEl) setNativeSelectValue(idTypeEl, p.idType);

          const idNoEl = findScopedInput(card, ['idno', 'idnumber', 'proofno', 'proofnumber'], ['ID Number', 'Proof Number']);
          if (idNoEl) setNativeInputValue(idNoEl, p.idNo);

          filledCount++;
        }
      });
    } else {
      // Global Indexed Fallback (e.g. #name_0, #name_1 or sequential input fields)
      pilgrimsToFill.forEach((p, idx) => {
        if (!p.name) return;
        const indexSuffixes = [`_${idx}`, `_${idx + 1}`, `[${idx}]`, `${idx + 1}`];
        
        let nameEl = null;
        for (const suf of indexSuffixes) {
          nameEl = document.querySelector(`input[name*="name"${suf}], input[id*="name"${suf}], input[formcontrolname*="name"${suf}]`);
          if (nameEl) break;
        }
        if (nameEl) {
          setNativeInputValue(nameEl, p.name);
          filledCount++;
        }

        let ageEl = null;
        for (const suf of indexSuffixes) {
          ageEl = document.querySelector(`input[name*="age"${suf}], input[id*="age"${suf}], input[formcontrolname*="age"${suf}]`);
          if (ageEl) break;
        }
        if (ageEl) setNativeInputValue(ageEl, p.age);

        let genderEl = null;
        for (const suf of indexSuffixes) {
          genderEl = document.querySelector(`select[name*="gender"${suf}], select[id*="gender"${suf}], select[formcontrolname*="gender"${suf}]`);
          if (genderEl) break;
        }
        if (genderEl) setNativeSelectValue(genderEl, p.gender);

        let idTypeEl = null;
        for (const suf of indexSuffixes) {
          idTypeEl = document.querySelector(`select[name*="idType"${suf}], select[id*="idType"${suf}], select[formcontrolname*="idType"${suf}]`);
          if (idTypeEl) break;
        }
        if (idTypeEl) setNativeSelectValue(idTypeEl, p.idType);

        let idNoEl = null;
        for (const suf of indexSuffixes) {
          idNoEl = document.querySelector(`input[name*="idNo"${suf}], input[id*="idNo"${suf}], input[formcontrolname*="idNo"${suf}]`);
          if (idNoEl) break;
        }
        if (idNoEl) setNativeInputValue(idNoEl, p.idNo);
      });
    }

    // Contact & Address Details
    if (profileData.contact) {
      const c = profileData.contact;
      if (c.mobile) {
        const mob = findScopedInput(document, ['mobile', 'phone', 'contactno'], ['Mobile']);
        if (mob) setNativeInputValue(mob, c.mobile);
      }
      if (c.email) {
        const em = findScopedInput(document, ['email', 'emailid'], ['Email']);
        if (em) setNativeInputValue(em, c.email);
      }
      if (c.addressLine1) {
        const add1 = findScopedInput(document, ['address1', 'addressline1', 'address'], ['Address']);
        if (add1) setNativeInputValue(add1, c.addressLine1);
      }
      if (c.addressLine2) {
        const add2 = findScopedInput(document, ['address2', 'addressline2'], ['Address Line 2']);
        if (add2) setNativeInputValue(add2, c.addressLine2);
      }
      if (c.state) {
        const st = findScopedSelect(document, ['state'], ['State']);
        if (st) setNativeSelectValue(st, c.state);
      }
      if (c.city) {
        const ct = findScopedInput(document, ['city', 'town'], ['City']);
        if (ct) setNativeInputValue(ct, c.city);
      }
      if (c.pincode) {
        const pin = findScopedInput(document, ['pincode', 'pin', 'zip'], ['PIN']);
        if (pin) setNativeInputValue(pin, c.pincode);
      }
      if (c.gotram) {
        const got = findScopedInput(document, ['gotram', 'gotra'], ['Gotram']);
        if (got) setNativeInputValue(got, c.gotram);
      }
    }

    // NRI Details
    if (profileData.nri && profileData.nri.enabled) {
      const nri = profileData.nri;
      if (nri.passportNo) {
        const pass = findScopedInput(document, ['passport'], ['Passport']);
        if (pass) setNativeInputValue(pass, nri.passportNo);
      }
      if (nri.country) {
        const countr = findScopedInput(document, ['country'], ['Country']) || findScopedSelect(document, ['country'], ['Country']);
        if (countr) {
          if (countr.tagName === 'SELECT') setNativeSelectValue(countr, nri.country);
          else setNativeInputValue(countr, nri.country);
        }
      }
      if (nri.visaType) {
        const visa = findScopedSelect(document, ['visa'], ['Visa']);
        if (visa) setNativeSelectValue(visa, nri.visaType);
      }
    }

    showInPageNotification(`⚡ TTD FastFill Pro: Autofilled ${pilgrimsToFill.length} Devotee(s) & Contact info!`);
  }

  // ----------------------------------------------------
  // 4. In-Page Notification Toast & Floating Action Pill
  // ----------------------------------------------------
  function showInPageNotification(msg, isError = false) {
    let toast = document.getElementById('ttd-fastfill-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ttd-fastfill-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 75px;
        right: 20px;
        z-index: 999999;
        background: ${isError ? '#ef4444' : '#10b981'};
        color: #0f172a;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        font-weight: 700;
        padding: 10px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';

    setTimeout(() => {
      if (toast) toast.style.opacity = '0';
    }, 3200);
  }

  function injectFloatingPill() {
    if (document.getElementById('ttd-fastfill-pill')) return;

    const pill = document.createElement('div');
    pill.id = 'ttd-fastfill-pill';
    pill.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:16px;">⚡</span>
        <span>FastFill TTD</span>
      </div>
    `;
    pill.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999998;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #0f172a;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 800;
      padding: 10px 18px;
      border-radius: 30px;
      box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
      cursor: pointer;
      user-select: none;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    `;

    pill.addEventListener('mouseenter', () => {
      pill.style.transform = 'scale(1.06)';
      pill.style.boxShadow = '0 6px 22px rgba(245, 158, 11, 0.6)';
    });

    pill.addEventListener('mouseleave', () => {
      pill.style.transform = 'scale(1)';
      pill.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.4)';
    });

    pill.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['ttd_fastfill_data'], (res) => {
          if (res && res.ttd_fastfill_data) {
            const data = res.ttd_fastfill_data;
            const activeProfile = data.profiles[data.activeProfileId];
            executeAutofill(activeProfile);
          } else {
            showInPageNotification('Please configure TTD FastFill Pro popup first!', true);
          }
        });
      } else {
        showInPageNotification('FastFill Pill Clicked (Dev mode)');
      }
    });

    document.body.appendChild(pill);
  }

  // Inject floating pill when page is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    injectFloatingPill();
  } else {
    document.addEventListener('DOMContentLoaded', injectFloatingPill);
  }

  // Listen for messages from popup or background script
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'AUTOFILL_NOW') {
        executeAutofill(request.profile);
        sendResponse({ success: true });
      }
    });
  }
})();
