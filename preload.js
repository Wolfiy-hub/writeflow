// preload.js
// Bridge between main process and renderer

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Project operations
  saveProjectData: (data) => ipcRenderer.invoke('save-project-data', data),
  loadProjectData: (projectId) => ipcRenderer.invoke('load-project-data', projectId),
  loadAllProjects: () => ipcRenderer.invoke('load-all-projects'),
  deleteProject: (projectId) => ipcRenderer.invoke('delete-project', projectId),

  // Settings
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),

  // Backups
  getProjectBackups: (projectId) => ipcRenderer.invoke('get-project-backups', projectId),
  restoreBackup: (data) => ipcRenderer.invoke('restore-backup', data),

  // Export / Import
  exportProjectFile: (data) => ipcRenderer.invoke('export-project-file', data),
  importProjectFile: () => ipcRenderer.invoke('import-project-file'),

  // Storage
  getStorageInfo: () => ipcRenderer.invoke('get-storage-info'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),

  // Open external URL
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),

  // DOCX export
  exportDOCX: (data) => ipcRenderer.invoke('export-docx', data),

  // Spell check
  spellcheckGetLanguages: () => ipcRenderer.invoke('spellcheck-get-languages'),
  spellcheckSetLanguages: (languages) => ipcRenderer.invoke('spellcheck-set-languages', languages),
  spellcheckSetEnabled: (enabled) => ipcRenderer.invoke('spellcheck-set-enabled', enabled),
  spellcheckAddWord: (word) => ipcRenderer.invoke('spellcheck-add-word', word),
  spellcheckRemoveWord: (word) => ipcRenderer.invoke('spellcheck-remove-word', word),
  onSpellcheckWordAdded: (callback) => ipcRenderer.on('spellcheck-word-added', (event, word) => callback(word)),

  // Platform info
  platform: process.platform,
})