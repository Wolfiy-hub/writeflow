// app.js
// Main application controller

// ============================================
// APP STATE
// ============================================
const AppState = {
  currentProject: null,
  currentChapter: null,
  currentView: 'home',
  sidebarCollapsed: false,
  allProjects: [],
  projectToDelete: null,
  projectToEdit: null,
  chapterToDelete: null,
  filterGenre: '',
  sortBy: 'recent',
  searchQuery: '',
  contextMenu: null,
  draggedChapter: null,
  backupProjectId: null,
  settings: {
    theme: 'dark',
    font: 'Lora',
    fontSize: 16,
    lineSpacing: 1.8,
    spellcheckLanguage: 'en-us',
    spellcheckEnabled: true,
    autosaveInterval: 3000,
    focusMode: false,
    typewriterMode: false,
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('WriteFlow starting...')

  await sleep(1200)

  await loadSettings()
  applyTheme(AppState.settings.theme)
  await loadAllProjects()
  setupEventListeners()
  initEditor()
  initEditorModes()
  initCharacters()
  initNotes()
  initMoodboard()
  initRelationships()
  initAnalytics()
  initSprints()
  initOutliner()
  initSpellCheck()
  initVersions()
  initAnalysis()
  initExport()
  if (typeof initBookDesign === 'function') initBookDesign()
  if (typeof initPolish === 'function') initPolish()
  if (typeof initFindReplace === 'function') initFindReplace()
  finishLoading()

  setTimeout(() => {
    goToProjectsView()
  }, 300)

  console.log('WriteFlow ready!')
})

function finishLoading() {
  const loadingScreen = document.getElementById('loading-screen')
  const app = document.getElementById('app')

  loadingScreen.classList.add('fade-out')

  setTimeout(() => {
    loadingScreen.style.display = 'none'
    app.classList.remove('hidden')
  }, 500)
}

async function loadSettings() {
  try {
    const result = await window.electronAPI.loadSettings()
    if (result.success && result.settings) {
      AppState.settings = { ...AppState.settings, ...result.settings }
    }
  } catch (error) {
    console.log('No saved settings found, using defaults')
  }
}

async function loadAllProjects() {
  try {
    const result = await window.electronAPI.loadAllProjects()
    if (result.success) {
      AppState.allProjects = result.projects || []
    }
  } catch (error) {
    console.log('Could not load projects:', error)
    AppState.allProjects = []
  }
}

function setupEventListeners() {
  document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar)
  document.getElementById('settings-btn').addEventListener('click', openSettings)
  document.getElementById('app-logo-btn').addEventListener('click', goToProjectsView)
  document.getElementById('back-to-projects-btn').addEventListener('click', goToProjectsView)
  document.getElementById('breadcrumb-home').addEventListener('click', goToProjectsView)

  document.getElementById('btn-new-project-header').addEventListener('click', () => showModal('modal-new-project'))
  document.getElementById('btn-new-project-empty').addEventListener('click', () => showModal('modal-new-project'))

  document.getElementById('btn-create-project').addEventListener('click', createNewProject)
  document.getElementById('btn-confirm-delete').addEventListener('click', confirmDeleteProject)
  document.getElementById('btn-confirm-edit').addEventListener('click', confirmEditProject)
  document.getElementById('btn-confirm-delete-chapter').addEventListener('click', confirmDeleteChapter)

  // Storage modal buttons
  document.getElementById('btn-import-project').addEventListener('click', importProjectFile)
  document.getElementById('btn-close-storage').addEventListener('click', () => hideModal('modal-storage'))
  document.getElementById('btn-open-spellcheck').addEventListener('click', () => {
    hideModal('modal-storage')
    setTimeout(() => openSpellCheckSettings(), 200)
  })

  // Storage path click - open folder
  document.getElementById('storage-path').addEventListener('click', async () => {
    await window.electronAPI.openDataFolder()
  })

  document.querySelectorAll('.modal-close, .modal-cancel, .modal-overlay').forEach(el => {
    el.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal')
      if (modal) hideModal(modal.id)
    })
  })

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSidebarNav(btn.dataset.view))
  })

  document.getElementById('project-search').addEventListener('input', (e) => {
    AppState.searchQuery = e.target.value
    renderProjectsGrid()
  })

  document.getElementById('filter-genre').addEventListener('change', (e) => {
    AppState.filterGenre = e.target.value
    renderProjectsGrid()
  })

  document.getElementById('sort-by').addEventListener('change', (e) => {
    AppState.sortBy = e.target.value
    renderProjectsGrid()
  })

  document.addEventListener('keydown', handleKeyboardShortcuts)

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.novel-card-menu')) {
      document.querySelectorAll('.novel-card-menu-dropdown.open').forEach(m => {
        m.classList.remove('open')
      })
    }
    if (!e.target.closest('.context-menu')) {
      closeContextMenu()
    }
  })

  document.getElementById('project-title').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) createNewProject()
  })
  document.getElementById('edit-project-title').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) confirmEditProject()
  })

  // Save before window closes
  window.addEventListener('beforeunload', () => {
    if (AppState.currentChapter && Editor.hasUnsavedChanges) {
      saveChapterNow()
    }
  })
}

function handleKeyboardShortcuts(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal:not(.hidden)').forEach(modal => hideModal(modal.id))
    closeContextMenu()
  }

  if (e.ctrlKey && e.key === 'b' && !isEditorFocused()) {
    e.preventDefault()
    toggleSidebar()
  }

  if (e.ctrlKey && e.key === 'n' && AppState.currentView === 'projects') {
    e.preventDefault()
    showModal('modal-new-project')
  }
}

function isEditorFocused() {
  const active = document.activeElement
  return active && (active.id === 'editor-content' || active.closest('.editor-toolbar'))
}

