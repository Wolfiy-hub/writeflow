// versions.js
// Scene versions & iterations

const Versions = {
  panelOpen: false,
  versionToDelete: null,
}

// ============================================
// INITIALIZATION
// ============================================

function initVersions() {
  document.getElementById('btn-versions').addEventListener('click', toggleVersionsPanel)
  document.getElementById('versions-panel-close').addEventListener('click', closeVersionsPanel)
  document.getElementById('btn-new-version').addEventListener('click', openNewVersionModal)
  document.getElementById('btn-compare-versions').addEventListener('click', openCompareModal)
  document.getElementById('btn-create-version').addEventListener('click', createNewVersion)
  document.getElementById('btn-confirm-delete-version').addEventListener('click', confirmDeleteVersion)
  document.getElementById('btn-close-compare').addEventListener('click', () => hideModal('modal-compare'))
  
  // Compare selectors
  document.getElementById('compare-left-select').addEventListener('change', updateCompareView)
  document.getElementById('compare-right-select').addEventListener('change', updateCompareView)
  
  // Compare navigation buttons
  document.getElementById('btn-compare-top').addEventListener('click', () => {
    document.getElementById('compare-left-content').scrollTop = 0
    document.getElementById('compare-right-content').scrollTop = 0
  })
  document.getElementById('btn-compare-bottom').addEventListener('click', () => {
    const left = document.getElementById('compare-left-content')
    const right = document.getElementById('compare-right-content')
    left.scrollTop = left.scrollHeight
    right.scrollTop = right.scrollHeight
  })
  
  // Sync scrolling between the two columns
  setupCompareSyncScroll()
}

let syncScrollInProgress = false

function setupCompareSyncScroll() {
  const left = document.getElementById('compare-left-content')
  const right = document.getElementById('compare-right-content')
  const checkbox = document.getElementById('compare-sync-scroll')
  
  function syncFromLeft() {
    if (!checkbox.checked) return
    if (syncScrollInProgress) return
    syncScrollInProgress = true
    
    const leftMax = left.scrollHeight - left.clientHeight
    const rightMax = right.scrollHeight - right.clientHeight
    if (leftMax > 0) {
      const ratio = left.scrollTop / leftMax
      right.scrollTop = ratio * rightMax
    }
    setTimeout(() => { syncScrollInProgress = false }, 50)
  }
  
  function syncFromRight() {
    if (!checkbox.checked) return
    if (syncScrollInProgress) return
    syncScrollInProgress = true
    
    const leftMax = left.scrollHeight - left.clientHeight
    const rightMax = right.scrollHeight - right.clientHeight
    if (rightMax > 0) {
      const ratio = right.scrollTop / rightMax
      left.scrollTop = ratio * leftMax
    }
    setTimeout(() => { syncScrollInProgress = false }, 50)
  }
  
  left.addEventListener('scroll', syncFromLeft)
  right.addEventListener('scroll', syncFromRight)
}

// ============================================
// DATA STRUCTURE
// Chapters get a `versions` array. Each version has:
// { id, name, content, wordCount, createdAt, lastModified }
// Chapter also gets `activeVersionId` pointing to the current version.
// 
// LEGACY: For chapters without versions, we treat the chapter itself
// as version 0. We migrate on first access.
// ============================================

function ensureChapterHasVersions(chapter) {
  if (!chapter) return
  
  // If already has versions, do nothing
  if (chapter.versions && chapter.versions.length > 0) return
  
  // Migrate: create initial version from current content
  chapter.versions = [{
    id: generateId(),
    name: 'Original',
    content: chapter.content || '',
    wordCount: chapter.wordCount || 0,
    createdAt: chapter.createdAt || new Date().toISOString(),
    lastModified: chapter.lastModified || new Date().toISOString()
  }]
  chapter.activeVersionId = chapter.versions[0].id
}

function getActiveVersion(chapter) {
  if (!chapter) return null
  ensureChapterHasVersions(chapter)
  return chapter.versions.find(v => v.id === chapter.activeVersionId) || chapter.versions[0]
}

function syncActiveVersionFromChapter(chapter) {
  // Sync chapter's content to the active version (keeps them in sync when user edits)
  if (!chapter) return
  ensureChapterHasVersions(chapter)
  
  const active = getActiveVersion(chapter)
  if (active) {
    active.content = chapter.content
    active.wordCount = chapter.wordCount
    active.lastModified = new Date().toISOString()
  }
}

// ============================================
// PANEL TOGGLE
// ============================================

function toggleVersionsPanel() {
  if (!AppState.currentChapter) {
    showToast('Open a chapter first', 'info')
    return
  }
  
  if (Versions.panelOpen) {
    closeVersionsPanel()
  } else {
    openVersionsPanel()
  }
}

