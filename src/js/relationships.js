// relationships.js
// Multiple maps + custom colors + intensity + directional arrows

const Relationships = {
  currentMapId: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  isDraggingNode: false,
  isConnecting: false,
  connectingSourceId: null,
  panStart: { x: 0, y: 0 },
  nodeDragStart: { x: 0, y: 0, nodeX: 0, nodeY: 0 },
  saveTimer: null,
  editingConnection: null,
  pendingConnection: null,
  selectedType: null,
  mapToDelete: null,
  editingMapId: null,
  selectedCharsForMap: new Set(),
}

// ============================================
// INITIALIZATION
// ============================================

function initRelationships() {
  document.getElementById('btn-rel-zoom-in').addEventListener('click', () => setRelZoom(Relationships.zoom + 0.15))
  document.getElementById('btn-rel-zoom-out').addEventListener('click', () => setRelZoom(Relationships.zoom - 0.15))
  document.getElementById('btn-rel-reset-view').addEventListener('click', resetRelView)
  document.getElementById('btn-auto-layout').addEventListener('click', autoLayoutNodes)
  document.getElementById('btn-cancel-connecting').addEventListener('click', cancelConnecting)
  
  document.getElementById('btn-save-connection').addEventListener('click', saveConnection)
  document.getElementById('btn-delete-connection').addEventListener('click', deleteConnection)
  
  document.getElementById('rel-map-select').addEventListener('change', (e) => switchMap(e.target.value))
  document.getElementById('btn-new-rel-map').addEventListener('click', openNewMapModal)
  document.getElementById('btn-edit-rel-map').addEventListener('click', openEditMapModal)
  document.getElementById('btn-delete-rel-map').addEventListener('click', openDeleteMapModal)
  document.getElementById('btn-save-rel-map').addEventListener('click', saveMapEditor)
  document.getElementById('btn-confirm-delete-rel-map').addEventListener('click', confirmDeleteMap)
  
  // Type selector
  document.querySelectorAll('.rel-type-option').forEach(btn => {
    btn.addEventListener('click', () => {
      Relationships.selectedType = btn.dataset.type
      document.querySelectorAll('.rel-type-option').forEach(b => b.classList.remove('selected'))
      btn.classList.add('selected')
      const colorSection = document.getElementById('rel-color-section')
      colorSection.style.display = btn.dataset.type === 'other' ? 'block' : 'none'
    })
  })
  
  // Custom color picker sync
  document.getElementById('rel-custom-color-picker').addEventListener('input', (e) => {
    document.getElementById('rel-custom-color-hex').value = e.target.value.toUpperCase()
  })
  document.getElementById('rel-custom-color-hex').addEventListener('input', (e) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
      document.getElementById('rel-custom-color-picker').value = e.target.value
    }
  })
  
  // Intensity slider
  document.getElementById('rel-intensity-slider').addEventListener('input', (e) => {
    document.getElementById('rel-intensity-display').textContent = e.target.value
  })
  
  // Direction selector
  document.querySelectorAll('.rel-direction-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rel-direction-option').forEach(b => b.classList.remove('selected'))
      btn.classList.add('selected')
    })
  })
  
  // Canvas
  const container = document.getElementById('rel-canvas-container')
  container.addEventListener('mousedown', handleRelCanvasMouseDown)
  document.addEventListener('mousemove', handleRelCanvasMouseMove)
  document.addEventListener('mouseup', handleRelCanvasMouseUp)
  container.addEventListener('wheel', handleRelCanvasWheel, { passive: false })
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && Relationships.isConnecting) cancelConnecting()
  })
}

// ============================================
// MAP MANAGEMENT
// ============================================

function ensureDefaultMap() {
  if (!AppState.currentProject) return
  if (!AppState.currentProject.relationshipMaps) {
    AppState.currentProject.relationshipMaps = []
  }
  
  if (AppState.currentProject.relationshipMaps.length === 0 && 
      AppState.currentProject.characters?.length > 0) {
    const allChars = AppState.currentProject.characters.map(c => c.id)
    AppState.currentProject.relationshipMaps.push({
      id: generateId(),
      name: 'All Characters',
      characterIds: allChars,
      connections: AppState.currentProject.relationships || [],
      nodePositions: AppState.currentProject.nodePositions || {},
      createdAt: new Date().toISOString(),
    })
  }
}

function getCurrentMap() {
  if (!AppState.currentProject) return null
  ensureDefaultMap()
  
  const maps = AppState.currentProject.relationshipMaps || []
  if (maps.length === 0) return null
  
  if (!Relationships.currentMapId || !maps.find(m => m.id === Relationships.currentMapId)) {
    Relationships.currentMapId = maps[0].id
  }
  
  return maps.find(m => m.id === Relationships.currentMapId)
}

function renderMapSelector() {
  const select = document.getElementById('rel-map-select')
  const maps = AppState.currentProject?.relationshipMaps || []
  const currentMap = getCurrentMap()
  
  select.innerHTML = maps.map(m => 
    `<option value="${m.id}" ${m.id === currentMap?.id ? 'selected' : ''}>${escapeHtml(m.name)}</option>`
  ).join('')
  
  document.getElementById('rel-map-title').textContent = currentMap?.name || 'Relationship Map'
}

