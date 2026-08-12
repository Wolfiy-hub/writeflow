// findreplace.js — Find and Replace in the editor

const FindReplace = {
  isOpen: false,
  isReplaceMode: false,
  caseSensitive: false,
  matches: [],
  currentIndex: -1,
}

function initFindReplace() {
  document.getElementById('fr-find-input').addEventListener('input', doFind)
  document.getElementById('fr-next-btn').addEventListener('click', findNext)
  document.getElementById('fr-prev-btn').addEventListener('click', findPrev)
  document.getElementById('fr-close-btn').addEventListener('click', closeFindReplace)
  document.getElementById('fr-case-btn').addEventListener('click', toggleCase)
  document.getElementById('fr-toggle-replace').addEventListener('click', toggleReplace)
  document.getElementById('fr-replace-one').addEventListener('click', replaceOne)
  document.getElementById('fr-replace-all').addEventListener('click', replaceAll)
  
  // Enter in find input = next, Shift+Enter = prev
  document.getElementById('fr-find-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) findPrev()
      else findNext()
    }
    if (e.key === 'Escape') closeFindReplace()
  })
  
  document.getElementById('fr-replace-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); replaceOne() }
    if (e.key === 'Escape') closeFindReplace()
  })
  
  // Ctrl+F and Ctrl+H keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault()
      openFindReplace(false)
    }
    if (e.ctrlKey && e.key === 'h') {
      e.preventDefault()
      openFindReplace(true)
    }
  })
}

function openFindReplace(replaceMode) {
  if (!AppState.currentChapter || !Editor.contentEl) {
    showToast('Open a chapter first', 'info')
    return
  }
  
  FindReplace.isOpen = true
  FindReplace.isReplaceMode = replaceMode
  
  const bar = document.getElementById('find-replace-bar')
  bar.classList.add('visible')
  bar.classList.toggle('replace-mode', replaceMode)
  
  const findInput = document.getElementById('fr-find-input')
  
  // If text is selected, use it as search query
  const selection = window.getSelection()
  if (selection.toString().trim()) {
    findInput.value = selection.toString().trim()
  }
  
  findInput.focus()
  findInput.select()
  
  if (findInput.value) doFind()
}

function closeFindReplace() {
  FindReplace.isOpen = false
  document.getElementById('find-replace-bar').classList.remove('visible')
  clearHighlights()
  FindReplace.matches = []
  FindReplace.currentIndex = -1
  updateStatus()
}

function toggleCase() {
  FindReplace.caseSensitive = !FindReplace.caseSensitive
  document.getElementById('fr-case-btn').classList.toggle('active', FindReplace.caseSensitive)
  doFind()
}

function toggleReplace() {
  FindReplace.isReplaceMode = !FindReplace.isReplaceMode
  document.getElementById('find-replace-bar').classList.toggle('replace-mode', FindReplace.isReplaceMode)
  if (FindReplace.isReplaceMode) {
    document.getElementById('fr-replace-input').focus()
  }
}

function doFind() {
  clearHighlights()
  FindReplace.matches = []
  FindReplace.currentIndex = -1
  
  const query = document.getElementById('fr-find-input').value
  if (!query || !Editor.contentEl) {
    updateStatus()
    return
  }
  
  const flags = FindReplace.caseSensitive ? 'g' : 'gi'
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(escapedQuery, flags)
  
  // Walk through text nodes and find matches
  const walker = document.createTreeWalker(Editor.contentEl, NodeFilter.SHOW_TEXT, null, false)
  const textNodes = []
  let node
  
  while (node = walker.nextNode()) {
    textNodes.push(node)
  }
  
  // Process from last to first so DOM changes don't shift positions
  for (let i = textNodes.length - 1; i >= 0; i--) {
    const textNode = textNodes[i]
    const text = textNode.textContent
    const nodeMatches = []
    let match
    
    regex.lastIndex = 0
    while ((match = regex.exec(text)) !== null) {
      nodeMatches.push({ start: match.index, end: match.index + match[0].length, text: match[0] })
    }
    
    if (nodeMatches.length === 0) continue
    
    // Split text node and wrap matches
    const parent = textNode.parentNode
    const fragment = document.createDocumentFragment()
    let lastEnd = 0
    
    for (const m of nodeMatches) {
      // Text before match
      if (m.start > lastEnd) {
        fragment.appendChild(document.createTextNode(text.substring(lastEnd, m.start)))
      }
      
      // The match
      const span = document.createElement('span')
      span.className = 'find-highlight'
      span.textContent = text.substring(m.start, m.end)
      fragment.appendChild(span)
      
      lastEnd = m.end
    }
    
    // Text after last match
    if (lastEnd < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastEnd)))
    }
    
    parent.replaceChild(fragment, textNode)
  }
  
  // Collect all highlight spans
  FindReplace.matches = Array.from(Editor.contentEl.querySelectorAll('.find-highlight'))
  
  if (FindReplace.matches.length > 0) {
    FindReplace.currentIndex = 0
    highlightCurrent()
  }
  
  updateStatus()
}

