// polish.js
// Settings, themes, accent colors, novel covers, note images, shortcuts

const Polish = {
    currentAccentColor: '#7c6af7',
    currentTheme: 'dark',
    activeOverlay: null,
}

const THEME_PRESETS = [
    { key: 'dark', icon: '🌙', name: 'Midnight', desc: 'Classic dark' },
    { key: 'light', icon: '☀️', name: 'Daylight', desc: 'Bright & clean' },
    { key: 'sepia', icon: '📜', name: 'Sepia', desc: 'Warm paper' },
    { key: 'forest', icon: '🌲', name: 'Forest', desc: 'Deep green' },
    { key: 'ocean', icon: '🌊', name: 'Ocean', desc: 'Cool blue' },
    { key: 'sunset', icon: '🌅', name: 'Sunset', desc: 'Warm orange' },
    { key: 'lavender', icon: '💜', name: 'Lavender', desc: 'Soft purple' },
    { key: 'high-contrast', icon: '⬛', name: 'Contrast', desc: 'Max clarity' },
]

const ACCENT_COLORS = ['#7c6af7', '#ee6a99', '#e05555', '#f0a030', '#50c878', '#4fc3f7', '#ba68c8', '#8d6e63', '#26a69a', '#ff7043']

function initPolish() {
    loadPolishPrefs()
    applyPolishTheme(Polish.currentTheme)
    applyPolishAccent(Polish.currentAccentColor)

    // Override settings button
    const btn = document.getElementById('settings-btn')
    if (btn) {
        const newBtn = btn.cloneNode(true)
        btn.parentNode.replaceChild(newBtn, btn)
        newBtn.addEventListener('click', openPolishSettings)
    }

    // F1 shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F1') { e.preventDefault(); openPolishShortcuts() }
        if (e.key === 'Escape' && Polish.activeOverlay) closePolishOverlay()
    })
}

function loadPolishPrefs() {
    try {
        const s = localStorage.getItem('writeflow-polish')
        if (s) { const p = JSON.parse(s); Polish.currentTheme = p.theme || 'dark'; Polish.currentAccentColor = p.accentColor || '#7c6af7' }
    } catch (e) { }
}

function savePolishPrefs() {
    try { localStorage.setItem('writeflow-polish', JSON.stringify({ theme: Polish.currentTheme, accentColor: Polish.currentAccentColor })) } catch (e) { }
}

// Overlay system
function showPolishOverlay(html, opts = {}) {
    closePolishOverlay()
    const overlay = document.createElement('div')
    overlay.className = 'polish-overlay'
    const box = document.createElement('div')
    box.className = 'polish-modal-box' + (opts.wide ? ' polish-shortcuts-box' : '')
    box.innerHTML = html
    overlay.appendChild(box)
    document.body.appendChild(overlay)
    Polish.activeOverlay = overlay
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closePolishOverlay() })
    box.querySelector('.polish-modal-close')?.addEventListener('click', closePolishOverlay)
    box.querySelectorAll('.polish-cancel-btn').forEach(b => b.addEventListener('click', closePolishOverlay))
    return box
}

function closePolishOverlay() {
    if (Polish.activeOverlay) { Polish.activeOverlay.remove(); Polish.activeOverlay = null }
}

