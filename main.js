// main.js
// Main Electron process

const { app, BrowserWindow, ipcMain, dialog, shell, Menu, MenuItem } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow

// ============================================
// PATHS
// ============================================

function getDataPath() {
  const dataPath = path.join(app.getPath('userData'), 'writeflow-data')
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true })
  }
  return dataPath
}

function getProjectsPath() {
  const projectsPath = path.join(getDataPath(), 'projects')
  if (!fs.existsSync(projectsPath)) {
    fs.mkdirSync(projectsPath, { recursive: true })
  }
  return projectsPath
}

function getBackupsPath() {
  const backupsPath = path.join(getDataPath(), 'backups')
  if (!fs.existsSync(backupsPath)) {
    fs.mkdirSync(backupsPath, { recursive: true })
  }
  return backupsPath
}

// ============================================
// CREATE WINDOW
// ============================================

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: true,
    show: false,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
    icon: path.join(__dirname, 'src/assets/icon.png'),
    titleBarStyle: 'default',
  })

  // Set default spell check language
  mainWindow.webContents.session.setSpellCheckerLanguages(['en-US'])

  mainWindow.loadFile(path.join(__dirname, 'src/index.html'))

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.maximize()
  })

  // Set up spell check context menu
  setupSpellCheckContextMenu(mainWindow)

  // Only enable F12 DevTools in development (not in packaged app)
  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12') {
        mainWindow.webContents.toggleDevTools()
      }
    })
  }

  mainWindow.on('close', async (e) => {
    // Autosave is aggressive enough - just let it close
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// ============================================
// SPELL CHECK CONTEXT MENU
// ============================================

function setupSpellCheckContextMenu(win) {
  win.webContents.on('context-menu', (event, params) => {
    const menu = new Menu()

    // Add spelling suggestions
    if (params.misspelledWord) {
      if (params.dictionarySuggestions.length > 0) {
        for (const suggestion of params.dictionarySuggestions) {
          menu.append(new MenuItem({
            label: suggestion,
            click: () => win.webContents.replaceMisspelling(suggestion)
          }))
        }
        menu.append(new MenuItem({ type: 'separator' }))
      } else {
        menu.append(new MenuItem({
          label: 'No suggestions',
          enabled: false
        }))
        menu.append(new MenuItem({ type: 'separator' }))
      }

      // Add to dictionary
      menu.append(new MenuItem({
        label: `Add "${params.misspelledWord}" to dictionary`,
        click: () => {
          win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
          // Notify the renderer so it can track the word
          win.webContents.send('spellcheck-word-added', params.misspelledWord)
        }
      }))

      menu.append(new MenuItem({ type: 'separator' }))
    }

    // Standard cut/copy/paste
    if (params.editFlags.canCut) {
      menu.append(new MenuItem({ label: 'Cut', role: 'cut' }))
    }
    if (params.editFlags.canCopy) {
      menu.append(new MenuItem({ label: 'Copy', role: 'copy' }))
    }
    if (params.editFlags.canPaste) {
      menu.append(new MenuItem({ label: 'Paste', role: 'paste' }))
    }
    if (params.editFlags.canSelectAll) {
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }))
    }

    if (menu.items.length > 0) {
      menu.popup({ window: win })
    }
  })
}

// ============================================
// IPC - FILE OPERATIONS
// ============================================