function openVersionsPanel() {
  if (!AppState.currentChapter) return
  
  Versions.panelOpen = true
  document.getElementById('versions-panel').classList.add('open')
  renderVersionsList()
}

function closeVersionsPanel() {
  Versions.panelOpen = false
  document.getElementById('versions-panel').classList.remove('open')
}

// ============================================
// UPDATE VERSION COUNT BADGE ON EDITOR BUTTON
// ============================================

function updateVersionsButton() {
  const btn = document.getElementById('btn-versions')
  const badge = document.getElementById('versions-count')
  
  if (!AppState.currentChapter) {
    btn.classList.remove('has-versions')
    badge.classList.add('hidden')
    return
  }
  
  ensureChapterHasVersions(AppState.currentChapter)
  const count = AppState.currentChapter.versions.length
  
  if (count > 1) {
    btn.classList.add('has-versions')
    badge.classList.remove('hidden')
    badge.textContent = count
  } else {
    btn.classList.remove('has-versions')
    badge.classList.add('hidden')
  }
}

// Called from editor when content changes - live updates the panel if open
function refreshVersionsPanelIfOpen() {
  if (!Versions.panelOpen) return
  if (!AppState.currentChapter) return
  
  // Sync current editor content to active version so it shows up-to-date
  syncActiveVersionFromChapter(AppState.currentChapter)
  
  // Only update the active version card (not the whole list, to avoid losing focus on name inputs)
  const active = getActiveVersion(AppState.currentChapter)
  if (!active) return
  
  const card = document.querySelector(`.version-card[data-version-id="${active.id}"]`)
  if (!card) return
  
  // Update word count in meta
  const metaItems = card.querySelectorAll('.version-card-meta-item')
  if (metaItems.length >= 1) {
    metaItems[0].innerHTML = `
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>
      </svg>
      ${formatNumber(active.wordCount || 0)} words
    `
  }
  
  // Update preview
  const previewEl = card.querySelector('.version-card-preview')
  if (previewEl) {
    const preview = stripHtml(active.content || '').substring(0, 200)
    const hasContent = preview.trim().length > 0
    if (hasContent) {
      previewEl.classList.remove('empty')
      previewEl.textContent = preview
    } else {
      previewEl.classList.add('empty')
      previewEl.textContent = 'Empty version — nothing written yet'
    }
  }
}

// ============================================
// RENDER VERSIONS LIST
// ============================================

function renderVersionsList() {
  if (!AppState.currentChapter) return
  
  ensureChapterHasVersions(AppState.currentChapter)
  const chapter = AppState.currentChapter
  const container = document.getElementById('versions-list')
  
  if (chapter.versions.length === 0) {
    container.innerHTML = `
      <div class="versions-empty">
        <div class="versions-empty-icon">📚</div>
        <p>No versions yet.<br>Click "New Version" above to create one.</p>
      </div>
    `
    return
  }
  
  // Sort: active first, then by lastModified desc
  const sorted = [...chapter.versions].sort((a, b) => {
    if (a.id === chapter.activeVersionId) return -1
    if (b.id === chapter.activeVersionId) return 1
    return new Date(b.lastModified) - new Date(a.lastModified)
  })
  
  container.innerHTML = sorted.map(v => createVersionCardHTML(v, chapter)).join('')
  
  attachVersionCardListeners()
}

function createVersionCardHTML(version, chapter) {
  const isActive = version.id === chapter.activeVersionId
  const preview = stripHtml(version.content || '').substring(0, 200)
  const hasContent = preview.trim().length > 0
  
  return `
    <div class="version-card ${isActive ? 'active' : ''}" data-version-id="${version.id}">
      <div class="version-card-header">
        <input type="text" class="version-card-name" 
               value="${escapeHtml(version.name)}" 
               data-version-id="${version.id}"
               placeholder="Version name..." />
        ${isActive ? '<span class="version-active-badge">Active</span>' : ''}
      </div>
      
      <div class="version-card-meta">
        <span class="version-card-meta-item">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          ${formatNumber(version.wordCount || 0)} words
        </span>
        <span class="version-card-meta-item">
          ${formatDate(version.lastModified)}
        </span>
      </div>
      
      <div class="version-card-preview ${!hasContent ? 'empty' : ''}">
        ${hasContent ? escapeHtml(preview) : 'Empty version — nothing written yet'}
      </div>
      
      <div class="version-card-actions">
        ${!isActive ? `
          <button class="version-card-action primary" data-action="activate" data-version-id="${version.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Use This
          </button>
        ` : ''}
        <button class="version-card-action" data-action="duplicate" data-version-id="${version.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
          </svg>
          Duplicate
        </button>
        ${chapter.versions.length > 1 ? `
          <button class="version-card-action danger" data-action="delete" data-version-id="${version.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
            </svg>
            Delete
          </button>
        ` : ''}
      </div>
    </div>
  `
}

