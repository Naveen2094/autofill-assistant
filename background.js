/**
 * TTD FastFill Pro - Service Worker (Background Script)
 */

// Initialize default storage on extension install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('⚡ TTD FastFill Pro installed successfully');
    
    const defaultProfile = {
      name: 'Default Profile',
      pilgrimCount: 1,
      pilgrims: Array.from({ length: 6 }, (_, i) => ({
        name: '',
        age: '',
        gender: 'Male',
        idType: 'Aadhaar Card',
        idNo: ''
      })),
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
    };

    chrome.storage.local.get(['ttd_fastfill_data'], (res) => {
      if (!res.ttd_fastfill_data) {
        chrome.storage.local.set({
          ttd_fastfill_data: {
            profiles: { 'default': defaultProfile },
            activeProfileId: 'default'
          }
        });
      }
    });
  }
});

// Handle Keyboard Commands (Ctrl+Shift+A)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'trigger_autofill') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) return;
      const activeTab = tabs[0];

      chrome.storage.local.get(['ttd_fastfill_data'], (res) => {
        if (!res || !res.ttd_fastfill_data) return;
        const data = res.ttd_fastfill_data;
        const activeProfile = data.profiles[data.activeProfileId];

        if (activeProfile) {
          chrome.tabs.sendMessage(activeTab.id, { action: 'AUTOFILL_NOW', profile: activeProfile }, (response) => {
            if (chrome.runtime.lastError) {
              // Inject script dynamically if missing
              chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ['content.js']
              }, () => {
                setTimeout(() => {
                  chrome.tabs.sendMessage(activeTab.id, { action: 'AUTOFILL_NOW', profile: activeProfile });
                }, 100);
              });
            }

            // Flash badge
            chrome.action.setBadgeText({ tabId: activeTab.id, text: 'FAST' });
            chrome.action.setBadgeBackgroundColor({ tabId: activeTab.id, color: '#f59e0b' });
            setTimeout(() => {
              chrome.action.setBadgeText({ tabId: activeTab.id, text: '' });
            }, 2500);
          });
        }
      });
    });
  }
});
