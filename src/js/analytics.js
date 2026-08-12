// analytics.js
// Writing analytics - session tracking, stats, charts, milestones

const Analytics = {
  sessionStartTime: null,
  sessionStartWords: 0,
  sessionActiveTime: 0, // total ms of active typing this session
  lastActivityTime: null,
  isActive: false,
  isPaused: false,
  windowHasFocus: true,
  lastTickTime: null,
  timerMode: 'writing', // 'writing' or 'project'
  IDLE_TIMEOUT: 60000, // 1 minute for writing mode
  refreshInterval: null,
}

const MILESTONES = [
  { words: 100, icon: '🌱', label: 'First Words' },
  { words: 1000, icon: '📝', label: '1K Words' },
  { words: 5000, icon: '✍️', label: '5K Words' },
  { words: 10000, icon: '📖', label: '10K Words' },
  { words: 25000, icon: '📚', label: '25K Words' },
  { words: 50000, icon: '🎯', label: '50K Words' },
  { words: 75000, icon: '🏆', label: '75K Words' },
  { words: 100000, icon: '🌟', label: '100K Words' },
  { words: 150000, icon: '👑', label: '150K Words' },
  { words: 200000, icon: '💎', label: '200K Words' },
]

// ============================================
// INITIALIZATION
// ============================================

function initAnalytics() {
  document.getElementById('btn-set-daily-goal').addEventListener('click', openDailyGoalModal)
  document.getElementById('btn-save-daily-goal').addEventListener('click', saveDailyGoal)
  
  // Timer mode option selection
  document.querySelectorAll('.timer-mode-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.timer-mode-option').forEach(o => o.classList.remove('selected'))
      opt.classList.add('selected')
    })
  })
  
  // Wait for editor
  if (!Editor.contentEl) {
    setTimeout(initAnalytics, 500)
    return
  }
  
  Editor.contentEl.addEventListener('input', onWritingActivity)
  Editor.contentEl.addEventListener('keydown', onWritingActivity)
  
  // Window focus/blur detection (pauses when app is tabbed out)
  window.addEventListener('focus', () => {
    Analytics.windowHasFocus = true
    if (Analytics.timerMode === 'project' && Analytics.isActive) {
      Analytics.isPaused = false
      Analytics.lastTickTime = Date.now()
    }
    updateSessionDisplay()
  })
  
  window.addEventListener('blur', () => {
    Analytics.windowHasFocus = false
    if (Analytics.isActive) {
      // Save active time up until now
      tickSessionTime()
      Analytics.isPaused = true
    }
    updateSessionDisplay()
  })
  
  // Main timer loop - tick every 1 second
  setInterval(tickSession, 1000)
  
  // Idle check - every 5 seconds (only for writing mode)
  setInterval(checkIdleStatus, 5000)
}

// ============================================
// SESSION TRACKING
// ============================================

function onWritingActivity() {
  if (!AppState.currentProject) return
  
  const now = Date.now()
  Analytics.lastActivityTime = now
  
  // In "writing" mode, unpause on activity
  if (Analytics.timerMode === 'writing') {
    Analytics.isPaused = false
    if (!Analytics.lastTickTime) Analytics.lastTickTime = now
  }
  
  // Start session if not active
  if (!Analytics.isActive) {
    startSession()
  }
}

function startSession() {
  Analytics.isActive = true
  Analytics.isPaused = !Analytics.windowHasFocus && Analytics.timerMode === 'project'
  Analytics.sessionStartTime = Date.now()
  Analytics.sessionStartWords = getCurrentProjectWordCount()
  Analytics.sessionActiveTime = 0
  Analytics.lastTickTime = Date.now()
  
  document.getElementById('editor-session-stats').classList.add('visible')
  updateSessionDisplay()
}

// Called from window blur or before session ends
function tickSessionTime() {
  if (!Analytics.isActive || Analytics.isPaused || !Analytics.lastTickTime) return
  
  const now = Date.now()
  const elapsed = now - Analytics.lastTickTime
  Analytics.sessionActiveTime += elapsed
  Analytics.lastTickTime = now
}

