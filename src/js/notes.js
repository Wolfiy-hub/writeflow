// notes.js
// Notes management + Quick Note FAB

const Notes = {
  currentNote: null,
  saveTimer: null,
  filterQuery: '',
  filterCategory: '',
  sortBy: 'pinned-recent',
  noteToDelete: null,
  quickNoteOpen: false,
}

// ============================================
// INITIALIZATION
// ============================================

function initNotes() {
  document.getElementById('btn-new-note').addEventListener('click', createNewNote)
  document.getElementById('btn-new-note-empty').addEventListener('click', createNewNote)
  document.getElementById('btn-note-back').addEventListener('click', showNotesList)
  document.getElementById('btn-delete-note').addEventListener('click', () => {
    if (Notes.currentNote) openDeleteNoteModal(Notes.currentNote.id)
  })
  document.getElementById('btn-confirm-delete-note').addEventListener('click', confirmDeleteNote)
  document.getElementById('btn-note-pin').addEventListener('click', toggleNotePin)
  document.getElementById('btn-note-color').addEventListener('click', toggleColorMenu)

  document.getElementById('note-search').addEventListener('input', (e) => {
    Notes.filterQuery = e.target.value
    renderNotesGrid()
  })
  document.getElementById('note-category-filter').addEventListener('change', (e) => {
    Notes.filterCategory = e.target.value
    renderNotesGrid()
  })
  document.getElementById('note-sort').addEventListener('change', (e) => {
    Notes.sortBy = e.target.value
    renderNotesGrid()
  })

  // Detail view auto-save
  document.getElementById('note-detail-title').addEventListener('input', scheduleNoteSave)
  document.getElementById('note-detail-content').addEventListener('input', scheduleNoteSave)
  document.getElementById('note-detail-category').addEventListener('change', scheduleNoteSave)

  document.getElementById('note-tag-input').addEventListener('keydown', handleNoteTagInput)

  // Color options
  document.querySelectorAll('.note-color-option').forEach(opt => {
    opt.addEventListener('click', () => {
      selectNoteColor(opt.dataset.color)
    })
  })

  // Close card menus & color menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.note-card-menu') && !e.target.closest('.note-card-menu-dropdown')) {
      document.querySelectorAll('.note-card-menu-dropdown.open').forEach(m => {
        m.classList.remove('open')
        if (m.dataset.originalParent) {
          const originalParent = document.querySelector(`.note-card[data-note-id="${m.dataset.originalParent}"] .note-card-menu`)
          if (originalParent) originalParent.appendChild(m)
        }
      })
      document.querySelectorAll('.note-card-menu-btn.menu-open').forEach(b => {
        b.classList.remove('menu-open')
      })
    }

    if (!e.target.closest('#btn-note-color') && !e.target.closest('#note-color-menu')) {
      document.getElementById('note-color-menu').classList.remove('open')
    }
  })

  // Quick Note FAB
  document.getElementById('quick-note-fab').addEventListener('click', toggleQuickNote)
  document.getElementById('quick-note-close').addEventListener('click', closeQuickNote)
  document.getElementById('quick-note-save').addEventListener('click', saveQuickNote)

  // Ctrl+Shift+N for quick note
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
      e.preventDefault()
      toggleQuickNote()
    }
  })
}

// ============================================
// SHOW VIEWS
// ============================================

function showNotesList() {
  document.getElementById('notes-list-view').classList.remove('hidden')
  document.getElementById('notes-detail-view').classList.add('hidden')
  Notes.currentNote = null
  renderNotesGrid()
  updateNotesCount()
  if (AppState.currentView === 'notes' && AppState.currentProject) {
    updateSidebarForNotes(AppState.currentProject)
  }
}

function showNoteDetail(note) {
  document.getElementById('notes-list-view').classList.add('hidden')
  document.getElementById('notes-detail-view').classList.remove('hidden')
  Notes.currentNote = note
  loadNoteIntoForm(note)
  if (AppState.currentView === 'notes' && AppState.currentProject) {
    updateSidebarForNotes(AppState.currentProject)
  }
}

