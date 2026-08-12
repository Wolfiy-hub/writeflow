// spellcheck.js
// Spell check settings and management

const SpellCheck = {
    enabled: true,
    currentLanguages: ['en-US'],
    availableLanguages: [],
    customWords: [], // Session-only tracked words for UI display
}

// Comprehensive language labels with flags
// Language names - flag only where it makes sense (a proper country flag)
const FEATURED_LANGUAGES = {
  // English variants (proper country flags)
  'en-US': { name: 'English (US)', flag: '🇺🇸' },
  'en-GB': { name: 'English (UK)', flag: '🇬🇧' },
  'en-CA': { name: 'English (Canada)', flag: '🇨🇦' },
  'en-AU': { name: 'English (Australia)', flag: '🇦🇺' },
  'en': { name: 'English' },
  
  // European languages with proper country flags
  'af': { name: 'Afrikaans', flag: '🇿🇦' },
  'bg': { name: 'Bulgarian', flag: '🇧🇬' },
  'cs': { name: 'Czech', flag: '🇨🇿' },
  'da': { name: 'Danish', flag: '🇩🇰' },
  'de': { name: 'German', flag: '🇩🇪' },
  'de-DE': { name: 'German (Germany)', flag: '🇩🇪' },
  'el': { name: 'Greek', flag: '🇬🇷' },
  'es': { name: 'Spanish', flag: '🇪🇸' },
  'es-AR': { name: 'Spanish (Argentina)', flag: '🇦🇷' },
  'es-ES': { name: 'Spanish (Spain)', flag: '🇪🇸' },
  'es-MX': { name: 'Spanish (Mexico)', flag: '🇲🇽' },
  'es-US': { name: 'Spanish (US)', flag: '🇺🇸' },
  'et': { name: 'Estonian', flag: '🇪🇪' },
  'fa': { name: 'Persian', flag: '🇮🇷' },
  'fi': { name: 'Finnish', flag: '🇫🇮' },
  'fo': { name: 'Faroese', flag: '🇫🇴' },
  'fr': { name: 'French', flag: '🇫🇷' },
  'fr-FR': { name: 'French (France)', flag: '🇫🇷' },
  'ga': { name: 'Irish', flag: '🇮🇪' },
  'he': { name: 'Hebrew', flag: '🇮🇱' },
  'hi': { name: 'Hindi', flag: '🇮🇳' },
  'hr': { name: 'Croatian', flag: '🇭🇷' },
  'hu': { name: 'Hungarian', flag: '🇭🇺' },
  'hy': { name: 'Armenian', flag: '🇦🇲' },
  'id': { name: 'Indonesian', flag: '🇮🇩' },
  'is': { name: 'Icelandic', flag: '🇮🇸' },
  'it': { name: 'Italian', flag: '🇮🇹' },
  'it-IT': { name: 'Italian (Italy)', flag: '🇮🇹' },
  'ka': { name: 'Georgian', flag: '🇬🇪' },
  'kk': { name: 'Kazakh', flag: '🇰🇿' },
  'ko': { name: 'Korean', flag: '🇰🇷' },
  'lt': { name: 'Lithuanian', flag: '🇱🇹' },
  'lv': { name: 'Latvian', flag: '🇱🇻' },
  'mk': { name: 'Macedonian', flag: '🇲🇰' },
  'mn': { name: 'Mongolian', flag: '🇲🇳' },
  'ms': { name: 'Malay', flag: '🇲🇾' },
  'nb': { name: 'Norwegian Bokmål', flag: '🇳🇴' },
  'nb-NO': { name: 'Norwegian Bokmål (Norway)', flag: '🇳🇴' },
  'nl': { name: 'Dutch', flag: '🇳🇱' },
  'nl-NL': { name: 'Dutch (Netherlands)', flag: '🇳🇱' },
  'nn': { name: 'Norwegian Nynorsk', flag: '🇳🇴' },
  'no': { name: 'Norwegian', flag: '🇳🇴' },
  'pl': { name: 'Polish', flag: '🇵🇱' },
  'pl-PL': { name: 'Polish (Poland)', flag: '🇵🇱' },
  'pt': { name: 'Portuguese', flag: '🇵🇹' },
  'pt-BR': { name: 'Portuguese (Brazil)', flag: '🇧🇷' },
  'pt-PT': { name: 'Portuguese (Portugal)', flag: '🇵🇹' },
  'ro': { name: 'Romanian', flag: '🇷🇴' },
  'ro-RO': { name: 'Romanian (Romania)', flag: '🇷🇴' },
  'ru': { name: 'Russian', flag: '🇷🇺' },
  'ru-RU': { name: 'Russian (Russia)', flag: '🇷🇺' },
  'sk': { name: 'Slovak', flag: '🇸🇰' },
  'sl': { name: 'Slovenian', flag: '🇸🇮' },
  'sq': { name: 'Albanian', flag: '🇦🇱' },
  'sr': { name: 'Serbian', flag: '🇷🇸' },
  'sv': { name: 'Swedish', flag: '🇸🇪' },
  'sv-SE': { name: 'Swedish (Sweden)', flag: '🇸🇪' },
  'ta': { name: 'Tamil', flag: '🇱🇰' },
  'tg': { name: 'Tajik', flag: '🇹🇯' },
  'tr': { name: 'Turkish', flag: '🇹🇷' },
  'tr-TR': { name: 'Turkish (Turkey)', flag: '🇹🇷' },
  'uk': { name: 'Ukrainian', flag: '🇺🇦' },
  'vi': { name: 'Vietnamese', flag: '🇻🇳' },
  
  // Languages without a single national flag - use code badge
  'ca': { name: 'Catalan' },
  'cy': { name: 'Welsh' },
  'eu': { name: 'Basque' },
  'gl': { name: 'Galician' },
  'sh': { name: 'Serbo-Croatian' },
}