// Runs every second
function tickSession() {
  if (!Analytics.isActive) return
  
  // Determine if we should tick or pause
  let shouldTick = false
  
  if (Analytics.timerMode === 'writing') {
    // Only tick if user has been active in the last IDLE_TIMEOUT
    if (Analytics.lastActivityTime) {
      const idleTime = Date.now() - Analytics.lastActivityTime
      shouldTick = idleTime < Analytics.IDLE_TIMEOUT && Analytics.windowHasFocus
    }
  } else {
    // Project mode: tick if window has focus
    shouldTick = Analytics.windowHasFocus
  }
  
  if (shouldTick) {
    Analytics.isPaused = false
    tickSessionTime()
  } else {
    if (!Analytics.isPaused) {
      // Just paused - save what we accumulated
      tickSessionTime()
    }
    Analytics.isPaused = true
    Analytics.lastTickTime = Date.now() // Reset so we don't add paused time later
  }
  
  updateSessionDisplay()
}

function checkIdleStatus() {
  if (!Analytics.isActive || Analytics.timerMode !== 'writing') return
  if (!Analytics.lastActivityTime) return
  
  const idleTime = Date.now() - Analytics.lastActivityTime
  
  // In writing mode: end session after 3 minutes of complete idleness
  if (idleTime > 3 * 60 * 1000) {
    endSession()
  }
}

function endSession() {
  if (!Analytics.isActive || !Analytics.sessionStartTime) return
  
  // Final tick
  tickSessionTime()
  
  const activeSec = Math.floor(Analytics.sessionActiveTime / 1000)
  const currentWords = getCurrentProjectWordCount()
  const wordsWritten = Math.max(0, currentWords - Analytics.sessionStartWords)
  
  // Only log meaningful sessions
  if (activeSec >= 15 || wordsWritten >= 5) {
    // Cap WPM at realistic values (max 150 wpm)
    let wpm = 0
    if (activeSec >= 30 && wordsWritten >= 5) {
      const rawWpm = (wordsWritten / activeSec) * 60
      wpm = Math.min(150, parseFloat(rawWpm.toFixed(1)))
    }
    
    logSession({
      projectId: AppState.currentProject?.id,
      startTime: new Date(Analytics.sessionStartTime).toISOString(),
      endTime: new Date().toISOString(),
      durationSec: activeSec,
      wordsWritten,
      wpm,
    })
  }
  
  Analytics.isActive = false
  Analytics.isPaused = false
  Analytics.sessionStartTime = null
  Analytics.sessionStartWords = 0
  Analytics.sessionActiveTime = 0
  Analytics.lastActivityTime = null
  Analytics.lastTickTime = null
  
  document.getElementById('editor-session-stats').classList.remove('visible')
}

function updateSessionDisplay() {
  if (!Analytics.isActive) return
  
  const activeSec = Math.floor(Analytics.sessionActiveTime / 1000)
  const min = Math.floor(activeSec / 60)
  const sec = activeSec % 60
  
  const wordsWritten = Math.max(0, getCurrentProjectWordCount() - Analytics.sessionStartWords)
  
  const timeEl = document.getElementById('session-time')
  const wordsEl = document.getElementById('session-words')
  const dotEl = document.getElementById('session-timer-dot')
  
  if (timeEl) timeEl.textContent = `${min}:${sec.toString().padStart(2, '0')}`
  if (wordsEl) wordsEl.textContent = `${wordsWritten} word${wordsWritten !== 1 ? 's' : ''}`
  if (dotEl) dotEl.classList.toggle('paused', Analytics.isPaused)
}

