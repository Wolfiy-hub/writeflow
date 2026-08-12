// moodboard.js
// Moodboard - visual canvas with images, text, and colors

const Moodboard = {
    currentBoard: null,
    selectedItem: null,
    editingItem: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    gridSnap: false,
    isPanning: false,
    isDraggingItem: false,
    isResizingItem: false,
    hasMoved: false,
    panStart: { x: 0, y: 0 },
    itemDragStart: { x: 0, y: 0, itemX: 0, itemY: 0 },
    itemResizeStart: { x: 0, y: 0, w: 0, h: 0 },
    saveTimer: null,
    titleSaveTimer: null,
    boardToDelete: null,
    editingLinkItemId: null,
}

// ============================================
// INITIALIZATION
// ============================================

function initMoodboard() {
    document.getElementById('btn-new-moodboard-empty').addEventListener('click', createNewMoodboard)

    document.getElementById('moodboard-title-input').addEventListener('input', () => {
        if (!Moodboard.currentBoard) return
        Moodboard.currentBoard.name = document.getElementById('moodboard-title-input').value.trim() || 'Untitled Moodboard'
        updateSidebarMoodboardItem(Moodboard.currentBoard)
        clearTimeout(Moodboard.titleSaveTimer)
        Moodboard.titleSaveTimer = setTimeout(saveMoodboardData, 500)
    })

    document.getElementById('btn-zoom-in').addEventListener('click', () => setZoom(Moodboard.zoom + 0.15))
    document.getElementById('btn-zoom-out').addEventListener('click', () => setZoom(Moodboard.zoom - 0.15))
    document.getElementById('btn-reset-view').addEventListener('click', resetView)
    document.getElementById('btn-grid-snap').addEventListener('click', toggleGridSnap)
    document.getElementById('btn-delete-moodboard').addEventListener('click', () => {
        if (Moodboard.currentBoard) openDeleteMoodboardModal(Moodboard.currentBoard.id)
    })

    document.getElementById('btn-confirm-delete-moodboard').addEventListener('click', confirmDeleteMoodboard)

    document.getElementById('btn-add-image').addEventListener('click', () => {
        Moodboard.editingItem = null
        document.getElementById('moodboard-image-input').click()
    })
    document.getElementById('moodboard-image-input').addEventListener('change', handleImageInput)
    document.getElementById('btn-add-text').addEventListener('click', addTextItem)
    document.getElementById('btn-add-color').addEventListener('click', () => {
        Moodboard.editingItem = null
        document.getElementById('color-picker-input').value = '#7c6af7'
        document.getElementById('color-hex-input').value = '#7C6AF7'
        showModal('modal-add-color')
    })

    // NEW: To-Do, Link, Table
    document.getElementById('btn-add-todo').addEventListener('click', addTodoItem)
    document.getElementById('btn-add-link').addEventListener('click', () => {
        Moodboard.editingLinkItemId = null
        document.getElementById('link-modal-title').textContent = 'Add Link'
        document.getElementById('link-url-input').value = ''
        document.getElementById('link-title-input').value = ''
        document.getElementById('link-desc-input').value = ''
        document.getElementById('link-preview').classList.remove('visible')
        showModal('modal-add-link')
        setTimeout(() => document.getElementById('link-url-input').focus(), 100)
    })
    document.getElementById('btn-add-table').addEventListener('click', addTableItem)
    document.getElementById('btn-confirm-add-link').addEventListener('click', handleLinkConfirm)

    // Link URL live preview
    document.getElementById('link-url-input').addEventListener('input', updateLinkPreview)

    const colorPicker = document.getElementById('color-picker-input')
    const colorHex = document.getElementById('color-hex-input')

    colorPicker.addEventListener('input', (e) => {
        colorHex.value = e.target.value.toUpperCase()
    })
    colorHex.addEventListener('input', (e) => {
        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
            colorPicker.value = e.target.value
        }
    })

    document.getElementById('btn-confirm-add-color').addEventListener('click', handleColorConfirm)

    const container = document.getElementById('moodboard-canvas-container')
    container.addEventListener('mousedown', handleCanvasMouseDown)
    document.addEventListener('mousemove', handleCanvasMouseMove)
    document.addEventListener('mouseup', handleCanvasMouseUp)
    container.addEventListener('wheel', handleCanvasWheel, { passive: false })

    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && Moodboard.selectedItem) {
            const active = document.activeElement
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return

            e.preventDefault()
            deleteItem(Moodboard.selectedItem)
        }

        if (e.key === 'Escape' && Moodboard.selectedItem) {
            deselectAllItems()
        }
    })
}

// ============================================
// VIEW MANAGEMENT
// ============================================

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
}

function showMoodboardView() {
    if (!AppState.currentProject) return

    const boards = AppState.currentProject.moodboards || []
    const empty = document.getElementById('moodboard-empty')
    const active = document.getElementById('moodboard-active')

    if (boards.length === 0) {
        empty.classList.remove('hidden')
        active.classList.add('hidden')
        active.style.display = 'none'
        Moodboard.currentBoard = null
    } else {
        const boardToOpen = Moodboard.currentBoard
            ? boards.find(b => b.id === Moodboard.currentBoard.id) || boards[0]
            : boards[0]
        openMoodboard(boardToOpen)
    }
}

