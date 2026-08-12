// characters.js
// OVERHAULED — Portrait cards, tabbed profile, custom fields, sections, templates

const Characters = {
    currentCharacter: null,
    saveTimer: null,
    filterQuery: '',
    filterRole: '',
    activeTab: 'profile',
    mentionDropdown: null,
    mentionSelectedIndex: 0,
    mentionQuery: '',
    mentionRange: null,
    characterToDelete: null,
    editingFieldId: null,
    addingFieldToSectionId: null,
}

// ============================================
// FIELD TEMPLATES
// ============================================

const FIELD_TEMPLATES = {
    'fantasy-hero': {
        name: 'Fantasy Hero',
        icon: '⚔️',
        description: 'A hero for high fantasy stories',
        sections: [
            {
                name: 'Core Identity',
                fields: [
                    { label: 'Age', type: 'text', value: '' },
                    { label: 'Race / Species', type: 'text', value: '' },
                    { label: 'Class / Profession', type: 'text', value: '' },
                    { label: 'Title', type: 'text', value: '' },
                    { label: 'Origin', type: 'text', value: '' },
                ]
            },
            {
                name: 'Appearance',
                fields: [
                    { label: 'Height', type: 'text', value: '' },
                    { label: 'Build', type: 'text', value: '' },
                    { label: 'Hair', type: 'text', value: '' },
                    { label: 'Eyes', type: 'text', value: '' },
                    { label: 'Distinguishing Features', type: 'textarea', value: '' },
                ]
            },
            {
                name: 'Personality',
                fields: [
                    { label: 'Strengths', type: 'textarea', value: '' },
                    { label: 'Weaknesses', type: 'textarea', value: '' },
                    { label: 'Fears', type: 'textarea', value: '' },
                    { label: 'Motivations', type: 'textarea', value: '' },
                ]
            },
            {
                name: 'Skills & Abilities',
                fields: [
                    { label: 'Combat Style', type: 'text', value: '' },
                    { label: 'Magic / Powers', type: 'textarea', value: '' },
                    { label: 'Weapons', type: 'text', value: '' },
                    { label: 'Special Skills', type: 'textarea', value: '' },
                ]
            },
            {
                name: 'Story Arc',
                fields: [
                    { label: 'Backstory', type: 'textarea', value: '' },
                    { label: 'Goal', type: 'textarea', value: '' },
                    { label: 'Character Arc', type: 'textarea', value: '' },
                ]
            }
        ]
    },

    'villain': {
        name: 'Villain / Antagonist',
        icon: '🗡️',
        description: 'A memorable antagonist',
        sections: [
            {
                name: 'Core Identity',
                fields: [
                    { label: 'Age', type: 'text', value: '' },
                    { label: 'True Name', type: 'text', value: '' },
                    { label: 'Alias', type: 'text', value: '' },
                    { label: 'Title', type: 'text', value: '' },
                    { label: 'Faction / Organization', type: 'text', value: '' },
                ]
            },
            {
                name: 'Motivation',
                fields: [
                    { label: 'Ultimate Goal', type: 'textarea', value: '' },
                    { label: 'What They Want', type: 'textarea', value: '' },
                    { label: 'What They Believe', type: 'textarea', value: '' },
                    { label: 'Justification', type: 'textarea', value: '' },
                ]
            },
            {
                name: 'Origin',
                fields: [
                    { label: 'Backstory', type: 'textarea', value: '' },
                    { label: 'Trauma / Turning Point', type: 'textarea', value: '' },
                    { label: 'Resources & Power', type: 'textarea', value: '' },
                ]
            },
            {
                name: 'Traits',
                fields: [
                    { label: 'Menacing Qualities', type: 'textarea', value: '' },
                    { label: 'Vulnerability / Flaw', type: 'textarea', value: '' },
                    { label: 'Charisma Level', type: 'number', value: '' },
                    { label: 'Intelligence Level', type: 'number', value: '' },
                ]
            }
        ]
    },

    'love-interest': {
        name: 'Love Interest',
        icon: '💕',
        description: 'A romantic character',
        sections: [
            {
                name: 'Core Identity',
                fields: [
                    { label: 'Age', type: 'text', value: '' },
                    { label: 'Occupation', type: 'text', value: '' },
                    { label: 'How They Met', type: 'textarea', value: '' },
                ]
            },
            {
                name: 'Personality',
                fields: [
                    { label: 'First Impression', type: 'textarea', value: '' },
                    { label: 'Hidden Depths', type: 'textarea', value: '' },
                    { label: 'Chemistry Type', type: 'text', value: '' },
                ]
            },
            {
                name: 'Physical',
                fields: [
                    { label: 'Appearance', type: 'textarea', value: '' },
                    { label: 'Style', type: 'text', value: '' },
                    { label: 'Signature Feature', type: 'text', value: '' },
                ]
            },
            {
                name: 'Relationship Arc',
                fields: [
                    { label: 'Initial Feelings', type: 'textarea', value: '' },
                    { label: 'Growth', type: 'textarea', value: '' },
                    { label: 'Conflict', type: 'textarea', value: '' },
                    { label: 'Resolution', type: 'textarea', value: '' },
                ]
            }
        ]
    },

    'sidekick': {
        name: 'Sidekick / Companion',
        icon: '🎯',
        description: 'A loyal companion character',
        sections: [
            {
                name: 'Core Identity',
                fields: [
                    { label: 'Age', type: 'text', value: '' },
                    { label: 'Role', type: 'text', value: '' },
                    { label: 'Relationship to Hero', type: 'text', value: '' },
                ]
            },
            {
                name: 'Personality',
                fields: [
                    { label: 'Personality Type', type: 'text', value: '' },
                    { label: 'Humor Style', type: 'text', value: '' },
                    { label: 'Loyalty', type: 'textarea', value: '' },
                ]
            },
            {
                name: 'Story Role',
                fields: [
                    { label: 'How They Help', type: 'textarea', value: '' },
                    { label: 'Their Own Arc', type: 'textarea', value: '' },
                ]
            }
        ]
    },

    'blank': {
        name: 'Blank / Custom',
        icon: '📄',
        description: 'Start from scratch with basic fields',
        sections: [
            {
                name: 'Basic Info',
                fields: [
                    { label: 'Age', type: 'text', value: '' },
                    { label: 'Occupation', type: 'text', value: '' },
                ]
            }
        ]
    }
}

// ============================================
// INITIALIZATION
// ============================================