function updateNotesCount() {
  if (!AppState.currentProject) return
  const count = AppState.currentProject.notes?.length || 0
  document.getElementById('notes-count-text').textContent =
    `${count} note${count !== 1 ? 's' : ''}`
}

// ============================================
// RENDER GRID
// ============================================

function renderNotesGrid() {
  if (!AppState.currentProject) return

  const grid = document.getElementById('notes-grid')
  const empty = document.getElementById('notes-empty')

  let notes = [...(AppState.currentProject.notes || [])]

  if (Notes.filterQuery) {
    const q = Notes.filterQuery.toLowerCase()
    notes = notes.filter(n =>
      n.title?.toLowerCase().includes(q) ||
      n.content?.toLowerCase().includes(q) ||
      n.tags?.some(t => t.toLowerCase().includes(q))
    )
  }

  if (Notes.filterCategory) {
    notes = notes.filter(n => n.category === Notes.filterCategory)
  }

  // Sort
  notes.sort((a, b) => {
    switch (Notes.sortBy) {
      case 'pinned-recent':
        if (a.pinned !== b.pinned) return b.pinned ? 1 : -1
        return new Date(b.lastModified) - new Date(a.lastModified)
      case 'recent':
        return new Date(b.lastModified) - new Date(a.lastModified)
      case 'created':
        return new Date(b.createdAt) - new Date(a.createdAt)
      case 'alphabetical':
        return (a.title || '').localeCompare(b.title || '')
      default: return 0
    }
  })

  if ((AppState.currentProject.notes || []).length === 0) {
    grid.classList.add('hidden')
    empty.classList.remove('hidden')
    return
  }

  grid.classList.remove('hidden')
  empty.classList.add('hidden')

  if (notes.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        <p>No notes match your search</p>
      </div>
    `
    return
  }

  grid.innerHTML = notes.map(note => createNoteCard(note)).join('')

  grid.querySelectorAll('.note-card').forEach(card => {
    const noteId = card.dataset.noteId

    card.addEventListener('click', (e) => {
      if (e.target.closest('.note-card-menu')) return
      const note = AppState.currentProject.notes.find(n => n.id === noteId)
      if (note) showNoteDetail(note)
    })

    const menuBtn = card.querySelector('.note-card-menu-btn')
    const menuDropdown = card.querySelector('.note-card-menu-dropdown')

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation()

      const isOpen = menuDropdown.classList.contains('open')

      document.querySelectorAll('.note-card-menu-dropdown.open').forEach(m => {
        if (m !== menuDropdown) {
          m.classList.remove('open')
          if (m.dataset.originalParent) {
            const orig = document.querySelector(`.note-card[data-note-id="${m.dataset.originalParent}"] .note-card-menu`)
            if (orig) orig.appendChild(m)
          }
        }
      })
      document.querySelectorAll('.note-card-menu-btn.menu-open').forEach(b => {
        if (b !== menuBtn) b.classList.remove('menu-open')
      })

      if (isOpen) {
        menuDropdown.classList.remove('open')
        menuBtn.classList.remove('menu-open')
        const originalParent = document.querySelector(`.note-card[data-note-id="${menuDropdown.dataset.originalParent}"] .note-card-menu`)
        if (originalParent) originalParent.appendChild(menuDropdown)
      } else {
        menuDropdown.dataset.originalParent = noteId
        document.body.appendChild(menuDropdown)
        menuDropdown.classList.add('open')
        menuBtn.classList.add('menu-open')

        requestAnimationFrame(() => {
          const btnRect = menuBtn.getBoundingClientRect()
          const dropdownRect = menuDropdown.getBoundingClientRect()

          let top = btnRect.bottom + 4
          let left = btnRect.right - dropdownRect.width
          if (left < 8) left = btnRect.left
          if (top + dropdownRect.height > window.innerHeight - 8) {
            top = btnRect.top - dropdownRect.height - 4
          }

          menuDropdown.style.top = `${top}px`
          menuDropdown.style.left = `${left}px`
        })
      }
    })

    card.querySelector('[data-action="pin"]').addEventListener('click', (e) => {
      e.stopPropagation()
      menuDropdown.classList.remove('open')
      menuBtn.classList.remove('menu-open')
      toggleNotePinById(noteId)
    })

    card.querySelector('[data-action="duplicate"]').addEventListener('click', (e) => {
      e.stopPropagation()
      menuDropdown.classList.remove('open')
      menuBtn.classList.remove('menu-open')
      duplicateNote(noteId)
    })

    card.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
      e.stopPropagation()
      menuDropdown.classList.remove('open')
      menuBtn.classList.remove('menu-open')
      openDeleteNoteModal(noteId)
    })
  })
}

function createNoteCard(note) {
  const color = note.color || '#7c6af7'
  const category = note.category || 'general'
  const preview = note.content ? note.content.substring(0, 200) : ''

  return `
    <div class="note-card ${note.pinned ? 'pinned' : ''}" data-note-id="${note.id}" style="border-left-color: ${color}">
      
      ${note.pinned ? `
        <div class="note-pin" title="Pinned">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 6.44V4h1a1 1 0 000-2H6a1 1 0 000 2h1v2.44l-2.55 4.32A1 1 0 005 12h6v9a1 1 0 002 0v-9h6a1 1 0 00.86-1.24z"/>
          </svg>
        </div>
      ` : ''}
      
      <div class="note-card-menu">
        <button class="note-card-menu-btn" title="Options">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="1.5"/>
            <circle cx="12" cy="12" r="1.5"/>
            <circle cx="19" cy="12" r="1.5"/>
          </svg>
        </button>
        <div class="note-card-menu-dropdown">
          <button class="menu-item" data-action="pin">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="17" x2="12" y2="22"></line>
              <path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 002-2V3H6v1a2 2 0 002 2h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24z"></path>
            </svg>
            ${note.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button class="menu-item" data-action="duplicate">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
            </svg>
            Duplicate
          </button>
          <button class="menu-item danger" data-action="delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
            </svg>
            Delete
          </button>
        </div>
      </div>
      
      <div class="note-card-title">${escapeHtml(note.title || 'Untitled Note')}</div>
      
      <div class="note-card-preview ${!preview ? 'empty' : ''}">
        ${preview ? escapeHtml(preview) : 'No content yet...'}
      </div>
      
      ${note.tags && note.tags.length > 0 ? `
        <div class="note-card-tags">
          ${note.tags.slice(0, 4).map(tag => `<span class="note-card-tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
      
      <div class="note-card-meta">
        <span class="note-card-category">${getCategoryLabel(category)}</span>
        <span class="note-card-date">${formatDate(note.lastModified)}</span>
      </div>
    </div>
  `
}

// ============================================
// CREATE / DELETE / DUPLICATE / PIN
// ============================================

async function createNewNote() {
  if (!AppState.currentProject) return

  const note = {
    id: generateId(),
    title: '',
    content: '',
    category: 'general',
    color: '#7c6af7',
    pinned: false,
    tags: [],
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  }

  if (!AppState.currentProject.notes) AppState.currentProject.notes = []
  AppState.currentProject.notes.push(note)

  await saveCurrentProject()
  updateNotesCount()
  showNoteDetail(note)

  setTimeout(() => {
    document.getElementById('note-detail-title').focus()
  }, 100)

  showToast('Note created', 'success')
}

async function duplicateNote(noteId) {
  if (!AppState.currentProject) return
  const original = AppState.currentProject.notes.find(n => n.id === noteId)
  if (!original) return

  const duplicate = JSON.parse(JSON.stringify(original))
  duplicate.id = generateId()
  duplicate.title = (original.title || 'Note') + ' (Copy)'
  duplicate.createdAt = new Date().toISOString()
  duplicate.lastModified = new Date().toISOString()
  duplicate.pinned = false

  const idx = AppState.currentProject.notes.findIndex(n => n.id === noteId)
  AppState.currentProject.notes.splice(idx + 1, 0, duplicate)

  await saveCurrentProject()
  renderNotesGrid()
  updateNotesCount()
  showToast(`Duplicated note`, 'success')
}

function openDeleteNoteModal(noteId) {
  const note = AppState.currentProject?.notes.find(n => n.id === noteId)
  if (!note) return

  Notes.noteToDelete = noteId
  document.getElementById('delete-note-name').textContent = note.title || 'Untitled Note'
  showModal('modal-delete-note')
}

async function confirmDeleteNote() {
  if (!Notes.noteToDelete || !AppState.currentProject) return

  const note = AppState.currentProject.notes.find(n => n.id === Notes.noteToDelete)
  if (!note) return

  AppState.currentProject.notes = AppState.currentProject.notes.filter(n => n.id !== Notes.noteToDelete)

  const wasCurrent = Notes.currentNote?.id === Notes.noteToDelete

  await saveCurrentProject()
  hideModal('modal-delete-note')
  showToast('Note deleted', 'success')

  if (wasCurrent) {
    showNotesList()
  } else {
    renderNotesGrid()
  }
  updateNotesCount()

  if (AppState.currentView === 'notes') {
    updateSidebarForNotes(AppState.currentProject)
  }

  Notes.noteToDelete = null
}

async function toggleNotePinById(noteId) {
  const note = AppState.currentProject?.notes.find(n => n.id === noteId)
  if (!note) return

  note.pinned = !note.pinned
  note.lastModified = new Date().toISOString()

  await saveCurrentProject()
  renderNotesGrid()
  showToast(note.pinned ? 'Note pinned' : 'Note unpinned', 'info')
}

async function toggleNotePin() {
  if (!Notes.currentNote) return
  Notes.currentNote.pinned = !Notes.currentNote.pinned
  Notes.currentNote.lastModified = new Date().toISOString()

  document.getElementById('btn-note-pin').classList.toggle('active', Notes.currentNote.pinned)

  await saveCurrentProject()
  showToast(Notes.currentNote.pinned ? 'Pinned' : 'Unpinned', 'info')
}

// ============================================
// LOAD & SAVE FORM
// ============================================

function loadNoteIntoForm(note) {
  document.getElementById('note-detail-title').value = note.title || ''
  document.getElementById('note-detail-content').value = note.content || ''
  document.getElementById('note-detail-category').value = note.category || 'general'

  const color = note.color || '#7c6af7'
  document.getElementById('note-color-preview').style.background = color

  document.getElementById('btn-note-pin').classList.toggle('active', !!note.pinned)

  document.querySelectorAll('.note-color-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.color === color)
  })

  renderNoteTags(note.tags || [])

  if (typeof renderNoteImages === 'function') renderNoteImages()
}

function scheduleNoteSave() {
  clearTimeout(Notes.saveTimer)
  Notes.saveTimer = setTimeout(saveNoteForm, 800)
}

async function saveNoteForm() {
  if (!Notes.currentNote) return

  const note = Notes.currentNote
  note.title = document.getElementById('note-detail-title').value.trim()
  note.content = document.getElementById('note-detail-content').value
  note.category = document.getElementById('note-detail-category').value
  note.lastModified = new Date().toISOString()

  await saveCurrentProject()

  // Update sidebar
  if (AppState.currentView === 'notes') {
    updateSidebarNoteItem(note)
  }
}

function updateSidebarNoteItem(note) {
  const item = document.querySelector(`.note-sidebar-item[data-note-id="${note.id}"]`)
  if (!item) return

  const titleEl = item.querySelector('.note-sidebar-title')
  if (titleEl) titleEl.textContent = note.title || 'Untitled Note'

  const previewEl = item.querySelector('.note-sidebar-preview')
  if (previewEl) previewEl.textContent = (note.content || '').substring(0, 60) || 'No content'

  const pinEl = item.querySelector('.note-sidebar-pin')
  if (note.pinned && !pinEl) {
    const pinSvg = document.createElement('span')
    pinSvg.className = 'note-sidebar-pin'
    pinSvg.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M17 6.44V4h1a1 1 0 000-2H6a1 1 0 000 2h1v2.44l-2.55 4.32A1 1 0 005 12h6v9a1 1 0 002 0v-9h6a1 1 0 00.86-1.24z"/></svg>`
    item.querySelector('.note-sidebar-header').appendChild(pinSvg)
  } else if (!note.pinned && pinEl) {
    pinEl.remove()
  }
}

// ============================================
// COLOR PICKER
// ============================================

function toggleColorMenu(e) {
  if (e) e.stopPropagation()
  const menu = document.getElementById('note-color-menu')
  const btn = document.getElementById('btn-note-color')
  const isOpen = menu.classList.contains('open')

  if (isOpen) {
    menu.classList.remove('open')
  } else {
    menu.classList.add('open')
    requestAnimationFrame(() => {
      const btnRect = btn.getBoundingClientRect()
      menu.style.top = `${btnRect.bottom + 4}px`
      menu.style.left = `${btnRect.left}px`
    })
  }
}

async function selectNoteColor(color) {
  if (!Notes.currentNote) return
  Notes.currentNote.color = color
  Notes.currentNote.lastModified = new Date().toISOString()

  document.getElementById('note-color-preview').style.background = color
  document.querySelectorAll('.note-color-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.color === color)
  })
  document.getElementById('note-color-menu').classList.remove('open')

  await saveCurrentProject()
}

// ============================================
// TAGS
// ============================================

function renderNoteTags(tags) {
  const container = document.getElementById('note-tags-container')
  const input = document.getElementById('note-tag-input')

  container.querySelectorAll('.tag-chip').forEach(c => c.remove())

  tags.forEach(tag => {
    const chip = document.createElement('div')
    chip.className = 'tag-chip'
    chip.innerHTML = `${escapeHtml(tag)} <button class="tag-chip-remove">×</button>`
    container.insertBefore(chip, input)
    chip.querySelector('.tag-chip-remove').addEventListener('click', () => removeNoteTag(tag))
  })
}

function handleNoteTagInput(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    const tag = e.target.value.trim().replace(/,/g, '')
    if (tag) {
      addNoteTag(tag)
      e.target.value = ''
    }
  }
  if (e.key === 'Backspace' && !e.target.value && Notes.currentNote?.tags?.length > 0) {
    removeNoteTag(Notes.currentNote.tags[Notes.currentNote.tags.length - 1])
  }
}