function openMoodboard(board) {
    if (!board) return

    Moodboard.currentBoard = board
    Moodboard.zoom = 1
    Moodboard.panX = 0
    Moodboard.panY = 0
    Moodboard.selectedItem = null

    document.getElementById('moodboard-empty').classList.add('hidden')
    document.getElementById('moodboard-active').classList.remove('hidden')
    document.getElementById('moodboard-active').style.display = 'flex'

    document.getElementById('moodboard-title-input').value = board.name || 'Untitled Moodboard'

    renderMoodboardItems()
    applyTransform()
    updateSidebarForMoodboards(AppState.currentProject)
}

// ============================================
// MOODBOARD MANAGEMENT
// ============================================

async function createNewMoodboard() {
    if (!AppState.currentProject) return

    const board = {
        id: generateId(),
        name: `Moodboard ${(AppState.currentProject.moodboards?.length || 0) + 1}`,
        items: [],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    }

    if (!AppState.currentProject.moodboards) AppState.currentProject.moodboards = []
    AppState.currentProject.moodboards.push(board)

    await saveCurrentProject()
    openMoodboard(board)
    showToast('Moodboard created', 'success')
}

function openDeleteMoodboardModal(boardId) {
    const board = AppState.currentProject?.moodboards?.find(b => b.id === boardId)
    if (!board) return

    Moodboard.boardToDelete = boardId
    document.getElementById('delete-moodboard-name').textContent = board.name
    showModal('modal-delete-moodboard')
}

async function confirmDeleteMoodboard() {
    if (!Moodboard.boardToDelete || !AppState.currentProject) return

    AppState.currentProject.moodboards = AppState.currentProject.moodboards.filter(
        b => b.id !== Moodboard.boardToDelete
    )

    const wasCurrent = Moodboard.currentBoard?.id === Moodboard.boardToDelete

    await saveCurrentProject()
    hideModal('modal-delete-moodboard')
    showToast('Moodboard deleted', 'success')

    if (wasCurrent) {
        Moodboard.currentBoard = null
        showMoodboardView()
    }

    updateSidebarForMoodboards(AppState.currentProject)
    Moodboard.boardToDelete = null
}

// ============================================
// ITEM ADD / EDIT
// ============================================

// Handles both adding new images AND replacing existing images
async function handleImageInput(e) {
    const file = e.target.files[0]
    if (!file || !Moodboard.currentBoard) return

    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error')
        return
    }

    if (file.size > 3 * 1024 * 1024) {
        showToast('Image too large (max 3MB)', 'error')
        return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
        if (Moodboard.editingItem) {
            // REPLACING an existing image
            const item = Moodboard.currentBoard.items.find(i => i.id === Moodboard.editingItem)
            if (item) {
                item.src = event.target.result
                await saveMoodboardData()
                renderMoodboardItems()
                showToast('Image replaced', 'success')
            }
            Moodboard.editingItem = null
        } else {
            // ADDING a new image
            const item = {
                id: generateId(),
                type: 'image',
                src: event.target.result,
                x: getCenterX() - 100,
                y: getCenterY() - 100,
                width: 200,
                height: 200,
            }

            Moodboard.currentBoard.items.push(item)
            await saveMoodboardData()
            renderMoodboardItems()
            showToast('Image added', 'success')
        }
    }
    reader.readAsDataURL(file)

    e.target.value = ''
}

// Handles both adding new colors AND changing existing colors
async function handleColorConfirm() {
    const color = document.getElementById('color-hex-input').value

    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        showToast('Invalid color hex code', 'error')
        return
    }

    if (Moodboard.editingItem) {
        // CHANGING an existing color
        const item = Moodboard.currentBoard.items.find(i => i.id === Moodboard.editingItem)
        if (item) {
            item.color = color
            await saveMoodboardData()
            renderMoodboardItems()
            showToast('Color changed', 'success')
        }
        Moodboard.editingItem = null
    } else {
        // ADDING a new color
        await addColorItem(color)
    }

    hideModal('modal-add-color')
}

async function addTextItem() {
    if (!Moodboard.currentBoard) return

    const item = {
        id: generateId(),
        type: 'text',
        text: 'Double-click to edit',
        x: getCenterX() - 80,
        y: getCenterY() - 40,
        width: 160,
        height: 80,
    }

    Moodboard.currentBoard.items.push(item)
    await saveMoodboardData()
    renderMoodboardItems()

    setTimeout(() => {
        selectItem(item.id)
        const el = document.querySelector(`[data-item-id="${item.id}"]`)
        if (el) {
            const textEl = el.querySelector('.moodboard-item-content')
            if (textEl) {
                textEl.setAttribute('contenteditable', 'true')
                textEl.focus()
                document.execCommand('selectAll', false, null)
            }
        }
    }, 100)
}

async function addColorItem(color) {
    if (!Moodboard.currentBoard) return

    const item = {
        id: generateId(),
        type: 'color',
        color: color,
        x: getCenterX() - 60,
        y: getCenterY() - 60,
        width: 120,
        height: 120,
    }

    Moodboard.currentBoard.items.push(item)
    await saveMoodboardData()
    renderMoodboardItems()
    showToast('Color added', 'success')
}