function initCharacters() {
    document.getElementById('btn-new-character').addEventListener('click', createNewCharacter)
    document.getElementById('btn-new-character-empty').addEventListener('click', createNewCharacter)

    document.getElementById('btn-character-back').addEventListener('click', showCharactersList)
    document.getElementById('btn-delete-character').addEventListener('click', () => {
        if (Characters.currentCharacter) openDeleteCharacterModal(Characters.currentCharacter.id)
    })

    document.getElementById('btn-confirm-delete-character').addEventListener('click', confirmDeleteCharacter)

    document.getElementById('character-search').addEventListener('input', (e) => {
        Characters.filterQuery = e.target.value
        renderCharactersGrid()
    })

    document.getElementById('character-role-filter').addEventListener('change', (e) => {
        Characters.filterRole = e.target.value
        renderCharactersGrid()
    })

        // Profile tab main fields
        ;['char-name', 'char-nickname', 'char-role', 'char-bio'].forEach(id => {
            const el = document.getElementById(id)
            if (el) {
                el.addEventListener('input', scheduleCharacterSave)
                el.addEventListener('change', scheduleCharacterSave)
            }
        })

    // Color picker
    document.querySelectorAll('.character-color-picker-compact .color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => selectCharacterColor(swatch.dataset.color))
    })

    // Portrait uploads (both places)
    document.getElementById('character-profile-portrait').addEventListener('click', () => {
        document.getElementById('character-avatar-input').click()
    })
    document.getElementById('character-sidebar-portrait').addEventListener('click', () => {
        document.getElementById('character-avatar-input').click()
    })
    document.getElementById('character-avatar-input').addEventListener('change', handleAvatarUpload)

    // Tags
    document.getElementById('tag-input').addEventListener('keydown', handleTagInput)

    // Tab switching
    document.querySelectorAll('.character-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchCharacterTab(tab.dataset.tab)
        })
    })

    // Close card menus on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.character-card-more-btn') && !e.target.closest('.character-card-menu-dropdown')) {
            document.querySelectorAll('.character-card-menu-dropdown.open').forEach(m => {
                m.classList.remove('open')
            })
        }
    })

    setupMentionSystem()
    setupMentionClicks()
}

// ============================================
// SHOW / HIDE VIEWS
// ============================================

function showCharactersList() {
    document.getElementById('characters-list-view').classList.remove('hidden')
    document.getElementById('characters-detail-view').classList.add('hidden')
    Characters.currentCharacter = null
    renderCharactersGrid()
    updateCharactersCount()
    if (AppState.currentView === 'characters' && AppState.currentProject) {
        updateSidebarForCharacters(AppState.currentProject)
    }
}

function showCharacterDetail(character) {
    document.getElementById('characters-list-view').classList.add('hidden')
    document.getElementById('characters-detail-view').classList.remove('hidden')
    Characters.currentCharacter = character
    loadCharacterIntoForm(character)
    switchCharacterTab('profile') // default to profile
    if (AppState.currentView === 'characters' && AppState.currentProject) {
        updateSidebarForCharacters(AppState.currentProject)
    }
}

function updateCharactersCount() {
    if (!AppState.currentProject) return
    const count = AppState.currentProject.characters?.length || 0
    document.getElementById('characters-count-text').textContent =
        `${count} character${count !== 1 ? 's' : ''}`
}

// ============================================
// TAB SWITCHING
// ============================================

function switchCharacterTab(tabName) {
    Characters.activeTab = tabName

    document.querySelectorAll('.character-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName)
    })

    document.querySelectorAll('.character-tab-content').forEach(content => {
        content.classList.toggle('active', content.dataset.tabContent === tabName)
    })

    // Render tab-specific content
    if (tabName === 'details' && Characters.currentCharacter) {
        renderDetailsTab()
    } else if (tabName === 'appearances' && Characters.currentCharacter) {
        renderCharacterAppearances(Characters.currentCharacter.id)
    } else if (tabName === 'relations' && Characters.currentCharacter) {
        // Will be implemented in Part 3
        renderRelationsTab()
    }
}

// ============================================
// RENDER CARD GRID (NEW: portrait cards)
// ============================================

