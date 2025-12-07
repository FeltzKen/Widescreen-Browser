const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  createBrowserView: (viewId, url) => 
    ipcRenderer.invoke('create-browser-view', viewId, url),
  
  removeBrowserView: (viewId) => 
    ipcRenderer.invoke('remove-browser-view', viewId),
  
  updateViewBounds: (viewId, bounds) => 
    ipcRenderer.invoke('update-view-bounds', viewId, bounds),
  
  navigateView: (viewId, url) => 
    ipcRenderer.invoke('navigate-view', viewId, url),
  
  viewGoBack: (viewId) => 
    ipcRenderer.invoke('view-go-back', viewId),
  
  viewGoForward: (viewId) => 
    ipcRenderer.invoke('view-go-forward', viewId),
  
  viewReload: (viewId) => 
    ipcRenderer.invoke('view-reload', viewId),

  onViewNavigated: (callback) => {
    ipcRenderer.on('view-navigated', (event, viewId, url) => callback(viewId, url))
  },

  onViewTitleUpdated: (callback) => {
    ipcRenderer.on('view-title-updated', (event, viewId, title) => callback(viewId, title))
  }
  ,
  offViewNavigated: () => {
    ipcRenderer.removeAllListeners('view-navigated')
  },
  offViewTitleUpdated: () => {
    ipcRenderer.removeAllListeners('view-title-updated')
  }
})
