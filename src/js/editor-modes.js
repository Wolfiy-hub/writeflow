// editor-modes.js
// Focus, Typewriter, Fullscreen & Zen modes

const EditorModes = {
  focus: false,
  typewriter: false,
  fullscreen: false,
  zen: false,
  fontSize: 18,
  lineWidth: 'medium',
  currentParagraph: null,
  scrollTimer: null,
}

// ============================================
// INITIALIZATION
// ============================================

function initEditorModes() {
  loadModePreferences()
  
  document.getElementById('mode-focus-btn').addEventListener('click', toggleFocusMode)
  document.getElementById('mode-typewriter-btn').addEventListener('click', toggleTypewriterMode)
  document.getElementById('mode-fullscreen-btn').addEventListener('click', toggleFullscreenMode)
  document.getElementById('mode-zen-btn').addEventListener('click', toggleZenMode)
  
  document.getElementById('font-increase').addEventListener('click', () => changeFontSize(1))
  document.getElementById('font-decrease').addEventListener('click', () => changeFontSize(-1))
  
  document.querySelectorAll('.line-width-btn').forEach(btn => {
    btn.addEventListener('click', () => setLineWidth(btn.dataset.width))
  })
  
  document.getElementById('fullscreen-exit-btn').addEventListener('click', () => {
    if (EditorModes.zen) toggleZenMode()
    else if (EditorModes.fullscreen) toggleFullscreenMode()
  })
  
  document.addEventListener('keydown', handleModeShortcuts)
  
  if (Editor.contentEl) {
    // Track ALL possible events that could move the cursor
    Editor.contentEl.addEventListener('input', onEditorChange)
    Editor.contentEl.addEventListener('click', onEditorChange)
    Editor.contentEl.addEventListener('keyup', onEditorChange)
    Editor.contentEl.addEventListener('focus', onEditorChange)
    Editor.contentEl.addEventListener('paste', () => setTimeout(onEditorChange, 50))
  }
  
  // Listen to selection changes (this catches ALL cursor movement)
  document.addEventListener('selectionchange', () => {
    // Only act if the editor is focused
    if (document.activeElement === Editor.contentEl) {
      onEditorChange()
    }
  })
  
  applyFontSize()
  applyLineWidth()
}

function onEditorChange() {
  if (EditorModes.focus || EditorModes.zen) {
    updateFocusedParagraph()
  }
  if (EditorModes.typewriter || EditorModes.zen) {
    scheduleTypewriterScroll()
  }
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

function handleModeShortcuts(e) {
  if (e.ctrlKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
    e.preventDefault()
    toggleFocusMode()
  }
  
  if (e.ctrlKey && e.shiftKey && (e.key === 'T' || e.key === 't')) {
    e.preventDefault()
    toggleTypewriterMode()
  }
  
  if (e.key === 'F11') {
    e.preventDefault()
    toggleFullscreenMode()
  }
  
  if (e.ctrlKey && e.shiftKey && (e.key === 'Z' || e.key === 'z')) {
    e.preventDefault()
    toggleZenMode()
  }
  
  if (e.key === 'Escape') {
    if (EditorModes.zen) toggleZenMode()
    else if (EditorModes.fullscreen) toggleFullscreenMode()
  }
  
  if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
    if (isEditorFocused()) {
      e.preventDefault()
      changeFontSize(1)
    }
  }
  
  if (e.ctrlKey && e.key === '-') {
    if (isEditorFocused()) {
      e.preventDefault()
      changeFontSize(-1)
    }
  }
}

// ============================================
// FOCUS MODE
// ============================================

function toggleFocusMode() {
  EditorModes.focus = !EditorModes.focus
  document.body.classList.toggle('focus-mode', EditorModes.focus)
  document.getElementById('mode-focus-btn').classList.toggle('active', EditorModes.focus)
  
  if (EditorModes.focus) {
    ensureEditorHasStructure()
    // Give DOM time to update, then find the focused paragraph
    setTimeout(() => updateFocusedParagraph(), 50)
    showToast('Focus Mode: ON', 'info', 1500)
  } else {
    clearFocusedParagraphs()
    showToast('Focus Mode: OFF', 'info', 1500)
  }
}

function clearFocusedParagraphs() {
  document.querySelectorAll('.focused-paragraph').forEach(p => {
    p.classList.remove('focused-paragraph')
  })
  EditorModes.currentParagraph = null
}