function switchMap(mapId) {
  Relationships.currentMapId = mapId
  Relationships.zoom = 1
  Relationships.panX = 0
  Relationships.panY = 0
  ensureCharacterPositions()
  renderRelationshipMap()
  renderMapSelector()
  updateSidebarForRelationships(AppState.currentProject)
}

function openNewMapModal() {
  Relationships.editingMapId = null
  document.getElementById('rel-map-editor-title').textContent = 'New Relationship Map'
  document.getElementById('rel-map-name-input').value = ''
  Relationships.selectedCharsForMap = new Set()
  renderCharSelector()
  showModal('modal-rel-map-editor')
}

function openEditMapModal() {
  const map = getCurrentMap()
  if (!map) return
  
  Relationships.editingMapId = map.id
  document.getElementById('rel-map-editor-title').textContent = 'Edit Map: ' + map.name
  document.getElementById('rel-map-name-input').value = map.name
  Relationships.selectedCharsForMap = new Set(map.characterIds || [])
  renderCharSelector()
  showModal('modal-rel-map-editor')
}

function renderCharSelector() {
  const container = document.getElementById('rel-map-char-selector')
  const chars = AppState.currentProject?.characters || []
  
  if (chars.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--text-muted); font-size: 12px;">No characters yet. Create characters first!</p>'
    return
  }
  
  container.innerHTML = chars.map(char => {
    const isSelected = Relationships.selectedCharsForMap.has(char.id)
    const initials = getInitials(char.name)
    const color = char.color || '#7c6af7'
    
    return `
      <div class="char-selector-item ${isSelected ? 'selected' : ''}" data-char-id="${char.id}">
        <div class="char-selector-check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="char-selector-portrait" style="background: ${color}">
          ${char.avatar ? `<img src="${char.avatar}" alt="" />` : escapeHtml(initials)}
        </div>
        <div class="char-selector-name">${escapeHtml(char.name)}</div>
      </div>
    `
  }).join('')
  
  container.querySelectorAll('.char-selector-item').forEach(item => {
    item.addEventListener('click', () => {
      const charId = item.dataset.charId
      if (Relationships.selectedCharsForMap.has(charId)) {
        Relationships.selectedCharsForMap.delete(charId)
        item.classList.remove('selected')
      } else {
        Relationships.selectedCharsForMap.add(charId)
        item.classList.add('selected')
      }
    })
  })
}

async function saveMapEditor() {
  const name = document.getElementById('rel-map-name-input').value.trim()
  if (!name) {
    showToast('Please enter a map name', 'error')
    return
  }
  
  if (Relationships.selectedCharsForMap.size === 0) {
    showToast('Please select at least one character', 'error')
    return
  }
  
  const charIds = Array.from(Relationships.selectedCharsForMap)
  
  if (!AppState.currentProject.relationshipMaps) {
    AppState.currentProject.relationshipMaps = []
  }
  
  if (Relationships.editingMapId) {
    const map = AppState.currentProject.relationshipMaps.find(m => m.id === Relationships.editingMapId)
    if (map) {
      map.name = name
      map.characterIds = charIds
    }
    showToast('Map updated', 'success')
  } else {
    const newMap = {
      id: generateId(),
      name: name,
      characterIds: charIds,
      connections: [],
      nodePositions: {},
      createdAt: new Date().toISOString(),
    }
    AppState.currentProject.relationshipMaps.push(newMap)
    Relationships.currentMapId = newMap.id
    showToast('Map created', 'success')
  }
  
  await saveCurrentProject()
  hideModal('modal-rel-map-editor')
  ensureCharacterPositions()
  renderMapSelector()
  renderRelationshipMap()
  updateSidebarForRelationships(AppState.currentProject)
  
  Relationships.editingMapId = null
}

function openDeleteMapModal() {
  const maps = AppState.currentProject?.relationshipMaps || []
  if (maps.length <= 1) {
    showToast("Can't delete the last map — create another one first", 'error')
    return
  }
  Relationships.mapToDelete = Relationships.currentMapId
  showModal('modal-delete-rel-map')
}

async function confirmDeleteMap() {
  if (!Relationships.mapToDelete) return
  
  AppState.currentProject.relationshipMaps = AppState.currentProject.relationshipMaps.filter(
    m => m.id !== Relationships.mapToDelete
  )
  
  if (AppState.currentProject.relationshipMaps.length > 0) {
    Relationships.currentMapId = AppState.currentProject.relationshipMaps[0].id
  }
  
  await saveCurrentProject()
  hideModal('modal-delete-rel-map')
  showToast('Map deleted', 'info')
  
  ensureCharacterPositions()
  renderMapSelector()
  renderRelationshipMap()
  updateSidebarForRelationships(AppState.currentProject)
  Relationships.mapToDelete = null
}

// ============================================
// VIEW
// ============================================

function showRelationshipsView() {
  if (!AppState.currentProject) return
  
  const chars = AppState.currentProject.characters || []
  const empty = document.getElementById('relationships-empty')
  const active = document.getElementById('relationships-active')
  
  if (chars.length === 0) {
    empty.classList.remove('hidden')
    active.classList.add('hidden')
    active.style.display = 'none'
    return
  }
  
  empty.classList.add('hidden')
  active.classList.remove('hidden')
  active.style.display = 'flex'
  
  ensureDefaultMap()
  ensureCharacterPositions()
  renderMapSelector()
  renderRelationshipMap()
  updateSidebarForRelationships(AppState.currentProject)
}