function renderCharactersGrid() {
    if (!AppState.currentProject) return

    const grid = document.getElementById('characters-grid')
    const empty = document.getElementById('characters-empty')

    let characters = [...(AppState.currentProject.characters || [])]

    if (Characters.filterQuery) {
        const q = Characters.filterQuery.toLowerCase()
        characters = characters.filter(c =>
            c.name?.toLowerCase().includes(q) ||
            c.nickname?.toLowerCase().includes(q) ||
            c.role?.toLowerCase().includes(q) ||
            c.bio?.toLowerCase().includes(q)
        )
    }

    if (Characters.filterRole) {
        characters = characters.filter(c => c.role === Characters.filterRole)
    }

    if ((AppState.currentProject.characters || []).length === 0) {
        grid.classList.add('hidden')
        empty.classList.remove('hidden')
        return
    }

    grid.classList.remove('hidden')
    empty.classList.add('hidden')

    if (characters.length === 0) {
        grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        <p>No characters match your search</p>
      </div>
    `
        return
    }

    const appearances = countAllAppearances()

    grid.innerHTML = characters.map(char => createCharacterCard(char, appearances[char.id] || 0)).join('')

    // Attach events
    grid.querySelectorAll('.character-card').forEach(card => {
        const charId = card.dataset.characterId

        // View Profile button and card body click
        card.querySelectorAll('.character-card-portrait, .character-card-body, .character-card-view-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.character-card-more-btn') || e.target.closest('.character-card-menu-dropdown')) return
                const char = AppState.currentProject.characters.find(c => c.id === charId)
                if (char) showCharacterDetail(char)
            })
        })

        // Menu button
        const menuBtn = card.querySelector('.character-card-more-btn')
        const menuDropdown = card.querySelector('.character-card-menu-dropdown')

        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation()

            const isOpen = menuDropdown.classList.contains('open')

            document.querySelectorAll('.character-card-menu-dropdown.open').forEach(m => {
                if (m !== menuDropdown) m.classList.remove('open')
            })

            if (isOpen) {
                menuDropdown.classList.remove('open')
            } else {
                document.body.appendChild(menuDropdown)
                menuDropdown.classList.add('open')

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

        card.querySelector('[data-action="duplicate"]').addEventListener('click', (e) => {
            e.stopPropagation()
            menuDropdown.classList.remove('open')
            duplicateCharacter(charId)
        })

        card.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
            e.stopPropagation()
            menuDropdown.classList.remove('open')
            openDeleteCharacterModal(charId)
        })
    })
}

function createCharacterCard(char, appearanceCount) {
    const color = char.color || '#7c6af7'
    const initials = getInitials(char.name)
    const roleLabel = getCharacterRoleLabel(char.role)
    const createdDate = char.createdAt ? new Date(char.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

    return `
    <div class="character-card" data-character-id="${char.id}">
      <div class="character-card-portrait" style="background: ${color}">
        ${char.avatar ? `<img src="${char.avatar}" alt="${escapeHtml(char.name)}" />` : escapeHtml(initials)}
        <div class="character-card-role-badge ${char.role || 'minor'}">
          ${escapeHtml(roleLabel)}
        </div>
      </div>
      
      <div class="character-card-body">
        <div class="character-card-name">${escapeHtml(char.name || 'Unnamed')}</div>
        <div class="character-card-meta">Created at · ${createdDate}</div>
        
        <div class="character-card-actions">
          <button class="character-card-view-btn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            View Profile
          </button>
          <button class="character-card-more-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="character-card-menu-dropdown">
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
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
          </svg>
          Delete
        </button>
      </div>
    </div>
  `
}

// ============================================
// CREATE / DELETE / DUPLICATE
// ============================================

async function createNewCharacter() {
    if (!AppState.currentProject) return

    const character = {
        id: generateId(),
        name: 'New Character',
        nickname: '',
        role: 'supporting',
        color: '#7c6af7',
        avatar: null,
        bio: '',
        tags: [],
        // Custom fields system (used by Details tab)
        sections: [
            {
                id: generateId(),
                name: 'Basic Info',
                fields: [
                    { id: generateId(), label: 'Age', type: 'text', value: '' },
                    { id: generateId(), label: 'Occupation', type: 'text', value: '' },
                ]
            }
        ],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    }

    if (!AppState.currentProject.characters) AppState.currentProject.characters = []
    AppState.currentProject.characters.push(character)

    await saveCurrentProject()
    updateCharactersCount()
    showCharacterDetail(character)

    setTimeout(() => {
        const nameInput = document.getElementById('char-name')
        nameInput.focus()
        nameInput.select()
    }, 100)

    showToast('Character created', 'success')
}

async function duplicateCharacter(charId) {
    if (!AppState.currentProject) return
    const original = AppState.currentProject.characters.find(c => c.id === charId)
    if (!original) return

    const duplicate = JSON.parse(JSON.stringify(original))
    duplicate.id = generateId()
    duplicate.name = original.name + ' (Copy)'
    duplicate.createdAt = new Date().toISOString()
    duplicate.lastModified = new Date().toISOString()

    // Regenerate section IDs
    if (duplicate.sections) {
        duplicate.sections.forEach(s => {
            s.id = generateId()
            if (s.fields) s.fields.forEach(f => f.id = generateId())
        })
    }

    const idx = AppState.currentProject.characters.findIndex(c => c.id === charId)
    AppState.currentProject.characters.splice(idx + 1, 0, duplicate)

    await saveCurrentProject()
    renderCharactersGrid()
    updateCharactersCount()

    if (AppState.currentView === 'characters') {
        updateSidebarForCharacters(AppState.currentProject)
    }

    showToast(`Duplicated "${original.name}"`, 'success')
}

function openDeleteCharacterModal(charId) {
    if (!AppState.currentProject) return
    const char = AppState.currentProject.characters.find(c => c.id === charId)
    if (!char) return

    Characters.characterToDelete = charId
    document.getElementById('delete-character-name').textContent = char.name
    showModal('modal-delete-character')
}

async function confirmDeleteCharacter() {
    if (!Characters.characterToDelete || !AppState.currentProject) return

    const char = AppState.currentProject.characters.find(c => c.id === Characters.characterToDelete)
    if (!char) return

    AppState.currentProject.characters = AppState.currentProject.characters.filter(
        c => c.id !== Characters.characterToDelete
    )

    const wasCurrentChar = Characters.currentCharacter?.id === Characters.characterToDelete

    await saveCurrentProject()
    hideModal('modal-delete-character')
    showToast(`"${char.name}" deleted`, 'success')

    if (wasCurrentChar) {
        showCharactersList()
    } else {
        renderCharactersGrid()
    }

    updateCharactersCount()

    if (AppState.currentView === 'characters') {
        updateSidebarForCharacters(AppState.currentProject)
    }

    Characters.characterToDelete = null
}

// ============================================
// LOAD & SAVE CHARACTER FORM
// ============================================

function loadCharacterIntoForm(char) {
    document.getElementById('char-name').value = char.name || ''
    document.getElementById('char-nickname').value = char.nickname || ''
    document.getElementById('char-role').value = char.role || 'supporting'
    document.getElementById('char-bio').value = char.bio || ''

    updateCharacterHeader(char)
    updatePortraits(char)
    updateSidebarInfo(char)

    // Color swatches
    document.querySelectorAll('.character-color-picker-compact .color-swatch').forEach(sw => {
        sw.classList.toggle('active', sw.dataset.color === (char.color || '#7c6af7'))
    })

    renderCharacterTags(char.tags || [])
    updateProfileStats(char)
}

function updateCharacterHeader(char) {
    // Sidebar name
    const sidebarName = document.getElementById('character-sidebar-name')
    if (sidebarName) sidebarName.textContent = char.name || 'Unnamed'
}

function updatePortraits(char) {
    const color = char.color || '#7c6af7'
    const initials = getInitials(char.name)

    // Sidebar portrait
    const sidebarPortrait = document.getElementById('character-sidebar-portrait')
    if (sidebarPortrait) {
        sidebarPortrait.style.background = color
        // Preserve hint, replace only image/initials
        const hintEl = sidebarPortrait.querySelector('.character-sidebar-portrait-hint')
        sidebarPortrait.innerHTML = char.avatar
            ? `<img src="${char.avatar}" alt="${escapeHtml(char.name)}" />`
            : escapeHtml(initials)
        if (hintEl) sidebarPortrait.appendChild(hintEl)
        else {
            const newHint = document.createElement('div')
            newHint.className = 'character-sidebar-portrait-hint'
            newHint.textContent = 'Click to change'
            sidebarPortrait.appendChild(newHint)
        }
    }

    // Profile portrait
    const profilePortrait = document.getElementById('character-profile-portrait')
    if (profilePortrait) {
        profilePortrait.style.background = color
        const hintEl = profilePortrait.querySelector('.character-profile-portrait-upload-hint')
        profilePortrait.innerHTML = char.avatar
            ? `<img src="${char.avatar}" alt="${escapeHtml(char.name)}" />`
            : escapeHtml(initials)
        if (hintEl) profilePortrait.appendChild(hintEl)
        else {
            const newHint = document.createElement('div')
            newHint.className = 'character-profile-portrait-upload-hint'
            newHint.textContent = 'Click to upload image (max 3MB)'
            profilePortrait.appendChild(newHint)
        }
    }
}

function updateSidebarInfo(char) {
    document.getElementById('character-sidebar-type').textContent = getCharacterRoleLabel(char.role)

    // Count mentions & appearances
    let mentions = 0
    let appearsIn = 0
    if (AppState.currentProject?.chapters) {
        AppState.currentProject.chapters.forEach(chapter => {
            if (chapter.content && chapter.content.includes(`data-character-id="${char.id}"`)) {
                const matches = chapter.content.match(new RegExp(`data-character-id="${char.id}"`, 'g'))
                if (matches) {
                    mentions += matches.length
                    appearsIn++
                }
            }
        })
    }

    document.getElementById('character-sidebar-mentions').textContent = mentions
    document.getElementById('character-sidebar-appears').textContent = `${appearsIn} Ch${appearsIn !== 1 ? 's' : ''}`
}

function updateProfileStats(char) {
    let mentions = 0
    let appearsIn = 0
    if (AppState.currentProject?.chapters) {
        AppState.currentProject.chapters.forEach(chapter => {
            if (chapter.content && chapter.content.includes(`data-character-id="${char.id}"`)) {
                const matches = chapter.content.match(new RegExp(`data-character-id="${char.id}"`, 'g'))
                if (matches) {
                    mentions += matches.length
                    appearsIn++
                }
            }
        })
    }
    document.getElementById('profile-mentions').textContent = mentions
    document.getElementById('profile-chapters').textContent = appearsIn
}

function updateSidebarCharacterItem(char) {
    if (AppState.currentView !== 'characters') return

    const item = document.querySelector(`.character-sidebar-item[data-character-id="${char.id}"]`)
    if (!item) return

    const color = char.color || '#7c6af7'
    const initials = getInitials(char.name)

    const avatar = item.querySelector('.character-sidebar-avatar')
    if (avatar) {
        avatar.style.background = color
        if (char.avatar) {
            avatar.innerHTML = `<img src="${char.avatar}" alt="" />`
        } else {
            avatar.textContent = initials
        }
    }

    const nameEl = item.querySelector('.character-sidebar-name')
    if (nameEl) nameEl.textContent = char.name || 'Unnamed'

    const roleEl = item.querySelector('.character-sidebar-role')
    if (roleEl) roleEl.textContent = getCharacterRoleLabel(char.role)
}

function scheduleCharacterSave() {
    clearTimeout(Characters.saveTimer)
    Characters.saveTimer = setTimeout(saveCharacterForm, 800)

    // Update UI live
    if (Characters.currentCharacter) {
        const char = Characters.currentCharacter
        char.name = document.getElementById('char-name').value.trim() || 'Unnamed'
        char.role = document.getElementById('char-role').value
        updateSidebarCharacterItem(char)
        updateCharacterHeader(char)
        updatePortraits(char)
        updateSidebarInfo(char)
    }
}

async function saveCharacterForm() {
    if (!Characters.currentCharacter) return

    const char = Characters.currentCharacter
    const oldName = char.name
    const oldColor = char.color

    char.name = document.getElementById('char-name').value.trim() || 'Unnamed'
    char.nickname = document.getElementById('char-nickname').value.trim()
    char.role = document.getElementById('char-role').value
    char.bio = document.getElementById('char-bio').value.trim()
    char.lastModified = new Date().toISOString()

    updateCharacterHeader(char)
    updatePortraits(char)
    updateSidebarCharacterItem(char)
    updateSidebarInfo(char)

    if (oldName !== char.name) {
        updateMentionsForCharacter(char.id, char.name)
    }

    await saveCurrentProject()
}

function updateMentionsForCharacter(charId, newName) {
    if (!AppState.currentProject) return

    AppState.currentProject.chapters?.forEach(chapter => {
        if (chapter.content && chapter.content.includes(`data-character-id="${charId}"`)) {
            const temp = document.createElement('div')
            temp.innerHTML = chapter.content

            temp.querySelectorAll(`.character-mention[data-character-id="${charId}"]`).forEach(mention => {
                mention.textContent = newName
            })

            chapter.content = temp.innerHTML
        }
    })

    if (AppState.currentChapter && Editor.contentEl) {
        const mentions = Editor.contentEl.querySelectorAll(`.character-mention[data-character-id="${charId}"]`)
        mentions.forEach(m => m.textContent = newName)
    }
}

function selectCharacterColor(color) {
    if (!Characters.currentCharacter) return
    Characters.currentCharacter.color = color

    document.querySelectorAll('.character-color-picker-compact .color-swatch').forEach(sw => {
        sw.classList.toggle('active', sw.dataset.color === color)
    })

    updatePortraits(Characters.currentCharacter)
    updateSidebarCharacterItem(Characters.currentCharacter)
    updateMentionColorsForCharacter(Characters.currentCharacter.id, color)
    scheduleCharacterSave()
}

function updateMentionColorsForCharacter(charId, color) {
    if (!AppState.currentProject) return

    AppState.currentProject.chapters?.forEach(chapter => {
        if (chapter.content && chapter.content.includes(`data-character-id="${charId}"`)) {
            const temp = document.createElement('div')
            temp.innerHTML = chapter.content

            temp.querySelectorAll(`.character-mention[data-character-id="${charId}"]`).forEach(mention => {
                mention.style.color = color
            })

            chapter.content = temp.innerHTML
        }
    })

    if (AppState.currentChapter && Editor.contentEl) {
        const mentions = Editor.contentEl.querySelectorAll(`.character-mention[data-character-id="${charId}"]`)
        mentions.forEach(m => m.style.color = color)
    }
}

// ============================================
// AVATAR UPLOAD
// ============================================

function handleAvatarUpload(e) {
    const file = e.target.files[0]
    if (!file || !Characters.currentCharacter) return

    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error')
        return
    }

    if (file.size > 3 * 1024 * 1024) {
        showToast('Image too large (max 3MB)', 'error')
        return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
        Characters.currentCharacter.avatar = event.target.result
        updatePortraits(Characters.currentCharacter)
        updateSidebarCharacterItem(Characters.currentCharacter)
        scheduleCharacterSave()
        showToast('Image uploaded', 'success')
    }
    reader.readAsDataURL(file)

    e.target.value = ''
}

// ============================================
// TAGS
// ============================================

function renderCharacterTags(tags) {
    const container = document.getElementById('character-tags-container')
    const input = document.getElementById('tag-input')

    container.querySelectorAll('.tag-chip').forEach(c => c.remove())

    tags.forEach(tag => {
        const chip = document.createElement('div')
        chip.className = 'tag-chip'
        chip.innerHTML = `${escapeHtml(tag)} <button class="tag-chip-remove" data-tag="${escapeHtml(tag)}">×</button>`
        container.insertBefore(chip, input)
        chip.querySelector('.tag-chip-remove').addEventListener('click', () => removeCharacterTag(tag))
    })
}

function handleTagInput(e) {
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        const tag = e.target.value.trim().replace(/,/g, '')
        if (tag) {
            addCharacterTag(tag)
            e.target.value = ''
        }
    }
    if (e.key === 'Backspace' && !e.target.value && Characters.currentCharacter?.tags?.length > 0) {
        removeCharacterTag(Characters.currentCharacter.tags[Characters.currentCharacter.tags.length - 1])
    }
}

function addCharacterTag(tag) {
    if (!Characters.currentCharacter) return
    if (!Characters.currentCharacter.tags) Characters.currentCharacter.tags = []
    if (!Characters.currentCharacter.tags.includes(tag)) {
        Characters.currentCharacter.tags.push(tag)
        renderCharacterTags(Characters.currentCharacter.tags)
        scheduleCharacterSave()
    }
}

function removeCharacterTag(tag) {
    if (!Characters.currentCharacter) return
    Characters.currentCharacter.tags = Characters.currentCharacter.tags.filter(t => t !== tag)
    renderCharacterTags(Characters.currentCharacter.tags)
    scheduleCharacterSave()
}

// ============================================
// DETAILS TAB — Custom fields, sections, templates
// ============================================

function renderDetailsTab() {
    const container = document.getElementById('details-tab-content')
    if (!container) return

    if (!Characters.currentCharacter) return

    const char = Characters.currentCharacter
    if (!char.sections) char.sections = []

    let html = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
      <div>
        <h2 style="font-size: 20px; color: var(--text-primary); font-weight: 600; margin: 0 0 4px 0;">Character Details</h2>
        <p style="color: var(--text-muted); font-size: 13px; margin: 0;">Custom fields grouped into sections</p>
      </div>
      <button class="btn-secondary" id="btn-apply-template">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        Apply Template
      </button>
    </div>
  `

    if (char.sections.length === 0) {
        html += `
      <div class="tab-empty-state">
        <h3>No fields yet</h3>
        <p>Add a section to start organizing character details, or apply a template to get started quickly.</p>
        <button class="btn-primary" id="btn-add-first-section" style="margin-top: 20px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add First Section
        </button>
      </div>
    `
    } else {
        char.sections.forEach(section => {
            html += renderSectionHTML(section)
        })

        html += `
      <button class="btn-secondary" id="btn-add-section" style="width: 100%; margin-top: 16px; padding: 12px; border: 2px dashed var(--border-color); background: transparent;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add New Section
      </button>
    `
    }

    container.innerHTML = html
    attachDetailsListeners()
}

function renderSectionHTML(section) {
    const fieldsHTML = (section.fields || []).map(field => renderFieldHTML(field, section.id)).join('')

    return `
    <div class="details-section" data-section-id="${section.id}" style="margin-bottom: 24px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden;">
      <div style="padding: 12px 16px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <input type="text" class="section-name-input" data-section-id="${section.id}" value="${escapeHtml(section.name)}" 
               style="flex: 1; background: transparent; border: 1px solid transparent; color: var(--text-primary); font-size: 13px; font-weight: 600; padding: 4px 8px; border-radius: 4px; outline: none; text-transform: uppercase; letter-spacing: 0.6px;" />
        <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px;">${(section.fields || []).length} field${(section.fields || []).length !== 1 ? 's' : ''}</span>
        <button class="section-delete-btn" data-section-id="${section.id}" style="background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px 6px; border-radius: 4px;" title="Delete section">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
          </svg>
        </button>
      </div>
      
      <div style="padding: 12px 16px;">
        ${fieldsHTML || '<p style="color: var(--text-muted); font-size: 12px; font-style: italic; padding: 8px 0;">No fields in this section yet</p>'}
        <button class="add-field-btn" data-section-id="${section.id}" style="background: transparent; border: 1px dashed var(--border-color); color: var(--text-muted); padding: 6px 12px; border-radius: 4px; cursor: pointer; font-family: var(--font-ui); font-size: 11px; margin-top: 8px; transition: var(--transition);">
          + Add Field
        </button>
      </div>
    </div>
  `
}

function renderFieldHTML(field, sectionId) {
    let inputHTML = ''

    if (field.type === 'textarea') {
        inputHTML = `<textarea class="field-value-input" data-field-id="${field.id}" placeholder="Enter ${escapeHtml(field.label.toLowerCase())}..." rows="3" style="width: 100%; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 10px; border-radius: 4px; font-family: var(--font-ui); font-size: 12px; outline: none; resize: vertical; min-height: 60px;">${escapeHtml(field.value || '')}</textarea>`
    } else if (field.type === 'number') {
        inputHTML = `<input type="number" class="field-value-input" data-field-id="${field.id}" value="${escapeHtml(field.value || '')}" placeholder="0" style="width: 100%; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 10px; border-radius: 4px; font-family: var(--font-ui); font-size: 12px; outline: none;" />`
    } else {
        inputHTML = `<input type="text" class="field-value-input" data-field-id="${field.id}" value="${escapeHtml(field.value || '')}" placeholder="Enter ${escapeHtml(field.label.toLowerCase())}..." style="width: 100%; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 10px; border-radius: 4px; font-family: var(--font-ui); font-size: 12px; outline: none;" />`
    }

    return `
    <div class="details-field" data-field-id="${field.id}" style="margin-bottom: 12px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; gap: 8px;">
        <input type="text" class="field-label-input" data-field-id="${field.id}" data-section-id="${sectionId}" value="${escapeHtml(field.label)}" 
               style="flex: 1; background: transparent; border: 1px solid transparent; color: var(--text-muted); font-size: 10px; font-weight: 600; padding: 2px 4px; border-radius: 3px; outline: none; text-transform: uppercase; letter-spacing: 0.5px;" />
        <button class="field-delete-btn" data-field-id="${field.id}" data-section-id="${sectionId}" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 2px 4px; opacity: 0; transition: opacity 0.15s ease;" title="Delete field">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      ${inputHTML}
    </div>
  `
}

function attachDetailsListeners() {
    // Apply template
    const templateBtn = document.getElementById('btn-apply-template')
    if (templateBtn) {
        templateBtn.addEventListener('click', openTemplatePickerModal)
    }

    // Add first section (empty state)
    const firstSectionBtn = document.getElementById('btn-add-first-section')
    if (firstSectionBtn) {
        firstSectionBtn.addEventListener('click', async (e) => {
            e.stopPropagation()
            e.preventDefault()

            if (!Characters.currentCharacter) return

            if (!Characters.currentCharacter.sections) {
                Characters.currentCharacter.sections = []
            }

            Characters.currentCharacter.sections.push({
                id: generateId(),
                name: 'New Section',
                fields: [
                    { id: generateId(), label: 'New Field', type: 'text', value: '' }
                ]
            })

            await saveCharacterForm()
            renderDetailsTab()
            showToast('Section added', 'success')
        })
    }

    // Add section
    const addSectionBtn = document.getElementById('btn-add-section')
    if (addSectionBtn) {
        addSectionBtn.addEventListener('click', async (e) => {
            e.stopPropagation()
            e.preventDefault()

            if (!Characters.currentCharacter) return

            if (!Characters.currentCharacter.sections) {
                Characters.currentCharacter.sections = []
            }

            Characters.currentCharacter.sections.push({
                id: generateId(),
                name: 'New Section',
                fields: [
                    { id: generateId(), label: 'New Field', type: 'text', value: '' }
                ]
            })

            await saveCharacterForm()
            renderDetailsTab()
            showToast('Section added', 'success')
        })
    }

    // Section name inputs
    document.querySelectorAll('.section-name-input').forEach(input => {
        input.addEventListener('input', () => {
            const section = Characters.currentCharacter.sections.find(s => s.id === input.dataset.sectionId)
            if (section) {
                section.name = input.value.trim() || 'Untitled Section'
                scheduleCharacterSave()
            }
        })
    })

    // Section delete
    document.querySelectorAll('.section-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Delete this section and all its fields?')) {
                deleteSection(btn.dataset.sectionId)
            }
        })
    })

    // Field label inputs
    document.querySelectorAll('.field-label-input').forEach(input => {
        input.addEventListener('input', () => {
            const field = findField(input.dataset.fieldId, input.dataset.sectionId)
            if (field) {
                field.label = input.value.trim() || 'Untitled'
                scheduleCharacterSave()
            }
        })
    })

    // Field value inputs
    document.querySelectorAll('.field-value-input').forEach(input => {
        input.addEventListener('input', () => {
            // Find field across all sections
            const char = Characters.currentCharacter
            for (const section of char.sections) {
                const field = section.fields.find(f => f.id === input.dataset.fieldId)
                if (field) {
                    field.value = input.value
                    scheduleCharacterSave()
                    break
                }
            }
        })
    })

    // Add field buttons
    document.querySelectorAll('.add-field-btn').forEach(btn => {
        btn.addEventListener('click', () => addField(btn.dataset.sectionId))
    })

    // Field delete buttons
    document.querySelectorAll('.field-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Delete this field?')) {
                deleteField(btn.dataset.fieldId, btn.dataset.sectionId)
            }
        })
        // Show on hover of parent
        const parent = btn.closest('.details-field')
        if (parent) {
            parent.addEventListener('mouseenter', () => { btn.style.opacity = '0.5' })
            parent.addEventListener('mouseleave', () => { btn.style.opacity = '0' })
            btn.addEventListener('mouseenter', () => { btn.style.opacity = '1' })
        }
    })
}