function addNoteTag(tag) {
  if (!Notes.currentNote) return
  if (!Notes.currentNote.tags) Notes.currentNote.tags = []
  if (!Notes.currentNote.tags.includes(tag)) {
    Notes.currentNote.tags.push(tag)
    renderNoteTags(Notes.currentNote.tags)
    scheduleNoteSave()
  }
}

function removeNoteTag(tag) {
  if (!Notes.currentNote) return
  Notes.currentNote.tags = Notes.currentNote.tags.filter(t => t !== tag)
  renderNoteTags(Notes.currentNote.tags)
  scheduleNoteSave()
}

// ============================================
// SIDEBAR
// ============================================

function updateSidebarForNotes(project) {
  const content = document.getElementById('sidebar-content')
  const notes = [...(project.notes || [])]

  // Sort pinned first, then recent
  notes.sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned ? 1 : -1
    return new Date(b.lastModified) - new Date(a.lastModified)
  })

  content.innerHTML = `
    <div class="sidebar-section">
      <div class="sidebar-section-header">
        <span>Notes</span>
        <button class="sidebar-add-btn" id="btn-sidebar-add-note" data-tooltip="New Note">+</button>
      </div>
      <div>
        ${notes.length === 0
      ? '<p class="sidebar-empty">No notes yet.<br>Click + to add one.</p>'
      : notes.map(note => createSidebarNoteItem(note)).join('')
    }
      </div>
    </div>
  `

  document.getElementById('btn-sidebar-add-note')?.addEventListener('click', createNewNote)

  document.querySelectorAll('.note-sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      const noteId = item.dataset.noteId
      const note = AppState.currentProject.notes.find(n => n.id === noteId)
      if (note) showNoteDetail(note)
    })
  })
}

