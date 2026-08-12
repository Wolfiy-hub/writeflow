// editor.js
// Chapter Editor - Rich text editing

const Editor = {
  contentEl: null,
  titleEl: null,
  summaryEl: null,
  saveTimer: null,
  isTyping: false,
  lastContent: '',
  lastTitle: '',
  lastSummary: '',
  hasUnsavedChanges: false,
  lastSavedAt: null,
}

// ============================================
// INITIALIZATION
// ============================================

function initEditor() {
  Editor.contentEl = document.getElementById('editor-content')
  Editor.titleEl = document.getElementById('editor-chapter-title')
  Editor.summaryEl = document.getElementById('editor-chapter-summary')

  setupEditorEventListeners()
  setupToolbarEventListeners()
  setupDropdowns()

  // Save before window closes
  window.addEventListener('beforeunload', (e) => {
    if (Editor.hasUnsavedChanges) {
      saveChapterNow()
    }
  })

  // Periodic safety save every 30 seconds
  setInterval(() => {
    if (Editor.hasUnsavedChanges && AppState.currentChapter) {
      saveChapterNow()
    }
  }, 30000)

  // Auto-refresh the "saved X ago" timer every 10 seconds
  setInterval(() => {
    if (Editor.lastSavedAt && !Editor.hasUnsavedChanges) {
      updateSaveStatus('saved')
    }
  }, 10000)
}

function setupEditorEventListeners() {
  Editor.contentEl.addEventListener('input', handleContentInput)
  Editor.contentEl.addEventListener('keydown', handleEditorKeydown)
  Editor.contentEl.addEventListener('paste', handlePaste)
  Editor.contentEl.addEventListener('mouseup', updateToolbarState)
  Editor.contentEl.addEventListener('keyup', updateToolbarState)

  Editor.titleEl.addEventListener('input', handleTitleInput)
  Editor.titleEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      Editor.contentEl.focus()
    }
  })

  Editor.summaryEl.addEventListener('input', handleSummaryInput)

  document.getElementById('summary-toggle').addEventListener('click', toggleSummary)

  document.getElementById('btn-editor-add-chapter').addEventListener('click', () => {
    if (AppState.currentProject) {
      addNewChapter()
    }
  })
}

function setupToolbarEventListeners() {
  document.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const command = btn.dataset.command
      execCommand(command)
    })
    btn.addEventListener('mousedown', (e) => e.preventDefault())
  })

  document.querySelectorAll('.toolbar-btn[data-block]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const block = btn.dataset.block
      formatBlock(block)
    })
    btn.addEventListener('mousedown', (e) => e.preventDefault())
  })
}

function setupDropdowns() {
  const headingBtn = document.getElementById('heading-dropdown-btn')
  const headingMenu = document.getElementById('heading-dropdown-menu')

  headingBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    headingMenu.classList.toggle('open')
    document.getElementById('scenebreak-dropdown-menu').classList.remove('open')
  })

  headingBtn.addEventListener('mousedown', (e) => e.preventDefault())

  document.querySelectorAll('#heading-dropdown-menu .toolbar-dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      formatBlock(item.dataset.block)
      headingMenu.classList.remove('open')
    })
    item.addEventListener('mousedown', (e) => e.preventDefault())
  })

  const breakBtn = document.getElementById('scenebreak-dropdown-btn')
  const breakMenu = document.getElementById('scenebreak-dropdown-menu')

  breakBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    breakMenu.classList.toggle('open')
    document.getElementById('heading-dropdown-menu').classList.remove('open')
  })

  breakBtn.addEventListener('mousedown', (e) => e.preventDefault())

  document.querySelectorAll('#scenebreak-dropdown-menu .toolbar-dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      insertSceneBreak(item.dataset.scenebreak)
      breakMenu.classList.remove('open')
    })
    item.addEventListener('mousedown', (e) => e.preventDefault())
  })

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.toolbar-dropdown')) {
      document.querySelectorAll('.toolbar-dropdown-menu.open').forEach(m => m.classList.remove('open'))
    }
  })
}

// ============================================
// LOADING A CHAPTER
// ============================================