// EDIT functions - open the right editor for each item type
function editItem(itemId) {
    const item = Moodboard.currentBoard?.items.find(i => i.id === itemId)
    if (!item) return

    if (item.type === 'image') {
        Moodboard.editingItem = itemId
        document.getElementById('moodboard-image-input').click()
    } else if (item.type === 'color') {
        Moodboard.editingItem = itemId
        document.getElementById('color-picker-input').value = item.color
        document.getElementById('color-hex-input').value = item.color.toUpperCase()
        showModal('modal-add-color')
    } else if (item.type === 'text') {
        const el = document.querySelector(`[data-item-id="${itemId}"]`)
        if (el) {
            const content = el.querySelector('.moodboard-item-content')
            if (content) {
                content.setAttribute('contenteditable', 'true')
                content.focus()
                document.execCommand('selectAll', false, null)
            }
        }
    } else if (item.type === 'link') {
        Moodboard.editingLinkItemId = itemId
        document.getElementById('link-modal-title').textContent = 'Edit Link'
        document.getElementById('link-url-input').value = item.url || ''
        document.getElementById('link-title-input').value = item.title || ''
        document.getElementById('link-desc-input').value = item.description || ''
        updateLinkPreview()
        showModal('modal-add-link')
    }
}

function getCenterX() {
    const container = document.getElementById('moodboard-canvas-container')
    const rect = container.getBoundingClientRect()
    return (rect.width / 2 - Moodboard.panX) / Moodboard.zoom
}

function getCenterY() {
    const container = document.getElementById('moodboard-canvas-container')
    const rect = container.getBoundingClientRect()
    return (rect.height / 2 - Moodboard.panY) / Moodboard.zoom
}

async function deleteItem(itemId) {
  if (!Moodboard.currentBoard) return
  
  Moodboard.currentBoard.items = Moodboard.currentBoard.items.filter(i => i.id !== itemId)
  
  Moodboard.selectedItem = null
  
  await saveMoodboardData()
  renderMoodboardItems()
  showToast('Item deleted', 'info')
}

// ============================================
// RENDER ITEMS
// ============================================

function renderMoodboardItems() {
    if (!Moodboard.currentBoard) return

    const canvas = document.getElementById('moodboard-canvas')
    canvas.innerHTML = ''

    Moodboard.currentBoard.items.forEach(item => {
        const el = createItemElement(item)
        canvas.appendChild(el)
    })

    if (Moodboard.selectedItem) {
        const el = document.querySelector(`[data-item-id="${Moodboard.selectedItem}"]`)
        if (el) el.classList.add('selected')
    }
}

function createItemElement(item) {
    const el = document.createElement('div')
    el.className = `moodboard-item type-${item.type}`
    el.dataset.itemId = item.id
    el.style.left = `${item.x}px`
    el.style.top = `${item.y}px`
    el.style.width = `${item.width}px`
    el.style.height = `${item.height}px`

    let contentHTML = ''

    if (item.type === 'image') {
        contentHTML = `<div class="moodboard-item-visual"><img src="${item.src}" alt="" draggable="false" /></div>`
    } else if (item.type === 'text') {
        contentHTML = `<div class="moodboard-item-visual"><div class="moodboard-item-content">${escapeHtml(item.text || '')}</div></div>`
    } else if (item.type === 'color') {
        contentHTML = `<div class="moodboard-item-visual" style="background: ${item.color}"><span>${item.color.toUpperCase()}</span></div>`
    } else if (item.type === 'todo') {
        contentHTML = createTodoHTML(item)
    } else if (item.type === 'link') {
        contentHTML = createLinkHTML(item)
    } else if (item.type === 'table') {
        contentHTML = createTableHTML(item)
    }

    const editLabel = item.type === 'image' ? 'Replace image'
        : item.type === 'color' ? 'Change color'
            : item.type === 'link' ? 'Edit link'
                : item.type === 'text' ? 'Edit text'
                    : ''

    const showEditBtn = ['image', 'color', 'link', 'text'].includes(item.type)

    el.innerHTML = `
    ${contentHTML}
    <div class="moodboard-item-toolbar">
      ${showEditBtn ? `
        <button class="item-tool-btn" data-action="edit" title="${editLabel}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>
      ` : ''}
      <button class="item-tool-btn danger" data-action="delete" title="Delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
        </svg>
      </button>
    </div>
    <div class="moodboard-item-resize"></div>
  `

    el.addEventListener('mousedown', (e) => handleItemMouseDown(e, item))

    // Double-click to edit
    el.addEventListener('dblclick', (e) => {
        if (item.type === 'todo' || item.type === 'table') return // These have their own inline editing
        e.stopPropagation()
        e.preventDefault()
        editItem(item.id)
    })

    // Delete button
    el.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
        e.stopPropagation()
        e.preventDefault()
        deleteItem(item.id)
    })

    // Edit button
    const editBtn = el.querySelector('[data-action="edit"]')
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            e.preventDefault()
            editItem(item.id)
        })
    }

    // Text item - save on blur
    if (item.type === 'text') {
        const content = el.querySelector('.moodboard-item-content')
        if (content) {
            content.addEventListener('blur', async () => {
                content.removeAttribute('contenteditable')
                item.text = content.textContent
                await saveMoodboardData()
            })
            content.addEventListener('keydown', (e) => {
                e.stopPropagation()
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    content.blur()
                }
                if (e.key === 'Escape') content.blur()
            })
            content.addEventListener('mousedown', (e) => {
                if (content.getAttribute('contenteditable') === 'true') e.stopPropagation()
            })
        }
    }

    // To-Do item event handlers
    if (item.type === 'todo') {
        attachTodoHandlers(el, item)
    }

    // Table event handlers
    if (item.type === 'table') {
        attachTableHandlers(el, item)
    }

    // Link click - open in default browser via IPC
    if (item.type === 'link') {
        const openBtn = el.querySelector('.link-card-open-btn')
        if (openBtn) {
            openBtn.addEventListener('mousedown', (e) => e.stopPropagation())
            openBtn.addEventListener('click', async (e) => {
                e.stopPropagation()
                e.preventDefault()
                try {
                    await window.electronAPI.openExternalUrl(item.url)
                } catch (err) {
                    console.error('Could not open URL:', err)
                    showToast('Could not open link', 'error')
                }
            })
        }
    }

    // Resize handle
    const resizeHandle = el.querySelector('.moodboard-item-resize')
    resizeHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation()
        e.preventDefault()
        handleItemResizeStart(e, item)
    })

    return el
}