function goToProjectsView() {
  if (AppState.currentChapter && Editor.hasUnsavedChanges) {
    saveChapterNow()
  }

  // End writing session when leaving
  if (typeof endSession === 'function') endSession()

  AppState.currentProject = null
  AppState.currentChapter = null
  AppState.currentView = 'projects'

  showView('projects')
  updateBreadcrumbs([{ label: 'Projects', current: true }])
  updateTopBar()
  updateSidebarForNoProject()
  renderProjectsGrid()

  updateQuickNoteFabVisibility()
  updateSprintLauncherVisibility()
}

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active')
    v.classList.add('hidden')
  })

  const target = document.getElementById(`view-${viewId}`)
  if (target) {
    target.classList.remove('hidden')
    target.classList.add('active')
  }
}

function updateTopBar() {
  const backBtn = document.getElementById('back-to-projects-btn')

  if (AppState.currentProject) {
    backBtn.classList.remove('hidden')
  } else {
    backBtn.classList.add('hidden')
  }
}

function updateBreadcrumbs(items) {
  const container = document.getElementById('breadcrumbs')
  container.innerHTML = ''

  items.forEach((item, index) => {
    if (index > 0) {
      const separator = document.createElement('span')
      separator.className = 'breadcrumb-separator'
      separator.textContent = '›'
      container.appendChild(separator)
    }

    const el = document.createElement('span')
    el.className = 'breadcrumb-item' + (item.current ? ' current' : '')
    el.textContent = item.label
    if (item.onClick) {
      el.addEventListener('click', item.onClick)
    }
    container.appendChild(el)
  })
}