function loadChapterIntoEditor(chapter) {
  if (!chapter) {
    showEditorEmpty()
    return
  }

  showEditorMain()

  Editor.titleEl.value = chapter.title || ''
  Editor.contentEl.innerHTML = chapter.content || ''

  // Clear analysis highlights since we loaded fresh content
  if (typeof clearHighlights === 'function') {
    clearHighlights()
  }

  Editor.summaryEl.value = chapter.summary || ''

  Editor.lastTitle = chapter.title || ''
  Editor.lastContent = chapter.content || ''
  Editor.lastSummary = chapter.summary || ''
  Editor.hasUnsavedChanges = false

  updateStats()
  updateToolbarState()
  updateSaveStatus('saved')

  if (chapter.summary) {
    document.getElementById('summary-toggle').classList.add('open')
    document.getElementById('summary-content').classList.add('open')
  } else {
    document.getElementById('summary-toggle').classList.remove('open')
    document.getElementById('summary-content').classList.remove('open')
  }

  // Update versions button
  if (typeof updateVersionsButton === 'function') {
    updateVersionsButton()
  }
}

function showEditorEmpty() {
  document.getElementById('editor-empty').classList.remove('hidden')
  document.getElementById('editor-main').classList.add('hidden')
}

function showEditorMain() {
  document.getElementById('editor-empty').classList.add('hidden')
  document.getElementById('editor-main').classList.remove('hidden')
}

// ============================================
// INPUT HANDLERS
// ============================================

function handleContentInput() {
  Editor.hasUnsavedChanges = true
  updateStats()
  scheduleAutoSave()
}

function handleTitleInput() {
  Editor.hasUnsavedChanges = true
  scheduleAutoSave()

  if (AppState.currentChapter) {
    const item = document.querySelector(`.chapter-item[data-chapter-id="${AppState.currentChapter.id}"] .chapter-item-title`)
    if (item) {
      item.textContent = Editor.titleEl.value || 'Untitled'
    }

    updateBreadcrumbs([
      { label: 'Projects', onClick: goToProjectsView },
      {
        label: AppState.currentProject.title, onClick: () => {
          if (Editor.hasUnsavedChanges) saveChapterNow()
          AppState.currentChapter = null
          showEditorEmpty()
          updateBreadcrumbs([
            { label: 'Projects', onClick: goToProjectsView },
            { label: AppState.currentProject.title, current: true }
          ])
          document.querySelectorAll('.chapter-item').forEach(i => i.classList.remove('active'))
        }
      },
      { label: Editor.titleEl.value || 'Untitled', current: true }
    ])
  }
}

function handleSummaryInput() {
  Editor.hasUnsavedChanges = true
  scheduleAutoSave()

  // Live update the sidebar subtitle
  if (AppState.currentChapter) {
    const item = document.querySelector(`.chapter-item[data-chapter-id="${AppState.currentChapter.id}"]`)
    if (item) {
      const infoEl = item.querySelector('.chapter-item-info')
      if (infoEl) {
        // Remove old subtitle if exists
        const oldSubtitle = infoEl.querySelector('.chapter-item-subtitle')
        if (oldSubtitle) oldSubtitle.remove()

        // Add new subtitle if summary has content
        const summaryText = Editor.summaryEl.value.trim()
        if (summaryText) {
          const subtitle = document.createElement('span')
          subtitle.className = 'chapter-item-subtitle'
          subtitle.textContent = summaryText.substring(0, 80)
          infoEl.appendChild(subtitle)
        }
      }
    }
  }
}

function handleEditorKeydown(e) {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'b':
        e.preventDefault()
        execCommand('bold')
        break
      case 'i':
        e.preventDefault()
        execCommand('italic')
        break
      case 'u':
        e.preventDefault()
        execCommand('underline')
        break
      case 's':
        e.preventDefault()
        saveChapterNow(true)
        break
    }
  }

  if (e.key === 'Tab') {
    e.preventDefault()
    document.execCommand('insertText', false, '    ')
  }
}

function handlePaste(e) {
  e.preventDefault()
  const text = e.clipboardData.getData('text/plain')
  document.execCommand('insertText', false, text)
}