function ensureCharacterPositions() {
  const map = getCurrentMap()
  if (!map) return
  
  if (!map.nodePositions) map.nodePositions = {}
  if (!map.connections) map.connections = []
  
  const chars = AppState.currentProject.characters || []
  const charsInMap = chars.filter(c => (map.characterIds || []).includes(c.id))
  
  const centerX = 2000
  const centerY = 2000
  const radius = Math.max(200, charsInMap.length * 50)
  
  let missingCount = 0
  charsInMap.forEach(char => {
    if (!map.nodePositions[char.id]) missingCount++
  })
  
  let index = 0
  charsInMap.forEach((char) => {
    if (!map.nodePositions[char.id]) {
      const angle = (index / Math.max(missingCount, 1)) * Math.PI * 2
      map.nodePositions[char.id] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      }
      index++
    }
  })
  
  if (Relationships.panX === 0 && Relationships.panY === 0) {
    const rect = document.getElementById('rel-canvas-container').getBoundingClientRect()
    Relationships.panX = -centerX + rect.width / 2
    Relationships.panY = -centerY + rect.height / 2
    applyRelTransform()
  }
}

// ============================================
// RENDER
// ============================================

function renderRelationshipMap() {
  const map = getCurrentMap()
  if (!map) return
  
  const canvas = document.getElementById('rel-canvas')
  const svg = document.getElementById('rel-connections-svg')
  
  canvas.querySelectorAll('.rel-node').forEach(n => n.remove())
  svg.innerHTML = ''
  
  const chars = AppState.currentProject.characters || []
  const charsInMap = chars.filter(c => (map.characterIds || []).includes(c.id))
  const validCharIds = new Set(charsInMap.map(c => c.id))
  
  charsInMap.forEach(char => {
    const pos = map.nodePositions[char.id]
    if (!pos) return
    const node = createNodeElement(char, pos)
    canvas.appendChild(node)
  })
  
  const connections = map.connections || []
  connections.forEach(conn => {
    if (!validCharIds.has(conn.fromId) || !validCharIds.has(conn.toId)) return
    const g = createConnectionElement(conn, map)
    if (g) svg.appendChild(g)
  })
  
  const validConnections = connections.filter(c => 
    validCharIds.has(c.fromId) && validCharIds.has(c.toId)
  )
  document.getElementById('rel-node-count').textContent = 
    `${charsInMap.length} character${charsInMap.length !== 1 ? 's' : ''}, ${validConnections.length} connection${validConnections.length !== 1 ? 's' : ''}`
}

function createNodeElement(char, pos) {
  const el = document.createElement('div')
  el.className = 'rel-node'
  el.dataset.characterId = char.id
  el.style.left = `${pos.x - 37}px`
  el.style.top = `${pos.y - 47}px`
  
  const color = char.color || '#7c6af7'
  const initials = getInitials(char.name)
  
  el.innerHTML = `
    <div class="rel-node-avatar" style="background: ${color}">
      ${char.avatar ? `<img src="${char.avatar}" alt="" />` : escapeHtml(initials)}
    </div>
    <div class="rel-node-name">${escapeHtml(char.name || 'Unnamed')}</div>
    <button class="rel-node-connect-btn" title="Connect to another character">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>
  `
  
  el.addEventListener('mousedown', (e) => handleNodeMouseDown(e, char))
  el.querySelector('.rel-node-connect-btn').addEventListener('click', (e) => {
    e.stopPropagation()
    startConnecting(char.id)
  })
  
  return el
}