// Helper HTML builders

function createTodoHTML(item) {
    const doneCount = (item.todos || []).filter(t => t.done).length
    const totalCount = (item.todos || []).length
    const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0

    const todosHTML = (item.todos || []).map(todo => `
    <div class="todo-item ${todo.done ? 'checked' : ''}" data-todo-id="${todo.id}">
      <input type="checkbox" class="todo-item-checkbox" ${todo.done ? 'checked' : ''} />
      <textarea class="todo-item-text" placeholder="Task..." rows="1">${escapeHtml(todo.text)}</textarea>
      <button class="todo-item-remove" title="Remove">×</button>
    </div>
  `).join('')

    return `
    <div class="moodboard-item-visual">
      <input type="text" class="todo-list-title" value="${escapeHtml(item.title || 'To-Do')}" placeholder="List title..." />
      <div class="todo-items-container">
        ${todosHTML}
      </div>
      <button class="todo-add-btn" data-action="add-todo">+ Add task</button>
      ${totalCount > 0 ? `
        <div class="todo-progress">
          <div class="todo-progress-bar">
            <div class="todo-progress-fill" style="width: ${progress}%"></div>
          </div>
          <span>${doneCount}/${totalCount}</span>
        </div>
      ` : ''}
    </div>
  `
}

function attachTodoHandlers(el, item) {
    // Title
    const titleInput = el.querySelector('.todo-list-title')
    if (titleInput) {
        titleInput.addEventListener('mousedown', (e) => e.stopPropagation())
        titleInput.addEventListener('input', async () => {
            item.title = titleInput.value
            await saveMoodboardData()
        })
    }

    // Individual todos
    el.querySelectorAll('.todo-item').forEach(todoEl => {
        const todoId = todoEl.dataset.todoId
        const todo = (item.todos || []).find(t => t.id === todoId)
        if (!todo) return

        const checkbox = todoEl.querySelector('.todo-item-checkbox')
        const textInput = todoEl.querySelector('.todo-item-text')
        const removeBtn = todoEl.querySelector('.todo-item-remove')

        checkbox.addEventListener('mousedown', (e) => e.stopPropagation())
        checkbox.addEventListener('change', async () => {
            todo.done = checkbox.checked
            todoEl.classList.toggle('checked', todo.done)
            await saveMoodboardData()
            // Re-render to update progress
            renderMoodboardItems()
        })

        textInput.addEventListener('mousedown', (e) => e.stopPropagation())
        textInput.addEventListener('input', async () => {
            todo.text = textInput.value
            autoResizeTextarea(textInput)
            await saveMoodboardData()
        })
        textInput.addEventListener('keydown', (e) => {
            e.stopPropagation()
            // Enter WITHOUT shift = new todo
            // Shift+Enter = actual line break within the todo
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                const newTodo = { id: generateId(), text: '', done: false }
                const idx = item.todos.findIndex(t => t.id === todoId)
                item.todos.splice(idx + 1, 0, newTodo)
                saveMoodboardData()
                renderMoodboardItems()
                setTimeout(() => {
                    const newInput = document.querySelector(`[data-todo-id="${newTodo.id}"] .todo-item-text`)
                    if (newInput) newInput.focus()
                }, 50)
            }
        })

        // Initial auto-resize
        setTimeout(() => autoResizeTextarea(textInput), 0)

        removeBtn.addEventListener('mousedown', (e) => e.stopPropagation())
        removeBtn.addEventListener('click', async () => {
            item.todos = item.todos.filter(t => t.id !== todoId)
            await saveMoodboardData()
            renderMoodboardItems()
        })
    })

    // Add task button
    const addBtn = el.querySelector('[data-action="add-todo"]')
    if (addBtn) {
        addBtn.addEventListener('mousedown', (e) => e.stopPropagation())
        addBtn.addEventListener('click', async () => {
            if (!item.todos) item.todos = []
            const newTodo = { id: generateId(), text: '', done: false }
            item.todos.push(newTodo)
            await saveMoodboardData()
            renderMoodboardItems()
            setTimeout(() => {
                const newInput = document.querySelector(`[data-todo-id="${newTodo.id}"] .todo-item-text`)
                if (newInput) newInput.focus()
            }, 50)
        })
    }
}