function attachVersionCardListeners() {
  // Rename inputs
  document.querySelectorAll('.version-card-name').forEach(input => {
    input.addEventListener('input', () => {
      const versionId = input.dataset.versionId
      const version = AppState.currentChapter.versions.find(v => v.id === versionId)
      if (version) {
        version.name = input.value.trim() || 'Untitled Version'
        version.lastModified = new Date().toISOString()
        saveCurrentProject()
      }
    })
  })
  
  // Action buttons
  document.querySelectorAll('[data-action="activate"]').forEach(btn => {
    btn.addEventListener('click', () => activateVersion(btn.dataset.versionId))
  })
  
  document.querySelectorAll('[data-action="duplicate"]').forEach(btn => {
    btn.addEventListener('click', () => duplicateVersion(btn.dataset.versionId))
  })
  
  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => openDeleteVersionModal(btn.dataset.versionId))
  })
}

// ============================================
// VERSION ACTIONS
// ============================================

function openNewVersionModal() {
  document.getElementById('new-version-name').value = ''
  // Reset radio to "copy"
  document.querySelector('input[name="version-source"][value="copy"]').checked = true
  updateNewVersionRadioStyles()
  
  // Attach radio listeners
  document.querySelectorAll('input[name="version-source"]').forEach(radio => {
    radio.addEventListener('change', updateNewVersionRadioStyles)
  })
  
  showModal('modal-new-version')
  setTimeout(() => document.getElementById('new-version-name').focus(), 100)
}

function updateNewVersionRadioStyles() {
  document.querySelectorAll('input[name="version-source"]').forEach(radio => {
    const label = radio.closest('label')
    if (radio.checked) {
      label.style.borderColor = 'var(--accent-primary)'
    } else {
      label.style.borderColor = 'var(--border-color)'
    }
  })
}

async function createNewVersion() {
  if (!AppState.currentChapter) return
  
  ensureChapterHasVersions(AppState.currentChapter)
  
  // Save current state to active version first
  syncActiveVersionFromChapter(AppState.currentChapter)
  
  const name = document.getElementById('new-version-name').value.trim() || `Version ${AppState.currentChapter.versions.length + 1}`
  const source = document.querySelector('input[name="version-source"]:checked')?.value || 'copy'
  
  const activeVersion = getActiveVersion(AppState.currentChapter)
  
  const newVersion = {
    id: generateId(),
    name: name,
    content: source === 'copy' && activeVersion ? activeVersion.content : '',
    wordCount: source === 'copy' && activeVersion ? activeVersion.wordCount : 0,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  }
  
  AppState.currentChapter.versions.push(newVersion)
  AppState.currentChapter.activeVersionId = newVersion.id
  
  // Update chapter content to match new version
  AppState.currentChapter.content = newVersion.content
  AppState.currentChapter.wordCount = newVersion.wordCount
  
  await saveCurrentProject()
  
  hideModal('modal-new-version')
  
  // Reload editor with the new version
  loadChapterIntoEditor(AppState.currentChapter)
  
  renderVersionsList()
  updateVersionsButton()
  showToast(`Version "${name}" created`, 'success')
}

async function activateVersion(versionId) {
  if (!AppState.currentChapter) return
  
  // Save current state to currently active version first
  syncActiveVersionFromChapter(AppState.currentChapter)
  
  const version = AppState.currentChapter.versions.find(v => v.id === versionId)
  if (!version) return
  
  // Switch active version
  AppState.currentChapter.activeVersionId = versionId
  AppState.currentChapter.content = version.content
  AppState.currentChapter.wordCount = version.wordCount
  
  await saveCurrentProject()
  
  // Reload the editor
  loadChapterIntoEditor(AppState.currentChapter)
  
  renderVersionsList()
  updateVersionsButton()
  showToast(`Switched to "${version.name}"`, 'success')
}

async function duplicateVersion(versionId) {
  if (!AppState.currentChapter) return
  
  const original = AppState.currentChapter.versions.find(v => v.id === versionId)
  if (!original) return
  
  const duplicate = {
    id: generateId(),
    name: `${original.name} (Copy)`,
    content: original.content,
    wordCount: original.wordCount,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  }
  
  const idx = AppState.currentChapter.versions.findIndex(v => v.id === versionId)
  AppState.currentChapter.versions.splice(idx + 1, 0, duplicate)
  
  await saveCurrentProject()
  renderVersionsList()
  updateVersionsButton()
  showToast(`Duplicated as "${duplicate.name}"`, 'success')
}