function renderProjectsGrid() {
  const grid = document.getElementById('projects-grid')
  const empty = document.getElementById('projects-empty')

  let projects = [...AppState.allProjects]

  if (AppState.searchQuery) {
    const q = AppState.searchQuery.toLowerCase()
    projects = projects.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.author && p.author.toLowerCase().includes(q)) ||
      (p.genre && p.genre.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    )
  }

  if (AppState.filterGenre) {
    projects = projects.filter(p => p.genre === AppState.filterGenre)
  }

  projects.sort((a, b) => {
    switch (AppState.sortBy) {
      case 'recent': return new Date(b.lastModified) - new Date(a.lastModified)
      case 'created': return new Date(b.createdAt) - new Date(a.createdAt)
      case 'alphabetical': return a.title.localeCompare(b.title)
      case 'alphabetical-desc': return b.title.localeCompare(a.title)
      case 'most-words': return (b.totalWords || 0) - (a.totalWords || 0)
      case 'least-words': return (a.totalWords || 0) - (b.totalWords || 0)
      default: return 0
    }
  })

  if (AppState.allProjects.length === 0) {
    grid.classList.add('hidden')
    empty.classList.remove('hidden')
    return
  }

  grid.classList.remove('hidden')
  empty.classList.add('hidden')

  if (projects.length === 0) {
    let message = 'No novels found'
    if (AppState.searchQuery && AppState.filterGenre) {
      message = `No ${getGenreLabel(AppState.filterGenre)} novels matching "${AppState.searchQuery}"`
    } else if (AppState.searchQuery) {
      message = `No novels matching "${AppState.searchQuery}"`
    } else if (AppState.filterGenre) {
      message = `No ${getGenreLabel(AppState.filterGenre)} novels yet`
    }

    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <div style="font-size: 40px; margin-bottom: 12px; opacity: 0.4;">🔍</div>
        <p style="font-size: 14px;">${escapeHtml(message)}</p>
      </div>
    `
    return
  }

  grid.innerHTML = projects.map(project => createProjectCard(project)).join('')

  grid.querySelectorAll('.novel-card').forEach(card => {
    const projectId = card.dataset.projectId

    card.addEventListener('click', (e) => {
      if (e.target.closest('.novel-card-menu')) return
      openProject(projectId)
    })

    const menuBtn = card.querySelector('.novel-card-menu-btn')
    const menuDropdown = card.querySelector('.novel-card-menu-dropdown')

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      document.querySelectorAll('.novel-card-menu-dropdown.open').forEach(m => {
        if (m !== menuDropdown) m.classList.remove('open')
      })
      menuDropdown.classList.toggle('open')
    })

    card.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
      e.stopPropagation()
      menuDropdown.classList.remove('open')
      openEditModal(projectId)
    })

    card.querySelector('[data-action="duplicate"]').addEventListener('click', (e) => {
      e.stopPropagation()
      menuDropdown.classList.remove('open')
      duplicateProject(projectId)
    })

    card.querySelector('[data-action="backups"]').addEventListener('click', (e) => {
      e.stopPropagation()
      menuDropdown.classList.remove('open')
      openBackupsModal(projectId)
    })

    card.querySelector('[data-action="export"]').addEventListener('click', (e) => {
      e.stopPropagation()
      menuDropdown.classList.remove('open')
      exportProject(projectId)
    })

    card.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
      e.stopPropagation()
      menuDropdown.classList.remove('open')
      openDeleteModal(projectId)
    })
  })
}

function createProjectCard(project) {
  const wordCount = project.totalWords || 0
  const wordGoal = project.wordGoal || 0
  const progress = wordGoal > 0 ? Math.min((wordCount / wordGoal) * 100, 100) : 0
  const chapterCount = project.chapters?.length || 0
  const hasCover = !!project.cover

  if (hasCover) {
    return createCoverCard(project, wordCount, wordGoal, progress, chapterCount)
  }

  return `
    <div class="novel-card" data-project-id="${project.id}">
      <div class="novel-card-header">
        <h3 class="novel-card-title">${escapeHtml(project.title)}</h3>
        <div class="novel-card-menu">
          <button class="novel-card-menu-btn" data-tooltip="Options">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
          <div class="novel-card-menu-dropdown">
            <button class="menu-item" data-action="edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              Edit Details
            </button>
            <button class="menu-item" data-action="duplicate">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
              </svg>
              Duplicate
            </button>
            <button class="menu-item" data-action="backups">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"></path>
                <path d="M8 16H3v5"></path>
              </svg>
              Restore Backup
            </button>
            <button class="menu-item" data-action="export">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export
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
      </div>
      
      ${project.genre ? `<span class="novel-card-genre">${escapeHtml(getGenreLabel(project.genre))}</span>` : ''}
      
      <p class="novel-card-description ${!project.description ? 'empty' : ''}">
        ${escapeHtml(project.description || 'No synopsis yet...')}
      </p>
      
      ${wordGoal > 0 ? `
        <div class="novel-card-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
          <div class="progress-text">
            <span>${formatNumber(wordCount)} words</span>
            <span>${Math.round(progress)}% of ${formatNumber(wordGoal)}</span>
          </div>
        </div>
      ` : `
        <div class="novel-card-progress">
          <div class="progress-text">
            <span>${formatNumber(wordCount)} words written</span>
          </div>
        </div>
      `}
      
      <div class="novel-card-footer">
        <span class="novel-card-footer-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"></path>
          </svg>
          ${chapterCount} chapter${chapterCount !== 1 ? 's' : ''}
        </span>
        <span class="novel-card-footer-item">
          ${formatDate(project.lastModified)}
        </span>
      </div>
    </div>
  `
}

function createCoverCard(project, wordCount, wordGoal, progress, chapterCount) {
  return `
    <div class="novel-card has-cover" data-project-id="${project.id}">
      <div class="novel-card-menu">
        <button class="novel-card-menu-btn" data-tooltip="Options">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="1.5"/>
            <circle cx="12" cy="12" r="1.5"/>
            <circle cx="19" cy="12" r="1.5"/>
          </svg>
        </button>
        <div class="novel-card-menu-dropdown">
          <button class="menu-item" data-action="edit">Edit Details</button>
          <button class="menu-item" data-action="duplicate">Duplicate</button>
          <button class="menu-item" data-action="backups">Restore Backup</button>
          <button class="menu-item" data-action="export">Export</button>
          <button class="menu-item danger" data-action="delete">Delete</button>
        </div>
      </div>
      <div class="novel-card-cover">
        <img src="${project.cover}" alt="${escapeHtml(project.title)}" />
      </div>
      <div class="novel-card-content-overlay">
        <h3 class="novel-card-title">${escapeHtml(project.title)}</h3>
        ${project.genre ? `<span class="novel-card-genre">${escapeHtml(getGenreLabel(project.genre))}</span>` : ''}
        <div class="novel-card-footer">
          <span class="novel-card-footer-item">${chapterCount} ch</span>
          <span class="novel-card-footer-item">${formatNumber(wordCount)}w</span>
          <span class="novel-card-footer-item">${formatDate(project.lastModified)}</span>
        </div>
      </div>
    </div>
  `
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar')
  AppState.sidebarCollapsed = !AppState.sidebarCollapsed
  sidebar.classList.toggle('collapsed', AppState.sidebarCollapsed)
}

function switchSidebarNav(view) {
  if (!AppState.currentProject) {
    showToast('Open a project first', 'info')
    return
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view)
  })

  AppState.currentView = view

  const viewMap = {
    chapters: 'editor', characters: 'characters', notes: 'notes',
    moodboard: 'moodboard', relationships: 'relationships',
    outliner: 'outliner', analytics: 'analytics', bookdesign: 'bookdesign'
  }

  showView(viewMap[view] || 'editor')

  // Update sidebar based on view
  if (view === 'chapters') {
    updateSidebarForProject(AppState.currentProject)
  } else if (view === 'characters') {
    updateSidebarForCharacters(AppState.currentProject)
    showCharactersList()
  } else if (view === 'notes') {
    updateSidebarForNotes(AppState.currentProject)
    showNotesList()
  } else if (view === 'moodboard') {
    updateSidebarForMoodboards(AppState.currentProject)
    showMoodboardView()
  } else if (view === 'relationships') {
    updateSidebarForRelationships(AppState.currentProject)
    showRelationshipsView()
  } else if (view === 'analytics') {
    updateSidebarForAnalytics(AppState.currentProject)
    showAnalyticsView()
  } else if (view === 'bookdesign') {
    updateSidebarForProject(AppState.currentProject)
    showBookDesignView()
  } else if (view === 'outliner') {
    updateSidebarForOutliner(AppState.currentProject)
    showOutlinerView()
  } else {
    updateSidebarForProject(AppState.currentProject)
  }

  updateBreadcrumbs([
    { label: 'Projects', onClick: goToProjectsView },
    { label: AppState.currentProject.title, current: true }
  ])
}

function updateSidebarForNoProject() {
  const content = document.getElementById('sidebar-content')
  content.innerHTML = `
    <div class="sidebar-placeholder">
      <div class="placeholder-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"></path>
        </svg>
      </div>
      <p>Open a project to see chapters</p>
    </div>
  `
}

function updateSidebarForAnalytics(project) {
  const content = document.getElementById('sidebar-content')
  const sessions = project?.analytics?.sessions || []
  const goal = project?.analytics?.dailyGoal || 500
  const mode = project?.analytics?.timerMode || 'writing'

  const today = new Date().toISOString().split('T')[0]
  const todaySessions = sessions.filter(s => s.startTime.startsWith(today))
  const wordsToday = todaySessions.reduce((sum, s) => sum + s.wordsWritten, 0)

  content.innerHTML = `
    <div class="sidebar-section">
      <div class="sidebar-section-header">
        <span>Overview</span>
      </div>
      <div style="padding: 8px 4px;">
        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px;">
          <span style="color: var(--text-muted);">Today</span>
          <span style="color: var(--text-primary); font-weight: 500;">${formatNumber(wordsToday)} words</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px;">
          <span style="color: var(--text-muted);">Daily Goal</span>
          <span style="color: var(--text-primary); font-weight: 500;">${formatNumber(goal)} words</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px;">
          <span style="color: var(--text-muted);">Timer Mode</span>
          <span style="color: var(--text-primary); font-weight: 500;">${mode === 'writing' ? 'Writing only' : 'Project time'}</span>
        </div>
      </div>
    </div>
    
    <div class="sidebar-section">
      <div class="sidebar-section-header">
        <span>Info</span>
      </div>
      <p class="sidebar-empty" style="text-align: left; padding: 8px 4px; font-size: 11px;">
        Stats update automatically. Live session data appears while you're actively writing.
      </p>
    </div>
  `
}

function updateSidebarForProject(project) {
  const content = document.getElementById('sidebar-content')
  const totalWords = project.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0)

  content.innerHTML = `
    <div class="sidebar-section">
      <div class="sidebar-section-header">
        <span>Chapters</span>
        <button class="sidebar-add-btn" id="btn-add-chapter" data-tooltip="New Chapter">+</button>
      </div>
      <div id="chapters-list">
        ${project.chapters.length === 0
      ? '<p class="sidebar-empty">No chapters yet.<br>Click + to add one.</p>'
      : project.chapters.map((ch, index) => createChapterItem(ch, index)).join('')
    }
      </div>
      ${project.chapters.length > 0 ? `
        <div class="chapters-footer">
          <span class="chapters-footer-item">${project.chapters.length} chapter${project.chapters.length !== 1 ? 's' : ''}</span>
          <span class="chapters-footer-item">${formatNumber(totalWords)} words</span>
        </div>
      ` : ''}
    </div>
  `

  document.getElementById('btn-add-chapter')?.addEventListener('click', addNewChapter)
  attachChapterEventListeners()
}

function createChapterItem(chapter, index) {
  const isActive = AppState.currentChapter?.id === chapter.id
  const statusClass = chapter.status || 'draft'
  const statusLabel = getStatusLabel(chapter.status)

  return `
    <div class="chapter-item ${isActive ? 'active' : ''}" 
         data-chapter-id="${chapter.id}" 
         data-chapter-index="${index}"
         draggable="true">
      <div class="chapter-drag-handle">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
          <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
        </svg>
      </div>
      <div class="chapter-item-info">
        <span class="chapter-item-title">${escapeHtml(chapter.title)}</span>
        ${chapter.summary ? `<span class="chapter-item-subtitle">${escapeHtml(chapter.summary.substring(0, 80))}</span>` : ''}
      </div>
      <div class="chapter-item-right">
        <span class="chapter-item-words">${chapter.wordCount || 0}w${chapter.wordGoal ? '<span style="color:' + ((chapter.wordCount || 0) >= chapter.wordGoal ? 'var(--accent-success)' : 'var(--text-muted)') + ';font-size:9px;margin-left:1px;">/' + chapter.wordGoal + '</span>' : ''}</span>
        <span class="chapter-status ${statusClass}">${statusLabel}</span>
      </div>
    </div>
  `
}

function attachChapterEventListeners() {
  const chapterItems = document.querySelectorAll('.chapter-item')

  chapterItems.forEach(item => {
    const chapterId = item.dataset.chapterId

    item.addEventListener('click', (e) => {
      if (e.target.closest('.chapter-drag-handle')) return
      selectChapter(chapterId)
    })

    item.addEventListener('dblclick', (e) => {
      if (e.target.closest('.chapter-drag-handle')) return
      startRenameChapter(chapterId)
    })

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      showChapterContextMenu(e, chapterId)
    })

    item.addEventListener('dragstart', (e) => handleDragStart(e, chapterId))
    item.addEventListener('dragend', handleDragEnd)
    item.addEventListener('dragover', handleDragOver)
    item.addEventListener('dragenter', handleDragEnter)
    item.addEventListener('dragleave', handleDragLeave)
    item.addEventListener('drop', (e) => handleDrop(e, chapterId))
  })
}

function selectChapter(chapterId) {
  if (!AppState.currentProject) return

  if (AppState.currentChapter && AppState.currentChapter.id !== chapterId && Editor.hasUnsavedChanges) {
    saveChapterNow()
  }

  const chapter = AppState.currentProject.chapters.find(ch => ch.id === chapterId)
  if (!chapter) return

  AppState.currentChapter = chapter

  document.querySelectorAll('.chapter-item').forEach(item => {
    item.classList.toggle('active', item.dataset.chapterId === chapterId)
  })

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
    { label: chapter.title, current: true }
  ])

  showView('editor')
  loadChapterIntoEditor(chapter)
}

async function addNewChapter() {
  if (!AppState.currentProject) return

  const chapter = {
    id: generateId(),
    title: `Chapter ${AppState.currentProject.chapters.length + 1}`,
    content: '', summary: '', wordCount: 0, status: 'draft',
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  }

  AppState.currentProject.chapters.push(chapter)
  await saveCurrentProject()
  updateSidebarForProject(AppState.currentProject)
  showToast(`Added "${chapter.title}"`, 'success')
  selectChapter(chapter.id)
}

function startRenameChapter(chapterId) {
  const item = document.querySelector(`.chapter-item[data-chapter-id="${chapterId}"]`)
  if (!item) return

  const titleEl = item.querySelector('.chapter-item-title')
  const chapter = AppState.currentProject.chapters.find(ch => ch.id === chapterId)
  if (!titleEl || !chapter) return

  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'chapter-item-title-input'
  input.value = chapter.title

  titleEl.replaceWith(input)
  input.focus()
  input.select()

  const finishRename = async () => {
    const newTitle = input.value.trim()
    if (newTitle && newTitle !== chapter.title) {
      chapter.title = newTitle
      chapter.lastModified = new Date().toISOString()
      await saveCurrentProject()
      showToast('Chapter renamed', 'success')
    }
    updateSidebarForProject(AppState.currentProject)
    if (AppState.currentChapter?.id === chapterId) selectChapter(chapterId)
  }

  input.addEventListener('blur', finishRename)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur() }
    if (e.key === 'Escape') { input.value = chapter.title; input.blur() }
  })
}

async function duplicateChapter(chapterId) {
  if (!AppState.currentProject) return
  const original = AppState.currentProject.chapters.find(ch => ch.id === chapterId)
  if (!original) return

  const duplicate = JSON.parse(JSON.stringify(original))
  duplicate.id = generateId()
  duplicate.title = original.title + ' (Copy)'
  duplicate.createdAt = new Date().toISOString()
  duplicate.lastModified = new Date().toISOString()

  const index = AppState.currentProject.chapters.findIndex(ch => ch.id === chapterId)
  AppState.currentProject.chapters.splice(index + 1, 0, duplicate)

  await saveCurrentProject()
  updateSidebarForProject(AppState.currentProject)
  showToast(`Duplicated "${original.title}"`, 'success')
}

function openDeleteChapterModal(chapterId) {
  const chapter = AppState.currentProject?.chapters.find(ch => ch.id === chapterId)
  if (!chapter) return

  AppState.chapterToDelete = chapterId
  document.getElementById('delete-chapter-name').textContent = chapter.title
  showModal('modal-delete-chapter')
}

async function confirmDeleteChapter() {
  if (!AppState.chapterToDelete || !AppState.currentProject) return

  const chapter = AppState.currentProject.chapters.find(ch => ch.id === AppState.chapterToDelete)
  AppState.currentProject.chapters = AppState.currentProject.chapters.filter(ch => ch.id !== AppState.chapterToDelete)

  if (AppState.currentChapter?.id === AppState.chapterToDelete) {
    AppState.currentChapter = null
    showEditorEmpty()
  }

  await saveCurrentProject()
  hideModal('modal-delete-chapter')
  updateSidebarForProject(AppState.currentProject)
  showToast(`"${chapter.title}" deleted`, 'success')
  AppState.chapterToDelete = null
}

async function setChapterStatus(chapterId, status) {
  if (!AppState.currentProject) return
  const chapter = AppState.currentProject.chapters.find(ch => ch.id === chapterId)
  if (!chapter) return

  chapter.status = status
  chapter.lastModified = new Date().toISOString()

  await saveCurrentProject()
  updateSidebarForProject(AppState.currentProject)
  if (AppState.currentChapter?.id === chapterId) selectChapter(chapterId)
  showToast(`Status: ${getStatusLabel(status)}`, 'success')
}

function showChapterContextMenu(event, chapterId) {
  closeContextMenu()
  const chapter = AppState.currentProject?.chapters.find(ch => ch.id === chapterId)
  if (!chapter) return

  const menu = document.createElement('div')
  menu.className = 'context-menu'
  menu.innerHTML = `
    <button class="context-menu-item" data-action="rename">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>
      </svg> Rename
    </button>
    <button class="context-menu-item" data-action="duplicate">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
      </svg> Duplicate
    </button>
    <div class="context-menu-divider"></div>
    <div class="context-menu-label">Status</div>
    <div class="context-menu-status ${chapter.status === 'draft' ? 'active' : ''}" data-action="status" data-status="draft"><span class="status-dot draft"></span> Draft</div>
    <div class="context-menu-status ${chapter.status === 'in-progress' ? 'active' : ''}" data-action="status" data-status="in-progress"><span class="status-dot in-progress"></span> In Progress</div>
    <div class="context-menu-status ${chapter.status === 'revised' ? 'active' : ''}" data-action="status" data-status="revised"><span class="status-dot revised"></span> Revised</div>
    <div class="context-menu-status ${chapter.status === 'final' ? 'active' : ''}" data-action="status" data-status="final"><span class="status-dot final"></span> Final</div>
    <div class="context-menu-divider"></div>
    <button class="context-menu-item" data-action="word-goal">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="6"></circle>
        <circle cx="12" cy="12" r="2"></circle>
      </svg>
      Set Word Goal
    </button>
    <div class="context-menu-divider"></div>
    <button class="context-menu-item danger" data-action="delete">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
      </svg> Delete
    </button>
  `

  menu.style.left = `${event.clientX}px`
  menu.style.top = `${event.clientY}px`
  document.body.appendChild(menu)
  AppState.contextMenu = menu

  const rect = menu.getBoundingClientRect()
  if (rect.right > window.innerWidth) menu.style.left = `${window.innerWidth - rect.width - 8}px`
  if (rect.bottom > window.innerHeight) menu.style.top = `${window.innerHeight - rect.height - 8}px`

  menu.querySelector('[data-action="rename"]').addEventListener('click', () => { closeContextMenu(); startRenameChapter(chapterId) })
  menu.querySelector('[data-action="duplicate"]').addEventListener('click', () => { closeContextMenu(); duplicateChapter(chapterId) })
  menu.querySelector('[data-action="word-goal"]').addEventListener('click', () => { closeContextMenu(); setChapterWordGoal(chapterId) })
  menu.querySelector('[data-action="delete"]').addEventListener('click', () => { closeContextMenu(); openDeleteChapterModal(chapterId) })
  menu.querySelectorAll('[data-action="status"]').forEach(btn => {
    btn.addEventListener('click', () => { closeContextMenu(); setChapterStatus(chapterId, btn.dataset.status) })
  })
}

function closeContextMenu() {
  if (AppState.contextMenu) {
    AppState.contextMenu.remove()
    AppState.contextMenu = null
  }
}

function handleDragStart(e, chapterId) {
  AppState.draggedChapter = chapterId
  e.target.classList.add('dragging')
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', chapterId)
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging')
  AppState.draggedChapter = null
  document.querySelectorAll('.chapter-item').forEach(item => {
    item.classList.remove('drag-over', 'drag-over-bottom')
  })
}

function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }

function handleDragEnter(e) {
  e.preventDefault()
  const item = e.target.closest('.chapter-item')
  if (!item || item.dataset.chapterId === AppState.draggedChapter) return

  document.querySelectorAll('.chapter-item').forEach(i => i.classList.remove('drag-over', 'drag-over-bottom'))

  const rect = item.getBoundingClientRect()
  const midY = rect.top + rect.height / 2
  if (e.clientY < midY) item.classList.add('drag-over')
  else item.classList.add('drag-over-bottom')
}

function handleDragLeave(e) {
  const item = e.target.closest('.chapter-item')
  if (item && !item.contains(e.relatedTarget)) item.classList.remove('drag-over', 'drag-over-bottom')
}

async function handleDrop(e, targetChapterId) {
  e.preventDefault()
  if (!AppState.draggedChapter || !AppState.currentProject) return
  if (AppState.draggedChapter === targetChapterId) return

  const chapters = AppState.currentProject.chapters
  const draggedIndex = chapters.findIndex(ch => ch.id === AppState.draggedChapter)
  const targetIndex = chapters.findIndex(ch => ch.id === targetChapterId)
  if (draggedIndex === -1 || targetIndex === -1) return

  const [draggedChapter] = chapters.splice(draggedIndex, 1)
  const targetItem = e.target.closest('.chapter-item')
  const rect = targetItem.getBoundingClientRect()
  const midY = rect.top + rect.height / 2

  let insertIndex = chapters.findIndex(ch => ch.id === targetChapterId)
  if (e.clientY >= midY) insertIndex += 1

  chapters.splice(insertIndex, 0, draggedChapter)

  document.querySelectorAll('.chapter-item').forEach(item => item.classList.remove('drag-over', 'drag-over-bottom', 'dragging'))

  await saveCurrentProject()
  updateSidebarForProject(AppState.currentProject)
  if (AppState.currentChapter?.id === AppState.draggedChapter) selectChapter(AppState.draggedChapter)
  showToast('Chapter reordered', 'success')
  AppState.draggedChapter = null
}

async function createNewProject() {
  const title = document.getElementById('project-title').value.trim()
  const author = document.getElementById('project-author').value.trim()
  const genre = document.getElementById('project-genre').value
  const description = document.getElementById('project-description').value.trim()
  const wordGoal = parseInt(document.getElementById('project-word-goal').value) || 0

  if (!title) {
    const input = document.getElementById('project-title')
    input.focus()
    input.style.borderColor = 'var(--accent-danger)'
    setTimeout(() => input.style.borderColor = '', 2000)
    return
  }

  const project = {
    id: generateId(), title, author, genre, description, wordGoal, totalWords: 0,
    chapters: [], characters: [], notes: [], moodboards: [], relationships: [],
    analytics: { dailyGoal: 500, sessions: [], streak: 0 },
    createdAt: new Date().toISOString(), lastModified: new Date().toISOString(),
    version: '1.0'
  }

  const result = await window.electronAPI.saveProjectData({ projectId: project.id, data: project })

  if (result.success) {
    AppState.allProjects.push(project)
    hideModal('modal-new-project')
    resetNewProjectForm()
    showToast(`"${project.title}" created!`, 'success')
    await openProjectById(project)
  } else {
    showToast('Failed to create project', 'error')
  }
}

async function openProject(projectId) {
  const result = await window.electronAPI.loadProjectData(projectId)
  if (result.success) await openProjectById(result.data)
  else showToast('Could not open project', 'error')
}

async function openProjectById(project) {
  AppState.currentProject = project
  AppState.currentChapter = null
  AppState.currentView = 'chapters'

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === 'chapters')
  })

  updateTopBar()
  updateBreadcrumbs([
    { label: 'Projects', onClick: goToProjectsView },
    { label: project.title, current: true }
  ])

  showView('editor')
  showEditorEmpty()
  updateSidebarForProject(project)

  updateQuickNoteFabVisibility()
  updateSprintLauncherVisibility()
}

function openDeleteModal(projectId) {
  const project = AppState.allProjects.find(p => p.id === projectId)
  if (!project) return
  AppState.projectToDelete = projectId
  document.getElementById('delete-project-name').textContent = project.title
  showModal('modal-confirm-delete')
}

async function confirmDeleteProject() {
  if (!AppState.projectToDelete) return
  const project = AppState.allProjects.find(p => p.id === AppState.projectToDelete)
  const result = await window.electronAPI.deleteProject(AppState.projectToDelete)

  if (result.success) {
    AppState.allProjects = AppState.allProjects.filter(p => p.id !== AppState.projectToDelete)
    hideModal('modal-confirm-delete')
    renderProjectsGrid()
    showToast(`"${project.title}" deleted`, 'success')
    AppState.projectToDelete = null
  } else {
    showToast('Failed to delete project', 'error')
  }
}

function openEditModal(projectId) {
  const project = AppState.allProjects.find(p => p.id === projectId)
  if (!project) return

  AppState.projectToEdit = projectId

  document.getElementById('edit-project-title').value = project.title || ''
  document.getElementById('edit-project-author').value = project.author || ''
  document.getElementById('edit-project-genre').value = project.genre || ''
  document.getElementById('edit-project-description').value = project.description || ''
  document.getElementById('edit-project-word-goal').value = project.wordGoal || ''

  showModal('modal-edit-project')

  setTimeout(() => {
    if (typeof loadCoverIntoEditModal === 'function') loadCoverIntoEditModal()
    const input = document.getElementById('edit-project-title')
    if (input) {
      input.focus()
      input.select()
    }
  }, 100)
}

async function confirmEditProject() {
  if (!AppState.projectToEdit) return

  const newTitle = document.getElementById('edit-project-title').value.trim()
  if (!newTitle) {
    const input = document.getElementById('edit-project-title')
    input.style.borderColor = 'var(--accent-danger)'
    setTimeout(() => input.style.borderColor = '', 2000)
    return
  }

  const project = AppState.allProjects.find(p => p.id === AppState.projectToEdit)
  if (!project) return

  project.title = newTitle
  project.author = document.getElementById('edit-project-author').value.trim()
  project.genre = document.getElementById('edit-project-genre').value
  project.description = document.getElementById('edit-project-description').value.trim()
  project.wordGoal = parseInt(document.getElementById('edit-project-word-goal').value) || 0
  project.lastModified = new Date().toISOString()

  // Cover is already stored on the project object by polish.js's handleCoverUpload
  // So it's saved automatically

  const result = await window.electronAPI.saveProjectData({ projectId: project.id, data: project })

  if (result.success) {
    hideModal('modal-edit-project')
    renderProjectsGrid()
    showToast('Novel details updated', 'success')
    AppState.projectToEdit = null
  } else {
    showToast('Failed to update', 'error')
  }
}

async function duplicateProject(projectId) {
  const original = AppState.allProjects.find(p => p.id === projectId)
  if (!original) return

  const duplicate = JSON.parse(JSON.stringify(original))
  duplicate.id = generateId()
  duplicate.title = original.title + ' (Copy)'
  duplicate.createdAt = new Date().toISOString()
  duplicate.lastModified = new Date().toISOString()

  if (duplicate.chapters) {
    duplicate.chapters.forEach(ch => { ch.id = generateId() })
  }

  const result = await window.electronAPI.saveProjectData({ projectId: duplicate.id, data: duplicate })

  if (result.success) {
    AppState.allProjects.push(duplicate)
    renderProjectsGrid()
    showToast(`Duplicated as "${duplicate.title}"`, 'success')
  }
}

function resetNewProjectForm() {
  document.getElementById('project-title').value = ''
  document.getElementById('project-author').value = ''
  document.getElementById('project-genre').value = ''
  document.getElementById('project-description').value = ''
  document.getElementById('project-word-goal').value = ''
}

async function saveCurrentProject() {
  if (!AppState.currentProject) return

  AppState.currentProject.totalWords = AppState.currentProject.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0)
  AppState.currentProject.lastModified = new Date().toISOString()

  await window.electronAPI.saveProjectData({
    projectId: AppState.currentProject.id,
    data: AppState.currentProject
  })

  const idx = AppState.allProjects.findIndex(p => p.id === AppState.currentProject.id)
  if (idx >= 0) AppState.allProjects[idx] = AppState.currentProject
}

// ============================================
// BACKUPS
// ============================================

async function openBackupsModal(projectId) {
  AppState.backupProjectId = projectId
  const list = document.getElementById('backup-list')
  list.innerHTML = '<p class="no-backups">Loading backups...</p>'

  showModal('modal-backups')

  const result = await window.electronAPI.getProjectBackups(projectId)

  if (!result.success) {
    list.innerHTML = '<p class="no-backups">Could not load backups</p>'
    return
  }

  if (result.backups.length === 0) {
    list.innerHTML = `
      <div class="no-backups">
        <div class="no-backups-icon">📦</div>
        <p>No backups yet</p>
        <p style="font-size: 11px; margin-top: 4px;">Backups are created automatically each time you save.</p>
      </div>
    `
    return
  }

  list.innerHTML = result.backups.map(backup => `
    <div class="backup-item">
      <div class="backup-info">
        <div class="backup-date">${formatDate(backup.createdAt)} at ${new Date(backup.createdAt).toLocaleTimeString()}</div>
        <div class="backup-size">${formatFileSize(backup.size)}</div>
      </div>
      <button class="backup-restore-btn" data-filename="${backup.filename}">Restore</button>
    </div>
  `).join('')

  list.querySelectorAll('.backup-restore-btn').forEach(btn => {
    btn.addEventListener('click', () => restoreBackup(btn.dataset.filename))
  })
}

async function restoreBackup(filename) {
  if (!AppState.backupProjectId) return

  const result = await window.electronAPI.restoreBackup({
    projectId: AppState.backupProjectId,
    filename: filename
  })

  if (result.success) {
    // Update in-memory project list
    const idx = AppState.allProjects.findIndex(p => p.id === AppState.backupProjectId)
    if (idx >= 0) {
      AppState.allProjects[idx] = result.data
    }

    // If this was the currently open project, reload it
    if (AppState.currentProject?.id === AppState.backupProjectId) {
      AppState.currentProject = result.data
      AppState.currentChapter = null
      showEditorEmpty()
      updateSidebarForProject(result.data)
    }

    renderProjectsGrid()
    hideModal('modal-backups')
    showToast('Backup restored successfully', 'success')
  } else {
    showToast('Failed to restore backup', 'error')
  }
}

// ============================================
// EXPORT / IMPORT
// ============================================

async function exportProject(projectId) {
  const project = AppState.allProjects.find(p => p.id === projectId)
  if (!project) return

  const result = await window.electronAPI.exportProjectFile({
    projectId: projectId,
    projectTitle: project.title
  })

  if (result.success) {
    showToast(`Exported to ${result.path}`, 'success', 4000)
  } else if (!result.canceled) {
    showToast('Failed to export', 'error')
  }
}

async function importProjectFile() {
  const result = await window.electronAPI.importProjectFile()

  if (result.success) {
    AppState.allProjects.push(result.project)
    hideModal('modal-storage')
    renderProjectsGrid()
    showToast(`Imported "${result.project.title}"`, 'success')
  } else if (!result.canceled) {
    showToast('Failed to import', 'error')
  }
}

// ============================================
// SETTINGS
// ============================================

async function openSettings() {
  // For now, open the storage modal (settings comes in Stage 15)
  showModal('modal-storage')

  const result = await window.electronAPI.getStorageInfo()
  if (result.success) {
    document.getElementById('storage-info-content').innerHTML = `
      <div class="storage-stat">
        <div class="storage-stat-value">${result.projectCount}</div>
        <div class="storage-stat-label">Projects</div>
      </div>
      <div class="storage-stat">
        <div class="storage-stat-value">${result.backupCount}</div>
        <div class="storage-stat-label">Backups</div>
      </div>
      <div class="storage-stat">
        <div class="storage-stat-value">${formatFileSize(result.totalSize)}</div>
        <div class="storage-stat-label">Total Size</div>
      </div>
      <div class="storage-stat">
        <div class="storage-stat-value">✓</div>
        <div class="storage-stat-label">All Saved</div>
      </div>
    `
    document.getElementById('storage-path').textContent = result.dataPath
  }
}

function applyTheme(theme) {
  document.body.classList.toggle('light-theme', theme === 'light')
}

function showModal(modalId) {
  const modal = document.getElementById(modalId)
  if (!modal) return

  // Force remove hidden class (handles CSS !important conflicts)
  modal.classList.remove('hidden')
  modal.className = modal.className.replace(/\bhidden\b/g, '').trim()

  setTimeout(() => {
    const firstInput = modal.querySelector('input:not([type="hidden"]), textarea')
    if (firstInput) firstInput.focus()
  }, 100)
}

function hideModal(modalId) {
  document.getElementById(modalId)?.classList.add('hidden')
}

function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container')
  const toast = document.createElement('div')
  toast.className = `toast ${type}`

  const iconMap = { success: '✓', error: '✕', info: 'ⓘ' }
  toast.innerHTML = `<span style="font-size: 16px;">${iconMap[type] || ''}</span><span>${escapeHtml(message)}</span>`

  container.appendChild(toast)

  setTimeout(() => {
    toast.classList.add('fade-out')
    setTimeout(() => toast.remove(), 300)
  }, duration)
}

function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9) }

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

function escapeHtml(str) {
  if (!str) return ''
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function formatNumber(num) { return num.toLocaleString('en-US') }

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const mins = Math.floor(diff / (1000 * 60))

  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getGenreLabel(genre) {
  const map = { 'fantasy': 'Fantasy', 'sci-fi': 'Sci-Fi', 'romance': 'Romance', 'thriller': 'Thriller', 'mystery': 'Mystery', 'horror': 'Horror', 'literary': 'Literary', 'historical': 'Historical', 'ya': 'Young Adult', 'childrens': "Children's", 'nonfiction': 'Non-Fiction', 'memoir': 'Memoir', 'other': 'Other' }
  return map[genre] || genre
}

function getStatusLabel(status) {
  const map = { 'draft': 'Draft', 'in-progress': 'Writing', 'revised': 'Revised', 'final': 'Final' }
  return map[status] || 'Draft'
}

function setChapterWordGoal(chapterId) {
  if (!AppState.currentProject) return
  const chapter = AppState.currentProject.chapters.find(ch => ch.id === chapterId)
  if (!chapter) return

  const currentGoal = chapter.wordGoal || 0

  // Build a modal dynamically (since prompt() doesn't work in Electron)
  const overlay = document.createElement('div')
  overlay.className = 'polish-overlay'
  overlay.innerHTML = `
    <div class="polish-modal-box" style="max-width: 400px;">
      <div class="polish-modal-header">
        <h2>Set Word Goal</h2>
        <button class="polish-modal-close">✕</button>
      </div>
      <div class="polish-modal-body">
        <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 12px;">
          Set a word count target for <strong>${escapeHtml(chapter.title)}</strong>
        </p>
        <p style="color: var(--text-muted); font-size: 11px; margin-bottom: 12px;">
          Current: ${chapter.wordCount || 0} words written. Enter 0 to remove the goal.
        </p>
        <div class="form-group">
          <label>Word Goal</label>
          <input type="number" id="chapter-word-goal-input" value="${currentGoal || ''}" placeholder="e.g. 3000" min="0" max="100000" style="width: 100%; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px 12px; border-radius: var(--radius-sm); font-size: 14px; outline: none;" />
        </div>
      </div>
      <div class="polish-modal-footer">
        <button class="btn-secondary" id="chapter-goal-cancel">Cancel</button>
        <button class="btn-primary" id="chapter-goal-save">Save Goal</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  const input = overlay.querySelector('#chapter-word-goal-input')
  input.focus()
  input.select()

  const close = () => overlay.remove()

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('.polish-modal-close').addEventListener('click', close)
  overlay.querySelector('#chapter-goal-cancel').addEventListener('click', close)

  overlay.querySelector('#chapter-goal-save').addEventListener('click', async () => {
    const goal = parseInt(input.value) || 0
    chapter.wordGoal = goal
    chapter.lastModified = new Date().toISOString()

    await saveCurrentProject()
    updateSidebarForProject(AppState.currentProject)

    close()
    showToast(goal > 0 ? `Goal: ${formatNumber(goal)} words for "${chapter.title}"` : 'Word goal removed', 'success')
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') overlay.querySelector('#chapter-goal-save').click()
    if (e.key === 'Escape') close()
  })
}