function createLinkHTML(item) {
    return `
    <div class="moodboard-item-visual">
      <div class="link-card-image">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"></path>
        </svg>
      </div>
      <div class="link-card-content">
        <div class="link-card-domain">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"></path>
          </svg>
          ${escapeHtml(item.domain || '')}
        </div>
        <div class="link-card-title">${escapeHtml(item.title || 'Untitled')}</div>
        ${item.description ? `<div class="link-card-desc">${escapeHtml(item.description)}</div>` : ''}
        <button class="link-card-open-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
          Open Link
        </button>
      </div>
    </div>
  `
}

function createTableHTML(item) {
    const rows = item.rows || [['', '', '']]

    let tableHTML = '<table class="moodboard-table"><tbody>'
    rows.forEach((row, rowIdx) => {
        tableHTML += '<tr>'
        row.forEach((cell, colIdx) => {
            const tag = rowIdx === 0 ? 'th' : 'td'
            tableHTML += `<${tag} contenteditable="true" data-row="${rowIdx}" data-col="${colIdx}">${escapeHtml(cell || '')}</${tag}>`
        })
        tableHTML += '</tr>'
    })
    tableHTML += '</tbody></table>'
    tableHTML += `
    <div class="table-controls">
      <button class="table-control-btn" data-action="add-row">+ Row</button>
      <button class="table-control-btn" data-action="add-col">+ Column</button>
      <button class="table-control-btn" data-action="del-row">− Row</button>
      <button class="table-control-btn" data-action="del-col">− Column</button>
    </div>
  `

    return `<div class="moodboard-item-visual">${tableHTML}</div>`
}

function attachTableHandlers(el, item) {
    // Cell editing
    el.querySelectorAll('td, th').forEach(cell => {
        cell.addEventListener('mousedown', (e) => e.stopPropagation())
        cell.addEventListener('input', async () => {
            const row = parseInt(cell.dataset.row)
            const col = parseInt(cell.dataset.col)
            if (item.rows[row]) {
                item.rows[row][col] = cell.textContent
                await saveMoodboardData()
            }
        })
        cell.addEventListener('keydown', (e) => {
            e.stopPropagation()
            if (e.key === 'Enter') e.preventDefault() // no line breaks in cells
        })
    })

    // Row/column controls
    el.querySelectorAll('[data-action="add-row"]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => e.stopPropagation())
        btn.addEventListener('click', async () => {
            const cols = item.rows[0]?.length || 3
            item.rows.push(new Array(cols).fill(''))
            await saveMoodboardData()
            renderMoodboardItems()
        })
    })

    el.querySelectorAll('[data-action="add-col"]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => e.stopPropagation())
        btn.addEventListener('click', async () => {
            item.rows.forEach(row => row.push(''))
            await saveMoodboardData()
            renderMoodboardItems()
        })
    })

    el.querySelectorAll('[data-action="del-row"]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => e.stopPropagation())
        btn.addEventListener('click', async () => {
            if (item.rows.length > 1) {
                item.rows.pop()
                await saveMoodboardData()
                renderMoodboardItems()
            }
        })
    })

    el.querySelectorAll('[data-action="del-col"]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => e.stopPropagation())
        btn.addEventListener('click', async () => {
            if (item.rows[0] && item.rows[0].length > 1) {
                item.rows.forEach(row => row.pop())
                await saveMoodboardData()
                renderMoodboardItems()
            }
        })
    })
}

function selectItem(itemId) {
    deselectAllItems()
    Moodboard.selectedItem = itemId
    const el = document.querySelector(`[data-item-id="${itemId}"]`)
    if (el) el.classList.add('selected')
}

function deselectAllItems() {
    document.querySelectorAll('.moodboard-item.selected').forEach(el => {
        el.classList.remove('selected')
    })
    Moodboard.selectedItem = null
}

// ============================================
// ITEM DRAG
// ============================================

function handleItemMouseDown(e, item) {
    if (e.target.closest('.moodboard-item-toolbar')) return
    if (e.target.closest('.moodboard-item-resize')) return

    const content = e.target.closest('.moodboard-item-content')
    if (content && content.getAttribute('contenteditable') === 'true') return

    e.stopPropagation()
    e.preventDefault()

    selectItem(item.id)


    Moodboard.isDraggingItem = true
    Moodboard.hasMoved = false

    const el = document.querySelector(`[data-item-id="${item.id}"]`)

    Moodboard.itemDragStart = {
        x: e.clientX,
        y: e.clientY,
        itemX: item.x,
        itemY: item.y,
        item: item,
        el: el
    }
}

function handleItemResizeStart(e, item) {
    Moodboard.isResizingItem = true
    selectItem(item.id)

    Moodboard.itemResizeStart = {
        x: e.clientX,
        y: e.clientY,
        w: item.width,
        h: item.height,
        item: item
    }
}

// ============================================
// CANVAS PAN
// ============================================

