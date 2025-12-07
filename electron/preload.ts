import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  createBrowserView: (viewId: string, url: string) => 
    ipcRenderer.invoke('create-browser-view', viewId, url),
  
  removeBrowserView: (viewId: string) => 
    ipcRenderer.invoke('remove-browser-view', viewId),
  
  destroyBrowserView: (viewId: string) => 
    ipcRenderer.invoke('remove-browser-view', viewId),
  
  updateViewBounds: (viewId: string, bounds: { x: number, y: number, width: number, height: number }) => 
    ipcRenderer.invoke('update-view-bounds', viewId, bounds),
  
  navigateView: (viewId: string, url: string) => 
    ipcRenderer.invoke('navigate-view', viewId, url),
  
  viewLoadURL: (viewId: string, url: string) => 
    ipcRenderer.invoke('navigate-view', viewId, url),
  
  viewGoBack: (viewId: string) => 
    ipcRenderer.invoke('view-go-back', viewId),
  
  viewGoForward: (viewId: string) => 
    ipcRenderer.invoke('view-go-forward', viewId),
  
  viewReload: (viewId: string) => 
    ipcRenderer.invoke('view-reload', viewId),

  clearCache: () => 
    ipcRenderer.invoke('clear-cache'),

  onViewNavigated: (callback: (viewId: string, url: string) => void) => {
    ipcRenderer.on('view-navigated', (event, viewId, url) => callback(viewId, url))
  },

  onViewTitleUpdated: (callback: (viewId: string, title: string) => void) => {
    ipcRenderer.on('view-title-updated', (event, viewId, title) => callback(viewId, title))
  }
})