// ============================================
// FORMATTING COMMANDS
// ============================================

function execCommand(command) {
  Editor.contentEl.focus()
  document.execCommand(command, false, null)
  updateToolbarState()
  Editor.hasUnsavedChanges = true
  scheduleAutoSave()
}

function formatBlock(tagName) {
  Editor.contentEl.focus()

  const selection = window.getSelection()
  if (selection.rangeCount === 0) return

  const parentBlock = getParentBlockElement(selection.anchorNode)
  if (parentBlock && parentBlock.tagName.toLowerCase() === tagName) {
    document.execCommand('formatBlock', false, 'p')
  } else {
    document.execCommand('formatBlock', false, tagName)
  }

  updateToolbarState()
  Editor.hasUnsavedChanges = true
  scheduleAutoSave()
}

function getParentBlockElement(node) {
  const blockTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI']
  while (node && node !== Editor.contentEl) {
    if (node.nodeType === 1 && blockTags.includes(node.tagName)) {
      return node
    }
    node = node.parentNode
  }
  return null
}

function insertSceneBreak(style) {
  Editor.contentEl.focus()
  const sceneBreakHTML = `<hr class="scene-break" data-style="${style}" contenteditable="false"><p><br></p>`
  document.execCommand('insertHTML', false, sceneBreakHTML)
  Editor.hasUnsavedChanges = true
  scheduleAutoSave()
}

// ============================================
// TOOLBAR STATE
// ============================================

