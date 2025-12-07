export interface ElectronAPI {
  createBrowserView: (viewId: string, url: string) => Promise<string>
  removeBrowserView: (viewId: string) => Promise<void>
  destroyBrowserView: (viewId: string) => Promise<void>
  updateViewBounds: (viewId: string, bounds: { x: number, y: number, width: number, height: number }) => Promise<void>
  navigateView: (viewId: string, url: string) => Promise<void>
  viewLoadURL: (viewId: string, url: string) => Promise<void>
  viewGoBack: (viewId: string) => Promise<void>
  viewGoForward: (viewId: string) => Promise<void>
  viewReload: (viewId: string) => Promise<void>
  clearCache: () => Promise<{ success: boolean, error?: any }>
  toggleDevTools: (viewId: string) => Promise<void>
  listBrowserViews: () => Promise<string[]>
  onViewNavigated: (callback: (viewId: string, url: string) => void) => void
  onViewTitleUpdated: (callback: (viewId: string, title: string) => void) => void
  onViewFaviconUpdated: (callback: (viewId: string, favicon: string) => void) => void
  onViewLoadingChanged: (callback: (viewId: string, isLoading: boolean) => void) => void
  onViewAudioChanged: (callback: (viewId: string, isPlaying: boolean) => void) => void
  offViewNavigated: () => void
  offViewTitleUpdated: () => void
  offViewFaviconUpdated: () => void
  offViewLoadingChanged: () => void
  offViewAudioChanged: () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