function openDeleteVersionModal(versionId) {
  const version = AppState.currentChapter?.versions.find(v => v.id === versionId)
  if (!version) return
  
  Versions.versionToDelete = versionId
  document.getElementById('delete-version-name').textContent = version.name
  showModal('modal-delete-version')
}

async function confirmDeleteVersion() {
  if (!Versions.versionToDelete || !AppState.currentChapter) return
  
  const versionId = Versions.versionToDelete
  const wasActive = AppState.currentChapter.activeVersionId === versionId
  
  AppState.currentChapter.versions = AppState.currentChapter.versions.filter(v => v.id !== versionId)
  
  // If we deleted the active version, switch to the first remaining one
  if (wasActive && AppState.currentChapter.versions.length > 0) {
    const newActive = AppState.currentChapter.versions[0]
    AppState.currentChapter.activeVersionId = newActive.id
    AppState.currentChapter.content = newActive.content
    AppState.currentChapter.wordCount = newActive.wordCount
    loadChapterIntoEditor(AppState.currentChapter)
  }
  
  await saveCurrentProject()
  hideModal('modal-delete-version')
  renderVersionsList()
  updateVersionsButton()
  showToast('Version deleted', 'info')
  Versions.versionToDelete = null
}

// ============================================
// COMPARE MODAL
// ============================================

function openCompareModal() {
  if (!AppState.currentChapter) return
  
  ensureChapterHasVersions(AppState.currentChapter)
  const versions = AppState.currentChapter.versions
  
  if (versions.length < 2) {
    showToast('Create at least 2 versions to compare', 'info')
    return
  }
  
  // Sync current before comparing
  syncActiveVersionFromChapter(AppState.currentChapter)
  
  // Populate selects
  const leftSelect = document.getElementById('compare-left-select')
  const rightSelect = document.getElementById('compare-right-select')
  
  const options = versions.map(v => {
    const isActive = v.id === AppState.currentChapter.activeVersionId
    return `<option value="${v.id}">${escapeHtml(v.name)}${isActive ? ' (Active)' : ''}</option>`
  }).join('')
  
  leftSelect.innerHTML = options
  rightSelect.innerHTML = options
  
  // Default: left = active, right = another version
  leftSelect.value = AppState.currentChapter.activeVersionId
  const otherVersion = versions.find(v => v.id !== AppState.currentChapter.activeVersionId)
  if (otherVersion) {
    rightSelect.value = otherVersion.id
  }
  
  updateCompareView()
  showModal('modal-compare')
}

function updateCompareView() {
  if (!AppState.currentChapter) return
  
  const leftId = document.getElementById('compare-left-select').value
  const rightId = document.getElementById('compare-right-select').value
  
  const leftVersion = AppState.currentChapter.versions.find(v => v.id === leftId)
  const rightVersion = AppState.currentChapter.versions.find(v => v.id === rightId)
  
  updateCompareColumn('left', leftVersion)
  updateCompareColumn('right', rightVersion)
}

function updateCompareColumn(side, version) {
  const contentEl = document.getElementById(`compare-${side}-content`)
  const statsEl = document.getElementById(`compare-${side}-stats`)
  const badgeEl = document.getElementById(`compare-${side}-badge`)
  
  if (!version) {
    contentEl.className = 'compare-column-content empty'
    contentEl.textContent = 'Nothing selected'
    statsEl.textContent = ''
    return
  }
  
  const isActive = version.id === AppState.currentChapter.activeVersionId
  badgeEl.classList.toggle('active', isActive)
  badgeEl.textContent = isActive ? 'Active' : 'Version'
  
  if (!version.content || version.content.trim() === '') {
    contentEl.className = 'compare-column-content empty'
    contentEl.textContent = 'This version is empty'
  } else {
    contentEl.className = 'compare-column-content'
    contentEl.innerHTML = version.content
  }
  
  // Scroll to top when switching versions
  contentEl.scrollTop = 0
  
  const wordCount = version.wordCount || 0
  const chars = stripHtml(version.content || '').length
  const readMin = Math.max(1, Math.ceil(wordCount / 200))
  statsEl.innerHTML = `
    <span>${formatNumber(wordCount)} words</span>
    <span>${formatNumber(chars)} chars</span>
    <span>${readMin} min read</span>
    <span style="margin-left: auto;">Modified ${formatDate(version.lastModified)}</span>
  `
}

// ============================================
// UTILITY
// ============================================

function stripHtml(html) {
  const temp = document.createElement('div')
  temp.innerHTML = html
  return temp.textContent || temp.innerText || ''
}