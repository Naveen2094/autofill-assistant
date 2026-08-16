/**
 * TTD FastFill Pro - Popup Controller
 */

// Default Empty Pilgrim Object
const createEmptyPilgrim = (index) => ({
  name: '',
  age: '',
  gender: 'Male',
  idType: 'Aadhaar Card',
  idNo: ''
});

// Default Profile Template
const createDefaultProfile = (name = 'Default Profile') => ({
  name: name,
  pilgrimCount: 1,
  pilgrims: Array.from({ length: 6 }, (_, i) => createEmptyPilgrim(i + 1)),
  contact: {
    mobile: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    state: 'Andhra Pradesh',
    city: '',
    pincode: '',
    gotram: ''
  },
  nri: {
    enabled: false,
    passportNo: '',
    country: '',
    visaType: 'OCI Card'
  }
});

let state = {
  profiles: {
    'default': createDefaultProfile('Default Profile')
  },
  activeProfileId: 'default'
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadStateFromStorage();
  initUI();
  bindEvents();
});

// Load saved data from chrome.storage.local
async function loadStateFromStorage() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['ttd_fastfill_data'], (result) => {
        if (result && result.ttd_fastfill_data) {
          state = result.ttd_fastfill_data;
        }
        resolve();
      });
    } else {
      // Fallback for standalone dev
      const local = localStorage.getItem('ttd_fastfill_data');
      if (local) {
        try { state = JSON.parse(local); } catch (e) {}
      }
      resolve();
    }
  });
}

// Persist data to storage
async function saveStateToStorage() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ ttd_fastfill_data: state }, () => resolve());
    } else {
      localStorage.setItem('ttd_fastfill_data', JSON.stringify(state));
      resolve();
    }
  });
}

function getActiveProfile() {
  if (!state.profiles[state.activeProfileId]) {
    state.activeProfileId = Object.keys(state.profiles)[0] || 'default';
  }
  return state.profiles[state.activeProfileId];
}

// Initialize UI Components
function initUI() {
  renderProfileDropdown();
  renderPilgrimAccordions();
  populateFormFields();
}

// Render Profile Quick Dropdown
function renderProfileDropdown() {
  const select = document.getElementById('activeProfileSelect');
  select.innerHTML = '';
  Object.keys(state.profiles).forEach(id => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = state.profiles[id].name;
    if (id === state.activeProfileId) opt.selected = true;
    select.appendChild(opt);
  });
  renderProfilesList();
}

// Render Pilgrim Accordions (1 to 6)
function renderPilgrimAccordions() {
  const container = document.getElementById('pilgrimAccordions');
  container.innerHTML = '';
  const profile = getActiveProfile();

  for (let i = 0; i < 6; i++) {
    const pilgrimIndex = i + 1;
    const isVisible = pilgrimIndex <= profile.pilgrimCount;
    const data = profile.pilgrims[i] || createEmptyPilgrim(pilgrimIndex);

    const item = document.createElement('div');
    item.className = `accordion-item ${i === 0 ? 'open' : ''}`;
    item.style.display = isVisible ? 'block' : 'none';
    item.dataset.index = i;

    item.innerHTML = `
      <div class="accordion-header">
        <div class="accordion-title">
          <span class="pilgrim-badge">Pilgrim #${pilgrimIndex}</span>
          <span class="pilgrim-name-preview" id="preview-name-${i}">${data.name ? data.name : '(Unnamed)'}</span>
        </div>
        <span class="accordion-icon">▼</span>
      </div>
      <div class="accordion-body">
        <div class="form-row">
          <div class="field-group full-width">
            <label>Full Name (as per ID) *</label>
            <input type="text" class="p-field" data-field="name" data-index="${i}" value="${escapeHtml(data.name)}" placeholder="Enter Name">
          </div>
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Age *</label>
            <input type="number" class="p-field" data-field="age" data-index="${i}" value="${data.age}" min="1" max="110" placeholder="Age">
          </div>
          <div class="field-group">
            <label>Gender *</label>
            <select class="p-field" data-field="gender" data-index="${i}">
              <option value="Male" ${data.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${data.gender === 'Female' ? 'selected' : ''}>Female</option>
              <option value="Transgender" ${data.gender === 'Transgender' ? 'selected' : ''}>Transgender</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Photo ID Type *</label>
            <select class="p-field" data-field="idType" data-index="${i}">
              <option value="Aadhaar Card" ${data.idType === 'Aadhaar Card' ? 'selected' : ''}>Aadhaar Card</option>
              <option value="Passport" ${data.idType === 'Passport' ? 'selected' : ''}>Passport</option>
              <option value="Voter ID" ${data.idType === 'Voter ID' ? 'selected' : ''}>Voter ID</option>
              <option value="PAN Card" ${data.idType === 'PAN Card' ? 'selected' : ''}>PAN Card</option>
              <option value="Driving License" ${data.idType === 'Driving License' ? 'selected' : ''}>Driving License</option>
            </select>
          </div>
          <div class="field-group">
            <label>Photo ID Number *</label>
            <input type="text" class="p-field" data-field="idNo" data-index="${i}" value="${escapeHtml(data.idNo)}" placeholder="ID Number">
          </div>
        </div>
      </div>
    `;

    container.appendChild(item);
  }

  // Set active count buttons
  document.querySelectorAll('.count-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.count) === profile.pilgrimCount);
  });
}