function createConnectionElement(conn, map) {
  const positions = map.nodePositions || {}
  const from = positions[conn.fromId]
  const to = positions[conn.toId]
  
  if (!from || !to) return null
  
  const svgNS = 'http://www.w3.org/2000/svg'
  const g = document.createElementNS(svgNS, 'g')
  g.dataset.connectionId = conn.id
  
  const color = conn.customColor || getRelationshipColor(conn.type)
  
  // Intensity: 1-10 → visible stroke widths (1px to 12px)
  const intensity = Math.max(1, Math.min(10, conn.intensity || 5))
  const strokeWidth = 1 + (intensity - 1) * 1.2
  
  // Arrow size — noticeably bigger than line but proportional
  const arrowSize = Math.max(10, strokeWidth * 1.8)
  
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const nodeRadius = 55
  
  let x1 = from.x, y1 = from.y, x2 = to.x, y2 = to.y
  
  const direction = conn.direction || 'none'
  if (dist > 0) {
    // TO end
    if (direction === 'from-to' || direction === 'both') {
      // Leave room for arrow: line ends BEFORE the node, arrow fills the gap
      const ratio = (dist - nodeRadius - arrowSize) / dist
      x2 = from.x + dx * ratio
      y2 = from.y + dy * ratio
    } else {
      // No arrow, just stop at node edge
      const ratio = (dist - nodeRadius) / dist
      x2 = from.x + dx * ratio
      y2 = from.y + dy * ratio
    }
    
    // FROM end
    if (direction === 'to-from' || direction === 'both') {
      const ratio = (nodeRadius + arrowSize) / dist
      x1 = from.x + dx * ratio
      y1 = from.y + dy * ratio
    } else {
      const ratio = nodeRadius / dist
      x1 = from.x + dx * ratio
      y1 = from.y + dy * ratio
    }
  }
  
  // Invisible wide hit area for clicking
  const hitArea = document.createElementNS(svgNS, 'line')
  hitArea.setAttribute('x1', from.x)
  hitArea.setAttribute('y1', from.y)
  hitArea.setAttribute('x2', to.x)
  hitArea.setAttribute('y2', to.y)
  hitArea.setAttribute('stroke', 'transparent')
  hitArea.setAttribute('stroke-width', Math.max(20, strokeWidth + 15))
  hitArea.setAttribute('fill', 'none')
  hitArea.style.cursor = 'pointer'
  hitArea.style.pointerEvents = 'stroke'
  g.appendChild(hitArea)
  
  // The visible line
  const line = document.createElementNS(svgNS, 'line')
  line.setAttribute('x1', x1)
  line.setAttribute('y1', y1)
  line.setAttribute('x2', x2)
  line.setAttribute('y2', y2)
  line.setAttribute('stroke', color)
  line.setAttribute('stroke-width', strokeWidth)
  line.setAttribute('stroke-linecap', 'round')
  line.setAttribute('fill', 'none')
  line.style.pointerEvents = 'none'
  g.appendChild(line)
  
  // Draw arrows as separate polygons (drawn AFTER line, so they're visible on top)
  if (dist > 0) {
    const angle = Math.atan2(dy, dx)
    const arrowHalf = arrowSize / 2
    
    function makeArrow(tipX, tipY, dirAngle) {
      // Triangle pointing in dirAngle direction, tip at (tipX, tipY)
      const backCenterX = tipX - Math.cos(dirAngle) * arrowSize
      const backCenterY = tipY - Math.sin(dirAngle) * arrowSize
      const perpX = Math.cos(dirAngle + Math.PI / 2) * arrowHalf
      const perpY = Math.sin(dirAngle + Math.PI / 2) * arrowHalf
      
      const back1X = backCenterX + perpX
      const back1Y = backCenterY + perpY
      const back2X = backCenterX - perpX
      const back2Y = backCenterY - perpY
      
      const arrow = document.createElementNS(svgNS, 'polygon')
      arrow.setAttribute('points', `${tipX},${tipY} ${back1X},${back1Y} ${back2X},${back2Y}`)
      arrow.setAttribute('fill', color)
      arrow.style.pointerEvents = 'none'
      return arrow
    }
    
    // Arrow pointing INTO the "to" node (tip at node edge)
    if (direction === 'from-to' || direction === 'both') {
      const tipRatio = (dist - nodeRadius) / dist
      const tipX = from.x + dx * tipRatio
      const tipY = from.y + dy * tipRatio
      g.appendChild(makeArrow(tipX, tipY, angle))
    }
    
    // Arrow pointing INTO the "from" node (tip at from-node edge, pointing backwards)
    if (direction === 'to-from' || direction === 'both') {
      const tipRatio = nodeRadius / dist
      const tipX = from.x + dx * tipRatio
      const tipY = from.y + dy * tipRatio
      g.appendChild(makeArrow(tipX, tipY, angle + Math.PI))
    }
  }
  
  // Click handling
  hitArea.addEventListener('click', (e) => {
    e.stopPropagation()
    openEditConnection(conn)
  })
  hitArea.addEventListener('mouseenter', () => {
    line.setAttribute('stroke-width', strokeWidth + 3)
  })
  hitArea.addEventListener('mouseleave', () => {
    line.setAttribute('stroke-width', strokeWidth)
  })
  
  // Label
  const label = conn.label || getRelationshipLabel(conn.type)
  if (label) {
    const midX = (from.x + to.x) / 2
    const midY = (from.y + to.y) / 2
    const textWidth = label.length * 6.5 + 16
    
    const rect = document.createElementNS(svgNS, 'rect')
    rect.setAttribute('x', midX - textWidth / 2)
    rect.setAttribute('y', midY - 10)
    rect.setAttribute('width', textWidth)
    rect.setAttribute('height', 20)
    rect.setAttribute('rx', 10)
    rect.setAttribute('ry', 10)
    rect.setAttribute('class', 'rel-connection-label-bg')
    rect.style.cursor = 'pointer'
    rect.addEventListener('click', (e) => {
      e.stopPropagation()
      openEditConnection(conn)
    })
    g.appendChild(rect)
    
    const text = document.createElementNS(svgNS, 'text')
    text.setAttribute('x', midX)
    text.setAttribute('y', midY + 4)
    text.setAttribute('class', 'rel-connection-label')
    text.style.cursor = 'pointer'
    text.textContent = label
    text.addEventListener('click', (e) => {
      e.stopPropagation()
      openEditConnection(conn)
    })
    g.appendChild(text)
  }
  
  return g
}

// ============================================
// NODE INTERACTIONS
// ============================================

function handleNodeMouseDown(e, char) {
  if (e.target.closest('.rel-node-connect-btn')) return
  
  e.stopPropagation()
  e.preventDefault()
  
  if (Relationships.isConnecting && Relationships.connectingSourceId) {
    if (Relationships.connectingSourceId !== char.id) {
      completeConnection(char.id)
    } else {
      cancelConnecting()
    }
    return
  }
  
  const map = getCurrentMap()
  const positions = map?.nodePositions || {}
  const pos = positions[char.id]
  if (!pos) return
  
  Relationships.isDraggingNode = true
  
  const el = document.querySelector(`.rel-node[data-character-id="${char.id}"]`)
  if (el) el.classList.add('dragging')
  
  Relationships.nodeDragStart = {
    x: e.clientX,
    y: e.clientY,
    nodeX: pos.x,
    nodeY: pos.y,
    charId: char.id,
    el: el
  }
}