function logSession(session) {
  if (!AppState.currentProject) return
  
  if (!AppState.currentProject.analytics) {
    AppState.currentProject.analytics = { dailyGoal: 500, sessions: [], streak: 0 }
  }
  if (!AppState.currentProject.analytics.sessions) {
    AppState.currentProject.analytics.sessions = []
  }
  
  AppState.currentProject.analytics.sessions.push(session)
  
  // Keep only last 5 years worth
  if (AppState.currentProject.analytics.sessions.length > 365 * 5) {
    AppState.currentProject.analytics.sessions = AppState.currentProject.analytics.sessions.slice(-365 * 5)
  }
  
  saveCurrentProject()
  checkMilestones()
  
  // Refresh analytics view if visible
  if (AppState.currentView === 'analytics') {
    showAnalyticsView()
  }
}

function getCurrentProjectWordCount() {
  if (!AppState.currentProject) return 0
  return (AppState.currentProject.chapters || []).reduce(
    (sum, ch) => sum + (ch.wordCount || 0), 0
  )
}

// ============================================
// VIEW: ANALYTICS DASHBOARD
// ============================================

function showAnalyticsView() {
  if (!AppState.currentProject) return
  
  // Load timer mode preference from project
  if (AppState.currentProject.analytics?.timerMode) {
    Analytics.timerMode = AppState.currentProject.analytics.timerMode
  }
  
  renderStatsGrid()
  renderDailyGoal()
  renderDailyChart()
  renderHeatmap()
  renderChapterProgress()
  renderMilestones()
  updateAnalyticsSubtitle()
  
  // Auto-refresh every 10 seconds while viewing
  clearInterval(Analytics.refreshInterval)
  Analytics.refreshInterval = setInterval(() => {
    if (AppState.currentView === 'analytics') {
      renderStatsGrid()
      renderDailyGoal()
      updateAnalyticsSubtitle()
    } else {
      clearInterval(Analytics.refreshInterval)
    }
  }, 10000)
}

function updateAnalyticsSubtitle() {
  const totalWords = getCurrentProjectWordCount()
  
  let subtitle = 'Track your progress and stay motivated'
  if (totalWords > 0) {
    subtitle = `Total: ${formatNumber(totalWords)} words written`
  }
  
  const el = document.getElementById('analytics-subtitle')
  if (el) el.textContent = subtitle
}