// Settings
function openPolishSettings() {
    const box = showPolishOverlay(`
    <div class="polish-modal-header"><h2>⚙ Settings</h2><button class="polish-modal-close">✕</button></div>
    <div class="polish-modal-body">
      <div class="polish-settings-section">
        <div class="polish-settings-title">Theme</div>
        <div class="polish-settings-desc">Choose your preferred appearance</div>
        <div class="polish-theme-grid">
          ${THEME_PRESETS.map(t => `<button class="polish-theme-btn ${Polish.currentTheme === t.key ? 'selected' : ''}" data-theme="${t.key}"><span class="polish-theme-icon">${t.icon}</span><span class="polish-theme-name">${t.name}</span><span class="polish-theme-desc">${t.desc}</span></button>`).join('')}
        </div>
      </div>
      <div class="polish-settings-section">
        <div class="polish-settings-title">Accent Color</div>
        <div class="polish-settings-desc">Personalize your app</div>
        <div class="polish-color-grid">
          ${ACCENT_COLORS.map(c => `<div class="polish-color-swatch ${Polish.currentAccentColor === c ? 'selected' : ''}" data-color="${c}" style="background:${c}"></div>`).join('')}
        </div>
      </div>
      <div class="polish-settings-section">
        <div class="polish-settings-title">Tools</div>
        <div class="polish-settings-row"><div><div class="polish-settings-label">Spell check</div><div class="polish-settings-sublabel">Languages & dictionary</div></div><button class="btn-secondary" id="ps-spellcheck">Configure</button></div>
        <div class="polish-settings-row"><div><div class="polish-settings-label">Storage</div><div class="polish-settings-sublabel">Data & backups</div></div><button class="btn-secondary" id="ps-storage">View</button></div>
        <div class="polish-settings-row"><div><div class="polish-settings-label">Shortcuts</div><div class="polish-settings-sublabel">Keyboard shortcuts (F1)</div></div><button class="btn-secondary" id="ps-shortcuts">View</button></div>
        <div class="polish-settings-row"><div><div class="polish-settings-label">Support WriteFlow</div><div class="polish-settings-sublabel">Buy me a coffee ☕</div></div><button class="btn-secondary" id="ps-kofi" style="background: #ff5e5b; color: white; border-color: #ff5e5b;">☕ Ko-fi</button></div>
      </div>
    </div>
    <div class="polish-modal-footer"><button class="btn-primary polish-cancel-btn">Done</button></div>
  `)

    box.querySelectorAll('.polish-theme-btn').forEach(b => b.addEventListener('click', () => {
        Polish.currentTheme = b.dataset.theme
        applyPolishTheme(b.dataset.theme)
        applyPolishAccent(Polish.currentAccentColor)
        box.querySelectorAll('.polish-theme-btn').forEach(x => x.classList.remove('selected'))
        b.classList.add('selected')
        savePolishPrefs()
    }))

    box.querySelectorAll('.polish-color-swatch').forEach(s => s.addEventListener('click', () => {
        Polish.currentAccentColor = s.dataset.color
        applyPolishAccent(s.dataset.color)
        box.querySelectorAll('.polish-color-swatch').forEach(x => x.classList.remove('selected'))
        s.classList.add('selected')
        savePolishPrefs()
    }))

    box.querySelector('#ps-spellcheck')?.addEventListener('click', () => {
        closePolishOverlay()
        setTimeout(() => {
            if (typeof openSpellCheckSettings === 'function') {
                openSpellCheckSettings()
            } else {
                // Fallback: try showing the modal directly
                const modal = document.getElementById('modal-spellcheck')
                if (modal) {
                    modal.classList.remove('hidden')
                    modal.className = modal.className.replace(/\bhidden\b/g, '').trim()
                }
            }
        }, 300)
    })
    box.querySelector('#ps-storage')?.addEventListener('click', () => {
        closePolishOverlay()
        setTimeout(async () => {
            try {
                const result = await window.electronAPI.getStorageInfo()
                if (result.success) {
                    showPolishOverlay(`
            <div class="polish-modal-header"><h2>Storage & Data</h2><button class="polish-modal-close">✕</button></div>
            <div class="polish-modal-body">
              <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px;">Your writing is safely stored on your computer.</p>
              <div class="storage-info">
                <div class="storage-stat"><div class="storage-stat-value">${result.projectCount}</div><div class="storage-stat-label">Projects</div></div>
                <div class="storage-stat"><div class="storage-stat-value">${result.backupCount}</div><div class="storage-stat-label">Backups</div></div>
                <div class="storage-stat"><div class="storage-stat-value">${formatFileSize(result.totalSize)}</div><div class="storage-stat-label">Total Size</div></div>
                <div class="storage-stat"><div class="storage-stat-value">✓</div><div class="storage-stat-label">All Saved</div></div>
              </div>
              <p style="color:var(--text-secondary);font-size:12px;margin-top:16px;margin-bottom:6px;">Data location:</p>
              <div class="storage-path" id="ps-storage-path" style="cursor:pointer;">${result.dataPath}</div>
            </div>
            <div class="polish-modal-footer"><button class="btn-primary polish-cancel-btn">Done</button></div>
          `)
                    document.getElementById('ps-storage-path')?.addEventListener('click', () => window.electronAPI.openDataFolder())
                }
            } catch (e) { console.error(e) }
        }, 200)
    })
    box.querySelector('#ps-shortcuts')?.addEventListener('click', () => {
        closePolishOverlay()
        setTimeout(() => openPolishShortcuts(), 200)
    })

    box.querySelector('#ps-kofi')?.addEventListener('click', async () => {
        try {
            await window.electronAPI.openExternalUrl('https://ko-fi.com/writeflow')
        } catch (e) {
            // Fallback
            showToast('Visit ko-fi.com to support!', 'info')
        }
    })
}