function findField(fieldId, sectionId) {
    const char = Characters.currentCharacter
    if (!char || !char.sections) return null
    const section = char.sections.find(s => s.id === sectionId)
    return section ? section.fields.find(f => f.id === fieldId) : null
}

async function addCharacterSection(e) {
    console.log('[Characters] === addCharacterSection START ===')
    if (!Characters.currentCharacter) {
        alert('No character selected!')
        return
    }

    if (!Characters.currentCharacter.sections) Characters.currentCharacter.sections = []

    Characters.currentCharacter.sections.push({
        id: generateId(),
        name: 'New Section',
        fields: [
            { id: generateId(), label: 'New Field', type: 'text', value: '' }
        ]
    })

    await saveCharacterForm()
    renderDetailsTab()
    showToast('Section added', 'success')
}

async function deleteSection(sectionId) {
    if (!Characters.currentCharacter) return
    Characters.currentCharacter.sections = Characters.currentCharacter.sections.filter(s => s.id !== sectionId)
    await saveCharacterForm()
    renderDetailsTab()
    showToast('Section deleted', 'info')
}

async function addField(sectionId) {
    if (!Characters.currentCharacter) return
    const section = Characters.currentCharacter.sections.find(s => s.id === sectionId)
    if (!section) return

    if (!section.fields) section.fields = []
    section.fields.push({
        id: generateId(),
        label: 'New Field',
        type: 'text',
        value: ''
    })

    await saveCharacterForm()
    renderDetailsTab()
}