function createSidebarNoteItem(note) {
  const color = note.color || '#7c6af7'
  const isActive = Notes.currentNote?.id === note.id
  const preview = (note.content || '').substring(0, 60) || 'No content'

  return `
    <div class="note-sidebar-item ${isActive ? 'active' : ''}" data-note-id="${note.id}" style="border-left-color: ${color}">
      <div class="note-sidebar-header">
        <span class="note-sidebar-title">${escapeHtml(note.title || 'Untitled Note')}</span>
        ${note.pinned ? `<span class="note-sidebar-pin"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M17 6.44V4h1a1 1 0 000-2H6a1 1 0 000 2h1v2.44l-2.55 4.32A1 1 0 005 12h6v9a1 1 0 002 0v-9h6a1 1 0 00.86-1.24z"/></svg></span>` : ''}
      </div>
      <span class="note-sidebar-preview">${escapeHtml(preview)}</span>
    </div>
  `
}

// ============================================
// QUICK NOTE FAB
// ============================================

function toggleQuickNote() {
  if (!AppState.currentProject) {
    showToast('Open a project first', 'info')
    return
  }

  Notes.quickNoteOpen = !Notes.quickNoteOpen
  const panel = document.getElementById('quick-note-panel')

  if (Notes.quickNoteOpen) {
    panel.classList.add('open')
    setTimeout(() => document.getElementById('quick-note-title').focus(), 100)
  } else {
    panel.classList.remove('open')
  }
}

function closeQuickNote() {
  Notes.quickNoteOpen = false
  document.getElementById('quick-note-panel').classList.remove('open')
  document.getElementById('quick-note-title').value = ''
  document.getElementById('quick-note-content').value = ''
}

async function saveQuickNote() {
  if (!AppState.currentProject) return

  const title = document.getElementById('quick-note-title').value.trim()
  const content = document.getElementById('quick-note-content').value.trim()
  const category = document.getElementById('quick-note-category').value

  if (!title && !content) {
    showToast('Add some text first', 'info')
    return
  }

  const note = {
    id: generateId(),
    title: title || 'Quick Note',
    content,
    category,
    color: '#7c6af7',
    pinned: false,
    tags: [],
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  }

  if (!AppState.currentProject.notes) AppState.currentProject.notes = []
  AppState.currentProject.notes.push(note)

  await saveCurrentProject()
  closeQuickNote()
  showToast('Note saved', 'success')

  // Refresh sidebar if we're on notes view
  if (AppState.currentView === 'notes') {
    renderNotesGrid()
    updateSidebarForNotes(AppState.currentProject)
    updateNotesCount()
  }
}

// Show/hide FAB based on whether a project is open
function updateQuickNoteFabVisibility() {
  const fab = document.getElementById('quick-note-fab')
  if (AppState.currentProject) {
    fab.classList.remove('hidden')
  } else {
    fab.classList.add('hidden')
    // Also close the panel if open
    if (Notes.quickNoteOpen) closeQuickNote()
  }
}

// ============================================
// UTILITY
// ============================================

function getCategoryLabel(category) {
  const map = {
    'general': '📋 General',
    'idea': '💡 Idea',
    'research': '🔍 Research',
    'plot': '📖 Plot',
    'worldbuilding': '🌍 World',
    'character': '👤 Character'
  }
  return map[category] || 'General'
}