function handleCanvasMouseDown(e) {
    if (e.target.closest('.moodboard-item')) return
    if (e.target.closest('.moodboard-add-panel')) return
    if (e.target.closest('.moodboard-toolbar')) return

    deselectAllItems()

    const container = document.getElementById('moodboard-canvas-container')
    Moodboard.isPanning = true
    container.classList.add('panning')
    Moodboard.panStart = {
        x: e.clientX - Moodboard.panX,
        y: e.clientY - Moodboard.panY
    }
}

function handleCanvasMouseMove(e) {
    if (Moodboard.isDraggingItem && Moodboard.itemDragStart.item) {
        const dx = (e.clientX - Moodboard.itemDragStart.x) / Moodboard.zoom
        const dy = (e.clientY - Moodboard.itemDragStart.y) / Moodboard.zoom

        if (!Moodboard.hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
            Moodboard.hasMoved = true
            if (Moodboard.itemDragStart.el) {
                Moodboard.itemDragStart.el.classList.add('dragging')
            }
        }

        if (Moodboard.hasMoved) {
            let newX = Moodboard.itemDragStart.itemX + dx
            let newY = Moodboard.itemDragStart.itemY + dy

            if (Moodboard.gridSnap) {
                newX = Math.round(newX / 20) * 20
                newY = Math.round(newY / 20) * 20
            }

            Moodboard.itemDragStart.item.x = newX
            Moodboard.itemDragStart.item.y = newY

            if (Moodboard.itemDragStart.el) {
                Moodboard.itemDragStart.el.style.left = `${newX}px`
                Moodboard.itemDragStart.el.style.top = `${newY}px`
            }

        }
        return
    }

    if (Moodboard.isResizingItem && Moodboard.itemResizeStart.item) {
        const dx = (e.clientX - Moodboard.itemResizeStart.x) / Moodboard.zoom
        const dy = (e.clientY - Moodboard.itemResizeStart.y) / Moodboard.zoom

        const newW = Math.max(60, Moodboard.itemResizeStart.w + dx)
        const newH = Math.max(60, Moodboard.itemResizeStart.h + dy)

        Moodboard.itemResizeStart.item.width = newW
        Moodboard.itemResizeStart.item.height = newH

        const el = document.querySelector(`[data-item-id="${Moodboard.itemResizeStart.item.id}"]`)
        if (el) {
            el.style.width = `${newW}px`
            el.style.height = `${newH}px`
        }
        return
    }

    if (Moodboard.isPanning) {
        Moodboard.panX = e.clientX - Moodboard.panStart.x
        Moodboard.panY = e.clientY - Moodboard.panStart.y
        applyTransform()
    }
}

function handleCanvasMouseUp() {
    const container = document.getElementById('moodboard-canvas-container')
    if (container) container.classList.remove('panning')

    if (Moodboard.isDraggingItem) {
        if (Moodboard.itemDragStart.el) {
            Moodboard.itemDragStart.el.classList.remove('dragging')
        }
        if (Moodboard.hasMoved) {
            saveMoodboardData()
        }
    }

    if (Moodboard.isResizingItem) {
        saveMoodboardData()
    }

    Moodboard.isPanning = false
    Moodboard.isDraggingItem = false
    Moodboard.isResizingItem = false
    Moodboard.hasMoved = false
    Moodboard.itemDragStart = { x: 0, y: 0, itemX: 0, itemY: 0 }
    Moodboard.itemResizeStart = { x: 0, y: 0, w: 0, h: 0 }
}

function handleCanvasWheel(e) {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setZoom(Moodboard.zoom + delta)
    }
}

function setZoom(newZoom) {
    Moodboard.zoom = Math.min(3, Math.max(0.3, newZoom))
    applyTransform()
    updateZoomDisplay()
}

function updateZoomDisplay() {
    const el = document.getElementById('zoom-display')
    if (el) el.textContent = `${Math.round(Moodboard.zoom * 100)}%`
}

function applyTransform() {
    const canvas = document.getElementById('moodboard-canvas')
    if (canvas) {
        canvas.style.transform = `translate(${Moodboard.panX}px, ${Moodboard.panY}px) scale(${Moodboard.zoom})`
    }
    updateZoomDisplay()
}

function resetView() {
    Moodboard.zoom = 1
    Moodboard.panX = 0
    Moodboard.panY = 0
    applyTransform()
}

function toggleGridSnap() {
    Moodboard.gridSnap = !Moodboard.gridSnap
    const btn = document.getElementById('btn-grid-snap')
    const container = document.getElementById('moodboard-canvas-container')
    btn.classList.toggle('active', Moodboard.gridSnap)
    container.classList.toggle('grid-snap', Moodboard.gridSnap)
    showToast(Moodboard.gridSnap ? 'Grid snap ON' : 'Grid snap OFF', 'info', 1500)
}

async function saveMoodboardData() {
    if (!Moodboard.currentBoard || !AppState.currentProject) return
    Moodboard.currentBoard.lastModified = new Date().toISOString()
    await saveCurrentProject()
}

// ============================================
// SIDEBAR
// ============================================