async function deleteField(fieldId, sectionId) {
    if (!Characters.currentCharacter) return
    const section = Characters.currentCharacter.sections.find(s => s.id === sectionId)
    if (!section) return

    section.fields = section.fields.filter(f => f.id !== fieldId)
    await saveCharacterForm()
    renderDetailsTab()
}

// ============================================
// TEMPLATE PICKER
// ============================================

function openTemplatePickerModal() {
    // Build template picker modal on-the-fly
    const existing = document.getElementById('modal-template-picker')
    if (existing) existing.remove()

    const modal = document.createElement('div')
    modal.id = 'modal-template-picker'
    modal.className = 'modal'
    modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-box">
      <div class="modal-header">
        <h2>Choose a Template</h2>
        <button class="modal-close">✕</button>
      </div>
      <div class="modal-body">
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 12px;">
          Apply a preset field template. This will <strong>add</strong> sections to your existing details.
        </p>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          ${Object.entries(FIELD_TEMPLATES).map(([id, tpl]) => `
            <button class="template-picker-btn" data-template-id="${id}" style="background: var(--bg-card); border: 2px solid var(--border-color); color: var(--text-primary); padding: 16px; border-radius: var(--radius-md); cursor: pointer; text-align: left; transition: var(--transition); font-family: var(--font-ui);">
              <div style="font-size: 24px; margin-bottom: 8px;">${tpl.icon}</div>
              <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">${escapeHtml(tpl.name)}</div>
              <div style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">${escapeHtml(tpl.description)}</div>
            </button>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary modal-cancel">Cancel</button>
      </div>
    </div>
  `

    document.body.appendChild(modal)
    modal.classList.remove('hidden')

    // Close handlers
    modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove())
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove())
    modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove())

    // Template selection
    modal.querySelectorAll('.template-picker-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.borderColor = 'var(--accent-primary)'
            btn.style.background = 'var(--bg-hover)'
        })
        btn.addEventListener('mouseleave', () => {
            btn.style.borderColor = 'var(--border-color)'
            btn.style.background = 'var(--bg-card)'
        })
        btn.addEventListener('click', () => {
            applyTemplate(btn.dataset.templateId)
            modal.remove()
        })
    })
}