function startConnecting(charId) {
  if (Relationships.isConnecting && Relationships.connectingSourceId !== charId) {
    document.querySelectorAll('.rel-node.connecting-source').forEach(n => {
      n.classList.remove('connecting-source')
    })
  }
  
  Relationships.isConnecting = true
  Relationships.connectingSourceId = charId
  
  const container = document.getElementById('rel-canvas-container')
  container.classList.add('connecting')
  
  const sourceEl = document.querySelector(`.rel-node[data-character-id="${charId}"]`)
  if (sourceEl) sourceEl.classList.add('connecting-source')
  
  showToast('Click another character to connect', 'info', 3000)
}

function cancelConnecting() {
  Relationships.isConnecting = false
  Relationships.connectingSourceId = null
  
  const container = document.getElementById('rel-canvas-container')
  container.classList.remove('connecting')
  
  document.querySelectorAll('.rel-node.connecting-source').forEach(n => n.classList.remove('connecting-source'))
  document.querySelectorAll('.rel-node.hover-target').forEach(n => n.classList.remove('hover-target'))
}

function completeConnection(targetId) {
  if (!Relationships.connectingSourceId || Relationships.connectingSourceId === targetId) {
    cancelConnecting()
    return
  }
  
  const sourceId = Relationships.connectingSourceId
  const map = getCurrentMap()
  if (!map) { cancelConnecting(); return }
  
  const connections = map.connections || []
  const existing = connections.find(c => 
    (c.fromId === sourceId && c.toId === targetId) ||
    (c.fromId === targetId && c.toId === sourceId)
  )
  
  if (existing) {
    cancelConnecting()
    openEditConnection(existing)
    return
  }
  
  Relationships.pendingConnection = {
    fromId: sourceId,
    toId: targetId
  }
  
  cancelConnecting()
  openConnectionModal(null, sourceId, targetId)
}

// ============================================
// CONNECTION MODAL
// ============================================

function openConnectionModal(existingConnection, fromId, toId) {
  if (!AppState.currentProject) return
  
  const chars = AppState.currentProject.characters || []
  const fromChar = chars.find(c => c.id === fromId)
  const toChar = chars.find(c => c.id === toId)
  
  if (!fromChar || !toChar) return
  
  document.getElementById('connection-from-name').textContent = fromChar.name
  document.getElementById('connection-to-name').textContent = toChar.name
  
  const titleEl = document.getElementById('connection-modal-title')
  const deleteBtn = document.getElementById('btn-delete-connection')
  
  if (existingConnection) {
    titleEl.textContent = 'Edit Connection'
    Relationships.editingConnection = existingConnection.id
    Relationships.selectedType = existingConnection.type
    document.getElementById('connection-label').value = existingConnection.label || ''
    document.getElementById('rel-intensity-slider').value = existingConnection.intensity || 5
    document.getElementById('rel-intensity-display').textContent = existingConnection.intensity || 5
    document.getElementById('rel-description').value = existingConnection.description || ''
    
    const customColor = existingConnection.customColor || '#7c6af7'
    document.getElementById('rel-custom-color-picker').value = customColor
    document.getElementById('rel-custom-color-hex').value = customColor.toUpperCase()
    document.getElementById('rel-color-section').style.display = 
      existingConnection.type === 'other' ? 'block' : 'none'
    
    const direction = existingConnection.direction || 'none'
    document.querySelectorAll('.rel-direction-option').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.direction === direction)
    })
    
    deleteBtn.style.display = ''
  } else {
    titleEl.textContent = 'Create Connection'
    Relationships.editingConnection = null
    Relationships.selectedType = 'friend'
    document.getElementById('connection-label').value = ''
    document.getElementById('rel-intensity-slider').value = 5
    document.getElementById('rel-intensity-display').textContent = 5
    document.getElementById('rel-description').value = ''
    document.getElementById('rel-custom-color-picker').value = '#7c6af7'
    document.getElementById('rel-custom-color-hex').value = '#7C6AF7'
    document.getElementById('rel-color-section').style.display = 'none'
    
    document.querySelectorAll('.rel-direction-option').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.direction === 'none')
    })
    
    deleteBtn.style.display = 'none'
  }
  
  document.querySelectorAll('.rel-type-option').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.type === Relationships.selectedType)
  })
  
  updateDirectionLabels(fromChar.name, toChar.name)
  
  showModal('modal-connection')
}

function updateDirectionLabels(fromName, toName) {
  const fromToBtn = document.querySelector('.rel-direction-option[data-direction="from-to"] .rel-direction-label')
  const toFromBtn = document.querySelector('.rel-direction-option[data-direction="to-from"] .rel-direction-label')
  
  if (fromToBtn) fromToBtn.innerHTML = `${escapeHtml(fromName)} <span style="opacity:0.5;">→</span> ${escapeHtml(toName)}`
  if (toFromBtn) toFromBtn.innerHTML = `${escapeHtml(toName)} <span style="opacity:0.5;">→</span> ${escapeHtml(fromName)}`
}

function openEditConnection(conn) {
  openConnectionModal(conn, conn.fromId, conn.toId)
}