function updateSidebarForMoodboards(project) {
    const content = document.getElementById('sidebar-content')
    const boards = project.moodboards || []

    content.innerHTML = `
    <div class="sidebar-section">
      <div class="sidebar-section-header">
        <span>Moodboards</span>
        <button class="sidebar-add-btn" id="btn-sidebar-add-moodboard" data-tooltip="New Moodboard">+</button>
      </div>
      <div>
        ${boards.length === 0
            ? '<p class="sidebar-empty">No moodboards yet.<br>Click + to add one.</p>'
            : boards.map(board => createSidebarMoodboardItem(board)).join('')
        }
      </div>
    </div>
  `

    document.getElementById('btn-sidebar-add-moodboard')?.addEventListener('click', createNewMoodboard)

    document.querySelectorAll('.moodboard-sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            const boardId = item.dataset.boardId
            const board = AppState.currentProject.moodboards.find(b => b.id === boardId)
            if (board) openMoodboard(board)
        })
    })
}

function createSidebarMoodboardItem(board) {
    const isActive = Moodboard.currentBoard?.id === board.id
    const itemCount = board.items?.length || 0

    return `
    <div class="moodboard-sidebar-item ${isActive ? 'active' : ''}" data-board-id="${board.id}">
      <div class="moodboard-sidebar-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      </div>
      <div class="moodboard-sidebar-info">
        <span class="moodboard-sidebar-name">${escapeHtml(board.name || 'Untitled')}</span>
        <span class="moodboard-sidebar-count">${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  `
}

function updateSidebarMoodboardItem(board) {
    const item = document.querySelector(`.moodboard-sidebar-item[data-board-id="${board.id}"]`)
    if (!item) return

    const nameEl = item.querySelector('.moodboard-sidebar-name')
    if (nameEl) nameEl.textContent = board.name || 'Untitled'

    const countEl = item.querySelector('.moodboard-sidebar-count')
    if (countEl) {
        const count = board.items?.length || 0
        countEl.textContent = `${count} item${count !== 1 ? 's' : ''}`
    }
}

// ============================================
// TO-DO LIST ITEMS
// ============================================

async function addTodoItem() {
    if (!Moodboard.currentBoard) return

    const item = {
        id: generateId(),
        type: 'todo',
        title: 'To-Do List',
        todos: [
            { id: generateId(), text: 'First task', done: false }
        ],
        x: getCenterX() - 120,
        y: getCenterY() - 100,
        width: 240,
        height: 200,
    }

    Moodboard.currentBoard.items.push(item)
    await saveMoodboardData()
    renderMoodboardItems()
    showToast('To-do list added', 'success')
}

// ============================================
// LINK CARDS
// ============================================

function updateLinkPreview() {
    const url = document.getElementById('link-url-input').value.trim()
    const preview = document.getElementById('link-preview')
    const domainEl = document.getElementById('link-preview-domain')
    const urlEl = document.getElementById('link-preview-url')

    if (!url) {
        preview.classList.remove('visible')
        return
    }

    try {
        const parsed = new URL(url.startsWith('http') ? url : 'https://' + url)
        domainEl.textContent = parsed.hostname
        urlEl.textContent = parsed.href
        preview.classList.add('visible')
    } catch (e) {
        preview.classList.remove('visible')
    }
}