function findNext() {
  if (FindReplace.matches.length === 0) return
  
  FindReplace.currentIndex = (FindReplace.currentIndex + 1) % FindReplace.matches.length
  highlightCurrent()
  updateStatus()
}

function findPrev() {
  if (FindReplace.matches.length === 0) return
  
  FindReplace.currentIndex = (FindReplace.currentIndex - 1 + FindReplace.matches.length) % FindReplace.matches.length
  highlightCurrent()
  updateStatus()
}

function highlightCurrent() {
  // Remove current class from all
  FindReplace.matches.forEach(m => m.classList.remove('current'))
  
  if (FindReplace.currentIndex >= 0 && FindReplace.currentIndex < FindReplace.matches.length) {
    const current = FindReplace.matches[FindReplace.currentIndex]
    current.classList.add('current')
    current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

function replaceOne() {
  if (FindReplace.currentIndex < 0 || FindReplace.currentIndex >= FindReplace.matches.length) return
  
  const replaceText = document.getElementById('fr-replace-input').value
  const current = FindReplace.matches[FindReplace.currentIndex]
  
  current.textContent = replaceText
  current.classList.remove('find-highlight', 'current')
  
  // Remove from matches array
  FindReplace.matches.splice(FindReplace.currentIndex, 1)
  
  // Adjust index
  if (FindReplace.currentIndex >= FindReplace.matches.length) {
    FindReplace.currentIndex = 0
  }
  
  if (FindReplace.matches.length > 0) {
    highlightCurrent()
  }
  
  updateStatus()
  
  // Mark editor as changed
  if (typeof Editor !== 'undefined') {
    Editor.hasUnsavedChanges = true
    if (typeof scheduleAutoSave === 'function') scheduleAutoSave()
  }
}

function replaceAll() {
  const replaceText = document.getElementById('fr-replace-input').value
  const count = FindReplace.matches.length
  
  FindReplace.matches.forEach(m => {
    m.textContent = replaceText
    m.classList.remove('find-highlight', 'current')
  })
  
  FindReplace.matches = []
  FindReplace.currentIndex = -1
  updateStatus()
  
  if (count > 0) {
    showToast(`Replaced ${count} occurrence${count !== 1 ? 's' : ''}`, 'success')
    
    if (typeof Editor !== 'undefined') {
      Editor.hasUnsavedChanges = true
      if (typeof scheduleAutoSave === 'function') scheduleAutoSave()
    }
  }
}

function clearHighlights() {
  if (!Editor.contentEl) return
  
  Editor.contentEl.querySelectorAll('.find-highlight').forEach(span => {
    const parent = span.parentNode
    parent.replaceChild(document.createTextNode(span.textContent), span)
  })
  
  Editor.contentEl.normalize()
}

function updateStatus() {
  const status = document.getElementById('fr-status')
  if (FindReplace.matches.length === 0) {
    const query = document.getElementById('fr-find-input').value
    status.textContent = query ? 'No matches' : '0/0'
  } else {
    status.textContent = `${FindReplace.currentIndex + 1}/${FindReplace.matches.length}`
  }
}