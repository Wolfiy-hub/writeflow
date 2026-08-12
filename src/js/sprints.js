// sprints.js
// Writing sprints (Pomodoro-style) - Single & Continuous with break lock

const Sprints = {
    isActive: false,
    isPaused: false,
    isBreak: false,
    duration: 15 * 60,
    breakDuration: 5 * 60,
    remainingSec: 0,
    startTime: null,
    startWords: 0,
    wordGoal: 0,
    interval: null,

    // Continuous mode
    isContinuous: false,
    totalSprints: 3,
    currentSprintIndex: 0, // 0-based
    overallGoal: 0,
    overallStartWords: 0,

    // Setup selections
    setupType: 'single',
    singleDuration: 15,
    continuousSprintDuration: 20,
    continuousBreakDuration: 5,
    continuousCount: 3,

    settings: {
        autoBreak: true,
        playSound: true,
    },
}

// ============================================
// INITIALIZATION
// ============================================

function initSprints() {
    try {
        const saved = localStorage.getItem('writeflow-sprint-settings')
        if (saved) {
            const s = JSON.parse(saved)
            Sprints.settings = { ...Sprints.settings, ...s }
        }
    } catch (e) { }

    document.getElementById('sprint-launcher').addEventListener('click', () => {
        if (Sprints.isActive) return
        openSprintSetup()
    })

    // Type tabs
    document.querySelectorAll('.sprint-type-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const type = tab.dataset.type
            Sprints.setupType = type
            document.querySelectorAll('.sprint-type-tab').forEach(t => t.classList.remove('active'))
            tab.classList.add('active')
            document.querySelectorAll('.sprint-mode-content').forEach(c => c.classList.remove('active'))
            document.getElementById(type === 'single' ? 'single-mode' : 'continuous-mode').classList.add('active')
            if (type === 'continuous') updatePreview()
        })
    })

    // Single mode duration
    document.querySelectorAll('.sprint-duration-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sprint-duration-btn').forEach(b => b.classList.remove('selected'))
            btn.classList.add('selected')
            Sprints.singleDuration = parseInt(btn.dataset.minutes)
        })
    })

    // Continuous mode sprint duration
    document.querySelectorAll('.sprint-mini-duration-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sprint-mini-duration-btn').forEach(b => b.classList.remove('selected'))
            btn.classList.add('selected')
            Sprints.continuousSprintDuration = parseInt(btn.dataset.minutes)
            updatePreview()
        })
    })

    // Continuous mode break duration
    document.querySelectorAll('.break-duration-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.break-duration-btn').forEach(b => b.classList.remove('selected'))
            btn.classList.add('selected')
            Sprints.continuousBreakDuration = parseInt(btn.dataset.minutes)
            updatePreview()
        })
    })

    // Stepper for sprint count
    document.getElementById('stepper-minus').addEventListener('click', () => {
        if (Sprints.continuousCount > 2) {
            Sprints.continuousCount--
            document.getElementById('sprint-count-value').textContent = Sprints.continuousCount
            updateStepperButtons()
            updatePreview()
        }
    })
    document.getElementById('stepper-plus').addEventListener('click', () => {
        if (Sprints.continuousCount < 10) {
            Sprints.continuousCount++
            document.getElementById('sprint-count-value').textContent = Sprints.continuousCount
            updateStepperButtons()
            updatePreview()
        }
    })

    document.getElementById('sprint-total-goal').addEventListener('input', updatePreview)

    // Toggles
    document.getElementById('sprint-toggle-break').addEventListener('click', function () {
        this.classList.toggle('on')
        this.dataset.on = this.classList.contains('on') ? 'true' : 'false'
    })
    document.getElementById('sprint-toggle-sound').addEventListener('click', function () {
        this.classList.toggle('on')
        this.dataset.on = this.classList.contains('on') ? 'true' : 'false'
    })

    document.getElementById('btn-start-sprint').addEventListener('click', startSprintFromSetup)

    // Sprint bar controls
    document.getElementById('sprint-bar-pause').addEventListener('click', togglePauseSprint)
    document.getElementById('sprint-bar-stop').addEventListener('click', () => {
        const msg = Sprints.isBreak
            ? 'End the break and stop the sprint session?'
            : 'End sprint early? Progress will be saved.'
        if (confirm(msg)) {
            endEverything(true)
        }
    })

    // Sprint complete modal
    document.getElementById('btn-sprint-done').addEventListener('click', () => hideModal('modal-sprint-complete'))
    document.getElementById('btn-sprint-another').addEventListener('click', () => {
        hideModal('modal-sprint-complete')
        setTimeout(() => openSprintSetup(), 300)
    })

    document.getElementById('btn-break-done').addEventListener('click', () => hideModal('modal-break-complete'))
    document.getElementById('btn-start-new-sprint').addEventListener('click', () => {
        hideModal('modal-break-complete')
        setTimeout(() => openSprintSetup(), 300)
    })

    // Break lock skip button
    document.getElementById('break-lock-skip').addEventListener('click', () => {
        if (confirm('Skip the break and start the next sprint?')) {
            Sprints.remainingSec = 0
            // Force tick to trigger completion
            tickSprint()
        }
    })

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
            e.preventDefault()
            if (!Sprints.isActive) openSprintSetup()
        }
    })

    updateStepperButtons()
}