function renderStatsGrid() {
  const grid = document.getElementById('stats-grid')
  if (!grid) return
  
  const sessions = AppState.currentProject?.analytics?.sessions || []
  
  const today = new Date().toISOString().split('T')[0]
  const todaySessions = sessions.filter(s => s.startTime.startsWith(today))
  const wordsToday = todaySessions.reduce((sum, s) => sum + s.wordsWritten, 0)
  
  // Add live session words to today's total (if active session is today)
  let liveTodayWords = wordsToday
  if (Analytics.isActive && Analytics.sessionStartTime) {
    const sessionDate = new Date(Analytics.sessionStartTime).toISOString().split('T')[0]
    if (sessionDate === today) {
      const liveWords = Math.max(0, getCurrentProjectWordCount() - Analytics.sessionStartWords)
      liveTodayWords += liveWords
    }
  }
  
  const totalWords = getCurrentProjectWordCount()
  const avgWpm = calculateAverageWPM()
  const bestDay = calculateBestDay()
  
  // Total time = sum of all session durations + current active session time
  let totalSec = sessions.reduce((sum, s) => sum + (s.durationSec || 0), 0)
  if (Analytics.isActive) {
    totalSec += Math.floor(Analytics.sessionActiveTime / 1000)
  }
  
  const isWritingNow = Analytics.isActive
  const currentSessionWords = isWritingNow ? Math.max(0, totalWords - Analytics.sessionStartWords) : 0
  
  grid.innerHTML = `
    ${isWritingNow ? `
      <div class="stat-card live">
        <div class="stat-card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div class="stat-card-label">Writing Now ${Analytics.isPaused ? '(paused)' : ''}</div>
        <div class="stat-card-value">${currentSessionWords}<span class="unit">words</span></div>
        <div class="stat-card-sublabel">This session</div>
      </div>
    ` : ''}
    
    <div class="stat-card">
      <div class="stat-card-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </div>
      <div class="stat-card-label">Today</div>
      <div class="stat-card-value">${formatNumber(liveTodayWords)}<span class="unit">words</span></div>
      <div class="stat-card-sublabel">${todaySessions.length} session${todaySessions.length !== 1 ? 's' : ''}</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-card-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="13 17 18 12 13 7"></polyline>
          <polyline points="6 17 11 12 6 7"></polyline>
        </svg>
      </div>
      <div class="stat-card-label">Avg WPM</div>
      <div class="stat-card-value">${avgWpm}<span class="unit">wpm</span></div>
      <div class="stat-card-sublabel">${avgWpm > 0 ? 'Your typing pace' : 'Write more for data'}</div>
    </div>
    
    <div class="stat-card success">
      <div class="stat-card-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"></path>
        </svg>
      </div>
      <div class="stat-card-label">Total Words</div>
      <div class="stat-card-value">${formatNumber(totalWords)}</div>
      <div class="stat-card-sublabel">${(AppState.currentProject.chapters || []).length} chapter${(AppState.currentProject.chapters || []).length !== 1 ? 's' : ''}</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-card-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="7"></circle>
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
        </svg>
      </div>
      <div class="stat-card-label">Best Day</div>
      <div class="stat-card-value">${formatNumber(bestDay.words)}<span class="unit">words</span></div>
      <div class="stat-card-sublabel">${bestDay.date || 'No data yet'}</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-card-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </div>
      <div class="stat-card-label">Total Time</div>
      <div class="stat-card-value">${formatDuration(totalSec)}</div>
      <div class="stat-card-sublabel">Time spent writing</div>
    </div>
  `
}

function renderDailyGoal() {
  const card = document.getElementById('daily-goal-card')
  if (!card) return
  
  const goal = AppState.currentProject?.analytics?.dailyGoal || 500
  const sessions = AppState.currentProject?.analytics?.sessions || []
  
  const today = new Date().toISOString().split('T')[0]
  let wordsToday = sessions
    .filter(s => s.startTime.startsWith(today))
    .reduce((sum, s) => sum + s.wordsWritten, 0)
  
  // Add live session words if today
  if (Analytics.isActive && Analytics.sessionStartTime) {
    const sessionDate = new Date(Analytics.sessionStartTime).toISOString().split('T')[0]
    if (sessionDate === today) {
      wordsToday += Math.max(0, getCurrentProjectWordCount() - Analytics.sessionStartWords)
    }
  }
  
  const percent = goal > 0 ? Math.min(100, Math.round((wordsToday / goal) * 100)) : 0
  const remaining = Math.max(0, goal - wordsToday)
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (percent / 100) * circumference
  
  card.innerHTML = `
    <div class="circular-progress">
      <svg viewBox="0 0 100 100">
        <circle class="circular-progress-bg" cx="50" cy="50" r="45"/>
        <circle class="circular-progress-fill ${percent >= 100 ? 'complete' : ''}" 
                cx="50" cy="50" r="45"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${strokeDashoffset}"/>
      </svg>
      <div class="circular-progress-text">
        <div class="circular-progress-percent">${percent}%</div>
        <div class="circular-progress-label">of goal</div>
      </div>
    </div>
    <div class="daily-goal-info">
      <h3>${percent >= 100 ? '🎉 Goal reached!' : `${formatNumber(remaining)} words to go`}</h3>
      <p><strong>${formatNumber(wordsToday)}</strong> of <strong>${formatNumber(goal)}</strong> words written today</p>
      <p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">
        ${percent >= 100 
          ? 'Amazing work! Come back tomorrow to keep your streak.' 
          : percent >= 50 
            ? "You're more than halfway there!" 
            : percent > 0 
              ? "Great start — keep writing!" 
              : "Every word counts. Open a chapter and start."}
      </p>
    </div>
  `
}