function openPolishShortcuts() {
    showPolishOverlay(`
    <div class="polish-modal-header"><h2>⌨️ Keyboard Shortcuts</h2><button class="polish-modal-close">✕</button></div>
    <div class="polish-modal-body">
      <div class="polish-shortcuts-grid">
        <div class="polish-shortcuts-section"><h4>General</h4>
          <div class="polish-shortcut-item"><span class="polish-shortcut-desc">Toggle sidebar</span><div class="polish-shortcut-keys"><span class="polish-shortcut-key">Ctrl</span><span class="polish-shortcut-key">B</span></div></div>
          <div class="polish-shortcut-item"><span class="polish-shortcut-desc">Save</span><div class="polish-shortcut-keys"><span class="polish-shortcut-key">Ctrl</span><span class="polish-shortcut-key">S</span></div></div>
          <div class="polish-shortcut-item"><span class="polish-shortcut-desc">Help</span><div class="polish-shortcut-keys"><span class="polish-shortcut-key">F1</span></div></div>
        </div>
        <div class="polish-shortcuts-section"><h4>Formatting</h4>
          <div class="polish-shortcut-item"><span class="polish-shortcut-desc">Bold</span><div class="polish-shortcut-keys"><span class="polish-shortcut-key">Ctrl</span><span class="polish-shortcut-key">B</span></div></div>
          <div class="polish-shortcut-item"><span class="polish-shortcut-desc">Italic</span><div class="polish-shortcut-keys"><span class="polish-shortcut-key">Ctrl</span><span class="polish-shortcut-key">I</span></div></div>
          <div class="polish-shortcut-item"><span class="polish-shortcut-desc">Underline</span><div class="polish-shortcut-keys"><span class="polish-shortcut-key">Ctrl</span><span class="polish-shortcut-key">U</span></div></div>
        </div>
        <div class="polish-shortcuts-section"><h4>Modes</h4>
          <div class="polish-shortcut-item"><span class="polish-shortcut-desc">Focus</span><div class="polish-shortcut-keys"><span class="polish-shortcut-key">Ctrl</span><span class="polish-shortcut-key">⇧</span><span class="polish-shortcut-key">F</span></div></div>
          <div class="polish-shortcut-item"><span class="polish-shortcut-desc">Typewriter</span><div class="polish-shortcut-keys"><span class="polish-shortcut-key">Ctrl</span><span class="polish-shortcut-key">⇧</span><span class="polish-shortcut-key">T</span></div></div>
          <div class="polish-shortcut-item"><span class="polish-shortcut-desc">Zen</span><div class="polish-shortcut-keys"><span class="polish-shortcut-key">Ctrl</span><span class="polish-shortcut-key">⇧</span><span class="polish-shortcut-key">Z</span></div></div>
          <div class="polish-shortcut-item"><span class="polish-shortcut-desc">Fullscreen</span><div class="polish-shortcut-keys"><span class="polish-shortcut-key">F11</span></div></div>
        </div>
        <div class="polish-shortcuts-section"><h4>Productivity</h4>
          <div class="polish-shortcut-item"><span class="polish-shortcut-desc">Quick note</span><div class="polish-shortcut-keys"><span class="polish-shortcut-key">Ctrl</span><span class="polish-shortcut-key">⇧</span><span class="polish-shortcut-key">N</span></div></div>
          <div class="polish-shortcut-item"><span class="polish-shortcut-desc">Sprint</span><div class="polish-shortcut-keys"><span class="polish-shortcut-key">Ctrl</span><span class="polish-shortcut-key">⇧</span><span class="polish-shortcut-key">S</span></div></div>
          <div class="polish-shortcut-item"><span class="polish-shortcut-desc">@Mention</span><div class="polish-shortcut-keys"><span class="polish-shortcut-key">@</span></div></div>
        </div>
      </div>
    </div>
    <div class="polish-modal-footer"><button class="btn-primary polish-cancel-btn">Got it</button></div>
  `, { wide: true })
}