function updateStepperButtons() {
    document.getElementById('stepper-minus').disabled = Sprints.continuousCount <= 2
    document.getElementById('stepper-plus').disabled = Sprints.continuousCount >= 10
}

// ============================================
// LIVE PREVIEW (Continuous Mode)
// ============================================

function updatePreview() {
    const content = document.getElementById('sprint-preview-content')
    if (!content) return

    const count = Sprints.continuousCount
    const sprintMin = Sprints.continuousSprintDuration
    const breakMin = Sprints.continuousBreakDuration
    const totalGoal = parseInt(document.getElementById('sprint-total-goal').value) || 0

    const totalWorkMin = count * sprintMin
    const totalBreakMin = (count - 1) * breakMin
    const totalTimeMin = totalWorkMin + totalBreakMin
    const wordsPerSprint = totalGoal > 0 ? Math.ceil(totalGoal / count) : 0

    // Build timeline pills
    let timeline = ''
    for (let i = 0; i < count; i++) {
        timeline += `<span class="timeline-pill sprint">Sprint ${i + 1}</span>`
        if (i < count - 1) {
            timeline += `<span class="timeline-pill break">${breakMin}m</span>`
        }
    }

    content.innerHTML = `
    <div class="sprint-preview-row">
      <span>Writing time</span>
      <strong>${count} × ${sprintMin}min = ${totalWorkMin}min</strong>
    </div>
    <div class="sprint-preview-row">
      <span>Break time</span>
      <strong>${count - 1} × ${breakMin}min = ${totalBreakMin}min</strong>
    </div>
    <div class="sprint-preview-row">
      <span>Total time</span>
      <strong>${formatTotalTime(totalTimeMin)}</strong>
    </div>
    ${totalGoal > 0 ? `
      <div class="sprint-preview-row">
        <span>Words per sprint</span>
        <strong>${wordsPerSprint} words</strong>
      </div>
    ` : ''}
    <div class="sprint-preview-timeline">${timeline}</div>
  `
}