// ============================================
// INITIALIZATION
// ============================================

async function initSpellCheck() {
    // Load available languages from Electron
    try {
        const result = await window.electronAPI.spellcheckGetLanguages()
        if (result.success) {
            SpellCheck.availableLanguages = result.languages
        }
    } catch (e) {
        console.error('Could not load spell check languages:', e)
    }

    // Load saved preferences
    loadSpellCheckPrefs()

    // Apply saved settings
    await applySpellCheckSettings()

    // Modal event listeners
    document.getElementById('spellcheck-toggle').addEventListener('click', function () {
        this.classList.toggle('on')
        this.dataset.on = this.classList.contains('on') ? 'true' : 'false'
        updateStatusDisplay()
    })

    document.getElementById('btn-save-spellcheck').addEventListener('click', saveAndApplySpellCheck)

    // Listen for words added via native right-click menu
    if (window.electronAPI.onSpellcheckWordAdded) {
        window.electronAPI.onSpellcheckWordAdded((word) => {
            if (!SpellCheck.customWords.includes(word)) {
                SpellCheck.customWords.push(word)
                saveSpellCheckPrefs()
                showToast(`"${word}" added to dictionary`, 'success', 2000)

                // If modal is open, refresh the list
                if (!document.getElementById('modal-spellcheck').classList.contains('hidden')) {
                    renderCustomWordsList()
                }
            }
        })
    }
}

// ============================================
// LOAD / SAVE PREFERENCES
// ============================================

function loadSpellCheckPrefs() {
    try {
        const saved = localStorage.getItem('writeflow-spellcheck')
        if (saved) {
            const prefs = JSON.parse(saved)
            SpellCheck.enabled = prefs.enabled !== false
            SpellCheck.currentLanguages = prefs.languages || ['en-US']
            SpellCheck.customWords = prefs.customWords || []
        }
    } catch (e) { }
}

function saveSpellCheckPrefs() {
    try {
        localStorage.setItem('writeflow-spellcheck', JSON.stringify({
            enabled: SpellCheck.enabled,
            languages: SpellCheck.currentLanguages,
            customWords: SpellCheck.customWords,
        }))
    } catch (e) { }
}

async function applySpellCheckSettings() {
    try {
        await window.electronAPI.spellcheckSetEnabled(SpellCheck.enabled)
        if (SpellCheck.enabled && SpellCheck.currentLanguages.length > 0) {
            await window.electronAPI.spellcheckSetLanguages(SpellCheck.currentLanguages)
        }

        // Re-add custom words
        for (const word of SpellCheck.customWords) {
            await window.electronAPI.spellcheckAddWord(word)
        }
    } catch (e) {
        console.error('Could not apply spell check settings:', e)
    }
}

// ============================================
// OPEN SETTINGS MODAL
// ============================================

async function openSpellCheckSettings() {
    // Load fresh list of available languages
    try {
        const result = await window.electronAPI.spellcheckGetLanguages()
        if (result.success) {
            SpellCheck.availableLanguages = result.languages
        }
    } catch (e) { }

    // Render language grid
    renderLanguageGrid()

    // Render custom words
    renderCustomWordsList()

    // Set toggle state
    const toggle = document.getElementById('spellcheck-toggle')
    toggle.classList.toggle('on', SpellCheck.enabled)
    toggle.dataset.on = SpellCheck.enabled
    updateStatusDisplay()

    showModal('modal-spellcheck')
}