async function saveConnection() {
  if (!AppState.currentProject) return
  
  if (!Relationships.selectedType) {
    showToast('Please pick a relationship type', 'error')
    return
  }
  
  const map = getCurrentMap()
  if (!map) return
  if (!map.connections) map.connections = []
  
  const label = document.getElementById('connection-label').value.trim()
  const intensity = parseInt(document.getElementById('rel-intensity-slider').value) || 5
  const description = document.getElementById('rel-description').value.trim()
  const customColor = document.getElementById('rel-custom-color-hex').value
  
  const selectedDirBtn = document.querySelector('.rel-direction-option.selected')
  const direction = selectedDirBtn?.dataset.direction || 'none'
  
  if (Relationships.editingConnection) {
    const conn = map.connections.find(c => c.id === Relationships.editingConnection)
    if (conn) {
      conn.type = Relationships.selectedType
      conn.label = label
      conn.intensity = intensity
      conn.description = description
      conn.direction = direction
      if (Relationships.selectedType === 'other' && /^#[0-9A-Fa-f]{6}$/.test(customColor)) {
        conn.customColor = customColor
      } else {
        delete conn.customColor
      }
    }
  } else if (Relationships.pendingConnection) {
    const newConn = {
      id: generateId(),
      fromId: Relationships.pendingConnection.fromId,
      toId: Relationships.pendingConnection.toId,
      type: Relationships.selectedType,
      label: label,
      intensity: intensity,
      description: description,
      direction: direction,
      createdAt: new Date().toISOString()
    }
    if (Relationships.selectedType === 'other' && /^#[0-9A-Fa-f]{6}$/.test(customColor)) {
      newConn.customColor = customColor
    }
    map.connections.push(newConn)
  }
  
  await saveCurrentProject()
  hideModal('modal-connection')
  renderRelationshipMap()
  showToast(Relationships.editingConnection ? 'Connection updated' : 'Connection created', 'success')
  
  if (typeof Characters !== 'undefined' && Characters.activeTab === 'relations' && Characters.currentCharacter) {
    renderRelationsTab()
  }
  
  Relationships.editingConnection = null
  Relationships.pendingConnection = null
  Relationships.selectedType = null
}

async function deleteConnection() {
  if (!Relationships.editingConnection) return
  
  const map = getCurrentMap()
  if (!map) return
  
  map.connections = (map.connections || []).filter(c => c.id !== Relationships.editingConnection)
  
  await saveCurrentProject()
  hideModal('modal-connection')
  renderRelationshipMap()
  showToast('Connection deleted', 'info')
  
  if (typeof Characters !== 'undefined' && Characters.activeTab === 'relations' && Characters.currentCharacter) {
    renderRelationsTab()
  }
  
  Relationships.editingConnection = null
}

// ============================================
// PAN & ZOOM
// ============================================

function handleRelCanvasMouseDown(e) {
  if (e.target.closest('.rel-node')) return
  if (e.target.tagName === 'line') return
  if (e.target.tagName === 'text') return
  if (e.target.tagName === 'polygon') return
  if (e.target.tagName === 'rect' && e.target.getAttribute('class') === 'rel-connection-label-bg') return
  if (e.target.closest('.rel-connecting-banner')) return
  if (e.target.closest('.relationships-toolbar')) return
  
  if (Relationships.isConnecting) {
    cancelConnecting()
    return
  }
  
  const container = document.getElementById('rel-canvas-container')
  Relationships.isPanning = true
  container.classList.add('panning')
  Relationships.panStart = {
    x: e.clientX - Relationships.panX,
    y: e.clientY - Relationships.panY
  }
}

function handleRelCanvasMouseMove(e) {
  if (Relationships.isDraggingNode && Relationships.nodeDragStart.charId) {
    const dx = (e.clientX - Relationships.nodeDragStart.x) / Relationships.zoom
    const dy = (e.clientY - Relationships.nodeDragStart.y) / Relationships.zoom
    
    const newX = Relationships.nodeDragStart.nodeX + dx
    const newY = Relationships.nodeDragStart.nodeY + dy
    
    const map = getCurrentMap()
    if (map) {
      map.nodePositions[Relationships.nodeDragStart.charId] = { x: newX, y: newY }
    }
    
    const el = Relationships.nodeDragStart.el
    if (el) {
      el.style.left = `${newX - 37}px`
      el.style.top = `${newY - 47}px`
    }
    
    renderRelationshipMap()
    return
  }
  
  if (Relationships.isConnecting) {
    document.querySelectorAll('.rel-node.hover-target').forEach(n => n.classList.remove('hover-target'))
    const hoveredNode = e.target.closest('.rel-node')
    if (hoveredNode && hoveredNode.dataset.characterId !== Relationships.connectingSourceId) {
      hoveredNode.classList.add('hover-target')
    }
    return
  }
  
  if (Relationships.isPanning) {
    Relationships.panX = e.clientX - Relationships.panStart.x
    Relationships.panY = e.clientY - Relationships.panStart.y
    applyRelTransform()
  }
}

function handleRelCanvasMouseUp() {
  const container = document.getElementById('rel-canvas-container')
  if (container) container.classList.remove('panning')
  
  if (Relationships.isDraggingNode) {
    if (Relationships.nodeDragStart.el) {
      Relationships.nodeDragStart.el.classList.remove('dragging')
    }
    scheduleRelSave()
  }
  
  Relationships.isPanning = false
  Relationships.isDraggingNode = false
  Relationships.nodeDragStart = { x: 0, y: 0, nodeX: 0, nodeY: 0 }
}