// Themes
function applyPolishTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme)
    document.body.classList.remove('light-theme')
    if (theme === 'light') document.body.classList.add('light-theme')
}

function applyPolishAccent(color) {
    const r = document.documentElement.style
    r.setProperty('--accent-primary', color, 'important')
    r.setProperty('--accent-hover', lightenHex(color, 15), 'important')
    r.setProperty('--accent-secondary', darkenHex(color, 15), 'important')
    r.setProperty('--text-accent', color, 'important')
}

function lightenHex(hex, pct) {
    const n = parseInt(hex.replace('#', ''), 16)
    const r = Math.min(255, (n >> 16) + Math.round(255 * pct / 100))
    const g = Math.min(255, ((n >> 8) & 0xFF) + Math.round(255 * pct / 100))
    const b = Math.min(255, (n & 0xFF) + Math.round(255 * pct / 100))
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

function darkenHex(hex, pct) {
    const n = parseInt(hex.replace('#', ''), 16)
    const r = Math.max(0, (n >> 16) - Math.round(255 * pct / 100))
    const g = Math.max(0, ((n >> 8) & 0xFF) - Math.round(255 * pct / 100))
    const b = Math.max(0, (n & 0xFF) - Math.round(255 * pct / 100))
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

// Note images
function attachImagesSectionToNote() {
    const body = document.querySelector('.note-detail-body')
    if (!body || document.getElementById('note-images-section')) return
    const ta = document.getElementById('note-detail-content')
    if (!ta) return

    const s = document.createElement('div')
    s.className = 'note-images-section'
    s.id = 'note-images-section'
    s.innerHTML = `<div class="note-images-header"><span class="note-images-title">Images</span><button class="note-add-image-btn" id="btn-add-note-image">+ Add Image</button></div><div class="note-images-grid" id="note-images-grid"></div><input type="file" id="note-image-input" accept="image/*" style="display:none;" />`
    ta.parentNode.insertBefore(s, ta)

    document.getElementById('btn-add-note-image').addEventListener('click', () => document.getElementById('note-image-input').click())
    document.getElementById('note-image-input').addEventListener('change', handleNoteImageUpload)
}

function renderNoteImages() {
    if (!Notes.currentNote) return
    attachImagesSectionToNote()
    const grid = document.getElementById('note-images-grid')
    if (!grid) return
    const images = Notes.currentNote.images || []

    if (images.length === 0) { grid.innerHTML = '<div class="notes-images-empty">No images yet</div>'; return }

    grid.innerHTML = images.map((img, i) => `<div class="note-image-item" data-idx="${i}"><img src="${img}" alt="" /><button class="note-image-remove" data-idx="${i}">✕</button></div>`).join('')

    grid.querySelectorAll('.note-image-item').forEach(item => {
        item.addEventListener('click', (e) => { if (e.target.closest('.note-image-remove')) return; openPolishLightbox(Notes.currentNote.images[parseInt(item.dataset.idx)]) })
    })
    grid.querySelectorAll('.note-image-remove').forEach(btn => {
        btn.addEventListener('click', async (e) => { e.stopPropagation(); Notes.currentNote.images.splice(parseInt(btn.dataset.idx), 1); await saveCurrentProject(); renderNoteImages(); showToast('Image removed', 'info') })
    })
}

async function handleNoteImageUpload(e) {
    const file = e.target.files[0]
    if (!file || !Notes.currentNote) return
    if (!file.type.startsWith('image/')) { showToast('Select an image', 'error'); return }
    if (file.size > 3 * 1024 * 1024) { showToast('Max 3MB', 'error'); return }
    const reader = new FileReader()
    reader.onload = async (ev) => { if (!Notes.currentNote.images) Notes.currentNote.images = []; Notes.currentNote.images.push(ev.target.result); await saveCurrentProject(); renderNoteImages(); showToast('Image added', 'success') }
    reader.readAsDataURL(file)
    e.target.value = ''
}

function openPolishLightbox(src) {
    document.querySelectorAll('.polish-lightbox').forEach(el => el.remove())
    const lb = document.createElement('div')
    lb.className = 'polish-lightbox'
    lb.innerHTML = `<button class="polish-lightbox-close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button><img src="${src}" alt="" />`
    document.body.appendChild(lb)
    const close = () => lb.remove()
    lb.addEventListener('click', (e) => { if (e.target === lb) close() })
    lb.querySelector('.polish-lightbox-close').addEventListener('click', close)
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc) } })
}