function formatTotalTime(minutes) {
    if (minutes < 60) return `${minutes}min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m === 0 ? `${h}h` : `${h}h ${m}min`
}

// ============================================
// LAUNCHER VISIBILITY
// ============================================

function updateSprintLauncherVisibility() {
    const launcher = document.getElementById('sprint-launcher')
    if (AppState.currentProject) {
        launcher.classList.add('visible')
    } else {
        launcher.classList.remove('visible')
        if (Sprints.isActive) endEverything(true)
    }
}

// ============================================
// OPEN SETUP
// ============================================

function openSprintSetup() {
    if (!AppState.currentProject) {
        showToast('Open a project first', 'info')
        return
    }

    // Safety: if state is stale/corrupted, force clean it
    if (!Sprints.isActive) {
        hideBreakLock()
        hideSprintBar()
        document.getElementById('sprint-launcher').classList.remove('active')
        clearInterval(Sprints.interval)
        Sprints.interval = null
    }

    document.getElementById('sprint-toggle-sound').classList.toggle('on', Sprints.settings.playSound)
    document.getElementById('sprint-toggle-sound').dataset.on = Sprints.settings.playSound
    document.getElementById('sprint-toggle-break').classList.toggle('on', Sprints.settings.autoBreak)
    document.getElementById('sprint-toggle-break').dataset.on = Sprints.settings.autoBreak

    updatePreview()
    showModal('modal-sprint-setup')
}

function saveSprintSettings() {
    try {
        localStorage.setItem('writeflow-sprint-settings', JSON.stringify(Sprints.settings))
    } catch (e) { }
}

// ============================================
// START SPRINT
// ============================================

function startSprintFromSetup() {
    const playSound = document.getElementById('sprint-toggle-sound').dataset.on === 'true'
    Sprints.settings.playSound = playSound

    if (Sprints.setupType === 'single') {
        const autoBreak = document.getElementById('sprint-toggle-break').dataset.on === 'true'
        Sprints.settings.autoBreak = autoBreak
        const wordGoal = parseInt(document.getElementById('sprint-word-goal').value) || 0

        Sprints.isContinuous = false
        Sprints.totalSprints = 1
        Sprints.currentSprintIndex = 0
        Sprints.overallGoal = 0
        Sprints.wordGoal = wordGoal
        Sprints.duration = Sprints.singleDuration * 60
        Sprints.breakDuration = 5 * 60

    } else {
        // Continuous
        Sprints.isContinuous = true
        Sprints.totalSprints = Sprints.continuousCount
        Sprints.currentSprintIndex = 0
        Sprints.overallGoal = parseInt(document.getElementById('sprint-total-goal').value) || 0
        Sprints.wordGoal = Sprints.overallGoal > 0 ? Math.ceil(Sprints.overallGoal / Sprints.totalSprints) : 0
        Sprints.duration = Sprints.continuousSprintDuration * 60
        Sprints.breakDuration = Sprints.continuousBreakDuration * 60
        Sprints.overallStartWords = getCurrentProjectWordCount()
        Sprints.settings.autoBreak = true // always for continuous
    }

    saveSprintSettings()
    hideModal('modal-sprint-setup')

    startNextSprint()
}

function startNextSprint() {
    Sprints.isActive = true
    Sprints.isPaused = false
    Sprints.isBreak = false
    Sprints.remainingSec = Sprints.duration
    Sprints.startTime = Date.now()
    Sprints.startWords = getCurrentProjectWordCount()

    hideBreakLock()
    showSprintBar()
    updateSprintBar()

    document.getElementById('sprint-launcher').classList.add('active')

    clearInterval(Sprints.interval)
    Sprints.interval = setInterval(tickSprint, 1000)

    const sprintNum = Sprints.currentSprintIndex + 1
    const total = Sprints.totalSprints

    if (Sprints.isContinuous) {
        showToast(`🏃 Sprint ${sprintNum} of ${total} started!`, 'success', 2500)
    } else {
        showToast(`🏃 ${Sprints.singleDuration}-minute sprint started!`, 'success', 2500)
    }

    // Focus editor
    if (AppState.currentChapter) {
        switchSidebarNav('chapters')
        setTimeout(() => Editor.contentEl?.focus(), 200)
    }
}

// ============================================
// TICK
// ============================================

function tickSprint() {
    if (Sprints.isPaused) return

    Sprints.remainingSec--

    if (Sprints.remainingSec <= 0) {
        if (Sprints.isBreak) {
            completeBreak()
        } else {
            completeSprint()
        }
        return
    }

    updateSprintBar()

    // Also update break lock timer if active
    if (Sprints.isBreak) {
        updateBreakLockDisplay()
    }
}

function togglePauseSprint() {
    Sprints.isPaused = !Sprints.isPaused
    updateSprintBar()

    const pauseBtn = document.getElementById('sprint-bar-pause')
    if (Sprints.isPaused) {
        pauseBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`
        pauseBtn.title = 'Resume'
    } else {
        pauseBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`
        pauseBtn.title = 'Pause'
    }
}

// ============================================
// COMPLETE SPRINT
// ============================================

function completeSprint() {
    clearInterval(Sprints.interval)

    const wordsWritten = getCurrentProjectWordCount() - Sprints.startWords
    const goalReached = Sprints.wordGoal > 0 && wordsWritten >= Sprints.wordGoal

    logSprint({
        startTime: new Date(Sprints.startTime).toISOString(),
        endTime: new Date().toISOString(),
        duration: Sprints.duration,
        wordsWritten,
        wordGoal: Sprints.wordGoal,
        goalReached,
        completed: true,
        isContinuous: Sprints.isContinuous,
        sprintNumber: Sprints.currentSprintIndex + 1,
        totalSprints: Sprints.totalSprints
    })

    if (Sprints.settings.playSound) {
        playBeep(880, 300)
        setTimeout(() => playBeep(1108, 400), 200)
    }

    const isLastSprint = Sprints.currentSprintIndex + 1 >= Sprints.totalSprints

    if (Sprints.isContinuous && !isLastSprint) {
        // Continuous mode - start break, then next sprint
        showToast(`✅ Sprint ${Sprints.currentSprintIndex + 1} of ${Sprints.totalSprints} done!`, 'success', 2500)
        setTimeout(() => startBreak(), 1000)
    } else {
        // Last sprint or single sprint - show completion
        Sprints.isActive = false
        hideSprintBar()
        document.getElementById('sprint-launcher').classList.remove('active')

        showSprintCompleteModal(wordsWritten, Sprints.duration, goalReached, isLastSprint && Sprints.isContinuous)

        // Single mode with auto-break
        if (!Sprints.isContinuous && Sprints.settings.autoBreak) {
            setTimeout(() => startBreak(), 3500)
        }
    }
}

// ============================================
// BREAK
// ============================================

function startBreak() {
    Sprints.isActive = true
    Sprints.isBreak = true
    Sprints.isPaused = false
    Sprints.duration = Sprints.breakDuration
    Sprints.remainingSec = Sprints.breakDuration
    Sprints.startTime = Date.now()

    showSprintBar()
    updateSprintBar()
    showBreakLock()

    document.getElementById('sprint-launcher').classList.add('active')

    clearInterval(Sprints.interval)
    Sprints.interval = setInterval(tickSprint, 1000)

    const breakMin = Math.round(Sprints.breakDuration / 60)
    showToast(`☕ ${breakMin}-minute break — enjoy!`, 'info', 2500)
}

function completeBreak() {
    clearInterval(Sprints.interval)
    hideBreakLock()

    if (Sprints.settings.playSound) {
        playBeep(660, 300)
        setTimeout(() => playBeep(880, 400), 200)
    }

    if (Sprints.isContinuous) {
        // Move to next sprint automatically
        Sprints.currentSprintIndex++
        hideSprintBar()
        document.getElementById('sprint-launcher').classList.remove('active')
        showToast(`⏰ Break's over — Sprint ${Sprints.currentSprintIndex + 1} starting!`, 'info', 2000)
        setTimeout(() => startNextSprint(), 1500)
    } else {
        // Single mode - just show break complete modal
        Sprints.isActive = false
        Sprints.isBreak = false
        hideSprintBar()
        document.getElementById('sprint-launcher').classList.remove('active')
        showModal('modal-break-complete')
    }
}