function renderLanguageGrid() {
  const grid = document.getElementById('spellcheck-lang-grid')
  
  const languageList = []
  
  // Featured languages first (if available in Chromium)
  Object.keys(FEATURED_LANGUAGES).forEach(code => {
    if (SpellCheck.availableLanguages.includes(code)) {
      languageList.push({
        code,
        ...FEATURED_LANGUAGES[code]
      })
    }
  })
  
  // Other available languages (unknown to us - use code as name & badge)
  SpellCheck.availableLanguages.forEach(code => {
    if (!FEATURED_LANGUAGES[code]) {
      languageList.push({
        code,
        name: code.toUpperCase(),
        // no flag - will use code badge
      })
    }
  })
  
  grid.innerHTML = languageList.map(lang => {
    const isSelected = SpellCheck.currentLanguages.includes(lang.code)
    
    // Show flag if we have one, otherwise show code badge
    const iconHTML = lang.flag 
      ? `<span class="spellcheck-lang-flag">${lang.flag}</span>`
      : `<span class="spellcheck-lang-badge">${escapeHtml(lang.code.split('-')[0])}</span>`
    
    return `
      <button class="spellcheck-lang-option ${isSelected ? 'selected' : ''}" data-lang-code="${lang.code}">
        ${iconHTML}
        <div class="spellcheck-lang-info">
          <div class="spellcheck-lang-name">${escapeHtml(lang.name)}</div>
          <div class="spellcheck-lang-code">${escapeHtml(lang.code)}</div>
        </div>
        <svg class="spellcheck-check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>
    `
  }).join('')
  
  // Click handlers
  grid.querySelectorAll('.spellcheck-lang-option').forEach(opt => {
    opt.addEventListener('click', () => {
      opt.classList.toggle('selected')
    })
  })
}

function renderCustomWordsList() {
  const container = document.getElementById('custom-words-list')
  
  if (SpellCheck.customWords.length === 0) {
    container.innerHTML = `<div class="custom-words-empty">No custom words yet. Right-click a word in the editor to add it.</div>`
    return
  }
  
  container.innerHTML = SpellCheck.customWords.map(word => `
    <div class="custom-word-chip">
      ${escapeHtml(word)}
      <button data-word="${escapeHtml(word)}" title="Remove">×</button>
    </div>
  `).join('')
  
  container.querySelectorAll('.custom-word-chip button').forEach(btn => {
    btn.addEventListener('click', async () => {
      const word = btn.dataset.word
      SpellCheck.customWords = SpellCheck.customWords.filter(w => w !== word)
      saveSpellCheckPrefs()
      
      // Also try to remove from Chromium's dictionary
      try {
        await window.electronAPI.spellcheckRemoveWord(word)
      } catch (e) {
        console.error('Could not remove word from Chromium dict:', e)
      }
      
      renderCustomWordsList()
      showToast(`"${word}" removed from dictionary`, 'info', 2000)
    })
  })
}

function updateStatusDisplay() {
    const toggle = document.getElementById('spellcheck-toggle')
    const isOn = toggle.classList.contains('on')
    const iconEl = document.getElementById('spellcheck-status-icon')
    const titleEl = document.getElementById('spellcheck-status-title')
    const descEl = document.getElementById('spellcheck-status-desc')

    if (isOn) {
        iconEl.classList.remove('off')
        iconEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
        titleEl.textContent = 'Spell Check is ON'
        descEl.textContent = 'Misspelled words will be underlined in red'
    } else {
        iconEl.classList.add('off')
        iconEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
        titleEl.textContent = 'Spell Check is OFF'
        descEl.textContent = 'No spell checking will be performed'
    }
}

// ============================================
// SAVE AND APPLY
// ============================================

async function saveAndApplySpellCheck() {
    // Get toggle state
    const toggle = document.getElementById('spellcheck-toggle')
    SpellCheck.enabled = toggle.classList.contains('on')

    // Get selected languages
    const selected = []
    document.querySelectorAll('.spellcheck-lang-option.selected').forEach(opt => {
        selected.push(opt.dataset.langCode)
    })

    if (SpellCheck.enabled && selected.length === 0) {
        showToast('Please select at least one language, or turn off spell check', 'error')
        return
    }

    SpellCheck.currentLanguages = selected.length > 0 ? selected : ['en-US']

    // Save preferences
    saveSpellCheckPrefs()

    // Apply to Electron
    await applySpellCheckSettings()

    hideModal('modal-spellcheck')
    showToast(
        SpellCheck.enabled
            ? `Spell check enabled (${SpellCheck.currentLanguages.length} language${SpellCheck.currentLanguages.length !== 1 ? 's' : ''})`
            : 'Spell check disabled',
        'success'
    )
}