function handleRelCanvasWheel(e) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setRelZoom(Relationships.zoom + delta)
  }
}

function setRelZoom(newZoom) {
  Relationships.zoom = Math.min(3, Math.max(0.3, newZoom))
  applyRelTransform()
  updateRelZoomDisplay()
}

function updateRelZoomDisplay() {
  const el = document.getElementById('rel-zoom-display')
  if (el) el.textContent = `${Math.round(Relationships.zoom * 100)}%`
}

function applyRelTransform() {
  const canvas = document.getElementById('rel-canvas')
  if (canvas) {
    canvas.style.transform = `translate(${Relationships.panX}px, ${Relationships.panY}px) scale(${Relationships.zoom})`
  }
  updateRelZoomDisplay()
}

function resetRelView() {
  Relationships.zoom = 1
  const rect = document.getElementById('rel-canvas-container').getBoundingClientRect()
  Relationships.panX = -2000 + rect.width / 2
  Relationships.panY = -2000 + rect.height / 2
  applyRelTransform()
}

async function autoLayoutNodes() {
  const map = getCurrentMap()
  if (!map) return
  
  const chars = AppState.currentProject.characters || []
  const charsInMap = chars.filter(c => (map.characterIds || []).includes(c.id))
  if (charsInMap.length === 0) return
  
  const centerX = 2000
  const centerY = 2000
  const radius = Math.max(200, charsInMap.length * 50)
  
  if (!map.nodePositions) map.nodePositions = {}
  
  charsInMap.forEach((char, i) => {
    const angle = (i / charsInMap.length) * Math.PI * 2 - Math.PI / 2
    map.nodePositions[char.id] = {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    }
  })
  
  await saveCurrentProject()
  renderRelationshipMap()
  resetRelView()
  showToast('Characters auto-arranged', 'success')
}

function scheduleRelSave() {
  clearTimeout(Relationships.saveTimer)
  Relationships.saveTimer = setTimeout(async () => {
    await saveCurrentProject()
  }, 500)
}

// ============================================
// SIDEBAR
// ============================================

function updateSidebarForRelationships(project) {
  const content = document.getElementById('sidebar-content')
  const maps = project.relationshipMaps || []
  
  content.innerHTML = `
    <div class="sidebar-section">
      <div class="sidebar-section-header">
        <span>Maps</span>
        <button class="sidebar-add-btn" id="btn-sidebar-new-map" data-tooltip="New map">+</button>
      </div>
      <div>
        ${maps.length === 0 
          ? '<p class="sidebar-empty">No maps yet.<br>Click + to create one.</p>'
          : maps.map(m => {
              const isActive = m.id === Relationships.currentMapId
              const charCount = (m.characterIds || []).length
              const connCount = (m.connections || []).length
              return `
                <div class="moodboard-sidebar-item ${isActive ? 'active' : ''}" data-map-id="${m.id}">
                  <div class="moodboard-sidebar-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="18" cy="5" r="3"></circle>
                      <circle cx="6" cy="12" r="3"></circle>
                      <circle cx="18" cy="19" r="3"></circle>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                  </div>
                  <div class="moodboard-sidebar-info">
                    <span class="moodboard-sidebar-name">${escapeHtml(m.name)}</span>
                    <span class="moodboard-sidebar-count">${charCount} chars · ${connCount} links</span>
                  </div>
                </div>
              `
            }).join('')
        }
      </div>
    </div>
    
    <div class="sidebar-section">
      <div class="sidebar-section-header">
        <span>Legend</span>
      </div>
      <div class="rel-legend">
        <div class="rel-legend-item"><div class="rel-legend-swatch" style="background:#ee6a99"></div>Love / Romance</div>
        <div class="rel-legend-item"><div class="rel-legend-swatch" style="background:#50c878"></div>Friend / Ally</div>
        <div class="rel-legend-item"><div class="rel-legend-swatch" style="background:#e05555"></div>Family</div>
        <div class="rel-legend-item"><div class="rel-legend-swatch" style="background:#4a4a5a"></div>Enemy</div>
        <div class="rel-legend-item"><div class="rel-legend-swatch" style="background:#f0a030"></div>Mentor</div>
        <div class="rel-legend-item"><div class="rel-legend-swatch" style="background:#ba68c8"></div>Rival</div>
        <div class="rel-legend-item"><div class="rel-legend-swatch" style="background:#7c6af7"></div>Other / Custom</div>
      </div>
    </div>
  `
  
  document.getElementById('btn-sidebar-new-map')?.addEventListener('click', openNewMapModal)
  
  document.querySelectorAll('.moodboard-sidebar-item[data-map-id]').forEach(item => {
    item.addEventListener('click', () => switchMap(item.dataset.mapId))
  })
}

// ============================================
// RELATIONS TAB
// ============================================