// Save project data (with automatic backup)
ipcMain.handle('save-project-data', async (event, { projectId, data }) => {
  try {
    const projectsPath = getProjectsPath()
    const filePath = path.join(projectsPath, `${projectId}.json`)

    // Create backup of existing file BEFORE overwriting
    if (fs.existsSync(filePath)) {
      await createBackup(projectId, filePath)
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')

    return { success: true, savedAt: new Date().toISOString() }
  } catch (error) {
    console.error('Save error:', error)
    return { success: false, error: error.message }
  }
})

// Load a specific project
ipcMain.handle('load-project-data', async (event, projectId) => {
  try {
    const filePath = path.join(getProjectsPath(), `${projectId}.json`)

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Project not found' }
    }

    const content = fs.readFileSync(filePath, 'utf8')
    return { success: true, data: JSON.parse(content) }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Load all projects
ipcMain.handle('load-all-projects', async () => {
  try {
    const projectsPath = getProjectsPath()
    const files = fs.readdirSync(projectsPath).filter(f => f.endsWith('.json'))
    const projects = []

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(projectsPath, file), 'utf8')
        projects.push(JSON.parse(content))
      } catch (e) {
        console.error(`Could not load ${file}:`, e.message)
      }
    }

    return { success: true, projects }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Delete a project (moves to deleted backups)
ipcMain.handle('delete-project', async (event, projectId) => {
  try {
    const filePath = path.join(getProjectsPath(), `${projectId}.json`)

    if (fs.existsSync(filePath)) {
      const deletedPath = path.join(getBackupsPath(), 'deleted')
      if (!fs.existsSync(deletedPath)) {
        fs.mkdirSync(deletedPath, { recursive: true })
      }
      const backupFile = path.join(deletedPath, `${projectId}_${Date.now()}.json`)
      fs.copyFileSync(filePath, backupFile)
      fs.unlinkSync(filePath)
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ============================================
// SETTINGS
// ============================================

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    const settingsPath = path.join(getDataPath(), 'settings.json')
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8')
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('load-settings', async () => {
  try {
    const settingsPath = path.join(getDataPath(), 'settings.json')

    if (!fs.existsSync(settingsPath)) {
      return { success: true, settings: null }
    }

    const content = fs.readFileSync(settingsPath, 'utf8')
    return { success: true, settings: JSON.parse(content) }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ============================================
// BACKUPS
// ============================================

async function createBackup(projectId, sourceFilePath) {
  try {
    const backupsPath = getBackupsPath()
    const projectBackupsPath = path.join(backupsPath, projectId)

    if (!fs.existsSync(projectBackupsPath)) {
      fs.mkdirSync(projectBackupsPath, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(projectBackupsPath, `backup_${timestamp}.json`)

    fs.copyFileSync(sourceFilePath, backupFile)

    // Keep only last 5 backups per project
    const backups = fs.readdirSync(projectBackupsPath)
      .filter(f => f.startsWith('backup_'))
      .sort()
      .reverse()

    if (backups.length > 5) {
      for (let i = 5; i < backups.length; i++) {
        fs.unlinkSync(path.join(projectBackupsPath, backups[i]))
      }
    }

    return true
  } catch (error) {
    console.error('Backup error:', error)
    return false
  }
}

// Get list of backups for a project
ipcMain.handle('get-project-backups', async (event, projectId) => {
  try {
    const projectBackupsPath = path.join(getBackupsPath(), projectId)

    if (!fs.existsSync(projectBackupsPath)) {
      return { success: true, backups: [] }
    }

    const files = fs.readdirSync(projectBackupsPath)
      .filter(f => f.startsWith('backup_'))
      .sort()
      .reverse()

    const backups = files.map(file => {
      const filePath = path.join(projectBackupsPath, file)
      const stats = fs.statSync(filePath)

      return {
        filename: file,
        size: stats.size,
        createdAt: stats.mtime.toISOString(),
      }
    })

    return { success: true, backups }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Restore a specific backup
ipcMain.handle('restore-backup', async (event, { projectId, filename }) => {
  try {
    const backupFile = path.join(getBackupsPath(), projectId, filename)

    if (!fs.existsSync(backupFile)) {
      return { success: false, error: 'Backup not found' }
    }

    const content = fs.readFileSync(backupFile, 'utf8')
    const data = JSON.parse(content)

    // Save current version as backup before restoring
    const currentFile = path.join(getProjectsPath(), `${projectId}.json`)
    if (fs.existsSync(currentFile)) {
      await createBackup(projectId, currentFile)
    }

    fs.writeFileSync(currentFile, content, 'utf8')

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ============================================
// EXPORT / IMPORT PROJECT
// ============================================

ipcMain.handle('export-project-file', async (event, { projectId, projectTitle }) => {
  try {
    const filePath = path.join(getProjectsPath(), `${projectId}.json`)
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Project not found' }
    }

    const safeTitle = projectTitle.replace(/[^a-z0-9]/gi, '_')
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Project',
      defaultPath: `${safeTitle}_${Date.now()}.writeflow`,
      filters: [
        { name: 'WriteFlow Project', extensions: ['writeflow', 'json'] }
      ]
    })

    if (result.canceled) {
      return { success: false, canceled: true }
    }

    const content = fs.readFileSync(filePath, 'utf8')
    fs.writeFileSync(result.filePath, content, 'utf8')

    return { success: true, path: result.filePath }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('import-project-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Project',
      properties: ['openFile'],
      filters: [
        { name: 'WriteFlow Project', extensions: ['writeflow', 'json'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true }
    }

    const content = fs.readFileSync(result.filePaths[0], 'utf8')
    const data = JSON.parse(content)

    // Generate new ID to avoid conflicts
    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
    data.id = newId
    data.title = data.title + ' (Imported)'
    data.lastModified = new Date().toISOString()

    const newFilePath = path.join(getProjectsPath(), `${newId}.json`)
    fs.writeFileSync(newFilePath, JSON.stringify(data, null, 2), 'utf8')

    return { success: true, project: data }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ============================================
// STORAGE INFO
// ============================================

ipcMain.handle('get-storage-info', async () => {
  try {
    const dataPath = getDataPath()
    const projectsPath = getProjectsPath()
    const backupsPath = getBackupsPath()

    let totalSize = 0
    let projectCount = 0
    let backupCount = 0

    if (fs.existsSync(projectsPath)) {
      const projectFiles = fs.readdirSync(projectsPath).filter(f => f.endsWith('.json'))
      projectCount = projectFiles.length
      for (const file of projectFiles) {
        totalSize += fs.statSync(path.join(projectsPath, file)).size
      }
    }

    if (fs.existsSync(backupsPath)) {
      const backupFolders = fs.readdirSync(backupsPath)
      for (const folder of backupFolders) {
        const folderPath = path.join(backupsPath, folder)
        const stats = fs.statSync(folderPath)
        if (stats.isDirectory()) {
          const files = fs.readdirSync(folderPath)
          backupCount += files.length
          for (const file of files) {
            totalSize += fs.statSync(path.join(folderPath, file)).size
          }
        }
      }
    }

    return {
      success: true,
      totalSize,
      projectCount,
      backupCount,
      dataPath
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Open data folder in file explorer
ipcMain.handle('open-data-folder', async () => {
  try {
    shell.openPath(getDataPath())
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ============================================
// SPELL CHECK
// ============================================

// Get available spell check languages
ipcMain.handle('spellcheck-get-languages', async () => {
  try {
    const languages = mainWindow.webContents.session.availableSpellCheckerLanguages
    return { success: true, languages }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Set active spell check languages
ipcMain.handle('spellcheck-set-languages', async (event, languages) => {
  try {
    mainWindow.webContents.session.setSpellCheckerLanguages(languages)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Enable/disable spell check
ipcMain.handle('spellcheck-set-enabled', async (event, enabled) => {
  try {
    mainWindow.webContents.session.setSpellCheckerEnabled(enabled)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Add word to personal dictionary
ipcMain.handle('spellcheck-add-word', async (event, word) => {
  try {
    mainWindow.webContents.session.addWordToSpellCheckerDictionary(word)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Remove word from personal dictionary
ipcMain.handle('spellcheck-remove-word', async (event, word) => {
  try {
    if (mainWindow.webContents.session.removeWordFromSpellCheckerDictionary) {
      mainWindow.webContents.session.removeWordFromSpellCheckerDictionary(word)
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Open external URL in default browser
ipcMain.handle('open-external-url', async (event, url) => {
  try {
    await shell.openExternal(url)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ============================================
// DOCX EXPORT
// ============================================

ipcMain.handle('export-docx', async (event, data) => {
  try {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } = require('docx')

    const children = []
    const s = data.settings
    const fontSize = (s.fontSize || 14) * 2

    if (s.titlePage) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 4000, after: 400 },
        children: [new TextRun({ text: data.project.title, bold: true, size: 56 })]
      }))
      if (data.project.author) {
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 600 },
          children: [new TextRun({ text: 'by ' + data.project.author, italics: true, size: 28 })]
        }))
      }
      children.push(new Paragraph({ children: [new PageBreak()] }))
    }

    if (s.toc) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 },
        children: [new TextRun({ text: 'Contents', bold: true, size: 40 })]
      }))
      data.chapters.forEach((ch, i) => {
        const num = s.chapterNumbers ? 'Chapter ' + (i + 1) + ': ' : ''
        children.push(new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: num + ch.title, size: 24 })]
        }))
      })
      children.push(new Paragraph({ children: [new PageBreak()] }))
    }

    data.chapters.forEach((ch, i) => {
      if (s.chapterNumbers) {
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 200 },
          children: [new TextRun({ text: 'CHAPTER ' + toRomanDocx(i + 1), size: 20, color: '888888' })]
        }))
      }

      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 800 },
        children: [new TextRun({ text: ch.title, bold: true, size: 40 })]
      }))

      const blocks = ch.content || []
      blocks.forEach((block, bi) => {
        if (block.type === 'scenebreak') {
          children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 400 },
            children: [new TextRun({ text: block.text, size: 24, color: '888888' })]
          }))
        } else if (block.type === 'h1') {
          children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [new TextRun({ text: block.text, bold: true, size: 36 })]
          }))
        } else if (block.type === 'h2') {
          children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
            children: [new TextRun({ text: block.text, bold: true, size: 32 })]
          }))
        } else if (block.type === 'h3') {
          children.push(new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 200 },
            children: [new TextRun({ text: block.text, bold: true, size: 28 })]
          }))
        } else if (block.type === 'blockquote') {
          children.push(new Paragraph({
            spacing: { before: 200, after: 200 },
            indent: { left: 720 },
            children: [new TextRun({ text: block.text, italics: true, size: fontSize, color: '555555' })]
          }))
        } else if (block.type === 'listitem') {
          children.push(new Paragraph({
            spacing: { after: 100 },
            indent: { left: 720 },
            children: [new TextRun({ text: '• ' + block.text, size: fontSize })]
          }))
        } else if (block.type === 'paragraph') {
          children.push(new Paragraph({
            spacing: { after: 200, line: Math.round((s.lineSpacing || 1.8) * 240) },
            indent: bi === 0 ? undefined : { firstLine: 400 },
            alignment: s.alignment === 'justify' ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
            children: [new TextRun({
              text: block.text,
              size: fontSize,
              bold: block.bold || false,
              italics: block.italic || false,
            })]
          }))
        }
      })

      if (i < data.chapters.length - 1) {
        children.push(new Paragraph({ children: [new PageBreak()] }))
      }
    })

    const doc = new Document({
      sections: [{ properties: {}, children }]
    })

    const buffer = await Packer.toBuffer(doc)

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export DOCX',
      defaultPath: data.project.title.replace(/[^a-z0-9]/gi, '_') + '.docx',
      filters: [{ name: 'Word Document', extensions: ['docx'] }]
    })

    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, buffer)
      return { success: true }
    }

    return { success: false, canceled: true }
  } catch (error) {
    console.error('DOCX generation error:', error)
    return { success: false, error: error.message }
  }
})

function toRomanDocx(num) {
  const roman = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 }
  let str = ''
  for (const [key, val] of Object.entries(roman)) {
    while (num >= val) { str += key; num -= val }
  }
  return str
}