// Make sure the editor has proper paragraph structure
function ensureEditorHasStructure() {
  if (!Editor.contentEl) return
  
  // If completely empty, add an empty paragraph
  if (!Editor.contentEl.innerHTML.trim() || Editor.contentEl.innerHTML === '<br>') {
    Editor.contentEl.innerHTML = '<p><br></p>'
    // Move cursor into the new paragraph
    const p = Editor.contentEl.querySelector('p')
    if (p) {
      const range = document.createRange()
      const sel = window.getSelection()
      range.setStart(p, 0)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    }
    return
  }
  
  // Wrap any orphan text or inline elements in <p> tags
  const nodes = Array.from(Editor.contentEl.childNodes)
  let orphanBuffer = []
  
  nodes.forEach(node => {
    const isBlock = node.nodeType === 1 && 
      ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'UL', 'OL', 'HR', 'DIV', 'PRE'].includes(node.tagName)
    
    if (isBlock) {
      // If we have orphans buffered, wrap them in a p tag before this block
      if (orphanBuffer.length > 0) {
        const p = document.createElement('p')
        orphanBuffer.forEach(orphan => p.appendChild(orphan))
        Editor.contentEl.insertBefore(p, node)
        orphanBuffer = []
      }
    } else {
      // It's an orphan (text node or inline element)
      orphanBuffer.push(node)
    }
  })
  
  // Handle any remaining orphans at the end
  if (orphanBuffer.length > 0) {
    const p = document.createElement('p')
    orphanBuffer.forEach(orphan => p.appendChild(orphan))
    Editor.contentEl.appendChild(p)
  }
}

function updateFocusedParagraph() {
  if (!EditorModes.focus && !EditorModes.zen) return
  if (!Editor.contentEl) return
  
  const selection = window.getSelection()
  if (!selection.rangeCount) return
  
  let node = selection.anchorNode
  if (!node) return
  
  // If we're in a text node, get its parent element
  if (node.nodeType === 3) {
    node = node.parentNode
  }
  
  // Walk up the DOM tree to find the direct child of editor-content
  let targetBlock = null
  let current = node
  
  while (current && current !== Editor.contentEl && current !== document.body) {
    if (current.parentNode === Editor.contentEl) {
      targetBlock = current
      break
    }
    current = current.parentNode
  }
  
  // If we couldn't find one, the cursor is directly in editor-content
  // In that case, try to find the closest block sibling
  if (!targetBlock && node.parentNode === Editor.contentEl) {
    targetBlock = node
  }
  
  if (!targetBlock) {
    console.log('[Focus] Could not find target block for:', node)
    return
  }
  
  // Only update if it's different
  if (EditorModes.currentParagraph === targetBlock) return
  
  // Clear previous
  clearFocusedParagraphs()
  
  // Add class to new one
  targetBlock.classList.add('focused-paragraph')
  EditorModes.currentParagraph = targetBlock
  
  console.log('[Focus] Highlighted:', targetBlock.tagName, targetBlock.textContent.substring(0, 30))
}

// ============================================
// TYPEWRITER MODE
// ============================================

function toggleTypewriterMode() {
  EditorModes.typewriter = !EditorModes.typewriter
  document.body.classList.toggle('typewriter-mode', EditorModes.typewriter)
  document.getElementById('mode-typewriter-btn').classList.toggle('active', EditorModes.typewriter)
  
  if (EditorModes.typewriter) {
    // Give CSS time to apply padding
    setTimeout(() => scrollToCurrentLine(), 200)
    showToast('Typewriter Mode: ON', 'info', 1500)
  } else {
    showToast('Typewriter Mode: OFF', 'info', 1500)
  }
}

function scheduleTypewriterScroll() {
  if (!EditorModes.typewriter && !EditorModes.zen) return
  
  clearTimeout(EditorModes.scrollTimer)
  EditorModes.scrollTimer = setTimeout(() => {
    scrollToCurrentLine()
  }, 50)
}