// ============================================
// BREAK LOCK OVERLAY
// ============================================

function showBreakLock() {
    const overlay = document.getElementById('break-lock-overlay')
    overlay.classList.add('visible')

    const messageEl = document.getElementById('break-lock-message')
    const progressEl = document.getElementById('break-lock-progress')

    if (Sprints.isContinuous) {
        const currentBreak = Sprints.currentSprintIndex + 1
        const totalBreaks = Sprints.totalSprints - 1
        const nextSprint = Sprints.currentSprintIndex + 2

        messageEl.textContent = 'Rest your mind. Get up, stretch, drink water. The editor will unlock when your break is done.'
        progressEl.textContent = `Break ${currentBreak} of ${totalBreaks} • Next: Sprint ${nextSprint} of ${Sprints.totalSprints}`
        progressEl.style.display = 'inline-block'
    } else {
        messageEl.textContent = 'Rest your mind. Get up, stretch, drink water. The editor will unlock when your break is done.'
        progressEl.style.display = 'none'
    }

    updateBreakLockDisplay()
}

function hideBreakLock() {
    document.getElementById('break-lock-overlay').classList.remove('visible')
}

function updateBreakLockDisplay() {
    const timerEl = document.getElementById('break-lock-timer')
    const min = Math.floor(Sprints.remainingSec / 60)
    const sec = Sprints.remainingSec % 60
    timerEl.textContent = `${min}:${sec.toString().padStart(2, '0')}`
}

// ============================================
// END EVERYTHING (user cancels)
// ============================================