async function applyTemplate(templateId) {
    if (!Characters.currentCharacter) return
    const template = FIELD_TEMPLATES[templateId]
    if (!template) return

    if (!Characters.currentCharacter.sections) Characters.currentCharacter.sections = []

    // Add template sections (with fresh IDs)
    template.sections.forEach(section => {
        const newSection = {
            id: generateId(),
            name: section.name,
            fields: (section.fields || []).map(f => ({
                id: generateId(),
                label: f.label,
                type: f.type,
                value: f.value || ''
            }))
        }
        Characters.currentCharacter.sections.push(newSection)
    })

    await saveCharacterForm()
    renderDetailsTab()
    showToast(`Template "${template.name}" applied`, 'success')
}

// ============================================
// RELATIONS TAB (placeholder — Part 3)
// ============================================

function renderRelationsTab() {
    const container = document.getElementById('relations-tab-content')
    container.innerHTML = `
    <div class="tab-empty-state">
      <h3>Character Relations</h3>
      <p>Coming in Part 3 of Stage 19 — rich relationship cards with intensity and details!</p>
    </div>
  `
}

// ============================================
// APPEARANCES
// ============================================

function countAllAppearances() {
    const counts = {}
    if (!AppState.currentProject) return counts

    const chars = AppState.currentProject.characters || []
    const chapters = AppState.currentProject.chapters || []

    chars.forEach(char => {
        let count = 0
        chapters.forEach(chapter => {
            if (chapter.content && chapter.content.includes(`data-character-id="${char.id}"`)) {
                const matches = chapter.content.match(new RegExp(`data-character-id="${char.id}"`, 'g'))
                count += matches ? matches.length : 0
            }
        })
        counts[char.id] = count
    })

    return counts
}