function renderDailyChart() {
  const container = document.getElementById('daily-chart')
  if (!container) return
  
  const sessions = AppState.currentProject?.analytics?.sessions || []
  
  const days = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    const wordsThisDay = sessions
      .filter(s => s.startTime.startsWith(dateStr))
      .reduce((sum, s) => sum + s.wordsWritten, 0)
    
    days.push({
      date: dateStr,
      words: wordsThisDay,
      isToday: i === 0,
      label: date.toLocaleDateString('en-US', { day: 'numeric' })
    })
  }
  
  const maxWords = Math.max(...days.map(d => d.words), 100)
  
  container.innerHTML = days.map(day => {
    const heightPercent = maxWords > 0 ? (day.words / maxWords) * 100 : 0
    return `
      <div class="chart-bar-column">
        <div class="chart-tooltip">
          <strong>${formatNumber(day.words)}</strong> words<br>
          ${new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
        <div class="chart-bar ${day.isToday ? 'today' : ''} ${day.words === 0 ? 'empty' : ''}" 
             style="height: ${Math.max(2, heightPercent)}%"></div>
        <div class="chart-label">${day.label}</div>
      </div>
    `
  }).join('')
}

function renderHeatmap() {
  const grid = document.getElementById('heatmap-grid')
  if (!grid) return
  
  const sessions = AppState.currentProject?.analytics?.sessions || []
  
  const dailyWords = {}
  sessions.forEach(s => {
    const date = s.startTime.split('T')[0]
    dailyWords[date] = (dailyWords[date] || 0) + s.wordsWritten
  })
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 364)
  
  while (startDate.getDay() !== 0) {
    startDate.setDate(startDate.getDate() - 1)
  }
  
  const cells = []
  const current = new Date(startDate)
  
  while (current <= today) {
    const dateStr = current.toISOString().split('T')[0]
    const words = dailyWords[dateStr] || 0
    const level = getHeatmapLevel(words)
    const isToday = dateStr === today.toISOString().split('T')[0]
    
    cells.push(`
      <div class="heatmap-cell level-${level} ${isToday ? 'today' : ''}"
           title="${current.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: ${formatNumber(words)} words"></div>
    `)
    
    current.setDate(current.getDate() + 1)
  }
  
  grid.innerHTML = cells.join('')
}

function getHeatmapLevel(words) {
  if (words === 0) return 0
  if (words < 100) return 1
  if (words < 500) return 2
  if (words < 1500) return 3
  return 4
}

function renderChapterProgress() {
  const list = document.getElementById('chapters-progress-list')
  if (!list) return
  
  const chapters = AppState.currentProject?.chapters || []
  
  if (chapters.length === 0) {
    list.innerHTML = `<div class="analytics-empty-state">No chapters yet</div>`
    return
  }
  
  const maxWords = Math.max(...chapters.map(c => c.wordCount || 0), 1000)
  
  list.innerHTML = chapters.map(chapter => {
    const words = chapter.wordCount || 0
    const percent = (words / maxWords) * 100
    const highClass = percent > 70 ? 'high' : ''
    
    return `
      <div class="chapter-progress-item" data-chapter-id="${chapter.id}">
        <div class="chapter-progress-info">
          <div class="chapter-progress-name">${escapeHtml(chapter.title)}</div>
          <div class="chapter-progress-bar">
            <div class="chapter-progress-fill ${highClass}" style="width: ${percent}%"></div>
          </div>
        </div>
        <div class="chapter-progress-words">${formatNumber(words)} words</div>
      </div>
    `
  }).join('')
  
  list.querySelectorAll('.chapter-progress-item').forEach(item => {
    item.addEventListener('click', () => {
      const chapterId = item.dataset.chapterId
      switchSidebarNav('chapters')
      setTimeout(() => selectChapter(chapterId), 100)
    })
  })
}