function updateToolbarState() {
  const commands = ['bold', 'italic', 'underline', 'strikeThrough']
  commands.forEach(cmd => {
    const btn = document.querySelector(`.toolbar-btn[data-command="${cmd}"]`)
    if (btn) {
      btn.classList.toggle('active', document.queryCommandState(cmd))
    }
  })

  const alignments = ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull']
  alignments.forEach(align => {
    const btn = document.querySelector(`.toolbar-btn[data-command="${align}"]`)
    if (btn) {
      btn.classList.toggle('active', document.queryCommandState(align))
    }
  })

  const listBtn = document.querySelector('.toolbar-btn[data-command="insertUnorderedList"]')
  if (listBtn) listBtn.classList.toggle('active', document.queryCommandState('insertUnorderedList'))

  const orderedBtn = document.querySelector('.toolbar-btn[data-command="insertOrderedList"]')
  if (orderedBtn) orderedBtn.classList.toggle('active', document.queryCommandState('insertOrderedList'))

  const selection = window.getSelection()
  if (selection.rangeCount > 0) {
    const parentBlock = getParentBlockElement(selection.anchorNode)
    const blockLabel = document.getElementById('heading-current')
    if (blockLabel) {
      if (parentBlock) {
        const tag = parentBlock.tagName.toLowerCase()
        const labels = { p: 'Paragraph', h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', blockquote: 'Quote', li: 'List Item' }
        blockLabel.textContent = labels[tag] || 'Paragraph'
      } else {
        blockLabel.textContent = 'Paragraph'
      }
    }

    const quoteBtn = document.querySelector('.toolbar-btn[data-block="blockquote"]')
    if (quoteBtn) {
      quoteBtn.classList.toggle('active', parentBlock?.tagName === 'BLOCKQUOTE')
    }
  }
}

// ============================================
// SUMMARY TOGGLE
// ============================================

function toggleSummary() {
  const toggle = document.getElementById('summary-toggle')
  const content = document.getElementById('summary-content')
  toggle.classList.toggle('open')
  content.classList.toggle('open')
}

// ============================================
// STATS
// ============================================

function updateStats() {
  const text = Editor.contentEl.innerText || ''

  const words = text.trim() ? text.trim().split(/\s+/).filter(w => w.length > 0).length : 0
  const chars = text.length
  const sentences = text.trim()
    ? text.split(/[.!?]+/).filter(s => s.trim().length > 0).length
    : 0
  const readMinutes = Math.max(1, Math.ceil(words / 200))

  document.getElementById('stat-words').textContent = formatNumber(words)
  document.getElementById('stat-chars').textContent = formatNumber(chars)
  document.getElementById('stat-sentences').textContent = formatNumber(sentences)
  document.getElementById('stat-reading-time').textContent = `${readMinutes} min`

  if (AppState.currentChapter) {
    AppState.currentChapter.wordCount = words

    // Update sidebar chapter word count (keep goal intact)
    const sidebarItem = document.querySelector(`.chapter-item[data-chapter-id="${AppState.currentChapter.id}"]`)
    if (sidebarItem) {
      const wordsEl = sidebarItem.querySelector('.chapter-item-words')
      if (wordsEl) {
        const goal = AppState.currentChapter.wordGoal
        if (goal) {
          const goalColor = words >= goal ? 'var(--accent-success)' : 'var(--text-muted)'
          wordsEl.innerHTML = `${words}w<span style="color:${goalColor};font-size:9px;margin-left:1px;">/${goal}</span>`
        } else {
          wordsEl.textContent = `${words}w`
        }
      }
    }

    // Update sidebar total word count footer
    if (AppState.currentProject) {
      const totalWords = AppState.currentProject.chapters.reduce(
        (sum, ch) => sum + (ch.wordCount || 0), 0
      )
      const footerItems = document.querySelectorAll('.chapters-footer-item')
      if (footerItems.length >= 2) {
        footerItems[1].textContent = `${formatNumber(totalWords)} words`
      }
    }

    // Live update versions panel if open
    if (typeof refreshVersionsPanelIfOpen === 'function') {
      refreshVersionsPanelIfOpen()
    }
  }
}

// ============================================
// AUTO-SAVE (IMPROVED)
// ============================================

function scheduleAutoSave() {
  updateSaveStatus('saving')

  clearTimeout(Editor.saveTimer)
  Editor.saveTimer = setTimeout(() => {
    saveChapterNow()
  }, 1500)
}

async function saveChapterNow(manual = false) {
  if (!AppState.currentChapter || !AppState.currentProject) {
    if (manual) showToast('No chapter open to save', 'info')
    return
  }

  const title = Editor.titleEl.value.trim() || 'Untitled Chapter'
  const content = Editor.contentEl.innerHTML
  const summary = Editor.summaryEl.value

  if (!manual && title === Editor.lastTitle && content === Editor.lastContent && summary === Editor.lastSummary) {
    updateSaveStatus('saved')
    Editor.hasUnsavedChanges = false
    return
  }

  AppState.currentChapter.title = title
  AppState.currentChapter.content = content
  AppState.currentChapter.summary = summary
  AppState.currentChapter.lastModified = new Date().toISOString()

  // Sync content to active version
  if (typeof syncActiveVersionFromChapter === 'function') {
    syncActiveVersionFromChapter(AppState.currentChapter)
  }

  Editor.lastTitle = title
  Editor.lastContent = content
  Editor.lastSummary = summary

  try {
    const result = await saveCurrentProject()
    Editor.hasUnsavedChanges = false
    Editor.lastSavedAt = new Date()
    updateSaveStatus('saved')

    if (manual) {
      showToast('Saved successfully', 'success')
      const statusEl = document.getElementById('save-status')
      statusEl.classList.add('saved-recently')
      setTimeout(() => statusEl.classList.remove('saved-recently'), 1000)
    }
  } catch (error) {
    updateSaveStatus('error')
    console.error('Save failed:', error)
    if (manual) {
      showToast('Save failed! Try again.', 'error')
    }
  }
}

function updateSaveStatus(status) {
  const el = document.getElementById('save-status')
  const text = document.getElementById('save-status-text')
  const dot = el.querySelector('.save-dot')

  el.classList.remove('saved', 'saving', 'error')
  el.classList.add(status)

  dot.classList.remove('saving')

  switch (status) {
    case 'saved':
      text.textContent = Editor.lastSavedAt
        ? `Saved • ${formatTimeAgo(Editor.lastSavedAt)}`
        : 'Saved'
      break
    case 'saving':
      text.textContent = 'Saving...'
      dot.classList.add('saving')
      break
    case 'error':
      text.textContent = 'Save failed!'
      break
  }
}

function formatTimeAgo(date) {
  const now = new Date()
  const diff = Math.floor((now - date) / 1000) // seconds

  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}