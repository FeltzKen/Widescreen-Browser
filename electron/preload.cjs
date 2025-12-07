const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  createBrowserView: (viewId, url) => 
    ipcRenderer.invoke('create-browser-view', viewId, url),
  
  removeBrowserView: (viewId) => 
    ipcRenderer.invoke('remove-browser-view', viewId),
  
  destroyBrowserView: (viewId) => 
    ipcRenderer.invoke('remove-browser-view', viewId),
  
  updateViewBounds: (viewId, bounds) => 
    ipcRenderer.invoke('update-view-bounds', viewId, bounds),
  
  navigateView: (viewId, url) => 
    ipcRenderer.invoke('navigate-view', viewId, url),
  
  viewLoadURL: (viewId, url) => 
    ipcRenderer.invoke('navigate-view', viewId, url),
  
  viewGoBack: (viewId) => 
    ipcRenderer.invoke('view-go-back', viewId),
  
  viewGoForward: (viewId) => 
    ipcRenderer.invoke('view-go-forward', viewId),
  
  viewReload: (viewId) => 
    ipcRenderer.invoke('view-reload', viewId),

  clearCache: () => 
    ipcRenderer.invoke('clear-cache'),

  onViewNavigated: (callback) => {
    ipcRenderer.on('view-navigated', (event, viewId, url) => callback(viewId, url))
  },

  onViewTitleUpdated: (callback) => {
    ipcRenderer.on('view-title-updated', (event, viewId, title) => callback(viewId, title))
  },

  onViewFaviconUpdated: (callback) => {
    ipcRenderer.on('view-favicon-updated', (event, viewId, favicon) => callback(viewId, favicon))
  },

  onViewLoadingChanged: (callback) => {
    ipcRenderer.on('view-loading-changed', (event, viewId, isLoading) => callback(viewId, isLoading))
  },

  onViewAudioChanged: (callback) => {
    ipcRenderer.on('view-audio-changed', (event, viewId, isPlaying) => callback(viewId, isPlaying))
  },

  toggleDevTools: (viewId) => 
    ipcRenderer.invoke('toggle-devtools', viewId),

  offViewNavigated: () => {
    ipcRenderer.removeAllListeners('view-navigated')
  },
  offViewTitleUpdated: () => {
    ipcRenderer.removeAllListeners('view-title-updated')
  },
  offViewFaviconUpdated: () => {
    ipcRenderer.removeAllListeners('view-favicon-updated')
  },
  offViewLoadingChanged: () => {
    ipcRenderer.removeAllListeners('view-loading-changed')
  },
  offViewAudioChanged: () => {
    ipcRenderer.removeAllListeners('view-audio-changed')
  }
})