function renderRelationsTab() {
  const container = document.getElementById('relations-tab-content')
  if (!Characters.currentCharacter) return
  
  const currentChar = Characters.currentCharacter
  const allChars = AppState.currentProject.characters || []
  
  const maps = AppState.currentProject.relationshipMaps || []
  const relationshipsToOtherChars = []
  
  maps.forEach(map => {
    (map.connections || []).forEach(conn => {
      if (conn.fromId === currentChar.id || conn.toId === currentChar.id) {
        const otherId = conn.fromId === currentChar.id ? conn.toId : conn.fromId
        const other = allChars.find(c => c.id === otherId)
        if (other) {
          relationshipsToOtherChars.push({
            connection: conn,
            otherChar: other,
            mapName: map.name
          })
        }
      }
    })
  })
  
  let html = `
    <div class="relations-tab-header">
      <div>
        <h2>Relations</h2>
        <p>All relationships this character has across maps</p>
      </div>
    </div>
  `
  
  if (relationshipsToOtherChars.length === 0) {
    html += `
      <div class="relations-empty">
        <div class="relations-empty-icon">🔗</div>
        <h3>No relationships yet</h3>
        <p>Go to the Relationships tab in the sidebar to create connections between characters.</p>
        <button class="btn-primary" onclick="switchSidebarNav('relationships')">Open Relationship Map</button>
      </div>
    `
  } else {
    html += `<div class="relations-cards-grid">`
    relationshipsToOtherChars.forEach(({connection, otherChar}) => {
      html += createRelationCard(connection, otherChar, currentChar)
    })
    html += `</div>`
  }
  
  container.innerHTML = html
  
  container.querySelectorAll('[data-action="edit-rel"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const connId = btn.dataset.connId
      const conn = findConnectionAcrossMaps(connId)
      if (conn) openEditConnection(conn)
    })
  })
  container.querySelectorAll('[data-action="delete-rel"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      if (confirm('Delete this relationship?')) {
        deleteConnectionAcrossMaps(btn.dataset.connId)
      }
    })
  })
  container.querySelectorAll('[data-action="view-char"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const charId = btn.dataset.charId
      const char = AppState.currentProject.characters.find(c => c.id === charId)
      if (char) showCharacterDetail(char)
    })
  })
  container.querySelectorAll('[data-view-char-id]').forEach(card => {
    card.style.cursor = 'pointer'
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return
      const charId = card.dataset.viewCharId
      const char = AppState.currentProject.characters.find(c => c.id === charId)
      if (char) showCharacterDetail(char)
    })
  })
}

function createRelationCard(conn, otherChar, currentChar) {
  const color = conn.customColor || getRelationshipColor(conn.type)
  const typeLabel = getRelationshipLabel(conn.type) || 'Related'
  const intensity = conn.intensity || 5
  const initials = getInitials(otherChar.name)
  const charColor = otherChar.color || '#7c6af7'
  
  return `
    <div class="relation-card" style="border-left-color: ${color}" data-view-char-id="${otherChar.id}">
      <div class="relation-card-header">
        <div class="relation-card-portrait" style="background: ${charColor}">
          ${otherChar.avatar ? `<img src="${otherChar.avatar}" alt="" />` : escapeHtml(initials)}
        </div>
        <div class="relation-card-info">
          <div class="relation-card-name">${escapeHtml(otherChar.name)}</div>
          <div class="relation-card-role">${escapeHtml(getCharacterRoleLabel(otherChar.role))}</div>
        </div>
        <div class="relation-card-type-badge" style="background: ${color}">
          ${escapeHtml(conn.label || typeLabel)}
        </div>
      </div>
      
      <div class="relation-card-intensity">
        <span class="relation-card-intensity-label">Intensity:</span>
        <div class="relation-card-intensity-bar">
          <div class="relation-card-intensity-fill" style="width: ${intensity * 10}%; background: ${color}"></div>
        </div>
        <span class="relation-card-intensity-value">${intensity}/10</span>
      </div>
      
      <div class="relation-card-description ${!conn.description ? 'empty' : ''}">
        ${escapeHtml(conn.description || 'No description added yet')}
      </div>
      
      <div class="relation-card-actions">
        <button class="relation-card-btn" data-action="view-char" data-char-id="${otherChar.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          View
        </button>
        <button class="relation-card-btn" data-action="edit-rel" data-conn-id="${conn.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          Edit
        </button>
        <button class="relation-card-btn danger" data-action="delete-rel" data-conn-id="${conn.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
          </svg>
        </button>
      </div>
    </div>
  `
}

function findConnectionAcrossMaps(connId) {
  const maps = AppState.currentProject?.relationshipMaps || []
  for (const map of maps) {
    const conn = (map.connections || []).find(c => c.id === connId)
    if (conn) return conn
  }
  return null
}

async function deleteConnectionAcrossMaps(connId) {
  const maps = AppState.currentProject?.relationshipMaps || []
  maps.forEach(map => {
    if (map.connections) {
      map.connections = map.connections.filter(c => c.id !== connId)
    }
  })
  
  await saveCurrentProject()
  renderRelationsTab()
  showToast('Relationship deleted', 'info')
}

// ============================================
// UTILITY
// ============================================

function getRelationshipLabel(type) {
  const map = {
    'love': 'Love', 'friend': 'Friends', 'family': 'Family',
    'enemy': 'Enemies', 'mentor': 'Mentor', 'rival': 'Rivals',
    'other': ''
  }
  return map[type] || ''
}

function getRelationshipColor(type) {
  const map = {
    'love': '#ee6a99', 'friend': '#50c878', 'family': '#e05555',
    'enemy': '#4a4a5a', 'mentor': '#f0a030', 'rival': '#ba68c8',
    'other': '#7c6af7'
  }
  return map[type] || '#7c6af7'
}