function renderCharacterAppearances(charId) {
    const listEl = document.getElementById('character-appearances-list')
    if (!AppState.currentProject) return

    const appearances = []
    AppState.currentProject.chapters?.forEach(chapter => {
        if (chapter.content && chapter.content.includes(`data-character-id="${charId}"`)) {
            const matches = chapter.content.match(new RegExp(`data-character-id="${charId}"`, 'g'))
            appearances.push({
                chapter: chapter,
                count: matches ? matches.length : 0
            })
        }
    })

    if (appearances.length === 0) {
        listEl.innerHTML = `
      <p style="color: var(--text-muted); font-size: 13px; padding: 20px; text-align: center;">
        Not mentioned in any chapters yet.<br>
        Type <strong>@${escapeHtml(Characters.currentCharacter?.name || 'name')}</strong> in a chapter to reference this character.
      </p>
    `
        return
    }

    listEl.innerHTML = appearances.map(app => `
    <div class="appearance-item" data-chapter-id="${app.chapter.id}">
      <span class="appearance-title">${escapeHtml(app.chapter.title)}</span>
      <span class="appearance-count">${app.count} mention${app.count !== 1 ? 's' : ''}</span>
    </div>
  `).join('')

    listEl.querySelectorAll('.appearance-item').forEach(item => {
        item.addEventListener('click', () => {
            const chapterId = item.dataset.chapterId
            switchSidebarNav('chapters')
            setTimeout(() => selectChapter(chapterId), 100)
        })
    })
}

// ============================================
// SIDEBAR (character list)
// ============================================

function updateSidebarForCharacters(project) {
    const content = document.getElementById('sidebar-content')
    const chars = project.characters || []

    content.innerHTML = `
    <div class="sidebar-section">
      <div class="sidebar-section-header">
        <span>Characters</span>
        <button class="sidebar-add-btn" id="btn-sidebar-add-character" data-tooltip="New Character">+</button>
      </div>
      <div>
        ${chars.length === 0
            ? '<p class="sidebar-empty">No characters yet.<br>Click + to add one.</p>'
            : chars.map(char => createSidebarCharacterItem(char)).join('')
        }
      </div>
    </div>
  `

    document.getElementById('btn-sidebar-add-character')?.addEventListener('click', createNewCharacter)

    document.querySelectorAll('.character-sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            const charId = item.dataset.characterId
            const char = AppState.currentProject.characters.find(c => c.id === charId)
            if (char) showCharacterDetail(char)
        })
    })
}

function createSidebarCharacterItem(char) {
    const color = char.color || '#7c6af7'
    const initials = getInitials(char.name)
    const isActive = Characters.currentCharacter?.id === char.id

    return `
    <div class="character-sidebar-item ${isActive ? 'active' : ''}" data-character-id="${char.id}">
      <div class="character-sidebar-avatar" style="background: ${color}">
        ${char.avatar ? `<img src="${char.avatar}" alt="" />` : escapeHtml(initials)}
      </div>
      <div class="character-sidebar-info">
        <span class="character-sidebar-name">${escapeHtml(char.name || 'Unnamed')}</span>
        <span class="character-sidebar-role">${escapeHtml(getCharacterRoleLabel(char.role))}</span>
      </div>
    </div>
  `
}

// ============================================
// @MENTION SYSTEM (unchanged from before)
// ============================================

function setupMentionSystem() {
    if (!Editor.contentEl) {
        setTimeout(setupMentionSystem, 500)
        return
    }

    Editor.contentEl.addEventListener('input', handleMentionInput)
    Editor.contentEl.addEventListener('keydown', handleMentionKeydown)

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.mention-dropdown')) {
            closeMentionDropdown()
        }
    })
}

function setupMentionClicks() {
    if (!Editor.contentEl) {
        setTimeout(setupMentionClicks, 500)
        return
    }

    Editor.contentEl.addEventListener('click', (e) => {
        const mention = e.target.closest('.character-mention')
        if (mention) {
            e.preventDefault()
            const charId = mention.dataset.characterId
            if (charId && AppState.currentProject) {
                const char = AppState.currentProject.characters?.find(c => c.id === charId)
                if (char) {
                    if (typeof saveChapterNow === 'function' && Editor.hasUnsavedChanges) {
                        saveChapterNow()
                    }
                    switchSidebarNav('characters')
                    setTimeout(() => showCharacterDetail(char), 100)
                }
            }
        }
    })
}