// Populate Non-Pilgrim Fields
function populateFormFields() {
  const profile = getActiveProfile();

  // Contact
  document.getElementById('contactMobile').value = profile.contact.mobile || '';
  document.getElementById('contactEmail').value = profile.contact.email || '';
  document.getElementById('addressLine1').value = profile.contact.addressLine1 || '';
  document.getElementById('addressLine2').value = profile.contact.addressLine2 || '';
  document.getElementById('addressState').value = profile.contact.state || 'Andhra Pradesh';
  document.getElementById('addressCity').value = profile.contact.city || '';
  document.getElementById('addressPincode').value = profile.contact.pincode || '';
  document.getElementById('gotram').value = profile.contact.gotram || '';

  // NRI
  const nriCheck = document.getElementById('nriEnabled');
  nriCheck.checked = profile.nri.enabled || false;
  document.getElementById('nriPassportNo').value = profile.nri.passportNo || '';
  document.getElementById('nriCountry').value = profile.nri.country || '';
  document.getElementById('nriVisaType').value = profile.nri.visaType || 'OCI Card';
  
  toggleNriContainer(profile.nri.enabled);
}

// Toggle NRI Inputs container state
function toggleNriContainer(enabled) {
  const container = document.getElementById('nriFieldsContainer');
  if (enabled) {
    container.classList.remove('disabled');
  } else {
    container.classList.add('disabled');
  }
}

// Render Profiles List inside Profiles Tab
function renderProfilesList() {
  const container = document.getElementById('savedProfilesList');
  container.innerHTML = '';
  Object.keys(state.profiles).forEach(id => {
    const item = document.createElement('div');
    item.className = 'profile-item';
    const isCurrent = id === state.activeProfileId;
    
    item.innerHTML = `
      <span class="profile-item-name">${escapeHtml(state.profiles[id].name)} ${isCurrent ? '⚡ (Active)' : ''}</span>
      <div class="profile-item-actions">
        ${!isCurrent ? `<button class="sm-btn btn-load-prof" data-id="${id}">Load</button>` : ''}
        ${Object.keys(state.profiles).length > 1 ? `<button class="sm-btn danger btn-del-prof" data-id="${id}">Delete</button>` : ''}
      </div>
    `;
    container.appendChild(item);
  });
}

// Collect Current UI Form Data into active profile object
function collectCurrentFormData() {
  const profile = getActiveProfile();
  
  // Pilgrims data
  document.querySelectorAll('.p-field').forEach(input => {
    const idx = parseInt(input.dataset.index);
    const field = input.dataset.field;
    if (profile.pilgrims[idx]) {
      profile.pilgrims[idx][field] = input.value.trim();
    }
  });

  // Contact
  profile.contact.mobile = document.getElementById('contactMobile').value.trim();
  profile.contact.email = document.getElementById('contactEmail').value.trim();
  profile.contact.addressLine1 = document.getElementById('addressLine1').value.trim();
  profile.contact.addressLine2 = document.getElementById('addressLine2').value.trim();
  profile.contact.state = document.getElementById('addressState').value;
  profile.contact.city = document.getElementById('addressCity').value.trim();
  profile.contact.pincode = document.getElementById('addressPincode').value.trim();
  profile.contact.gotram = document.getElementById('gotram').value.trim();

  // NRI
  profile.nri.enabled = document.getElementById('nriEnabled').checked;
  profile.nri.passportNo = document.getElementById('nriPassportNo').value.trim();
  profile.nri.country = document.getElementById('nriCountry').value.trim();
  profile.nri.visaType = document.getElementById('nriVisaType').value;

  return profile;
}