function endEverything(userEnded) {
    clearInterval(Sprints.interval)

    if (userEnded && Sprints.isActive && !Sprints.isBreak) {
        const wordsWritten = getCurrentProjectWordCount() - Sprints.startWords
        const actualDurationSec = Sprints.duration - Sprints.remainingSec

        if (actualDurationSec >= 30) {
            logSprint({
                startTime: new Date(Sprints.startTime).toISOString(),
                endTime: new Date().toISOString(),
                duration: actualDurationSec,
                wordsWritten,
                wordGoal: Sprints.wordGoal,
                goalReached: Sprints.wordGoal > 0 && wordsWritten >= Sprints.wordGoal,
                completed: false,
                endedEarly: true
            })
        }

        showToast('Sprint ended', 'info')
    }

    // CRITICAL: Force cleanup of all sprint state
    Sprints.isActive = false
    Sprints.isPaused = false
    Sprints.isBreak = false
    Sprints.isContinuous = false
    Sprints.currentSprintIndex = 0
    Sprints.remainingSec = 0
    Sprints.startTime = null
    Sprints.startWords = 0
    Sprints.wordGoal = 0
    Sprints.overallGoal = 0
    Sprints.overallStartWords = 0

    clearInterval(Sprints.interval)
    Sprints.interval = null

    // Force UI cleanup
    hideSprintBar()
    hideBreakLock()
    document.getElementById('sprint-launcher').classList.remove('active')

    // Reset pause button visual state
    const pauseBtn = document.getElementById('sprint-bar-pause')
    if (pauseBtn) {
        pauseBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`
        pauseBtn.title = 'Pause'
    }
}

// ============================================
// SPRINT BAR UI
// ============================================

function showSprintBar() {
    document.getElementById('sprint-bar').classList.add('visible')
}

function hideSprintBar() {
    document.getElementById('sprint-bar').classList.remove('visible')
}

function updateSprintBar() {
    const bar = document.getElementById('sprint-bar')
    const timeEl = document.getElementById('sprint-bar-time')
    const statusEl = document.getElementById('sprint-bar-status')
    const iconSvg = document.getElementById('sprint-bar-svg-icon')
    const progressFill = document.getElementById('sprint-progress-fill')

    const min = Math.floor(Sprints.remainingSec / 60)
    const sec = Sprints.remainingSec % 60
    timeEl.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`

    const totalCircumference = 2 * Math.PI * 15
    const progress = 1 - (Sprints.remainingSec / Sprints.duration)
    progressFill.setAttribute('stroke-dashoffset', totalCircumference * progress)

    let status = ''
    if (Sprints.isPaused) {
        status = '⏸ Paused'
    } else if (Sprints.isBreak) {
        if (Sprints.isContinuous) {
            status = `☕ Break • Next: Sprint ${Sprints.currentSprintIndex + 2}/${Sprints.totalSprints}`
        } else {
            status = '☕ Break time'
        }
    } else {
        if (Sprints.isContinuous) {
            status = `Sprint ${Sprints.currentSprintIndex + 1} of ${Sprints.totalSprints}`
        } else {
            status = 'Writing sprint'
        }
    }

    if (Sprints.wordGoal > 0 && !Sprints.isBreak) {
        const wordsWritten = getCurrentProjectWordCount() - Sprints.startWords
        const goalReached = wordsWritten >= Sprints.wordGoal
        const displayWords = wordsWritten < 0 ? wordsWritten : wordsWritten
        status += ` • <span class="sprint-bar-goal ${goalReached ? 'reached' : ''}">${displayWords}/${Sprints.wordGoal}${goalReached ? ' ✓' : ''}</span>`
    }

    statusEl.innerHTML = status

    if (Sprints.isBreak) {
        iconSvg.innerHTML = `
      <path d="M18 8h1a4 4 0 010 8h-1"></path>
      <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"></path>
      <line x1="6" y1="1" x2="6" y2="4"></line>
      <line x1="10" y1="1" x2="10" y2="4"></line>
      <line x1="14" y1="1" x2="14" y2="4"></line>
    `
    } else if (Sprints.isPaused) {
        iconSvg.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`
    } else {
        iconSvg.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`
    }

    bar.classList.toggle('warning', Sprints.remainingSec < 60 && !Sprints.isBreak && !Sprints.isPaused)
    bar.classList.toggle('break-mode', Sprints.isBreak)
}

// ============================================
// COMPLETION MODAL
// ============================================

function showSprintCompleteModal(wordsWritten, durationSec, goalReached, isContinuousComplete) {
    const durationMin = Math.round(durationSec / 60)
    const wpm = durationSec > 0 ? ((wordsWritten / durationSec) * 60).toFixed(1) : 0

    const iconEl = document.getElementById('sprint-complete-icon')
    const titleEl = document.getElementById('sprint-complete-title')
    const subtitleEl = document.getElementById('sprint-complete-subtitle')

    if (isContinuousComplete) {
        const totalWordsAll = getCurrentProjectWordCount() - Sprints.overallStartWords
        const overallGoalReached = Sprints.overallGoal > 0 && totalWordsAll >= Sprints.overallGoal

        iconEl.textContent = overallGoalReached ? '🏆' : '🎉'
        titleEl.textContent = 'All Sprints Complete!'
        subtitleEl.textContent = `You did all ${Sprints.totalSprints} sprints and wrote ${totalWordsAll} words total`

        // Override stats to show TOTAL words across all sprints
        document.getElementById('sprint-result-words').textContent = formatNumber(totalWordsAll)
    } else if (Sprints.wordGoal > 0) {
        if (goalReached) {
            iconEl.textContent = '🎯'
            titleEl.textContent = 'Goal Smashed!'
            subtitleEl.textContent = `You exceeded your ${Sprints.wordGoal}-word goal!`
        } else {
            iconEl.textContent = '💪'
            titleEl.textContent = 'Sprint Complete!'
            subtitleEl.textContent = `You wrote ${wordsWritten} of ${Sprints.wordGoal} words`
        }
        document.getElementById('sprint-result-words').textContent = formatNumber(wordsWritten)
    } else {
        if (wordsWritten >= 300) {
            iconEl.textContent = '🔥'
            titleEl.textContent = 'On Fire!'
        } else if (wordsWritten >= 100) {
            iconEl.textContent = '🎉'
            titleEl.textContent = 'Great Sprint!'
        } else if (wordsWritten > 0) {
            iconEl.textContent = '✨'
            titleEl.textContent = 'Sprint Complete!'
        } else {
            iconEl.textContent = '💭'
            titleEl.textContent = 'Sprint Done'
        }
        subtitleEl.textContent = wordsWritten > 0
            ? `You wrote ${wordsWritten} words in ${durationMin} minutes`
            : "Sometimes the words just don't come. That's ok!"
        document.getElementById('sprint-result-words').textContent = formatNumber(wordsWritten)
    }

    document.getElementById('sprint-result-time').textContent = `${durationMin}m`
    document.getElementById('sprint-result-wpm').textContent = wpm

    const goalContainer = document.getElementById('sprint-goal-status-container')
    if (isContinuousComplete && Sprints.overallGoal > 0) {
        const totalWords = getCurrentProjectWordCount() - Sprints.overallStartWords
        if (totalWords >= Sprints.overallGoal) {
            goalContainer.innerHTML = `<div class="sprint-goal-status success">🏆 You reached your ${Sprints.overallGoal}-word overall goal!</div>`
        } else {
            const short = Sprints.overallGoal - totalWords
            goalContainer.innerHTML = `<div class="sprint-goal-status missed">${short} words short of your ${Sprints.overallGoal}-word overall goal.</div>`
        }
    } else if (Sprints.wordGoal > 0) {
        if (goalReached) {
            goalContainer.innerHTML = `<div class="sprint-goal-status success">🎉 You reached your ${Sprints.wordGoal}-word goal!</div>`
        } else {
            const short = Sprints.wordGoal - wordsWritten
            goalContainer.innerHTML = `<div class="sprint-goal-status missed">${short} words short of your ${Sprints.wordGoal}-word goal.</div>`
        }
    } else {
        goalContainer.innerHTML = ''
    }

    showModal('modal-sprint-complete')
}

// ============================================
// LOGGING
// ============================================

function logSprint(sprintData) {
    if (!AppState.currentProject) return

    if (!AppState.currentProject.analytics) {
        AppState.currentProject.analytics = { dailyGoal: 500, sessions: [], streak: 0 }
    }
    if (!AppState.currentProject.analytics.sprints) {
        AppState.currentProject.analytics.sprints = []
    }

    AppState.currentProject.analytics.sprints.push(sprintData)

    if (AppState.currentProject.analytics.sprints.length > 500) {
        AppState.currentProject.analytics.sprints = AppState.currentProject.analytics.sprints.slice(-500)
    }

    saveCurrentProject()
}

// ============================================
// SOUND
// ============================================

function playBeep(frequency = 800, duration = 200) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gain = audioContext.createGain()

        oscillator.connect(gain)
        gain.connect(audioContext.destination)

        oscillator.frequency.value = frequency
        oscillator.type = 'sine'

        gain.gain.setValueAtTime(0.3, audioContext.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + duration / 1000)
    } catch (e) { }
}