function handleMentionInput(e) {
    const selection = window.getSelection()
    if (!selection.rangeCount) return

    const range = selection.getRangeAt(0)
    const cursorNode = range.startContainer
    const cursorOffset = range.startOffset

    if (cursorNode.nodeType !== 3) {
        closeMentionDropdown()
        return
    }

    const textBefore = cursorNode.textContent.substring(0, cursorOffset)
    const match = textBefore.match(/@([a-zA-Z0-9_\s-]*)$/)

    if (match) {
        Characters.mentionQuery = match[1].toLowerCase()
        Characters.mentionRange = {
            node: cursorNode,
            start: cursorOffset - match[0].length,
            end: cursorOffset
        }
        showMentionDropdown()
    } else {
        closeMentionDropdown()
    }
}

function handleMentionKeydown(e) {
    if (!Characters.mentionDropdown) return

    const items = Characters.mentionDropdown.querySelectorAll('.mention-item')
    if (items.length === 0) return

    if (e.key === 'ArrowDown') {
        e.preventDefault()
        Characters.mentionSelectedIndex = Math.min(Characters.mentionSelectedIndex + 1, items.length - 1)
        updateMentionSelection()
    } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        Characters.mentionSelectedIndex = Math.max(Characters.mentionSelectedIndex - 1, 0)
        updateMentionSelection()
    } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const selected = items[Characters.mentionSelectedIndex]
        if (selected) insertMention(selected.dataset.characterId)
    } else if (e.key === 'Escape') {
        e.preventDefault()
        closeMentionDropdown()
    }
}

function showMentionDropdown() {
    if (!AppState.currentProject) return

    const chars = AppState.currentProject.characters || []
    const filtered = chars.filter(c =>
        c.name.toLowerCase().includes(Characters.mentionQuery) ||
        c.nickname?.toLowerCase().includes(Characters.mentionQuery)
    ).slice(0, 8)

    if (!Characters.mentionDropdown) {
        Characters.mentionDropdown = document.createElement('div')
        Characters.mentionDropdown.className = 'mention-dropdown'
        document.body.appendChild(Characters.mentionDropdown)
    }

    if (filtered.length === 0) {
        Characters.mentionDropdown.innerHTML = `
      <div class="mention-empty">
        ${chars.length === 0
                ? 'No characters yet. Create one first!'
                : `No character matches "${escapeHtml(Characters.mentionQuery)}"`}
      </div>
    `
    } else {
        Characters.mentionDropdown.innerHTML = filtered.map((char, i) => {
            const color = char.color || '#7c6af7'
            const initials = getInitials(char.name)
            return `
        <div class="mention-item ${i === Characters.mentionSelectedIndex ? 'selected' : ''}" data-character-id="${char.id}">
          <div class="mention-avatar" style="background: ${color}">
            ${char.avatar ? `<img src="${char.avatar}" alt="" />` : escapeHtml(initials)}
          </div>
          <div class="mention-info">
            <div class="mention-name">${escapeHtml(char.name)}</div>
            <div class="mention-role">${escapeHtml(getCharacterRoleLabel(char.role))}</div>
          </div>
        </div>
      `
        }).join('')
    }

    positionMentionDropdown()

    Characters.mentionDropdown.querySelectorAll('.mention-item').forEach(item => {
        item.addEventListener('mousedown', (e) => {
            e.preventDefault()
            insertMention(item.dataset.characterId)
        })
    })

    Characters.mentionSelectedIndex = 0
}

function positionMentionDropdown() {
    if (!Characters.mentionDropdown) return

    const selection = window.getSelection()
    if (!selection.rangeCount) return

    const range = selection.getRangeAt(0).cloneRange()
    range.collapse(true)
    const rect = range.getBoundingClientRect()

    if (rect.top === 0 && rect.left === 0) return

    Characters.mentionDropdown.style.top = `${rect.bottom + 4}px`
    Characters.mentionDropdown.style.left = `${rect.left}px`

    setTimeout(() => {
        if (!Characters.mentionDropdown) return
        const dropdownRect = Characters.mentionDropdown.getBoundingClientRect()
        if (dropdownRect.right > window.innerWidth) {
            Characters.mentionDropdown.style.left = `${window.innerWidth - dropdownRect.width - 8}px`
        }
        if (dropdownRect.bottom > window.innerHeight) {
            Characters.mentionDropdown.style.top = `${rect.top - dropdownRect.height - 4}px`
        }
    }, 0)
}

function updateMentionSelection() {
    if (!Characters.mentionDropdown) return
    const items = Characters.mentionDropdown.querySelectorAll('.mention-item')
    items.forEach((item, i) => {
        item.classList.toggle('selected', i === Characters.mentionSelectedIndex)
    })
}

function insertMention(characterId) {
    if (!Characters.mentionRange || !AppState.currentProject) return

    const char = AppState.currentProject.characters.find(c => c.id === characterId)
    if (!char) { closeMentionDropdown(); return }

    const { node, start, end } = Characters.mentionRange
    const color = char.color || '#7c6af7'

    const range = document.createRange()
    range.setStart(node, start)
    range.setEnd(node, end)
    range.deleteContents()

    const mention = document.createElement('span')
    mention.className = 'character-mention'
    mention.setAttribute('data-character-id', char.id)
    mention.setAttribute('contenteditable', 'false')
    mention.style.color = color
    mention.textContent = char.name

    range.insertNode(mention)

    const space = document.createTextNode('\u00A0')
    mention.parentNode.insertBefore(space, mention.nextSibling)

    const newRange = document.createRange()
    newRange.setStartAfter(space)
    newRange.collapse(true)
    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(newRange)

    closeMentionDropdown()

    if (typeof scheduleAutoSave === 'function') {
        Editor.hasUnsavedChanges = true
        scheduleAutoSave()
    }
}

function closeMentionDropdown() {
    if (Characters.mentionDropdown) {
        Characters.mentionDropdown.remove()
        Characters.mentionDropdown = null
        Characters.mentionQuery = ''
        Characters.mentionRange = null
        Characters.mentionSelectedIndex = 0
    }
}

// ============================================
// UTILITY
// ============================================

function getInitials(name) {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function getCharacterRoleLabel(role) {
    const map = {
        'protagonist': 'Protagonist',
        'antagonist': 'Antagonist',
        'supporting': 'Supporting',
        'love-interest': 'Love Interest',
        'mentor': 'Mentor',
        'minor': 'Minor'
    }
    return map[role] || 'Supporting'
}