async function handleLinkConfirm() {
    let url = document.getElementById('link-url-input').value.trim()
    const customTitle = document.getElementById('link-title-input').value.trim()
    const customDesc = document.getElementById('link-desc-input').value.trim()

    if (!url) {
        showToast('Please enter a URL', 'error')
        return
    }

    if (!url.match(/^https?:\/\//)) {
        url = 'https://' + url
    }

    try {
        new URL(url)
    } catch (e) {
        showToast('Invalid URL', 'error')
        return
    }

    let hostname
    try {
        hostname = new URL(url).hostname
    } catch (e) {
        hostname = url
    }

    if (Moodboard.editingLinkItemId) {
        const item = Moodboard.currentBoard.items.find(i => i.id === Moodboard.editingLinkItemId)
        if (item) {
            item.url = url
            // Allow empty title now — but if user provides one, use it, else use hostname
            item.title = customTitle !== '' ? customTitle : hostname
            item.description = customDesc
            item.domain = hostname
            await saveMoodboardData()
            renderMoodboardItems()
            showToast('Link updated', 'success')
        }
        Moodboard.editingLinkItemId = null
    } else {
        // Better default dimensions for a new link (wider, shorter)
        const item = {
            id: generateId(),
            type: 'link',
            url: url,
            title: customTitle !== '' ? customTitle : hostname,
            description: customDesc,
            domain: hostname,
            x: getCenterX() - 140,
            y: getCenterY() - 100,
            width: 280,
            height: 200,
        }

        Moodboard.currentBoard.items.push(item)
        await saveMoodboardData()
        renderMoodboardItems()
        showToast('Link added', 'success')
    }

    hideModal('modal-add-link')
}

// ============================================
// TABLE ITEMS
// ============================================

async function addTableItem() {
    if (!Moodboard.currentBoard) return

    const item = {
        id: generateId(),
        type: 'table',
        rows: [
            ['Header 1', 'Header 2', 'Header 3'],
            ['', '', ''],
            ['', '', ''],
        ],
        x: getCenterX() - 150,
        y: getCenterY() - 80,
        width: 300,
        height: 160,
    }

    Moodboard.currentBoard.items.push(item)
    await saveMoodboardData()
    renderMoodboardItems()
    showToast('Table added', 'success')
}

// ============================================
// CONNECTIONS (LINES BETWEEN ITEMS)
// ============================================

function startConnecting(itemId) {
    // If already connecting from a different item, cancel that first
    if (Moodboard.isConnecting && Moodboard.connectingSourceId !== itemId) {
        document.querySelectorAll('.moodboard-item.connecting-source').forEach(el => {
            el.classList.remove('connecting-source')
        })
    }

    Moodboard.isConnecting = true
    Moodboard.connectingSourceId = itemId

    // Deselect all items so the item you're connecting FROM doesn't stay highlighted with toolbar
    deselectAllItems()

    const container = document.getElementById('moodboard-canvas-container')
    container.classList.add('connecting')

    const el = document.querySelector(`[data-item-id="${itemId}"]`)
    if (el) el.classList.add('connecting-source')

    showToast('Click another item to connect', 'info', 2500)
}

function cancelConnecting() {
    Moodboard.isConnecting = false
    Moodboard.connectingSourceId = null

    const container = document.getElementById('moodboard-canvas-container')
    container.classList.remove('connecting')

    document.querySelectorAll('.moodboard-item.connecting-source').forEach(el => {
        el.classList.remove('connecting-source')
    })
    document.querySelectorAll('.moodboard-item.connect-target-hover').forEach(el => {
        el.classList.remove('connect-target-hover')
    })
}

async function completeConnection(targetId) {
    const sourceId = Moodboard.connectingSourceId
    if (!sourceId || sourceId === targetId) {
        cancelConnecting()
        return
    }

    if (!Moodboard.currentBoard.connections) {
        Moodboard.currentBoard.connections = []
    }

    // Check if already connected
    const existing = Moodboard.currentBoard.connections.find(c =>
        (c.fromId === sourceId && c.toId === targetId) ||
        (c.fromId === targetId && c.toId === sourceId)
    )

    if (existing) {
        // Remove existing connection (toggle)
        Moodboard.currentBoard.connections = Moodboard.currentBoard.connections.filter(c => c !== existing)
        showToast('Connection removed', 'info')
    } else {
        Moodboard.currentBoard.connections.push({
            id: generateId(),
            fromId: sourceId,
            toId: targetId,
        })
        showToast('Items connected', 'success')
    }

    cancelConnecting()
    await saveMoodboardData()
    renderConnections()
}

function renderConnections() {
    const svg = document.getElementById('moodboard-connections-svg')
    if (!svg) return

    svg.innerHTML = ''

    if (!Moodboard.currentBoard || !Moodboard.currentBoard.connections) return

    // Get positions of all items
    const itemPositions = {}
    Moodboard.currentBoard.items.forEach(item => {
        itemPositions[item.id] = {
            x: item.x + item.width / 2,
            y: item.y + item.height / 2,
            w: item.width,
            h: item.height,
        }
    })

    const svgNS = 'http://www.w3.org/2000/svg'

    // Add arrow marker definition
    const defs = document.createElementNS(svgNS, 'defs')
    defs.innerHTML = `
    <marker id="mb-arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" class="moodboard-connection-arrow" />
    </marker>
  `
    svg.appendChild(defs)

    Moodboard.currentBoard.connections.forEach(conn => {
        const from = itemPositions[conn.fromId]
        const to = itemPositions[conn.toId]
        if (!from || !to) return

        // Calculate transformed positions (matching canvas transform)
        const fromX = from.x * Moodboard.zoom + Moodboard.panX
        const fromY = from.y * Moodboard.zoom + Moodboard.panY
        const toX = to.x * Moodboard.zoom + Moodboard.panX
        const toY = to.y * Moodboard.zoom + Moodboard.panY

        // Adjust endpoints to touch item edges
        const angle = Math.atan2(toY - fromY, toX - fromX)
        const fromRadius = Math.min(from.w, from.h) / 2 * Moodboard.zoom
        const toRadius = Math.min(to.w, to.h) / 2 * Moodboard.zoom

        const startX = fromX + Math.cos(angle) * fromRadius
        const startY = fromY + Math.sin(angle) * fromRadius
        const endX = toX - Math.cos(angle) * (toRadius + 4)
        const endY = toY - Math.sin(angle) * (toRadius + 4)

        const line = document.createElementNS(svgNS, 'line')
        line.setAttribute('x1', startX)
        line.setAttribute('y1', startY)
        line.setAttribute('x2', endX)
        line.setAttribute('y2', endY)
        line.setAttribute('class', 'moodboard-connection-line')
        line.setAttribute('marker-end', 'url(#mb-arrow)')
        line.dataset.connectionId = conn.id

        line.addEventListener('click', (e) => {
            e.stopPropagation()
            if (confirm('Delete this connection?')) {
                deleteConnection(conn.id)
            }
        })

        svg.appendChild(line)
    })
}

async function deleteConnection(connectionId) {
    if (!Moodboard.currentBoard.connections) return
    Moodboard.currentBoard.connections = Moodboard.currentBoard.connections.filter(c => c.id !== connectionId)
    await saveMoodboardData()
    renderConnections()
    showToast('Connection deleted', 'info')
}