function renderMilestones() {
  const grid = document.getElementById('milestones-grid')
  if (!grid) return
  
  const totalWords = getCurrentProjectWordCount()
  
  grid.innerHTML = MILESTONES.map(m => {
    const unlocked = totalWords >= m.words
    return `
      <div class="milestone ${unlocked ? 'unlocked' : 'locked'}">
        <div class="milestone-icon">${m.icon}</div>
        <div class="milestone-value">${formatNumber(m.words)}</div>
        <div class="milestone-label">${m.label}</div>
      </div>
    `
  }).join('')
}

function checkMilestones() {
  if (!AppState.currentProject) return
  
  const totalWords = getCurrentProjectWordCount()
  if (!AppState.currentProject.analytics.unlockedMilestones) {
    AppState.currentProject.analytics.unlockedMilestones = []
  }
  
  const unlocked = AppState.currentProject.analytics.unlockedMilestones
  
  MILESTONES.forEach(m => {
    if (totalWords >= m.words && !unlocked.includes(m.words)) {
      unlocked.push(m.words)
      showToast(`🎉 Milestone unlocked: ${m.label}!`, 'success', 4000)
    }
  })
}

// ============================================
// CALCULATIONS
// ============================================

function calculateAverageWPM() {
  const sessions = AppState.currentProject?.analytics?.sessions || []
  // Only count sessions with at least 2 minutes and 10+ words for accuracy
  const validSessions = sessions.filter(s => 
    s.wpm > 0 && 
    s.wpm < 150 && 
    s.durationSec >= 120 &&   // 2+ minutes
    s.wordsWritten >= 10
  )
  
  if (validSessions.length === 0) return '0.0'
  
  // Calculate precise WPM using totals (more accurate than averaging averages)
  const totalWords = validSessions.reduce((total, s) => total + s.wordsWritten, 0)
  const totalSec = validSessions.reduce((total, s) => total + s.durationSec, 0)
  
  const wpm = (totalWords / totalSec) * 60
  return wpm.toFixed(1)  // Returns like "15.2"
}

function calculateBestDay() {
  const sessions = AppState.currentProject?.analytics?.sessions || []
  const dailyWords = {}
  
  sessions.forEach(s => {
    const date = s.startTime.split('T')[0]
    dailyWords[date] = (dailyWords[date] || 0) + s.wordsWritten
  })
  
  let best = { date: null, words: 0 }
  Object.entries(dailyWords).forEach(([date, words]) => {
    if (words > best.words) {
      best = { date, words }
    }
  })
  
  if (best.date) {
    const d = new Date(best.date)
    best.date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  
  return best
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours < 24) return `${hours}h ${mins}m`
  const days = Math.floor(hours / 24)
  const hrs = hours % 24
  return `${days}d ${hrs}h`
}

// ============================================
// DAILY GOAL MODAL (with timer mode)
// ============================================

function openDailyGoalModal() {
  const currentGoal = AppState.currentProject?.analytics?.dailyGoal || 500
  const currentMode = AppState.currentProject?.analytics?.timerMode || 'writing'
  
  document.getElementById('daily-goal-input').value = currentGoal
  
  document.querySelectorAll('.timer-mode-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.mode === currentMode)
  })
  
  showModal('modal-daily-goal')
}

async function saveDailyGoal() {
  const goal = parseInt(document.getElementById('daily-goal-input').value) || 0
  if (goal < 0) return
  
  const selectedMode = document.querySelector('.timer-mode-option.selected')?.dataset.mode || 'writing'
  
  if (!AppState.currentProject.analytics) {
    AppState.currentProject.analytics = { dailyGoal: 500, sessions: [], streak: 0 }
  }
  
  AppState.currentProject.analytics.dailyGoal = goal
  AppState.currentProject.analytics.timerMode = selectedMode
  Analytics.timerMode = selectedMode
  
  await saveCurrentProject()
  
  hideModal('modal-daily-goal')
  renderDailyGoal()
  showToast(`Settings saved`, 'success')
}