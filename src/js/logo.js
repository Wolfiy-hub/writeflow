// logo.js
// Uses PNG files: icon.png for window/taskbar, logo.png for app UI

function injectLogo() {
  // LOADING SCREEN — use logo.png, remove the "WriteFlow" text
  const loadingLogoContainer = document.querySelector('#loading-screen .loading-logo')
  if (loadingLogoContainer) {
    loadingLogoContainer.innerHTML = `
      <img src="assets/logo.png" alt="WriteFlow" style="width: 280px; height: auto; object-fit: contain; display: block;" />
    `
  }
  
  // TOP BAR — use logo.png, remove the "WriteFlow" text
  const topBarLogo = document.getElementById('app-logo-btn')
  if (topBarLogo) {
    topBarLogo.innerHTML = `
      <img src="assets/logo.png" alt="WriteFlow" style="width: 140px; height: auto; object-fit: contain; display: block;" />
    `
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectLogo)
} else {
  injectLogo()
}