// Novel covers
function loadCoverIntoEditModal() {
    const editModal = document.getElementById('modal-edit-project')
    if (!editModal) return

    // Add cover section if not there
    if (!document.getElementById('cover-upload-input')) {
        const body = editModal.querySelector('.modal-body')
        if (!body) return
        const s = document.createElement('div')
        s.className = 'cover-upload-section'
        s.innerHTML = `<div class="cover-upload-preview" id="cover-upload-preview"><span class="cover-upload-preview-icon">📖</span></div><div class="cover-upload-info"><h4>Novel Cover</h4><p>Upload cover image (max 3MB)</p><div class="cover-upload-actions"><label for="cover-upload-input" class="cover-btn-upload">Upload</label><input type="file" id="cover-upload-input" accept="image/*" style="display:none;" /><button class="cover-btn-remove" id="cover-btn-remove" style="display:none;">Remove</button></div></div>`
        body.insertBefore(s, body.firstChild)
        document.getElementById('cover-upload-input').addEventListener('change', handleCoverUpload)
        document.getElementById('cover-upload-preview').addEventListener('click', () => document.getElementById('cover-upload-input').click())
        document.getElementById('cover-btn-remove').addEventListener('click', removeCover)
    }

    const project = AppState.allProjects.find(p => p.id === AppState.projectToEdit)
    if (!project) return
    const preview = document.getElementById('cover-upload-preview')
    const removeBtn = document.getElementById('cover-btn-remove')
    if (project.cover) {
        preview.innerHTML = `<img src="${project.cover}" alt="Cover" />`
        if (removeBtn) removeBtn.style.display = ''
    } else {
        preview.innerHTML = '<span class="cover-upload-preview-icon">📖</span>'
        if (removeBtn) removeBtn.style.display = 'none'
    }
}

function handleCoverUpload(e) {
    const file = e.target.files[0]
    if (!file || !AppState.projectToEdit) return
    if (!file.type.startsWith('image/')) { showToast('Select an image', 'error'); return }
    if (file.size > 3 * 1024 * 1024) { showToast('Max 3MB', 'error'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
        const p = AppState.allProjects.find(x => x.id === AppState.projectToEdit)
        if (!p) return
        p.cover = ev.target.result
        const preview = document.getElementById('cover-upload-preview')
        const removeBtn = document.getElementById('cover-btn-remove')
        if (preview) preview.innerHTML = `<img src="${p.cover}" alt="Cover" />`
        if (removeBtn) removeBtn.style.display = ''
        showToast('Cover ready — save to apply', 'info')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
}

function removeCover() {
    const p = AppState.allProjects.find(x => x.id === AppState.projectToEdit)
    if (!p) return
    p.cover = null
    const preview = document.getElementById('cover-upload-preview')
    const removeBtn = document.getElementById('cover-btn-remove')
    if (preview) preview.innerHTML = '<span class="cover-upload-preview-icon">📖</span>'
    if (removeBtn) removeBtn.style.display = 'none'
    showToast('Cover removed — save to apply', 'info')
}