function scrollToCurrentLine() {
  if (!EditorModes.typewriter && !EditorModes.zen) return
  
  const container = document.querySelector('.editor-container')
  if (!container) {
    console.log('[Typewriter] No container found')
    return
  }
  
  const selection = window.getSelection()
  if (!selection.rangeCount) {
    console.log('[Typewriter] No selection')
    return
  }
  
  // Get cursor position
  const range = selection.getRangeAt(0).cloneRange()
  
  // Insert a temporary marker to get precise position
  const marker = document.createElement('span')
  marker.style.cssText = 'display:inline-block;width:0;height:1em;'
  
  try {
    range.collapse(true)
    range.insertNode(marker)
    
    const markerRect = marker.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    
    // Calculate where the marker is vs where we want it (center of container)
    const markerCenterY = markerRect.top + (markerRect.height / 2)
    const containerCenterY = containerRect.top + (containerRect.height / 2)
    
    // The difference is how much we need to scroll
    const scrollOffset = markerCenterY - containerCenterY
    
    console.log('[Typewriter] Marker Y:', markerCenterY, 'Container center Y:', containerCenterY, 'Offset:', scrollOffset)
    
    // Remove the marker
    marker.remove()
    
    // Restore the cursor
    const newRange = document.createRange()
    newRange.setStart(range.startContainer, range.startOffset)
    newRange.collapse(true)
    selection.removeAllRanges()
    selection.addRange(newRange)
    
    // Scroll
    if (Math.abs(scrollOffset) > 5) {
      container.scrollBy({
        top: scrollOffset,
        behavior: 'smooth'
      })
    }
  } catch (e) {
    console.error('[Typewriter] Error:', e)
    if (marker.parentNode) marker.remove()
  }
}

// ============================================
// FULLSCREEN MODE
// ============================================

function toggleFullscreenMode() {
  EditorModes.fullscreen = !EditorModes.fullscreen
  document.body.classList.toggle('fullscreen-mode', EditorModes.fullscreen)
  document.getElementById('mode-fullscreen-btn').classList.toggle('active', EditorModes.fullscreen)
  
  if (EditorModes.fullscreen) {
    showToast('Fullscreen Mode • Press Esc to exit', 'info', 2000)
  }
}

// ============================================
// ZEN MODE
// ============================================

function toggleZenMode() {
  EditorModes.zen = !EditorModes.zen
  document.body.classList.toggle('zen-mode', EditorModes.zen)
  document.getElementById('mode-zen-btn').classList.toggle('active', EditorModes.zen)
  
  const indicator = document.getElementById('zen-indicator')
  
  if (EditorModes.zen) {
    indicator.classList.add('visible')
    ensureEditorHasStructure()
    setTimeout(() => {
      updateFocusedParagraph()
      scrollToCurrentLine()
    }, 100)
    showToast('Zen Mode • Distraction-free writing', 'info', 2000)
    
    setTimeout(() => {
      indicator.classList.remove('visible')
    }, 3000)
    
    if (Editor.contentEl) {
      setTimeout(() => Editor.contentEl.focus(), 100)
    }
  } else {
    indicator.classList.remove('visible')
    clearFocusedParagraphs()
    showToast('Zen Mode: OFF', 'info', 1500)
  }
}

// ============================================
// FONT SIZE
// ============================================

function changeFontSize(delta) {
  const newSize = Math.min(32, Math.max(12, EditorModes.fontSize + delta))
  if (newSize === EditorModes.fontSize) return
  
  EditorModes.fontSize = newSize
  applyFontSize()
  saveModePreferences()
}

function applyFontSize() {
  if (Editor.contentEl) {
    Editor.contentEl.style.fontSize = `${EditorModes.fontSize}px`
  }
  const valueEl = document.getElementById('font-size-value')
  if (valueEl) {
    valueEl.textContent = EditorModes.fontSize
  }
}

// ============================================
// LINE WIDTH
// ============================================

function setLineWidth(width) {
  EditorModes.lineWidth = width
  applyLineWidth()
  saveModePreferences()
}

function applyLineWidth() {
  const wrapper = document.querySelector('.editor-wrapper')
  if (wrapper) {
    wrapper.dataset.width = EditorModes.lineWidth
  }
  
  document.querySelectorAll('.line-width-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.width === EditorModes.lineWidth)
  })
}

// ============================================
// SAVE / LOAD PREFERENCES
// ============================================

function saveModePreferences() {
  const prefs = {
    fontSize: EditorModes.fontSize,
    lineWidth: EditorModes.lineWidth,
  }
  
  try {
    localStorage.setItem('writeflow-editor-prefs', JSON.stringify(prefs))
  } catch (e) {
    console.error('Could not save prefs:', e)
  }
}

function loadModePreferences() {
  try {
    const saved = localStorage.getItem('writeflow-editor-prefs')
    if (saved) {
      const prefs = JSON.parse(saved)
      if (prefs.fontSize) EditorModes.fontSize = prefs.fontSize
      if (prefs.lineWidth) EditorModes.lineWidth = prefs.lineWidth
    }
  } catch (e) {
    console.error('Could not load prefs:', e)
  }
}