// Bind User Events
function bindEvents() {
  // Navigation Tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  // Pilgrim Count Buttons
  document.querySelectorAll('.count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const count = parseInt(btn.dataset.count);
      const profile = getActiveProfile();
      profile.pilgrimCount = count;
      renderPilgrimAccordions();
    });
  });

  // Pilgrim Accordion Expand/Collapse
  document.getElementById('pilgrimAccordions').addEventListener('click', (e) => {
    const header = e.target.closest('.accordion-header');
    if (header) {
      const item = header.closest('.accordion-item');
      item.classList.toggle('open');
    }
  });

  // Update Pilgrim Preview Name live
  document.getElementById('pilgrimAccordions').addEventListener('input', (e) => {
    if (e.target.dataset.field === 'name') {
      const idx = e.target.dataset.index;
      const previewEl = document.getElementById(`preview-name-${idx}`);
      if (previewEl) {
        previewEl.textContent = e.target.value.trim() || '(Unnamed)';
      }
    }
  });

  // NRI Toggle
  document.getElementById('nriEnabled').addEventListener('change', (e) => {
    toggleNriContainer(e.target.checked);
  });

  // Profile Selector Change
  document.getElementById('activeProfileSelect').addEventListener('change', async (e) => {
    collectCurrentFormData();
    state.activeProfileId = e.target.value;
    await saveStateToStorage();
    renderPilgrimAccordions();
    populateFormFields();
    renderProfilesList();
    showToast('Switched to profile: ' + getActiveProfile().name);
  });

  // New Profile Button
  document.getElementById('btnNewProfile').addEventListener('click', async () => {
    const name = prompt('Enter name for the new profile:', 'Family Member');
    if (name && name.trim()) {
      const newId = 'prof_' + Date.now();
      state.profiles[newId] = createDefaultProfile(name.trim());
      state.activeProfileId = newId;
      await saveStateToStorage();
      initUI();
      showToast('Created profile: ' + name);
    }
  });

  // Profiles List Action Buttons (Load/Delete)
  document.getElementById('savedProfilesList').addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-load-prof')) {
      const id = e.target.dataset.id;
      state.activeProfileId = id;
      await saveStateToStorage();
      initUI();
      showToast('Loaded profile: ' + getActiveProfile().name);
    } else if (e.target.classList.contains('btn-del-prof')) {
      const id = e.target.dataset.id;
      if (confirm(`Delete profile "${state.profiles[id].name}"?`)) {
        delete state.profiles[id];
        state.activeProfileId = Object.keys(state.profiles)[0];
        await saveStateToStorage();
        initUI();
        showToast('Profile deleted');
      }
    }
  });

  // Save Profile Preset Button (in Profiles tab)
  document.getElementById('btnSaveNewProfile').addEventListener('click', async () => {
    const input = document.getElementById('profileNameInput');
    const name = input.value.trim();
    if (!name) {
      showToast('Please enter a profile name', true);
      return;
    }
    const newId = 'prof_' + Date.now();
    collectCurrentFormData();
    const newProfile = JSON.parse(JSON.stringify(getActiveProfile()));
    newProfile.name = name;
    state.profiles[newId] = newProfile;
    state.activeProfileId = newId;
    input.value = '';
    await saveStateToStorage();
    initUI();
    showToast(`Saved preset "${name}"`);
  });

  // Export JSON
  document.getElementById('btnExportJSON').addEventListener('click', () => {
    collectCurrentFormData();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ttd_fastfill_profiles_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported profiles to JSON');
  });

  // Import JSON
  document.getElementById('importFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported && imported.profiles && imported.activeProfileId) {
          state = imported;
          await saveStateToStorage();
          initUI();
          showToast('Profiles imported successfully!');
        } else {
          showToast('Invalid profile JSON structure', true);
        }
      } catch (err) {
        showToast('Failed to parse JSON file', true);
      }
    };
    reader.readAsText(file);
  });

  // Reset All Profiles
  document.getElementById('btnClearAll').addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all profiles and data?')) {
      state = {
        profiles: { 'default': createDefaultProfile('Default Profile') },
        activeProfileId: 'default'
      };
      await saveStateToStorage();
      initUI();
      showToast('Reset all stored profiles');
    }
  });

  // Footer Actions: Save Details
  document.getElementById('btnSaveDetails').addEventListener('click', async () => {
    collectCurrentFormData();
    await saveStateToStorage();
    showToast('Details saved locally!');
  });

  // Footer Actions: Fill Active Tab
  document.getElementById('btnFillActiveTab').addEventListener('click', async () => {
    const profile = collectCurrentFormData();
    await saveStateToStorage();

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) {
          showToast('No active tab found', true);
          return;
        }
        const activeTab = tabs[0];
        
        // Send message to content script
        chrome.tabs.sendMessage(activeTab.id, { action: 'AUTOFILL_NOW', profile }, (response) => {
          if (chrome.runtime.lastError) {
            // Script might not be injected yet, try injecting script programmatically
            chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              files: ['content.js']
            }, () => {
              if (chrome.runtime.lastError) {
                showToast('Cannot inject on this tab page', true);
              } else {
                setTimeout(() => {
                  chrome.tabs.sendMessage(activeTab.id, { action: 'AUTOFILL_NOW', profile });
                  showToast('Filled form on active tab!');
                }, 100);
              }
            });
          } else {
            showToast('Form autofilled on active tab!');
          }
        });
      });
    } else {
      showToast('Form filled (Dev mode)');
    }
  });
}

// Toast notification helper
function showToast(message, isError = false) {
  const toast = document.getElementById('toastNotification');
  toast.textContent = message;
  toast.className = `toast-bar ${isError ? 'error' : ''}`;
  setTimeout(() => {
    toast.className = 'toast-bar hidden';
  }, 2600);
}

// Escape HTML utility
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
