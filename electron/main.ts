import { app, BrowserWindow, BrowserView, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
const browserViews = new Map<string, BrowserView>()

// Development mode detection
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  // Prevent creating multiple windows
  if (mainWindow !== null) {
    console.log('Window already exists, not creating another')
    return
  }

  const preloadPath = path.join(__dirname, 'preload.cjs')

  console.log('Preload path:', preloadPath)

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1a1a',
      symbolColor: '#ffffff',
      height: 40
    }
  })

  // Load the renderer
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    browserViews.forEach(view => {
      if (mainWindow) mainWindow.removeBrowserView(view)
    })
    browserViews.clear()
  })
}

app.whenReady().then(() => {
  createWindow()

  // Only handle activate on macOS (when clicking dock icon)
  app.on('activate', () => {
    if (process.platform === 'darwin' && BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers for managing browser views
ipcMain.handle('create-browser-view', async (_event, viewId: string, url: string) => {
  if (!mainWindow) return

  const view = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

  mainWindow.addBrowserView(view)
  view.webContents.loadURL(url)
  browserViews.set(viewId, view)

  // Forward navigation events back to renderer
  view.webContents.on('did-navigate', (_event, url: string) => {
    mainWindow?.webContents.send('view-navigated', viewId, url)
  })

  view.webContents.on('page-title-updated', (_event, title: string) => {
    mainWindow?.webContents.send('view-title-updated', viewId, title)
  })

  return viewId
})

ipcMain.handle('remove-browser-view', async (_event, viewId: string) => {
  if (!mainWindow) return

  const view = browserViews.get(viewId)
  if (view) {
    mainWindow.removeBrowserView(view)
    // @ts-ignore - webContents.destroy() exists
    view.webContents.destroy()
    browserViews.delete(viewId)
  }
})

ipcMain.handle('update-view-bounds', async (_event, viewId: string, bounds: { x: number, y: number, width: number, height: number }) => {
  const view = browserViews.get(viewId)
  if (view) {
    view.setBounds(bounds)
  }
})

ipcMain.handle('navigate-view', async (_event, viewId: string, url: string) => {
  const view = browserViews.get(viewId)
  if (view) {
    view.webContents.loadURL(url)
  }
})

ipcMain.handle('view-go-back', async (_event, viewId: string) => {
  const view = browserViews.get(viewId)
  if (view && view.webContents.canGoBack()) {
    view.webContents.goBack()
  }
})

ipcMain.handle('view-go-forward', async (_event, viewId: string) => {
  const view = browserViews.get(viewId)
  if (view && view.webContents.canGoForward()) {
    view.webContents.goForward()
  }
})

ipcMain.handle('view-reload', async (_event, viewId: string) => {
  const view = browserViews.get(viewId)
  if (view) {
    view.webContents.reload()
  }
})

ipcMain.handle('clear-cache', async () => {
  if (!mainWindow) return
  
  try {
    await mainWindow.webContents.session.clearCache()
    await mainWindow.webContents.session.clearStorageData({
      storages: ['cookies', 'localstorage', 'indexdb', 'websql', 'serviceworkers', 'cachestorage']
    })
    return { success: true }
  } catch (error) {
    console.error('Failed to clear cache:', error)
    return { success: false, error }
  }
})

