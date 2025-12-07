import { useState, useEffect } from 'react'
import './App.css'

interface Tab {
  id: string
  url: string
  title: string
  viewId: string
  groupId: string | null
  pinned?: boolean
  favicon?: string
  isLoading?: boolean
  isAudioPlaying?: boolean
}

interface Group {
  id: string
  name: string
  tabIds: string[]
  collapsed: boolean
}

interface Bookmark {
  id: string
  title: string
  url: string
  folderId: string | null
  dateAdded: number
}

interface BookmarkFolder {
  id: string
  name: string
  parentId: string | null
}

interface HistoryItem {
  id: string
  url: string
  title: string
  timestamp: number
  visitCount: number
}

interface DownloadItem {
  id: string
  url: string
  filename: string
  filepath: string
  totalBytes: number
  receivedBytes: number
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted'
  startTime: number
}

interface SavedSession {
  id: string
  name: string
  tabs: Array<{ url: string; title: string; groupId: string | null }>
  groups: Array<{ name: string; tabIds: string[] }>
  groupSplitWidths: { [groupId: string]: number[] }
  dateCreated: number
}

function App() {
  // Load session state from localStorage
  const loadInitialSession = () => {
    try {
      const savedSession = localStorage.getItem('browserSession')
      if (savedSession) {
        const session = JSON.parse(savedSession)
        return {
          tabs: session.tabs || [],
          groups: session.groups || [],
          activeTabId: session.activeTabId || null,
          groupSplitWidths: session.groupSplitWidths || {}
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error)
    }
    return null
  }

  const savedSession = loadInitialSession()

  const [tabs, setTabs] = useState<Tab[]>(savedSession?.tabs.length ? savedSession.tabs : [
    {
      id: 'tab-1',
      url: 'about:blank',
      title: 'New Tab',
      viewId: 'view-1',
      groupId: null
    }
  ])
  const [groups, setGroups] = useState<Group[]>(savedSession?.groups || [])
  const [activeTabId, setActiveTabId] = useState(savedSession?.activeTabId || 'tab-1')
  const [urlInput, setUrlInput] = useState('')
  const [perTabUrlInputs, setPerTabUrlInputs] = useState<{ [tabId: string]: string }>({})
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null)
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null)
  const [dropTargetTabId, setDropTargetTabId] = useState<string | null>(null)
  const [dropTargetGroupId, setDropTargetGroupId] = useState<string | null>(null)
  const [openGroupMenuId, setOpenGroupMenuId] = useState<string | null>(null)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState<string>('')
  
  // Tab context menu state
  const [contextMenuTabId, setContextMenuTabId] = useState<string | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
  
  // Tab search state
  const [showTabSearch, setShowTabSearch] = useState(false)
  const [tabSearchQuery, setTabSearchQuery] = useState('')
  
  // Undo state for closing groups
  const [undoGroupClose, setUndoGroupClose] = useState<{
    group: Group
    tabs: Tab[]
    splitWidths: number[]
  } | null>(null)
  
  // Store custom split widths as percentages for each group
  const [groupSplitWidths, setGroupSplitWidths] = useState<{ [groupId: string]: number[] }>(savedSession?.groupSplitWidths || {})
  
  // Resize handle state
  const [resizingGroupId, setResizingGroupId] = useState<string | null>(null)
  const [resizingHandleIndex, setResizingHandleIndex] = useState<number | null>(null)
  const [resizeStartX, setResizeStartX] = useState<number>(0)

  // Panel reorder state
  const [draggingPanelIndex, setDraggingPanelIndex] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState<number>(0)
  const [dragStartX, setDragStartX] = useState<number>(0)

  // Window dimensions for responsive layout
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen')
    return saved ? JSON.parse(saved) : true // Default to open
  })
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : true
  })

  // Recently closed tabs
  const [recentlyClosed, setRecentlyClosed] = useState<Tab[]>([])
  
  // Recently closed groups
  const [recentlyClosedGroups, setRecentlyClosedGroups] = useState<Array<{
    group: Group
    tabs: Tab[]
    splitWidths: number[]
    closedAt: number
  }>>([])

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    const saved = localStorage.getItem('bookmarks')
    return saved ? JSON.parse(saved) : []
  })
  const [bookmarkFolders, setBookmarkFolders] = useState<BookmarkFolder[]>(() => {
    const saved = localStorage.getItem('bookmarkFolders')
    const folders = saved ? JSON.parse(saved) : []
    // Ensure root folder always exists
    const hasRoot = folders.some((f: BookmarkFolder) => f.id === 'root')
    if (!hasRoot) {
      folders.unshift({ id: 'root', name: 'Bookmarks', parentId: null })
    }
    return folders
  })
  const [showBookmarks, setShowBookmarks] = useState(false)

  // History state
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('history')
    return saved ? JSON.parse(saved) : []
  })
  const [showHistory, setShowHistory] = useState(false)

  // Downloads state
  const [downloads] = useState<DownloadItem[]>([])
  const [showDownloads, setShowDownloads] = useState(false)

  // Sessions state
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>(() => {
    const saved = localStorage.getItem('savedSessions')
    return saved ? JSON.parse(saved) : []
  })
  const [showSessions, setShowSessions] = useState(false)

  // Input states for modals
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')
  const [showNewSessionInput, setShowNewSessionInput] = useState(false)
  const [selectedTabsForBookmark, setSelectedTabsForBookmark] = useState<Set<string>>(new Set())

  // Find in page state
  const [findInPage, setFindInPage] = useState<string>('')
  const [showFindInPage, setShowFindInPage] = useState(false)

  // Settings state
  const [showSettings, setShowSettings] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [showRecentlyClosed, setShowRecentlyClosed] = useState(false)
  
  // Page context menu state
  const [pageContextMenu, setPageContextMenu] = useState<{
    x: number
    y: number
    linkUrl?: string
    imageUrl?: string
  } | null>(null)
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('appSettings')
    return saved ? JSON.parse(saved) : {
      defaultSearchEngine: 'duckduckgo',
      homepage: 'about:blank',
      defaultZoom: 100,
      enableNotifications: true,
      privateMode: false,
      customTheme: 'default',
      uiScale: 100,
      adBlockEnabled: true,
      autoSleepTabs: true,
      sleepTabsAfter: 30 // minutes
    }
  })

  // Performance monitoring
  const [showPerformance, setShowPerformance] = useState(false)
  const [memoryUsage, setMemoryUsage] = useState<{ used: number; total: number }>({ used: 0, total: 0 })
  const [sleepingTabs, setSleepingTabs] = useState<Set<string>>(new Set())

  // Custom theme
  const [customTheme, setCustomTheme] = useState(() => {
    const saved = localStorage.getItem('customTheme')
    return saved ? JSON.parse(saved) : {
      primaryColor: '#4a9eff',
      backgroundColor: '#1a1a1a',
      textColor: '#ffffff',
      accentColor: '#ff6b6b'
    }
  })

  const activeTab = tabs.find(t => t.id === activeTabId)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + T: New tab
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault()
        addNewTab()
      }
      // Ctrl/Cmd + W: Close current tab
      else if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault()
        if (tabs.length > 1) {
          closeTab(activeTabId)
        }
      }
      // Ctrl/Cmd + Shift + T: Reopen closed tab
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        reopenLastClosedTab()
      }
      // Ctrl/Cmd + Tab: Next tab
      else if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault()
        const currentIndex = tabs.findIndex(t => t.id === activeTabId)
        const nextIndex = (currentIndex + 1) % tabs.length
        setActiveTabId(tabs[nextIndex].id)
      }
      // Ctrl/Cmd + Shift + Tab: Previous tab
      else if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && e.shiftKey) {
        e.preventDefault()
        const currentIndex = tabs.findIndex(t => t.id === activeTabId)
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length
        setActiveTabId(tabs[prevIndex].id)
      }
      // Ctrl/Cmd + B: Toggle Bookmarks
      else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        setShowBookmarks(!showBookmarks)
      }
      // Ctrl/Cmd + H: Toggle History
      else if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault()
        setShowHistory(!showHistory)
      }
      // Ctrl/Cmd + D: Add Bookmark
      else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        if (activeTab) {
          addBookmark(activeTab.url, activeTab.title)
        }
      }
      // Ctrl/Cmd + F: Find in page
      else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setShowFindInPage(!showFindInPage)
      }
      // Ctrl/Cmd + ,: Settings
      else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setShowSettings(true)
      }
      // Ctrl/Cmd + /: Show keyboard shortcuts
      else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setShowKeyboardHelp(!showKeyboardHelp)
      }
      // Ctrl/Cmd + Shift + H: Show recently closed tabs
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
        e.preventDefault()
        setShowRecentlyClosed(!showRecentlyClosed)
      }
      // Ctrl/Cmd + R: Reload
      else if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault()
        reload()
      }
      // Alt + Left: Go Back
      else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        goBack()
      }
      // Alt + Right: Go Forward
      else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault()
        goForward()
      }
      // Ctrl/Cmd + P: Pin/Unpin current tab
      else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        if (activeTab) {
          togglePinTab(activeTab.id)
        }
      }
      // Ctrl/Cmd + L: Focus URL bar
      else if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault()
        const urlInput = document.querySelector('.url-input') as HTMLInputElement
        if (urlInput) {
          urlInput.focus()
          urlInput.select()
        }
      }
      // Ctrl/Cmd + D: Duplicate tab
      else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        duplicateTab(activeTabId)
      }
      // Ctrl/Cmd + [: Back
      else if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault()
        goBack()
      }
      // Ctrl/Cmd + ]: Forward
      else if ((e.ctrlKey || e.metaKey) && e.key === ']') {
        e.preventDefault()
        goForward()
      }
      // Ctrl/Cmd + 1-9: Switch to tab by number
      else if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const tabIndex = parseInt(e.key) - 1
        if (tabIndex < tabs.length) {
          setActiveTabId(tabs[tabIndex].id)
        }
      }
      // Escape: Close tab search/find in page
      else if (e.key === 'Escape') {
        if (showTabSearch) {
          setShowTabSearch(false)
          setTabSearchQuery('')
        } else if (showFindInPage) {
          setShowFindInPage(false)
          setFindInPage('')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tabs, activeTabId, showTabSearch, showFindInPage, showBookmarks, showHistory, activeTab])

  // Persist bookmarks
  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks))
  }, [bookmarks])

  // Persist bookmark folders
  useEffect(() => {
    // Ensure root folder always exists before saving
    const hasRoot = bookmarkFolders.some(f => f.id === 'root')
    const foldersToSave = hasRoot 
      ? bookmarkFolders 
      : [{ id: 'root', name: 'Bookmarks', parentId: null }, ...bookmarkFolders]
    
    localStorage.setItem('bookmarkFolders', JSON.stringify(foldersToSave))
    
    // Update state if root was missing
    if (!hasRoot) {
      setBookmarkFolders(foldersToSave)
    }
  }, [bookmarkFolders])

  // Persist history
  useEffect(() => {
    localStorage.setItem('history', JSON.stringify(history))
  }, [history])

  // Persist sessions
  useEffect(() => {
    localStorage.setItem('savedSessions', JSON.stringify(savedSessions))
  }, [savedSessions])

  // Persist settings
  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings))
  }, [settings])

  // Hide BrowserViews when any modal is open (z-index issue)
  useEffect(() => {
    const anyModalOpen = showBookmarks || showHistory || showDownloads || showSessions || showSettings || showKeyboardHelp || showRecentlyClosed || showPerformance
    
    if (anyModalOpen) {
      // Hide all browser views
      tabs.forEach(tab => {
        if (window.electronAPI) {
          window.electronAPI.updateViewBounds(tab.viewId, {
            x: 0,
            y: 0,
            width: 0,
            height: 0
          })
        }
      })
    } else {
      // Restore normal view layout
      updateAllViews()
    }
  }, [showBookmarks, showHistory, showDownloads, showSessions, showSettings, showKeyboardHelp, showRecentlyClosed, showPerformance, tabs, groups, activeTabId])

  // Initialize browser views for all tabs (including restored ones)
  useEffect(() => {
    if (!window.electronAPI) {
      console.error('electronAPI not available')
      return
    }

    const init = async () => {
      // Create views for all tabs (including restored from session)
      for (const tab of tabs) {
        await window.electronAPI.createBrowserView(tab.viewId, tab.url)
      }
      updateAllViews()
    }

    init()

    // Listen for title updates
    window.electronAPI.onViewTitleUpdated((viewId: string, title: string) => {
      setTabs(currentTabs => 
        currentTabs.map(t => 
          t.viewId === viewId ? { ...t, title } : t
        )
      )
    })

    // Listen for navigation updates (to update URL)
    window.electronAPI.onViewNavigated((viewId: string, url: string) => {
      setTabs(currentTabs => 
        currentTabs.map(t => 
          t.viewId === viewId ? { ...t, url } : t
        )
      )
      // Update per-tab URL input for this tab
      const tab = tabs.find(t => t.viewId === viewId)
      if (tab) {
        setPerTabUrlInputs(prev => ({ ...prev, [tab.id]: url }))
      }
    })

    // Listen for favicon updates
    window.electronAPI.onViewFaviconUpdated((viewId: string, favicon: string) => {
      setTabs(currentTabs => 
        currentTabs.map(t => 
          t.viewId === viewId ? { ...t, favicon } : t
        )
      )
    })

    // Listen for loading state changes
    window.electronAPI.onViewLoadingChanged((viewId: string, isLoading: boolean) => {
      setTabs(currentTabs => 
        currentTabs.map(t => 
          t.viewId === viewId ? { ...t, isLoading } : t
        )
      )
    })

    // Listen for audio state changes
    window.electronAPI.onViewAudioChanged((viewId: string, isPlaying: boolean) => {
      setTabs(currentTabs => 
        currentTabs.map(t => 
          t.viewId === viewId ? { ...t, isAudioPlaying: isPlaying } : t
        )
      )
    })

    return () => {
      window.electronAPI?.offViewTitleUpdated()
      window.electronAPI?.offViewNavigated()
      window.electronAPI?.offViewFaviconUpdated()
      window.electronAPI?.offViewLoadingChanged()
      window.electronAPI?.offViewAudioChanged()
      // Clean up all views
      tabs.forEach(tab => {
        window.electronAPI?.removeBrowserView(tab.viewId)
      })
    }
  }, [])

  // Update all views whenever tabs or active tab changes
  useEffect(() => {
    updateAllViews()
    
    // Listen for zoom changes and window resize
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
      updateAllViews()
    }
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [tabs, activeTabId, groups, openGroupMenuId, groupSplitWidths, sidebarOpen])

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen))
  }, [sidebarOpen])

  // Save dark mode state to localStorage and apply to body
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
    if (darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }, [darkMode])

  // Save session to localStorage whenever state changes
  useEffect(() => {
    const saveSession = () => {
      try {
        const session = {
          tabs: tabs.map(tab => ({
            id: tab.id,
            url: tab.url,
            title: tab.title,
            viewId: tab.viewId,
            groupId: tab.groupId
          })),
          groups,
          activeTabId,
          groupSplitWidths
        }
        localStorage.setItem('browserSession', JSON.stringify(session))
      } catch (error) {
        console.error('Failed to save session:', error)
      }
    }

    saveSession()
  }, [tabs, groups, activeTabId, groupSplitWidths])

  // Performance monitoring
  useEffect(() => {
    const updateMemory = () => {
      const perf = performance as any
      if (perf.memory) {
        setMemoryUsage({
          used: Math.round(perf.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(perf.memory.jsHeapSizeLimit / 1024 / 1024)
        })
      }
    }

    const interval = setInterval(updateMemory, 5000)
    updateMemory()
    return () => clearInterval(interval)
  }, [])

  // Auto-sleep inactive tabs
  useEffect(() => {
    if (!settings.autoSleepTabs) return

    const checkInactiveTabs = () => {
      tabs.forEach(tab => {
        if (tab.id !== activeTabId && !sleepingTabs.has(tab.id)) {
          // Check if tab has been inactive for threshold time
          // For now, we'll just sleep non-visible tabs after threshold
          // In production, you'd track last access time
          const shouldSleep = tab.groupId !== activeTab?.groupId
          if (shouldSleep) {
            setSleepingTabs(prev => new Set(prev).add(tab.id))
            // Hide the view to save resources
            if (window.electronAPI) {
              window.electronAPI.updateViewBounds(tab.viewId, {
                x: 0, y: 0, width: 0, height: 0
              })
            }
          }
        }
      })
    }

    const interval = setInterval(checkInactiveTabs, 30000) // Check every 30s
    return () => clearInterval(interval)
  }, [tabs, activeTabId, settings.autoSleepTabs, settings.sleepTabsAfter, sleepingTabs])

  // Save custom theme
  useEffect(() => {
    localStorage.setItem('customTheme', JSON.stringify(customTheme))
    
    // Define theme palettes
    const themePalettes = {
      default: {
        primaryColor: '#4a9eff',
        backgroundColor: '#1a1a1a',
        textColor: '#ffffff',
        accentColor: '#ff6b6b'
      },
      blue: {
        primaryColor: '#3b82f6',
        backgroundColor: '#0f172a',
        textColor: '#e0e7ff',
        accentColor: '#60a5fa'
      },
      green: {
        primaryColor: '#10b981',
        backgroundColor: '#064e3b',
        textColor: '#d1fae5',
        accentColor: '#34d399'
      },
      purple: {
        primaryColor: '#a855f7',
        backgroundColor: '#2e1065',
        textColor: '#f3e8ff',
        accentColor: '#c084fc'
      }
    }
    
    // Apply theme colors
    let colors = customTheme
    const themeName = settings.customTheme as 'default' | 'blue' | 'green' | 'purple' | 'custom'
    if (themeName !== 'custom' && themePalettes[themeName]) {
      colors = themePalettes[themeName]
    }
    
    document.documentElement.style.setProperty('--primary-color', colors.primaryColor)
    document.documentElement.style.setProperty('--background-color', colors.backgroundColor)
    document.documentElement.style.setProperty('--text-color', colors.textColor)
    document.documentElement.style.setProperty('--accent-color', colors.accentColor)
  }, [customTheme, settings.customTheme])

  // Apply UI scale
  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', `${settings.uiScale / 100}`)
  }, [settings.uiScale])

  const updateAllViews = () => {
    if (!window.electronAPI) return

    const sidebarWidth = sidebarOpen ? 180 : 0
    const windowWidth = window.innerWidth - sidebarWidth
    const windowHeight = window.innerHeight
    
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (!activeTab) return

    // Check if active tab is in a group
    const activeGroup = activeTab.groupId 
      ? groups.find(g => g.id === activeTab.groupId)
      : null
    
    const isInSplitView = activeGroup && activeGroup.tabIds.length >= 2
    
    // Hide nav-bar when group is shown, show it for single tabs
    const navBarHeight = 32 // Height of the nav-bar with controls and URL input (content ~32px + 12px bottom padding)
    const tabBarHeight = 64 // Height of just the tab bar (content ~49px + 10px top + 5px bottom padding)
    const toolbarHeight = isInSplitView ? tabBarHeight : (tabBarHeight + navBarHeight)
    const dragHandleHeight = 20 // Height of drag handle
    const panelHeaderHeight = 44 // Height of per-panel address bars

    tabs.forEach(tab => {
      const isActive = tab.id === activeTabId
      const isSplashScreen = tab.url === 'about:blank'
      const isSleeping = sleepingTabs.has(tab.id)
      
      // Wake up sleeping tabs when they become active
      if (isActive && isSleeping) {
        setSleepingTabs(prev => {
          const newSet = new Set(prev)
          newSet.delete(tab.id)
          return newSet
        })
      }
      
      // Don't render sleeping tabs
      if (isSleeping && !isActive) {
        window.electronAPI.updateViewBounds(tab.viewId, {
          x: 0, y: 0, width: 0, height: 0
        })
        return
      }
      
      // If active tab is in a group, show all tabs in that group split (regardless of collapsed state)
      if (activeGroup && tab.groupId === activeGroup.id) {
        const tabsInGroup = tabs.filter(t => t.groupId === activeGroup.id)
        const numTabs = tabsInGroup.length
        const tabIndex = activeGroup.tabIds.indexOf(tab.id)
        
        // Use custom widths if available, otherwise equal split
        const customWidths = groupSplitWidths[activeGroup.id]
        let xPos = 0
        let splitWidth = 0
        
        if (customWidths && customWidths.length === numTabs) {
          // Calculate position and width from percentages
          for (let i = 0; i < tabIndex; i++) {
            xPos += windowWidth * (customWidths[i] / 100)
          }
          splitWidth = windowWidth * (customWidths[tabIndex] / 100)
        } else {
          // Equal split
          splitWidth = Math.floor(windowWidth / numTabs)
          xPos = tabIndex * splitWidth
        }

        // Apply drag offset if this panel is being dragged
        if (draggingPanelIndex === tabIndex) {
          xPos += dragOffset
        }

        // Add panel header height if in split view (resize handles are at top, no gap below headers)
        const yPos = isInSplitView ? toolbarHeight + dragHandleHeight + panelHeaderHeight : toolbarHeight
        const viewHeight = isInSplitView ? windowHeight - toolbarHeight - dragHandleHeight - panelHeaderHeight : windowHeight - toolbarHeight

        // Add borders by insetting the view bounds (4px on sides between panels)
        const borderWidth = 4
        const isFirstPanel = tabIndex === 0
        const isLastPanel = tabIndex === numTabs - 1
        
        const leftInset = isFirstPanel ? 0 : borderWidth
        const rightInset = isLastPanel ? 0 : borderWidth
        
        // Hide BrowserView if it's showing splash screen, otherwise show it
        window.electronAPI.updateViewBounds(tab.viewId, {
          x: Math.round(xPos) + leftInset + sidebarWidth,
          y: yPos,
          width: Math.round(splitWidth) - leftInset - rightInset,
          height: isSplashScreen ? 0 : viewHeight
        })
      }
      // Otherwise show only the active tab full width
      else if (isActive) {
        window.electronAPI.updateViewBounds(tab.viewId, {
          x: sidebarWidth,
          y: toolbarHeight,
          width: windowWidth,
          height: isSplashScreen ? 0 : windowHeight - toolbarHeight
        })
      }
      // Hide all other tabs
      else {
        window.electronAPI.updateViewBounds(tab.viewId, {
          x: sidebarWidth,
          y: toolbarHeight,
          width: windowWidth,
          height: 0
        })
      }
    })
  }

  const navigate = (urlToNavigate?: string, targetTabId?: string) => {
    if (!window.electronAPI) return

    const tabId = targetTabId || activeTabId
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return

    const inputUrl = urlToNavigate || (targetTabId ? perTabUrlInputs[targetTabId] : urlInput.trim())
    if (!inputUrl) return

    let finalUrl = inputUrl
    
    // Check if it's a URL or search query
    if (!/^https?:\/\//i.test(finalUrl) && !finalUrl.includes('.')) {
      // It's a search query - use configured search engine
      const searchEngines = {
        google: 'https://www.google.com/search?q=',
        duckduckgo: 'https://duckduckgo.com/?q=',
        bing: 'https://www.bing.com/search?q='
      }
      const searchEngine = settings.defaultSearchEngine as keyof typeof searchEngines
      finalUrl = (searchEngines[searchEngine] || searchEngines.duckduckgo) + encodeURIComponent(finalUrl)
    } else if (!/^https?:\/\//i.test(finalUrl)) {
      // It's a domain without protocol
      finalUrl = 'https://' + finalUrl
    }

    window.electronAPI.navigateView(tab.viewId, finalUrl)
    
    // Update tab URL and add to history
    setTabs(tabs.map(t => 
      t.id === tabId ? { ...t, url: finalUrl } : t
    ))
    
    // Add to history
    addToHistory(finalUrl, tab.title || 'Untitled')
    
    // Clear the appropriate input
    if (targetTabId) {
      setPerTabUrlInputs(prev => ({ ...prev, [targetTabId]: '' }))
    } else {
      setUrlInput('')
    }
  }

  const switchTab = (tabId: string) => {
    setActiveTabId(tabId)
  }

  const addNewTab = async () => {
    const newTabId = `tab-${Date.now()}`
    const newViewId = `view-${Date.now()}`
    const newTab: Tab = {
      id: newTabId,
      url: 'about:blank',
      title: 'New Tab',
      viewId: newViewId,
      groupId: null
    }

    // Create the new tab first
    const newTabs = [...tabs, newTab]
    setTabs(newTabs)
    setActiveTabId(newTabId)

    // Then create the browser view
    if (window.electronAPI) {
      await window.electronAPI.createBrowserView(newViewId, 'about:blank')
      // Immediately update bounds to show splash
      updateAllViews()
    }
  }

  const closeTab = (tabId: string) => {
    // Prevent closing the last tab
    if (tabs.length === 1) return

    const tab = tabs.find(t => t.id === tabId)
    if (tab) {
      // Add to recently closed tabs (keep last 10)
      setRecentlyClosed([...recentlyClosed, tab].slice(-10))
      
      if (window.electronAPI) {
        window.electronAPI.removeBrowserView(tab.viewId)
      }
    }

    // If tab is in a group, update the group
    if (tab?.groupId) {
      const group = groups.find(g => g.id === tab.groupId)
      if (group) {
        const updatedTabIds = group.tabIds.filter(id => id !== tabId)
        
        // If group has 2 or fewer tabs remaining, delete the group and separate all tabs
        if (updatedTabIds.length <= 1) {
          setGroups(groups.filter(g => g.id !== tab.groupId))
          setTabs(tabs.filter(t => t.id !== tabId).map(t => {
            if (t.groupId === tab.groupId) {
              return { ...t, groupId: null }
            }
            return t
          }))
          // Clean up split widths
          setGroupSplitWidths(prev => {
            const updated = { ...prev }
            delete updated[tab.groupId!]
            return updated
          })
        } else {
          // Update group with remaining tabs
          setGroups(groups.map(g => {
            if (g.id === tab.groupId) {
              return { ...g, tabIds: updatedTabIds }
            }
            return g
          }))
          setTabs(tabs.filter(t => t.id !== tabId))
          // Reset split widths to equal distribution
          setGroupSplitWidths(prev => {
            const updated = { ...prev }
            delete updated[tab.groupId!]
            return updated
          })
        }
      }
    } else {
      // Tab not in a group, just remove it
      setTabs(tabs.filter(t => t.id !== tabId))
    }

    // If closing active tab, switch to the previous tab
    if (tabId === activeTabId) {
      const currentIndex = tabs.findIndex(t => t.id === tabId)
      const newTabs = tabs.filter(t => t.id !== tabId)
      const newActiveIndex = Math.max(0, currentIndex - 1)
      if (newTabs.length > 0) {
        setActiveTabId(newTabs[newActiveIndex].id)
      }
    }
  }

  const goBack = () => activeTab && window.electronAPI?.viewGoBack(activeTab.viewId)
  const goForward = () => activeTab && window.electronAPI?.viewGoForward(activeTab.viewId)
  const reload = () => activeTab && window.electronAPI?.viewReload(activeTab.viewId)

  // Pin tab function
  const togglePinTab = (tabId: string) => {
    setTabs(prevTabs => 
      prevTabs.map(t => 
        t.id === tabId 
          ? { ...t, pinned: !t.pinned }
          : t
      )
    )
  }

  // Bookmark functions
  const addBookmark = (url: string, title: string, folderId: string = 'root') => {
    const newBookmark: Bookmark = {
      id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      url,
      folderId,
      dateAdded: Date.now()
    }
    setBookmarks(prevBookmarks => [...prevBookmarks, newBookmark])
  }

  const removeBookmark = (bookmarkId: string) => {
    setBookmarks(bookmarks.filter(b => b.id !== bookmarkId))
  }

  const createBookmarkFolder = (name: string, parentId: string = 'root') => {
    const newFolder: BookmarkFolder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      parentId
    }
    setBookmarkFolders([...bookmarkFolders, newFolder])
    return newFolder.id
  }

  const removeBookmarkFolder = (folderId: string) => {
    // Prevent deletion of system folders
    if (folderId === 'root') {
      return
    }
    // Remove all bookmarks in this folder
    setBookmarks(bookmarks.filter(b => b.folderId !== folderId))
    // Remove the folder
    setBookmarkFolders(bookmarkFolders.filter(f => f.id !== folderId))
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const moveBookmark = (bookmarkId: string, targetFolderId: string) => {
    setBookmarks(bookmarks.map(b => 
      b.id === bookmarkId ? { ...b, folderId: targetFolderId } : b
    ))
  }

  // History functions
  const addToHistory = (url: string, title: string) => {
    const existingItem = history.find(h => h.url === url)
    if (existingItem) {
      setHistory(history.map(h => 
        h.url === url 
          ? { ...h, timestamp: Date.now(), visitCount: h.visitCount + 1 }
          : h
      ))
    } else {
      const newItem: HistoryItem = {
        id: `history-${Date.now()}`,
        url,
        title,
        timestamp: Date.now(),
        visitCount: 1
      }
      setHistory([newItem, ...history].slice(0, 1000)) // Keep last 1000 items
    }
  }

  const clearHistory = () => {
    setHistory([])
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const searchHistory = (query: string) => {
    return history.filter(h => 
      h.title.toLowerCase().includes(query.toLowerCase()) || 
      h.url.toLowerCase().includes(query.toLowerCase())
    )
  }

  // Session functions
  const saveCurrentSession = (name: string) => {
    // Filter out about:blank tabs
    const validTabs = tabs.filter(t => t.url && t.url !== 'about:blank')
    
    const session: SavedSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      tabs: validTabs.map(t => ({ 
        url: t.url, 
        title: t.title, 
        groupId: t.groupId 
      })),
      groups: groups.map(g => ({ 
        name: g.name, 
        tabIds: g.tabIds.filter(tabId => validTabs.find(t => t.id === tabId))
      })),
      groupSplitWidths,
      dateCreated: Date.now()
    }
    setSavedSessions(prevSessions => [...prevSessions, session])
  }

  const loadSession = async (sessionId: string) => {
    const session = savedSessions.find(s => s.id === sessionId)
    if (!session) return

    // Close all current tabs
    for (const tab of tabs) {
      if (window.electronAPI) {
        await window.electronAPI.destroyBrowserView(tab.viewId)
      }
    }

    // Create mapping of old group IDs to new group IDs
    const groupIdMap = new Map<string | null, string | null>()
    groupIdMap.set(null, null) // null stays null (ungrouped tabs)
    
    // Create new groups first to get their IDs
    const newGroups: Group[] = []
    session.groups.forEach((savedGroup, index) => {
      const newGroupId = `group-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
      
      // Find the old group ID from the first tab that belonged to this group
      const firstTabInGroup = session.tabs.find(t => 
        savedGroup.tabIds.includes(session.tabs.indexOf(t).toString()) || 
        t.groupId === savedGroup.tabIds[0]
      )
      
      if (firstTabInGroup?.groupId) {
        groupIdMap.set(firstTabInGroup.groupId, newGroupId)
      }
      
      newGroups.push({
        id: newGroupId,
        name: savedGroup.name,
        collapsed: false,
        tabIds: [] // Will be populated as we create tabs
      })
    })

    // Recreate tabs from session
    const newTabs: Tab[] = []
    for (let i = 0; i < session.tabs.length; i++) {
      const tabData = session.tabs[i]
      const newTabId = `tab-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`
      const newViewId = `view-${newTabId}`
      
      // Map old group ID to new group ID
      const newGroupId = groupIdMap.get(tabData.groupId) || null
      
      const newTab: Tab = {
        id: newTabId,
        url: tabData.url,
        title: tabData.title,
        viewId: newViewId,
        groupId: newGroupId
      }
      
      newTabs.push(newTab)
      
      // Add tab ID to the corresponding group
      if (newGroupId) {
        const group = newGroups.find(g => g.id === newGroupId)
        if (group) {
          group.tabIds.push(newTabId)
        }
      }
      
      if (window.electronAPI) {
        await window.electronAPI.createBrowserView(newViewId, tabData.url)
      }
      
      // Small delay between tab creations
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    setTabs(newTabs)
    setGroups(newGroups)
    setActiveTabId(newTabs[0]?.id || '')
    
    // Update group split widths with new group IDs
    const newGroupSplitWidths: { [groupId: string]: number[] } = {}
    Object.entries(session.groupSplitWidths).forEach(([oldGroupId, widths]) => {
      const newGroupId = groupIdMap.get(oldGroupId)
      if (newGroupId) {
        newGroupSplitWidths[newGroupId] = widths
      }
    })
    setGroupSplitWidths(newGroupSplitWidths)
  }

  const deleteSession = (sessionId: string) => {
    setSavedSessions(savedSessions.filter(s => s.id !== sessionId))
  }

  // Recently closed tabs
  const reopenLastClosedTab = async () => {
    if (recentlyClosed.length === 0) return
    
    const lastClosed = recentlyClosed[recentlyClosed.length - 1]
    const newTabId = `tab-${Date.now()}`
    const newViewId = `view-${Date.now()}`
    
    const newTab: Tab = {
      id: newTabId,
      url: lastClosed.url,
      title: lastClosed.title,
      viewId: newViewId,
      groupId: null
    }
    
    setTabs([...tabs, newTab])
    setActiveTabId(newTabId)
    setRecentlyClosed(recentlyClosed.slice(0, -1))
    
    if (window.electronAPI) {
      await window.electronAPI.createBrowserView(newViewId, lastClosed.url)
    }
  }

  // Context menu handlers
  const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault()
    setContextMenuTabId(tabId)
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
  }

  const closeContextMenu = () => {
    setContextMenuTabId(null)
    setContextMenuPosition(null)
    setPageContextMenu(null)
  }

  // Page context menu handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePageContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const target = e.target as HTMLElement
    const link = target.closest('a')
    const img = target.closest('img')
    
    setPageContextMenu({
      x: e.clientX,
      y: e.clientY,
      linkUrl: link?.href,
      imageUrl: img?.src
    })
  }

  const duplicateTab = async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return

    const newTabId = `tab-${Date.now()}`
    const newViewId = `view-${Date.now()}`
    const newTab: Tab = {
      id: newTabId,
      url: tab.url,
      title: tab.title,
      viewId: newViewId,
      groupId: tab.groupId
    }

    // Add to tabs
    const tabIndex = tabs.findIndex(t => t.id === tabId)
    const newTabs = [...tabs.slice(0, tabIndex + 1), newTab, ...tabs.slice(tabIndex + 1)]
    setTabs(newTabs)

    // Add to group if original tab was in a group
    if (tab.groupId) {
      setGroups(groups.map(g => {
        if (g.id === tab.groupId) {
          const tabIdIndex = g.tabIds.indexOf(tabId)
          const newTabIds = [...g.tabIds.slice(0, tabIdIndex + 1), newTabId, ...g.tabIds.slice(tabIdIndex + 1)]
          return { ...g, tabIds: newTabIds }
        }
        return g
      }))
      
      // Reset split widths for the group to equal distribution
      setGroupSplitWidths(prev => {
        const updated = { ...prev }
        delete updated[tab.groupId!]
        return updated
      })
    }

    // Create browser view
    if (window.electronAPI) {
      await window.electronAPI.createBrowserView(newViewId, tab.url)
      updateAllViews()
    }

    closeContextMenu()
  }

  const closeTabsToRight = (tabId: string) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId)
    if (tabIndex === -1 || tabIndex === tabs.length - 1) return

    const tabsToClose = tabs.slice(tabIndex + 1)
    
    // Remove browser views
    tabsToClose.forEach(tab => {
      if (window.electronAPI) {
        window.electronAPI.removeBrowserView(tab.viewId)
      }
    })

    // Update groups - remove closed tabs from their groups
    const closedTabIds = new Set(tabsToClose.map(t => t.id))
    setGroups(groups.map(g => ({
      ...g,
      tabIds: g.tabIds.filter(id => !closedTabIds.has(id))
    })).filter(g => g.tabIds.length > 0))

    // Keep only tabs up to and including the clicked tab
    const newTabs = tabs.slice(0, tabIndex + 1)
    setTabs(newTabs)

    // If active tab was closed, switch to the clicked tab
    if (closedTabIds.has(activeTabId)) {
      setActiveTabId(tabId)
    }

    closeContextMenu()
  }

  const closeOtherTabs = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return

    // Remove all other browser views
    tabs.forEach(t => {
      if (t.id !== tabId && window.electronAPI) {
        window.electronAPI.removeBrowserView(t.viewId)
      }
    })

    // Clear all groups
    setGroups([])
    setGroupSplitWidths({})

    // Keep only the clicked tab
    setTabs([{ ...tab, groupId: null }])
    setActiveTabId(tabId)

    closeContextMenu()
  }

  const reloadTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (tab && window.electronAPI) {
      window.electronAPI.viewReload(tab.viewId)
    }
    closeContextMenu()
  }

  // Reorder tabs within a group
  const reorderTabsInGroup = (groupId: string, fromIndex: number, toIndex: number) => {
    setGroups(groups.map(g => {
      if (g.id === groupId) {
        const newTabIds = [...g.tabIds]
        const [movedTab] = newTabIds.splice(fromIndex, 1)
        newTabIds.splice(toIndex, 0, movedTab)
        return { ...g, tabIds: newTabIds }
      }
      return g
    }))
    
    // Reorder split widths if they exist
    const currentWidths = groupSplitWidths[groupId]
    if (currentWidths && currentWidths.length > 0) {
      setGroupSplitWidths(prev => {
        const newWidths = [...currentWidths]
        const [movedWidth] = newWidths.splice(fromIndex, 1)
        newWidths.splice(toIndex, 0, movedWidth)
        return { ...prev, [groupId]: newWidths }
      })
    }
    
    // Trigger immediate view update
    setTimeout(() => updateAllViews(), 0)
  }

  // Panel drag handlers for reordering in split view
  const handlePanelDragStart = (e: React.MouseEvent, index: number) => {
    setDraggingPanelIndex(index)
    setDragStartX(e.clientX)
    setDragOffset(0)
  }

  useEffect(() => {
    if (draggingPanelIndex === null) return

    const handleMouseMove = (e: MouseEvent) => {
      const currentOffset = e.clientX - dragStartX
      setDragOffset(currentOffset)
      
      // Update BrowserView positions in real-time
      updateAllViews()

      // Check if we should swap with adjacent panel
      const activeTab = tabs.find(t => t.id === activeTabId)
      if (!activeTab?.groupId) return

      const activeGroup = groups.find(g => g.id === activeTab.groupId)
      if (!activeGroup) return

      const numTabs = activeGroup.tabIds.length
      const customWidths = groupSplitWidths[activeGroup.id] || Array(numTabs).fill(100 / numTabs)
      const windowWidth = window.innerWidth

      // Check if dragging right and crossed 50% threshold of next panel
      if (currentOffset > 0 && draggingPanelIndex < numTabs - 1) {
        const nextPanelWidth = windowWidth * (customWidths[draggingPanelIndex + 1] / 100)
        const threshold = nextPanelWidth * 0.5
        
        if (currentOffset > threshold) {
          // Swap with next panel
          reorderTabsInGroup(activeTab.groupId, draggingPanelIndex, draggingPanelIndex + 1)
          setDraggingPanelIndex(draggingPanelIndex + 1)
          setDragStartX(e.clientX)
          setDragOffset(0)
        }
      }
      // Check if dragging left and crossed 50% threshold of previous panel
      else if (currentOffset < 0 && draggingPanelIndex > 0) {
        const prevPanelWidth = windowWidth * (customWidths[draggingPanelIndex - 1] / 100)
        const threshold = prevPanelWidth * 0.5
        
        if (Math.abs(currentOffset) > threshold) {
          // Swap with previous panel
          reorderTabsInGroup(activeTab.groupId, draggingPanelIndex, draggingPanelIndex - 1)
          setDraggingPanelIndex(draggingPanelIndex - 1)
          setDragStartX(e.clientX)
          setDragOffset(0)
        }
      }
    }

    const handleMouseUp = () => {
      setDraggingPanelIndex(null)
      setDragOffset(0)
      setDragStartX(0)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingPanelIndex, dragStartX, dragOffset, activeTabId, groups, groupSplitWidths, tabs])

  // Update views when drag offset changes or drag ends
  useEffect(() => {
    updateAllViews()
  }, [dragOffset, draggingPanelIndex])

  const renameGroup = (groupId: string, newName: string) => {
    if (newName.trim()) {
      setGroups(groups.map(g => 
        g.id === groupId ? { ...g, name: newName.trim() } : g
      ))
    }
    setEditingGroupId(null)
    setEditingGroupName('')
  }

  const startEditingGroup = (groupId: string, currentName: string) => {
    setEditingGroupId(groupId)
    setEditingGroupName(currentName)
  }

  const closeGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    if (!group) return

    const groupTabs = tabs.filter(t => group.tabIds.includes(t.id))
    const splitWidths = groupSplitWidths[groupId] || []

    // Store for undo
    setUndoGroupClose({ group, tabs: groupTabs, splitWidths })
    
    // Add to recently closed groups (keep last 10)
    setRecentlyClosedGroups(prev => [
      { group, tabs: groupTabs, splitWidths, closedAt: Date.now() },
      ...prev
    ].slice(0, 10))

    // Remove browser views
    groupTabs.forEach(tab => {
      if (window.electronAPI) {
        window.electronAPI.removeBrowserView(tab.viewId)
      }
    })

    // Remove tabs and group
    setTabs(tabs.filter(t => !group.tabIds.includes(t.id)))
    setGroups(groups.filter(g => g.id !== groupId))
    setGroupSplitWidths(prev => {
      const updated = { ...prev }
      delete updated[groupId]
      return updated
    })

    // Switch to another tab if active was closed
    if (group.tabIds.includes(activeTabId)) {
      const remainingTabs = tabs.filter(t => !group.tabIds.includes(t.id))
      if (remainingTabs.length > 0) {
        setActiveTabId(remainingTabs[0].id)
      }
    }

    // Auto-clear undo after 5 seconds
    setTimeout(() => {
      setUndoGroupClose(null)
    }, 5000)
  }

  const undoCloseGroup = async () => {
    if (!undoGroupClose) return

    const { group, tabs: closedTabs, splitWidths } = undoGroupClose

    // Recreate browser views
    for (const tab of closedTabs) {
      if (window.electronAPI) {
        await window.electronAPI.createBrowserView(tab.viewId, tab.url)
      }
    }

    // Restore tabs and group
    setTabs(prev => [...prev, ...closedTabs])
    setGroups(prev => [...prev, group])
    if (splitWidths.length > 0) {
      setGroupSplitWidths(prev => ({ ...prev, [group.id]: splitWidths }))
    }

    setUndoGroupClose(null)
  }

  // Drag and drop handlers
  const handleDragStart = (tabId: string) => {
    setDraggedTabId(tabId)
    setDraggedGroupId(null)
  }

  const handleGroupDragStart = (groupId: string) => {
    setDraggedGroupId(groupId)
    setDraggedTabId(null)
  }

  const handleDragOver = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault()
    setDropTargetTabId(targetTabId)
    setDropTargetGroupId(null)
  }

  const handleGroupDragOver = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault()
    setDropTargetGroupId(targetGroupId)
    setDropTargetTabId(null)
  }

  const handleDragLeave = () => {
    setDropTargetTabId(null)
    setDropTargetGroupId(null)
  }

  const handleDrop = (targetTabId: string) => {
    if (draggedTabId && draggedTabId !== targetTabId) {
      handleTabDrop(targetTabId)
    } else if (draggedGroupId) {
      handleGroupDropOnTab(targetTabId)
    }
    
    setDraggedTabId(null)
    setDraggedGroupId(null)
    setDropTargetTabId(null)
    setDropTargetGroupId(null)
  }

  const handleGroupDrop = (targetGroupId: string) => {
    if (draggedTabId) {
      handleTabDropOnGroup(targetGroupId)
    } else if (draggedGroupId && draggedGroupId !== targetGroupId) {
      handleGroupMerge(targetGroupId)
    }
    
    setDraggedTabId(null)
    setDraggedGroupId(null)
    setDropTargetTabId(null)
    setDropTargetGroupId(null)
  }

  const handleTabDrop = (targetTabId: string) => {
    if (!draggedTabId) return

    const draggedTab = tabs.find(t => t.id === draggedTabId)
    const targetTab = tabs.find(t => t.id === targetTabId)

    if (!draggedTab || !targetTab) return

    // If both tabs are ungrouped, create a new group
    if (draggedTab.groupId === null && targetTab.groupId === null) {
      const newGroupId = `group-${Date.now()}`
      const newGroup: Group = {
        id: newGroupId,
        name: 'Group',
        tabIds: [targetTabId, draggedTabId],
        collapsed: true
      }

      setGroups([...groups, newGroup])
      setTabs(tabs.map(t => {
        if (t.id === targetTabId || t.id === draggedTabId) {
          return { ...t, groupId: newGroupId }
        }
        return t
      }))
    }
    // If dragged tab is in a group and target is ungrouped, create new group
    else if (draggedTab.groupId && targetTab.groupId === null) {
      // Remove from old group first
      const oldGroup = groups.find(g => g.id === draggedTab.groupId)
      if (oldGroup) {
        const updatedTabIds = oldGroup.tabIds.filter(id => id !== draggedTabId)
        
        // Delete old group if only one tab left
        if (updatedTabIds.length === 1) {
          setGroups(groups.filter(g => g.id !== draggedTab.groupId))
          setTabs(tabs.map(t => {
            if (t.id === updatedTabIds[0]) {
              return { ...t, groupId: null }
            }
            return t
          }))
        } else {
          setGroups(groups.map(g => {
            if (g.id === draggedTab.groupId) {
              return { ...g, tabIds: updatedTabIds }
            }
            return g
          }))
        }
      }
      
      // Create new group with target and dragged tab
      const newGroupId = `group-${Date.now()}`
      const newGroup: Group = {
        id: newGroupId,
        name: 'Group',
        tabIds: [targetTabId, draggedTabId],
        collapsed: true
      }

      setGroups(prevGroups => [...prevGroups, newGroup])
      setTabs(tabs.map(t => {
        if (t.id === targetTabId || t.id === draggedTabId) {
          return { ...t, groupId: newGroupId }
        }
        return t
      }))
    }
    // If target is in a group and dragged is not, add to group
    else if (targetTab.groupId && draggedTab.groupId === null) {
      setGroups(groups.map(g => {
        if (g.id === targetTab.groupId) {
          return { ...g, tabIds: [...g.tabIds, draggedTabId] }
        }
        return g
      }))
      setTabs(tabs.map(t => {
        if (t.id === draggedTabId) {
          return { ...t, groupId: targetTab.groupId }
        }
        return t
      }))
      
      // Reset split widths for the group to equal distribution
      setGroupSplitWidths(prev => {
        const updated = { ...prev }
        delete updated[targetTab.groupId!]
        return updated
      })
    }
    // If both tabs are in different groups, merge the groups
    else if (draggedTab.groupId && targetTab.groupId && draggedTab.groupId !== targetTab.groupId) {
      const draggedGroup = groups.find(g => g.id === draggedTab.groupId)
      const targetGroup = groups.find(g => g.id === targetTab.groupId)
      
      if (draggedGroup && targetGroup) {
        const draggedGroupId = draggedTab.groupId
        const targetGroupId = targetTab.groupId
        
        // Merge dragged group into target group
        setGroups(groups.filter(g => g.id !== draggedGroupId).map(g => {
          if (g.id === targetGroupId) {
            return { ...g, tabIds: [...g.tabIds, ...draggedGroup.tabIds] }
          }
          return g
        }))
        setTabs(tabs.map(t => {
          if (t.groupId === draggedGroupId) {
            return { ...t, groupId: targetGroupId }
          }
          return t
        }))
        
        // Reset split widths for both groups
        setGroupSplitWidths(prev => {
          const updated = { ...prev }
          delete updated[draggedGroupId]
          delete updated[targetGroupId]
          return updated
        })
      }
    }
  }

  const handleTabDropOnGroup = (targetGroupId: string) => {
    if (!draggedTabId) return

    const draggedTab = tabs.find(t => t.id === draggedTabId)
    const targetGroup = groups.find(g => g.id === targetGroupId)

    if (!draggedTab || !targetGroup) return

    // Remove from old group if in one
    if (draggedTab.groupId) {
      const oldGroup = groups.find(g => g.id === draggedTab.groupId)
      if (oldGroup) {
        const oldGroupId = draggedTab.groupId
        const updatedTabIds = oldGroup.tabIds.filter(id => id !== draggedTabId)
        
        // Delete old group if only one tab left
        if (updatedTabIds.length === 1) {
          setGroups(groups.filter(g => g.id !== oldGroupId))
          setTabs(tabs.map(t => {
            if (t.id === updatedTabIds[0]) {
              return { ...t, groupId: null }
            }
            return t
          }))
        } else {
          setGroups(groups.map(g => {
            if (g.id === oldGroupId) {
              return { ...g, tabIds: updatedTabIds }
            }
            return g
          }))
        }
      }
    }

    // Add to target group
    setGroups(groups.map(g => {
      if (g.id === targetGroupId) {
        return { ...g, tabIds: [...g.tabIds, draggedTabId] }
      }
      return g
    }))
    setTabs(tabs.map(t => {
      if (t.id === draggedTabId) {
        return { ...t, groupId: targetGroupId }
      }
      return t
    }))
    
    // Reset split widths for the target group to equal distribution
    setGroupSplitWidths(prev => {
      const updated = { ...prev }
      delete updated[targetGroupId]
      return updated
    })
  }

  const handleGroupDropOnTab = (targetTabId: string) => {
    if (!draggedGroupId) return

    const draggedGroup = groups.find(g => g.id === draggedGroupId)
    const targetTab = tabs.find(t => t.id === targetTabId)

    if (!draggedGroup || !targetTab) return

    // If target is ungrouped, add it to the dragged group
    if (targetTab.groupId === null) {
      setGroups(groups.map(g => {
        if (g.id === draggedGroupId) {
          return { ...g, tabIds: [...g.tabIds, targetTabId] }
        }
        return g
      }))
      setTabs(tabs.map(t => {
        if (t.id === targetTabId) {
          return { ...t, groupId: draggedGroupId }
        }
        return t
      }))
      
      // Reset split widths for the group to equal distribution
      setGroupSplitWidths(prev => {
        const updated = { ...prev }
        delete updated[draggedGroupId]
        return updated
      })
    }
    // If target is in a different group, merge the groups
    else if (targetTab.groupId !== draggedGroupId) {
      handleGroupMerge(targetTab.groupId)
    }
  }

  const handleGroupMerge = (targetGroupId: string) => {
    if (!draggedGroupId || draggedGroupId === targetGroupId) return

    const draggedGroup = groups.find(g => g.id === draggedGroupId)
    const targetGroup = groups.find(g => g.id === targetGroupId)

    if (!draggedGroup || !targetGroup) return

    // Merge dragged group tabs into target group
    setGroups(groups.filter(g => g.id !== draggedGroupId).map(g => {
      if (g.id === targetGroupId) {
        return { ...g, tabIds: [...g.tabIds, ...draggedGroup.tabIds] }
      }
      return g
    }))

    // Update all tabs from dragged group to point to target group
    setTabs(tabs.map(t => {
      if (t.groupId === draggedGroupId) {
        return { ...t, groupId: targetGroupId }
      }
      return t
    }))
    
    // Reset split widths for both groups
    setGroupSplitWidths(prev => {
      const updated = { ...prev }
      delete updated[draggedGroupId]
      delete updated[targetGroupId]
      return updated
    })
  }

  const handleUngroupTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (!tab || !tab.groupId) return

    const group = groups.find(g => g.id === tab.groupId)
    if (!group) return

    const groupId = tab.groupId

    // Remove tab from group
    const updatedTabIds = group.tabIds.filter(id => id !== tabId)

    // If group has 2 or fewer tabs remaining, delete the group and separate all tabs
    if (updatedTabIds.length <= 1) {
      setTabs(tabs.map(t => {
        if (t.groupId === groupId) {
          return { ...t, groupId: null }
        }
        return t
      }))
      setGroups(groups.filter(g => g.id !== groupId))
      // Clean up split widths for deleted group
      setGroupSplitWidths(prev => {
        const updated = { ...prev }
        delete updated[groupId]
        return updated
      })
    } else {
      // Update group with remaining tabs
      setGroups(groups.map(g => {
        if (g.id === groupId) {
          return { ...g, tabIds: updatedTabIds }
        }
        return g
      }))
      setTabs(tabs.map(t => {
        if (t.id === tabId) {
          return { ...t, groupId: null }
        }
        return t
      }))
      // Reset split widths to equal distribution
      setGroupSplitWidths(prev => {
        const updated = { ...prev }
        delete updated[groupId]
        return updated
      })
    }
  }

  const toggleGroupCollapse = (groupId: string) => {
    setGroups(groups.map(g => {
      if (g.id === groupId) {
        const newCollapsed = !g.collapsed
        // Track if menu is opening or closing
        setOpenGroupMenuId(newCollapsed ? null : groupId)
        return { ...g, collapsed: newCollapsed }
      }
      // Close all other groups when opening a new one
      return { ...g, collapsed: true }
    }))
  }

  // Close group menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openGroupMenuId) {
        setGroups(groups.map(g => 
          g.id === openGroupMenuId ? { ...g, collapsed: true } : g
        ))
        setOpenGroupMenuId(null)
      }
    }

    if (openGroupMenuId) {
      // Add slight delay to prevent immediate closure on toggle click
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside)
      }, 100)
      
      return () => {
        clearTimeout(timer)
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [openGroupMenuId, groups])

  // Resize handle handlers
  const handleResizeStart = (groupId: string, handleIndex: number, e: React.MouseEvent) => {
    e.preventDefault()
    setResizingGroupId(groupId)
    setResizingHandleIndex(handleIndex)
    setResizeStartX(e.clientX)
  }

  useEffect(() => {
    if (resizingGroupId === null || resizingHandleIndex === null) return

    const handleMouseMove = (e: MouseEvent) => {
      const group = groups.find(g => g.id === resizingGroupId)
      if (!group) return

      const numTabs = group.tabIds.length
      const windowWidth = window.innerWidth
      const deltaX = e.clientX - resizeStartX

      // Get current widths or initialize equal split
      const currentWidths = groupSplitWidths[resizingGroupId] || 
        Array(numTabs).fill(100 / numTabs)

      // Calculate new widths
      const newWidths = [...currentWidths]
      const leftIndex = resizingHandleIndex
      const rightIndex = resizingHandleIndex + 1

      const deltaPercent = (deltaX / windowWidth) * 100

      // Minimum width: 15% of window
      const minPercent = 15
      
      // Calculate maximum possible width for left panel
      // Ensure all panels can maintain minimum width
      const maxLeftWidth = 100 - (minPercent * (numTabs - 1))
      
      // Calculate new widths with constraints
      let newLeftWidth = currentWidths[leftIndex] + deltaPercent
      let newRightWidth = currentWidths[rightIndex] - deltaPercent
      
      // Clamp left panel between min and max
      newLeftWidth = Math.max(minPercent, Math.min(maxLeftWidth, newLeftWidth))
      
      // Calculate what's left for right panel
      const otherPanelsWidth = newWidths.reduce((sum, width, idx) => {
        if (idx !== leftIndex && idx !== rightIndex) return sum + width
        return sum
      }, 0)
      
      newRightWidth = 100 - newLeftWidth - otherPanelsWidth
      
      // Only apply if right panel is also above minimum
      if (newRightWidth >= minPercent) {
        newWidths[leftIndex] = newLeftWidth
        newWidths[rightIndex] = newRightWidth

        setGroupSplitWidths({
          ...groupSplitWidths,
          [resizingGroupId]: newWidths
        })
        setResizeStartX(e.clientX)
      }
    }

    const handleMouseUp = () => {
      setResizingGroupId(null)
      setResizingHandleIndex(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingGroupId, resizingHandleIndex, resizeStartX, groups, groupSplitWidths])

  // Wake sleeping tab
  const wakeTab = (tabId: string) => {
    setSleepingTabs(prev => {
      const newSet = new Set(prev)
      newSet.delete(tabId)
      return newSet
    })
    updateAllViews()
  }

  // Ad blocker (basic implementation - would need actual filter lists in production)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isAdUrl = (url: string): boolean => {
    if (!settings.adBlockEnabled) return false
    const adPatterns = [
      'doubleclick.net',
      'googlesyndication.com',
      'google-analytics.com',
      'googleadservices.com',
      'amazon-adsystem.com',
      'facebook.com/tr',
      'ads.',
      '/ads/',
      '/ad/',
      'tracker',
      'analytics'
    ]
    return adPatterns.some(pattern => url.includes(pattern))
  }

  // Screenshot function (would require Electron IPC in production)
  const takeScreenshot = async () => {
    if (!activeTab) return
    // This would need to be implemented in Electron main process
    // For now, just show a message
    alert('Screenshot functionality requires additional Electron IPC setup')
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">🌐</span>
            <span className="logo-text">WideScreen</span>
          </div>
        </div>

        <div className="sidebar-content">
          {/* Appearance Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">Appearance</div>
            <div 
              className="sidebar-item"
              onClick={() => setDarkMode(!darkMode)}
            >
              <span className="sidebar-item-icon">{darkMode ? '🌙' : '☀️'}</span>
              <span className="sidebar-item-label">
                {darkMode ? 'Dark Mode' : 'Light Mode'}
              </span>
              <span className="sidebar-item-toggle">
                <div className={`toggle ${darkMode ? 'active' : ''}`}>
                  <div className="toggle-thumb" />
                </div>
              </span>
            </div>
          </div>

          {/* Tab Management Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">Tabs & Groups</div>
            <div className="sidebar-item" onClick={() => setShowTabSearch(true)}>
              <span className="sidebar-item-icon">🔍</span>
              <span className="sidebar-item-label">Search Tabs</span>
            </div>
            <div className="sidebar-item">
              <span className="sidebar-item-icon">📊</span>
              <span className="sidebar-item-label">
                {tabs.length} Tab{tabs.length !== 1 ? 's' : ''} Open
              </span>
            </div>
            <div className="sidebar-item">
              <span className="sidebar-item-icon">📁</span>
              <span className="sidebar-item-label">
                {groups.length} Group{groups.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="sidebar-item" onClick={() => setShowSessions(!showSessions)}>
              <span className="sidebar-item-icon">💾</span>
              <span className="sidebar-item-label">Sessions</span>
            </div>
          </div>

          {/* Bookmarks & History Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">Library</div>
            <div className="sidebar-item" onClick={() => setShowBookmarks(!showBookmarks)}>
              <span className="sidebar-item-icon">⭐</span>
              <span className="sidebar-item-label">Bookmarks ({bookmarks.length})</span>
            </div>
            <div className="sidebar-item" onClick={() => setShowHistory(!showHistory)}>
              <span className="sidebar-item-icon">📜</span>
              <span className="sidebar-item-label">History</span>
            </div>
            <div className="sidebar-item" onClick={() => setShowRecentlyClosed(!showRecentlyClosed)}>
              <span className="sidebar-item-icon">🔄</span>
              <span className="sidebar-item-label">Recently Closed ({recentlyClosed.length})</span>
            </div>
            <div className="sidebar-item" onClick={() => setShowDownloads(!showDownloads)}>
              <span className="sidebar-item-icon">⬇️</span>
              <span className="sidebar-item-label">Downloads ({downloads.length})</span>
            </div>
          </div>

          {/* Browser Settings Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">Browser</div>
            <div className="sidebar-item" onClick={() => setShowPerformance(!showPerformance)}>
              <span className="sidebar-item-icon">📈</span>
              <span className="sidebar-item-label">Performance</span>
            </div>
            <div className="sidebar-item" onClick={() => setShowSettings(true)}>
              <span className="sidebar-item-icon">⚙️</span>
              <span className="sidebar-item-label">Settings</span>
            </div>
            <div className="sidebar-item" onClick={() => setShowKeyboardHelp(true)}>
              <span className="sidebar-item-icon">⌨️</span>
              <span className="sidebar-item-label">Shortcuts</span>
            </div>
            <div className="sidebar-item" onClick={async () => {
              if (window.electronAPI?.clearCache) {
                const result = await window.electronAPI.clearCache()
                if (result?.success) {
                  alert('Cache cleared successfully!')
                } else {
                  alert('Failed to clear cache')
                }
              }
            }}>
              <span className="sidebar-item-icon">🗑️</span>
              <span className="sidebar-item-label">Clear Cache</span>
            </div>
          </div>

          {/* About Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">About</div>
            <div className="sidebar-item">
              <span className="sidebar-item-icon">ℹ️</span>
              <span className="sidebar-item-label">Version 0.1.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar toggle button */}
      <button 
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
      >
        <span className="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="toolbar">
        <div className="tab-bar">
          {/* Tab search bar */}
          {showTabSearch && (
            <div className="tab-search-bar">
              <input
                type="text"
                className="tab-search-input"
                placeholder="Search tabs..."
                value={tabSearchQuery}
                onChange={(e) => setTabSearchQuery(e.target.value)}
                autoFocus
              />
              <button 
                className="tab-search-close"
                onClick={() => {
                  setShowTabSearch(false)
                  setTabSearchQuery('')
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Render ungrouped tabs */}
          {tabs.filter(tab => tab.groupId === null).map(tab => {
            // Filter by search query if active
            if (showTabSearch && tabSearchQuery) {
              const query = tabSearchQuery.toLowerCase()
              if (!tab.title.toLowerCase().includes(query) && 
                  !tab.url.toLowerCase().includes(query)) {
                return null
              }
            }
            
            return (
            <div 
              key={tab.id} 
              className={`tab ${tab.id === activeTabId ? 'active' : ''} ${tab.pinned ? 'pinned' : ''} ${dropTargetTabId === tab.id ? 'drop-target' : ''}`}
              onClick={() => switchTab(tab.id)}
              onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
              draggable
              onDragStart={() => handleDragStart(tab.id)}
              onDragOver={(e) => handleDragOver(e, tab.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(tab.id)}
            >
              {tab.pinned && <span className="pin-indicator">📌</span>}
              {tab.favicon ? (
                <img src={tab.favicon} alt="" className="tab-favicon" />
              ) : (
                <span className="tab-icon">🌐</span>
              )}
              {tab.isLoading && <span className="loading-indicator">⟳</span>}
              {tab.isAudioPlaying && <span className="audio-indicator">🔊</span>}
              {sleepingTabs.has(tab.id) && <span className="sleeping-indicator">💤</span>}
              <span className="tab-title">{tab.title.split(/[\s.,;:!?\-|/()\[\]{}"']/)[0]}</span>
              <button 
                className="close-tab" 
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              >
                ×
              </button>
            </div>
          )})}

          {/* Render groups */}
          {groups.map(group => {
            // Filter group tabs by search query if active
            const visibleTabIds = showTabSearch && tabSearchQuery
              ? group.tabIds.filter(tabId => {
                  const tab = tabs.find(t => t.id === tabId)
                  if (!tab) return false
                  const query = tabSearchQuery.toLowerCase()
                  return tab.title.toLowerCase().includes(query) || 
                         tab.url.toLowerCase().includes(query)
                })
              : group.tabIds
            
            // Hide group if no tabs match
            if (showTabSearch && tabSearchQuery && visibleTabIds.length === 0) {
              return null
            }
            
            return (
            <div key={group.id} className="group-container">
              <div className="group-main">
              <div 
                className={`group-header ${group.tabIds.includes(activeTabId) ? 'active' : ''} ${dropTargetGroupId === group.id ? 'drop-target' : ''}`}
                onClick={() => {
                  const firstTabInGroup = group.tabIds[0]
                  switchTab(firstTabInGroup)
                }}
                draggable
                onDragStart={() => handleGroupDragStart(group.id)}
                onDragOver={(e) => handleGroupDragOver(e, group.id)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleGroupDrop(group.id)}
              >
                {editingGroupId === group.id ? (
                  <input
                    type="text"
                    className="group-name-input"
                    value={editingGroupName}
                    onChange={(e) => setEditingGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                      if (e.key === 'Enter') renameGroup(group.id, editingGroupName)
                      if (e.key === 'Escape') { setEditingGroupId(null); setEditingGroupName('') }
                    }}
                    onBlur={() => renameGroup(group.id, editingGroupName)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span 
                    className="group-name"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      startEditingGroup(group.id, group.name)
                    }}
                    title="Double-click to rename"
                  >
                    {group.name}
                  </span>
                )}
                <button 
                  className="close-group-button"
                  onClick={(e) => { e.stopPropagation(); closeGroup(group.id); }}
                  title="Close group"
                >
                  ×
                </button>
                <button 
                  className="collapse-button"
                  onClick={(e) => { e.stopPropagation(); toggleGroupCollapse(group.id); }}
                >
                  {group.collapsed ? '→' : '←'}
                </button>
              </div>
              </div>
              
              {!group.collapsed && (
                <div 
                  className="group-tabs"
                  onClick={(e) => e.stopPropagation()}
                >
                  {visibleTabIds.map((tabId) => {
                    const tab = tabs.find(t => t.id === tabId)
                    if (!tab) return null
                    return (
                      <div 
                        key={tab.id}
                        className={`group-tab ${tab.id === activeTabId ? 'active' : ''}`}
                        onClick={() => switchTab(tab.id)}
                        onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
                      >
                        <span className="tab-title">{tab.title.split(/[\s.,;:!?\-|/()\[\]{}"']/)[0]}</span>
                        <button 
                          className="ungroup-button"
                          onClick={(e) => { e.stopPropagation(); handleUngroupTab(tab.id); }}
                          title="Remove from group"
                        >
                          ⤴
                        </button>
                        <button 
                          className="close-tab" 
                          onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )})}

          <button className="new-tab-button" onClick={addNewTab}>+</button>
        </div>

        {/* Hide nav-bar when a group is selected, show for single tabs */}
        {(() => {
          const activeTab = tabs.find(t => t.id === activeTabId)
          const activeGroup = activeTab?.groupId ? groups.find(g => g.id === activeTab.groupId) : null
          const isGroupView = activeGroup && activeGroup.tabIds.length >= 2
          
          if (isGroupView) return null
          
          return (
            <div className="nav-bar">
              <div className="nav-controls">
                <button onClick={goBack}>←</button>
                <button onClick={goForward}>→</button>
                <button onClick={reload}>⟳</button>
              </div>

              <input
                type="text"
                className="url-input"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && navigate()}
                placeholder="Enter URL or search..."
              />

              <button onClick={() => navigate()}>Go</button>
              <button onClick={takeScreenshot} title="Take Screenshot">📷</button>
            </div>
          )
        })()}
      </div>

      {/* Panel containers for split views - each contains drag handle, address bar, and content */}
      {(() => {
        const activeTab = tabs.find(t => t.id === activeTabId)
        if (!activeTab?.groupId) return null
        
        const activeGroup = groups.find(g => g.id === activeTab.groupId)
        if (!activeGroup) return null

        const numTabs = activeGroup.tabIds.length
        if (numTabs < 2) return null

        const sidebarWidth = sidebarOpen ? 180 : 0
        const availableWidth = windowWidth - sidebarWidth
        const customWidths = groupSplitWidths[activeGroup.id] || 
          Array(numTabs).fill(100 / numTabs)
        
        const panelContainers: JSX.Element[] = []
        let cumulativeX = 0

        activeGroup.tabIds.forEach((tabId, index) => {
          const tab = tabs.find(t => t.id === tabId)
          if (!tab) return

          const widthPercent = customWidths[index] / 100
          const panelWidth = Math.round(availableWidth * widthPercent)
          
          // Apply drag offset to the dragging panel
          const offsetX = draggingPanelIndex === index ? dragOffset : 0
          
          panelContainers.push(
            <div
              key={`panel-container-${tabId}`}
              className={`split-panel-container ${draggingPanelIndex === index ? 'dragging' : ''}`}
              style={{
                left: `${Math.round(cumulativeX + offsetX + sidebarWidth)}px`,
                width: `${panelWidth}px`,
                top: '64px',
                bottom: 0,
                position: 'fixed',
                zIndex: draggingPanelIndex === index ? 1002 : 1001
              }}
            >
              {/* Drag Handle */}
              <div
                className="panel-drag-handle"
                onMouseDown={(e) => handlePanelDragStart(e, index)}
                title="Drag to reorder panel"
              >
                <div className="drag-handle-icon">⋮</div>
              </div>

              {/* Address Bar */}
              <div className="panel-header">
                <div className="panel-nav-controls">
                  <button onClick={() => { setActiveTabId(tabId); goBack(); }}>←</button>
                  <button onClick={() => { setActiveTabId(tabId); goForward(); }}>→</button>
                  <button onClick={() => { setActiveTabId(tabId); reload(); }}>⟳</button>
                </div>
                <input
                  type="text"
                  className="panel-url-input"
                  value={perTabUrlInputs[tabId] || tab.url || ''}
                  onChange={(e) => setPerTabUrlInputs(prev => ({ ...prev, [tabId]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(undefined, tabId)}
                  placeholder="Enter URL or search..."
                />
                <button onClick={() => navigate(undefined, tabId)}>Go</button>
              </div>
            </div>
          )

          cumulativeX += panelWidth
        })

        return panelContainers
      })()}

      {/* Resize handles for active group - between panels */}
      {(() => {
        const activeTab = tabs.find(t => t.id === activeTabId)
        if (!activeTab?.groupId) return null
        
        const activeGroup = groups.find(g => g.id === activeTab.groupId)
        if (!activeGroup) return null

        const numTabs = activeGroup.tabIds.length
        if (numTabs < 2) return null

        const sidebarWidth = sidebarOpen ? 180 : 0
        const availableWidth = windowWidth - sidebarWidth
        const customWidths = groupSplitWidths[activeGroup.id] || 
          Array(numTabs).fill(100 / numTabs)
        
        const handles = []
        let cumulativeX = 0

        for (let i = 0; i < numTabs - 1; i++) {
          const widthPercent = customWidths[i] / 100
          const panelWidth = availableWidth * widthPercent
          
          // Apply cumulative drag offset for all panels being affected
          let totalOffset = 0
          if (draggingPanelIndex !== null) {
            if (draggingPanelIndex === i) {
              totalOffset = dragOffset
            } else if (draggingPanelIndex === i + 1) {
              totalOffset = dragOffset
            }
          }
          
          cumulativeX += panelWidth
          handles.push(
            <div
              key={`handle-${i}`}
              className="resize-handle"
              style={{
                left: `${Math.round(cumulativeX + totalOffset + sidebarWidth)}px`,
                top: '64px',
                height: '20px',
                width: '32px',
                zIndex: 1002
              }}
              onMouseDown={(e) => handleResizeStart(activeGroup.id, i, e)}
            />
          )
        }

        return handles
      })()}

      {/* Splash screens for panels with about:blank */}
      {(() => {
        const activeTab = tabs.find(t => t.id === activeTabId)
        if (!activeTab?.groupId) {
          // Single tab view - show splash if active tab is about:blank
          return activeTab?.url === 'about:blank' ? (
            <div className="splash-screen">
              <div className="splash-content">
                <h1>WideScreen Browser</h1>
                
                <div className="description-section">
                  <p className="description-text">
                    A powerful browser designed for widescreen displays with side-by-side panels, 
                    perfect for multitasking and comparing content.
                  </p>
                  <div className="features-grid">
                    <div className="feature-item">
                      <strong>🔀 Split Views</strong>
                      <span>Create groups and view multiple pages side-by-side</span>
                    </div>
                    <div className="feature-item">
                      <strong>📌 Pin Pages</strong>
                      <span>Keep important tabs always accessible</span>
                    </div>
                    <div className="feature-item">
                      <strong>🔖 Bookmarks</strong>
                      <span>Organize sites with folders (Ctrl+D)</span>
                    </div>
                    <div className="feature-item">
                      <strong>💾 Sessions</strong>
                      <span>Save and restore tab layouts</span>
                    </div>
                    <div className="feature-item">
                      <strong>⌨️ Shortcuts</strong>
                      <span>Ctrl+T new tab, Ctrl+W close, Ctrl+Tab switch</span>
                    </div>
                    <div className="feature-item">
                      <strong>🎨 Themes</strong>
                      <span>Switch between dark and light modes</span>
                    </div>
                  </div>
                </div>

                <div className="search-container">
                  <input
                    type="text"
                    className="search-input"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate()}
                    placeholder="Search DuckDuckGo or enter URL..."
                    autoFocus
                  />
                  <button className="search-button" onClick={() => navigate()}>Search</button>
                </div>

                <p className="quick-start-label">Quick Start</p>
                <div className="quick-links">
              <a href="#" onClick={(e) => { 
                e.preventDefault(); 
                navigate('github.com');
              }}>
                GitHub
              </a>
              <a href="#" onClick={(e) => { 
                e.preventDefault(); 
                navigate('youtube.com');
              }}>
                YouTube
              </a>
              <a href="#" onClick={(e) => { 
                e.preventDefault(); 
                navigate('reddit.com');
              }}>
                Reddit
              </a>
              <a href="#" onClick={(e) => { 
                e.preventDefault(); 
                navigate('twitter.com');
              }}>
                Twitter
              </a>
              <a href="#" onClick={(e) => { 
                e.preventDefault(); 
                navigate('netflix.com');
              }}>
                Netflix
              </a>
              <a href="#" onClick={(e) => { 
                e.preventDefault(); 
                navigate('amazon.com');
              }}>
                Amazon
              </a>
            </div>
          </div>
        </div>
          ) : null
        }
        
        // Split view - show splash for each panel with about:blank
        const activeGroup = groups.find(g => g.id === activeTab.groupId)
        if (!activeGroup || activeGroup.tabIds.length < 2) return null

        const windowWidth = window.innerWidth
        const customWidths = groupSplitWidths[activeGroup.id] || 
          Array(activeGroup.tabIds.length).fill(100 / activeGroup.tabIds.length)
        
        const splashScreens: JSX.Element[] = []
        let cumulativeX = 0

        activeGroup.tabIds.forEach((tabId, index) => {
          const tab = tabs.find(t => t.id === tabId)
          const widthPercent = customWidths[index] / 100
          
          if (!tab || tab.url !== 'about:blank') {
            cumulativeX += windowWidth * widthPercent
            return
          }

          const panelWidth = Math.round(windowWidth * widthPercent)
          
          splashScreens.push(
            <div
              key={`splash-${tabId}`}
              className="splash-screen panel-splash"
              style={{
                left: `${Math.round(cumulativeX)}px`,
                width: `${Math.round(panelWidth)}px`,
                top: '170px', // toolbar (100px) + panel header (40px) + resize handle (30px)
                height: 'calc(100vh - 170px)',
                position: 'fixed'
              }}
            >
              <div className="splash-content">
                <h1>WideScreen Browser</h1>
                
                <div className="description-section compact">
                  <p className="description-text">
                    A powerful browser designed for widescreen displays with side-by-side panels.
                  </p>
                  <div className="features-grid">
                    <div className="feature-item">
                      <strong>🔀 Split Views</strong>
                      <span>Multiple pages side-by-side</span>
                    </div>
                    <div className="feature-item">
                      <strong>📌 Pin & Organize</strong>
                      <span>Bookmarks and sessions</span>
                    </div>
                    <div className="feature-item">
                      <strong>⌨️ Keyboard Shortcuts</strong>
                      <span>Ctrl+T, Ctrl+W, Ctrl+Tab</span>
                    </div>
                  </div>
                </div>

                <div className="search-container">
                  <input
                    type="text"
                    className="search-input"
                    value={perTabUrlInputs[tabId] || ''}
                    onChange={(e) => setPerTabUrlInputs(prev => ({ ...prev, [tabId]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(undefined, tabId)}
                    placeholder="Search DuckDuckGo or enter URL..."
                  />
                  <button className="search-button" onClick={() => navigate(undefined, tabId)}>Search</button>
                </div>

                <p className="quick-start-label">Quick Start</p>
                <div className="quick-links">
                  <a href="#" onClick={(e) => { 
                    e.preventDefault(); 
                    navigate('github.com', tabId);
                  }}>
                    GitHub
                  </a>
                  <a href="#" onClick={(e) => { 
                    e.preventDefault(); 
                    navigate('youtube.com', tabId);
                  }}>
                    YouTube
                  </a>
                  <a href="#" onClick={(e) => { 
                    e.preventDefault(); 
                    navigate('reddit.com', tabId);
                  }}>
                    Reddit
                  </a>
                  <a href="#" onClick={(e) => { 
                    e.preventDefault(); 
                    navigate('twitter.com', tabId);
                  }}>
                    Twitter
                  </a>
                  <a href="#" onClick={(e) => { 
                    e.preventDefault(); 
                    navigate('netflix.com', tabId);
                  }}>
                    Netflix
                  </a>
                  <a href="#" onClick={(e) => { 
                    e.preventDefault(); 
                    navigate('amazon.com', tabId);
                  }}>
                    Amazon
                  </a>
                </div>
              </div>
            </div>
          )

          cumulativeX += panelWidth
        })

        return splashScreens
      })()}

      {/* Tab context menu */}
      {contextMenuTabId && contextMenuPosition && (
        <>
          <div className="context-menu-overlay" onClick={closeContextMenu} />
          <div 
            className="context-menu"
            style={{
              left: `${contextMenuPosition.x}px`,
              top: `${contextMenuPosition.y}px`
            }}
          >
            <div className="context-menu-item" onClick={() => { togglePinTab(contextMenuTabId); closeContextMenu(); }}>
              {tabs.find(t => t.id === contextMenuTabId)?.pinned ? '📌 Unpin Tab' : '📌 Pin Tab'}
            </div>
            <div className="context-menu-separator" />
            <div className="context-menu-item" onClick={() => duplicateTab(contextMenuTabId)}>
              Duplicate Tab
            </div>
            <div className="context-menu-item" onClick={() => reloadTab(contextMenuTabId)}>
              Reload
            </div>
            <div className="context-menu-separator" />
            <div className="context-menu-item" onClick={() => closeTabsToRight(contextMenuTabId)}>
              Close Tabs to Right
            </div>
            <div className="context-menu-item" onClick={() => closeOtherTabs(contextMenuTabId)}>
              Close Other Tabs
            </div>
            <div className="context-menu-separator" />
            <div 
              className="context-menu-item danger" 
              onClick={() => { closeTab(contextMenuTabId); closeContextMenu(); }}
            >
              Close Tab
            </div>
          </div>
        </>
      )}

      {/* Page Context Menu */}
      {pageContextMenu && (
        <>
          <div className="context-menu-overlay" onClick={closeContextMenu} />
          <div 
            className="context-menu"
            style={{
              left: `${pageContextMenu.x}px`,
              top: `${pageContextMenu.y}px`
            }}
          >
            {pageContextMenu.linkUrl && (
              <>
                <div className="context-menu-item" onClick={async () => {
                  const newTabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                  const newViewId = `view-${newTabId}`
                  const newTab: Tab = {
                    id: newTabId,
                    viewId: newViewId,
                    url: pageContextMenu.linkUrl!,
                    title: 'Loading...',
                    groupId: null
                  }
                  if (window.electronAPI) {
                    await window.electronAPI.createBrowserView(newViewId, pageContextMenu.linkUrl!)
                  }
                  setTabs(prevTabs => [...prevTabs, newTab])
                  setActiveTabId(newTabId)
                  closeContextMenu()
                }}>
                  Open Link in New Tab
                </div>
                <div className="context-menu-item" onClick={() => {
                  navigator.clipboard.writeText(pageContextMenu.linkUrl!)
                  closeContextMenu()
                }}>
                  Copy Link Address
                </div>
                <div className="context-menu-separator" />
              </>
            )}
            {pageContextMenu.imageUrl && (
              <>
                <div className="context-menu-item" onClick={async () => {
                  const newTabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                  const newViewId = `view-${newTabId}`
                  const newTab: Tab = {
                    id: newTabId,
                    viewId: newViewId,
                    url: pageContextMenu.imageUrl!,
                    title: 'Image',
                    groupId: null
                  }
                  if (window.electronAPI) {
                    await window.electronAPI.createBrowserView(newViewId, pageContextMenu.imageUrl!)
                  }
                  setTabs(prevTabs => [...prevTabs, newTab])
                  setActiveTabId(newTabId)
                  closeContextMenu()
                }}>
                  Open Image in New Tab
                </div>
                <div className="context-menu-item" onClick={() => {
                  navigator.clipboard.writeText(pageContextMenu.imageUrl!)
                  closeContextMenu()
                }}>
                  Copy Image Address
                </div>
                <div className="context-menu-separator" />
              </>
            )}
            <div className="context-menu-item" onClick={() => { goBack(); closeContextMenu(); }}>
              ← Back
            </div>
            <div className="context-menu-item" onClick={() => { goForward(); closeContextMenu(); }}>
              Forward →
            </div>
            <div className="context-menu-item" onClick={() => { reload(); closeContextMenu(); }}>
              Reload
            </div>
          </div>
        </>
      )}

      {/* Undo popup for closed groups */}
      {undoGroupClose && (
        <div className="undo-popup">
          <span>Group "{undoGroupClose.group.name}" closed with {undoGroupClose.tabs.length} tab(s)</span>
          <button className="undo-button" onClick={undoCloseGroup}>
            Undo
          </button>
          <button className="dismiss-button" onClick={() => setUndoGroupClose(null)}>
            ×
          </button>
        </div>
      )}

      {/* Bookmarks Panel */}
      {showBookmarks && (
        <div className="modal-overlay" onClick={() => setShowBookmarks(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bookmarks</h2>
              <button className="modal-close" onClick={() => setShowBookmarks(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="bookmark-controls">
                {activeTab && (() => {
                  const activeGroup = activeTab.groupId ? groups.find(g => g.id === activeTab.groupId) : null
                  const pagesInGroup = activeGroup 
                    ? tabs.filter(t => activeGroup.tabIds.includes(t.id) && t.url !== 'about:blank')
                    : [activeTab].filter(t => t.url !== 'about:blank')
                  
                  // Initialize selected tabs if empty
                  if (selectedTabsForBookmark.size === 0 && pagesInGroup.length > 0) {
                    setSelectedTabsForBookmark(new Set([activeTab.id]))
                  }

                  return (
                    <div className="current-page-info">
                      <div className="current-page-label">Current page{pagesInGroup.length > 1 ? 's' : ''}:</div>
                      <div className="current-pages-list">
                        {pagesInGroup.map(tab => (
                          <div key={tab.id} className="current-page-item">
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={selectedTabsForBookmark.has(tab.id)}
                                onChange={(e) => {
                                  const newSelected = new Set(selectedTabsForBookmark)
                                  if (e.target.checked) {
                                    newSelected.add(tab.id)
                                  } else {
                                    newSelected.delete(tab.id)
                                  }
                                  setSelectedTabsForBookmark(newSelected)
                                }}
                              />
                              <div className="page-details">
                                <div className="current-page-title">{tab.title}</div>
                                <div className="current-page-url">{tab.url}</div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                <div className="bookmark-actions">
                  <button 
                    className="btn-primary" 
                    onClick={() => {
                      const tabsToBookmark = Array.from(selectedTabsForBookmark)
                        .map(tabId => tabs.find(t => t.id === tabId))
                        .filter(tab => tab !== undefined)
                      
                      tabsToBookmark.forEach((tab, index) => {
                        // Add slight delay to ensure unique timestamps
                        setTimeout(() => {
                          addBookmark(tab.url, tab.title)
                        }, index * 10)
                      })
                      
                      // Clear selection after bookmarking
                      setSelectedTabsForBookmark(new Set())
                    }}
                    disabled={selectedTabsForBookmark.size === 0}
                  >
                    ⭐ Bookmark Page{selectedTabsForBookmark.size > 1 ? 's' : ''} ({selectedTabsForBookmark.size})
                  </button>
                  {activeTab?.groupId && (() => {
                    const group = groups.find(g => g.id === activeTab.groupId)
                    return group && (
                      <button 
                        className="btn-secondary" 
                        onClick={() => {
                          const folderName = group.name || 'Group Bookmarks'
                          const folderId = createBookmarkFolder(folderName)
                          const tabsToBookmark = group.tabIds
                            .map(tabId => tabs.find(t => t.id === tabId))
                            .filter((tab): tab is Tab => tab !== undefined && tab.url !== 'about:blank')
                          
                          tabsToBookmark.forEach((tab, index) => {
                            // Add slight delay to ensure unique timestamps
                            setTimeout(() => {
                              addBookmark(tab.url, tab.title, folderId)
                            }, index * 10)
                          })
                        }}
                      >
                        📁 Save "{group.name}" as Folder ({group.tabIds.length})
                      </button>
                    )
                  })()}
                  <button 
                    className="btn-secondary" 
                    onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                  >
                    📁 New Folder
                  </button>
                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      const dataStr = JSON.stringify({ bookmarks, bookmarkFolders }, null, 2)
                      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
                      const exportFileDefaultName = `bookmarks-${new Date().toISOString().split('T')[0]}.json`
                      const linkElement = document.createElement('a')
                      linkElement.setAttribute('href', dataUri)
                      linkElement.setAttribute('download', exportFileDefaultName)
                      linkElement.click()
                    }}
                  >
                    📤 Export
                  </button>
                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = '.json'
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            try {
                              const data = JSON.parse(event.target?.result as string)
                              if (data.bookmarks && data.bookmarkFolders) {
                                setBookmarks(data.bookmarks)
                                setBookmarkFolders(data.bookmarkFolders)
                                alert('Bookmarks imported successfully!')
                              } else {
                                alert('Invalid bookmark file format')
                              }
                            } catch (error) {
                              alert('Failed to import bookmarks')
                            }
                          }
                          reader.readAsText(file)
                        }
                      }
                      input.click()
                    }}
                  >
                    📥 Import
                  </button>
                </div>
                {showNewFolderInput && (
                  <div className="inline-input-group">
                    <input
                      type="text"
                      placeholder="Folder name..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newFolderName.trim()) {
                          createBookmarkFolder(newFolderName.trim())
                          setNewFolderName('')
                          setShowNewFolderInput(false)
                        } else if (e.key === 'Escape') {
                          setNewFolderName('')
                          setShowNewFolderInput(false)
                        }
                      }}
                      autoFocus
                    />
                    <button 
                      className="btn-primary"
                      onClick={() => {
                        if (newFolderName.trim()) {
                          createBookmarkFolder(newFolderName.trim())
                          setNewFolderName('')
                          setShowNewFolderInput(false)
                        }
                      }}
                    >
                      Create
                    </button>
                    <button 
                      className="btn-secondary"
                      onClick={() => {
                        setNewFolderName('')
                        setShowNewFolderInput(false)
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <div className="bookmark-list">
                {bookmarkFolders.map(folder => (
                  <div key={folder.id} className="bookmark-folder">
                    <div className="bookmark-folder-header">
                      <div 
                        className="bookmark-folder-name"
                        onClick={async () => {
                          // Get all bookmarks in this folder
                          const folderBookmarks = bookmarks.filter(b => b.folderId === folder.id)
                          
                          if (folderBookmarks.length === 0) return
                          
                          // Create a new group for these bookmarks
                          const newGroupId = `group-${Date.now()}`
                          const newTabIds: string[] = []
                          
                          // Create tabs for each bookmark
                          for (const bookmark of folderBookmarks) {
                            const newTabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                            const newViewId = `view-${newTabId}`
                            
                            const newTab: Tab = {
                              id: newTabId,
                              viewId: newViewId,
                              url: bookmark.url,
                              title: bookmark.title || bookmark.url,
                              groupId: newGroupId
                            }
                            
                            newTabIds.push(newTabId)
                            
                            if (window.electronAPI) {
                              await window.electronAPI.createBrowserView(newViewId, bookmark.url)
                            }
                            
                            setTabs(prevTabs => [...prevTabs, newTab])
                            
                            // Small delay between tab creations
                            await new Promise(resolve => setTimeout(resolve, 50))
                          }
                          
                          // Create the group
                          const newGroup: Group = {
                            id: newGroupId,
                            name: folder.name,
                            tabIds: newTabIds,
                            collapsed: false
                          }
                          
                          setGroups(prevGroups => [...prevGroups, newGroup])
                          
                          // Switch to the first tab of the new group
                          if (newTabIds.length > 0) {
                            setActiveTabId(newTabIds[0])
                          }
                          
                          setShowBookmarks(false)
                        }}
                        style={{ cursor: folder.id !== 'root' && bookmarks.filter(b => b.folderId === folder.id).length > 0 ? 'pointer' : 'default' }}
                        title={folder.id !== 'root' && bookmarks.filter(b => b.folderId === folder.id).length > 0 ? 'Click to restore all bookmarks as a new group' : ''}
                      >
                        📁 {folder.name}
                      </div>
                      {folder.id !== 'root' && (
                        <button 
                          className="folder-delete"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Delete folder "${folder.name}" and all its bookmarks?`)) {
                              removeBookmarkFolder(folder.id)
                            }
                          }}
                          title="Delete folder"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {bookmarks
                      .filter(b => b.folderId === folder.id)
                      .map(bookmark => (
                        <div key={bookmark.id} className="bookmark-item">
                          <div 
                            className="bookmark-link"
                            onClick={async () => {
                              if (window.electronAPI) {
                                if (activeTab) {
                                  // If there's an active tab, navigate it to the URL
                                  await window.electronAPI.viewLoadURL(activeTab.viewId, bookmark.url)
                                  setTabs(prevTabs => 
                                    prevTabs.map(t => 
                                      t.id === activeTab.id 
                                        ? { ...t, url: bookmark.url, title: bookmark.title || bookmark.url }
                                        : t
                                    )
                                  )
                                } else {
                                  // If no active tab, create a new one
                                  const newTabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                                  const newViewId = `view-${newTabId}`
                                  
                                  const newTab: Tab = {
                                    id: newTabId,
                                    viewId: newViewId,
                                    url: bookmark.url,
                                    title: bookmark.title || bookmark.url,
                                    groupId: null
                                  }
                                  
                                  await window.electronAPI.createBrowserView(newViewId, bookmark.url)
                                  setTabs(prevTabs => [...prevTabs, newTab])
                                  setActiveTabId(newTabId)
                                }
                                setShowBookmarks(false)
                              }
                            }}
                          >
                            <span className="bookmark-icon">🔗</span>
                            <span className="bookmark-title">{bookmark.title || bookmark.url}</span>
                          </div>
                          <button 
                            className="bookmark-delete"
                            onClick={() => removeBookmark(bookmark.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>History</h2>
              <button className="modal-close" onClick={() => setShowHistory(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="history-controls">
                <input
                  type="text"
                  placeholder="Search history..."
                  className="history-search"
                  onChange={() => {
                    // Search is reactive through the list rendering
                  }}
                />
                <button className="btn-danger" onClick={clearHistory}>
                  Clear All History
                </button>
              </div>
              <div className="history-list">
                {history.slice(0, 100).map(item => (
                  <div key={item.id} className="history-item">
                    <div 
                      className="history-link"
                      onClick={async () => {
                        if (window.electronAPI) {
                          // Always create a new tab for history items
                          const newTabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                          const newViewId = `view-${newTabId}`
                          
                          const newTab: Tab = {
                            id: newTabId,
                            viewId: newViewId,
                            url: item.url,
                            title: item.title || item.url,
                            groupId: activeTab?.groupId || null
                          }
                          
                          await window.electronAPI.createBrowserView(newViewId, item.url)
                          setTabs(prevTabs => [...prevTabs, newTab])
                          setActiveTabId(newTabId)
                          
                          // If the active tab was in a group, add the new tab to that group
                          if (activeTab?.groupId) {
                            setGroups(prevGroups => 
                              prevGroups.map(g => 
                                g.id === activeTab.groupId 
                                  ? { ...g, tabIds: [...g.tabIds, newTabId] }
                                  : g
                              )
                            )
                          }
                          
                          setShowHistory(false)
                        }
                      }}
                    >
                      <div className="history-title">{item.title || item.url}</div>
                      <div className="history-url">{item.url}</div>
                      <div className="history-meta">
                        {new Date(item.timestamp).toLocaleString()} • {item.visitCount} visit{item.visitCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Downloads Panel */}
      {showDownloads && (
        <div className="modal-overlay" onClick={() => setShowDownloads(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Downloads</h2>
              <button className="modal-close" onClick={() => setShowDownloads(false)}>×</button>
            </div>
            <div className="modal-body">
              {downloads.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#718096', padding: '40px 20px' }}>
                  No downloads yet
                </div>
              ) : (
                <div className="download-list">
                  {downloads.map(download => (
                    <div key={download.id} className="download-item">
                      <div className="download-info">
                        <div className="download-filename">{download.filename}</div>
                        <div className="download-url">{download.url}</div>
                        <div className="download-progress">
                          {download.state === 'completed' ? 'Completed' : 
                           download.state === 'interrupted' ? 'Failed' :
                           `${Math.round((download.receivedBytes / download.totalBytes) * 100)}%`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sessions Panel */}
      {showSessions && (
        <div className="modal-overlay" onClick={() => setShowSessions(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Sessions</h2>
              <button className="modal-close" onClick={() => setShowSessions(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="session-controls">
                <button 
                  className="btn-primary"
                  onClick={() => setShowNewSessionInput(!showNewSessionInput)}
                >
                  💾 Save Current Session
                </button>
              </div>
              {showNewSessionInput && (
                <div className="inline-input-group">
                  <input
                    type="text"
                    placeholder="Session name..."
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSessionName.trim()) {
                        saveCurrentSession(newSessionName.trim())
                        setNewSessionName('')
                        setShowNewSessionInput(false)
                      } else if (e.key === 'Escape') {
                        setNewSessionName('')
                        setShowNewSessionInput(false)
                      }
                    }}
                    autoFocus
                  />
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      if (newSessionName.trim()) {
                        saveCurrentSession(newSessionName.trim())
                        setNewSessionName('')
                        setShowNewSessionInput(false)
                      }
                    }}
                  >
                    Save
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      setNewSessionName('')
                      setShowNewSessionInput(false)
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div className="session-list">
                {savedSessions.map(session => (
                  <div key={session.id} className="session-item">
                    <div className="session-info">
                      <div className="session-name">{session.name}</div>
                      <div className="session-meta">
                        {session.tabs.length} tabs • {new Date(session.dateCreated).toLocaleString()}
                      </div>
                    </div>
                    <div className="session-actions">
                      <button 
                        className="btn-secondary"
                        onClick={() => {
                          loadSession(session.id)
                          setShowSessions(false)
                        }}
                      >
                        Load
                      </button>
                      <button 
                        className="btn-danger"
                        onClick={() => deleteSession(session.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-panel large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button className="modal-close" onClick={() => setShowSettings(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="settings-section">
                <h3>General</h3>
                <div className="setting-item">
                  <label>Default Search Engine:</label>
                  <select 
                    value={settings.defaultSearchEngine}
                    onChange={(e) => setSettings({...settings, defaultSearchEngine: e.target.value})}
                  >
                    <option value="google">Google</option>
                    <option value="duckduckgo">DuckDuckGo</option>
                    <option value="bing">Bing</option>
                  </select>
                </div>
                <div className="setting-item">
                  <label>Homepage:</label>
                  <input 
                    type="text"
                    value={settings.homepage}
                    onChange={(e) => setSettings({...settings, homepage: e.target.value})}
                    placeholder="about:blank"
                  />
                </div>
                <div className="setting-item">
                  <label>Default Zoom:</label>
                  <input 
                    type="range"
                    min="50"
                    max="200"
                    value={settings.defaultZoom}
                    onChange={(e) => setSettings({...settings, defaultZoom: parseInt(e.target.value)})}
                  />
                  <span>{settings.defaultZoom}%</span>
                </div>
              </div>
              <div className="settings-section">
                <h3>Privacy</h3>
                <div className="setting-item">
                  <label>
                    <input 
                      type="checkbox"
                      checked={settings.enableNotifications}
                      onChange={(e) => setSettings({...settings, enableNotifications: e.target.checked})}
                    />
                    Enable Notifications
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input 
                      type="checkbox"
                      checked={settings.privateMode}
                      onChange={(e) => setSettings({...settings, privateMode: e.target.checked})}
                    />
                    Private Browsing Mode
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input 
                      type="checkbox"
                      checked={settings.adBlockEnabled}
                      onChange={(e) => setSettings({...settings, adBlockEnabled: e.target.checked})}
                    />
                    Enable Ad Blocker
                  </label>
                </div>
              </div>
              <div className="settings-section">
                <h3>Performance</h3>
                <div className="setting-item">
                  <label>
                    <input 
                      type="checkbox"
                      checked={settings.autoSleepTabs}
                      onChange={(e) => setSettings({...settings, autoSleepTabs: e.target.checked})}
                    />
                    Auto-sleep Inactive Tabs
                  </label>
                </div>
                <div className="setting-item">
                  <label>Sleep tabs after (minutes):</label>
                  <input 
                    type="number"
                    min="5"
                    max="120"
                    value={settings.sleepTabsAfter}
                    onChange={(e) => setSettings({...settings, sleepTabsAfter: parseInt(e.target.value) || 30})}
                    disabled={!settings.autoSleepTabs}
                  />
                </div>
              </div>
              <div className="settings-section">
                <h3>Appearance</h3>
                <div className="setting-item">
                  <label>UI Scale:</label>
                  <input 
                    type="range"
                    min="80"
                    max="150"
                    value={settings.uiScale}
                    onChange={(e) => setSettings({...settings, uiScale: parseInt(e.target.value)})}
                  />
                  <span>{settings.uiScale}%</span>
                </div>
                <div className="setting-item">
                  <label>Theme:</label>
                  <select 
                    value={settings.customTheme}
                    onChange={(e) => setSettings({...settings, customTheme: e.target.value})}
                  >
                    <option value="default">Default</option>
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="purple">Purple</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                {settings.customTheme === 'custom' && (
                  <>
                    <div className="setting-item">
                      <label>Primary Color:</label>
                      <input 
                        type="color"
                        value={customTheme.primaryColor}
                        onChange={(e) => setCustomTheme({...customTheme, primaryColor: e.target.value})}
                      />
                    </div>
                    <div className="setting-item">
                      <label>Background Color:</label>
                      <input 
                        type="color"
                        value={customTheme.backgroundColor}
                        onChange={(e) => setCustomTheme({...customTheme, backgroundColor: e.target.value})}
                      />
                    </div>
                    <div className="setting-item">
                      <label>Text Color:</label>
                      <input 
                        type="color"
                        value={customTheme.textColor}
                        onChange={(e) => setCustomTheme({...customTheme, textColor: e.target.value})}
                      />
                    </div>
                    <div className="setting-item">
                      <label>Accent Color:</label>
                      <input 
                        type="color"
                        value={customTheme.accentColor}
                        onChange={(e) => setCustomTheme({...customTheme, accentColor: e.target.value})}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="settings-section">
                <h3>About</h3>
                <p>WideScreen Browser v0.1.0</p>
                <p>A multi-panel browser with advanced management features</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      {showKeyboardHelp && (
        <div className="modal-overlay" onClick={() => setShowKeyboardHelp(false)}>
          <div className="modal-panel large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Keyboard Shortcuts</h2>
              <button className="modal-close" onClick={() => setShowKeyboardHelp(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="shortcuts-section">
                <h3>Tab Management</h3>
                <div className="shortcut-item">
                  <kbd>Ctrl/Cmd + T</kbd>
                  <span>New Tab</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl/Cmd + W</kbd>
                  <span>Close Tab</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl/Cmd + Shift + T</kbd>
                  <span>Reopen Closed Tab</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl/Cmd + Tab</kbd>
                  <span>Next Tab</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl/Cmd + Shift + Tab</kbd>
                  <span>Previous Tab</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl/Cmd + P</kbd>
                  <span>Pin/Unpin Tab</span>
                </div>
              </div>
              <div className="shortcuts-section">
                <h3>Navigation</h3>
                <div className="shortcut-item">
                  <kbd>Ctrl/Cmd + L</kbd>
                  <span>Focus URL Bar</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl/Cmd + R</kbd>
                  <span>Reload Page</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Alt + Left</kbd>
                  <span>Go Back</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Alt + Right</kbd>
                  <span>Go Forward</span>
                </div>
              </div>
              <div className="shortcuts-section">
                <h3>Bookmarks & History</h3>
                <div className="shortcut-item">
                  <kbd>Ctrl/Cmd + D</kbd>
                  <span>Bookmark Current Page</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl/Cmd + B</kbd>
                  <span>Show Bookmarks</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl/Cmd + H</kbd>
                  <span>Show History</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl/Cmd + Shift + H</kbd>
                  <span>Show Recently Closed Tabs</span>
                </div>
              </div>
              <div className="shortcuts-section">
                <h3>Other</h3>
                <div className="shortcut-item">
                  <kbd>Ctrl/Cmd + F</kbd>
                  <span>Find in Page</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl/Cmd + ,</kbd>
                  <span>Settings</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl/Cmd + /</kbd>
                  <span>Show Keyboard Shortcuts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recently Closed */}
      {showRecentlyClosed && (
        <div className="modal-overlay" onClick={() => setShowRecentlyClosed(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Recently Closed</h2>
              <button className="modal-close" onClick={() => setShowRecentlyClosed(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Recently Closed Groups */}
              {recentlyClosedGroups.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ fontSize: '14px', color: '#a0aec0', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recently Closed Groups</h3>
                  <div className="history-list">
                    {[...recentlyClosedGroups].map((closedGroup, index) => (
                      <div key={`group-${closedGroup.group.id}-${index}`} className="history-item">
                        <div 
                          className="history-link"
                          onClick={async () => {
                            // Restore the group
                            const newGroup = { ...closedGroup.group }
                            const newTabs: Tab[] = []
                            const newTabIds: string[] = []
                            
                            for (const oldTab of closedGroup.tabs) {
                              const newTabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                              const newViewId = `view-${newTabId}`
                              
                              const newTab: Tab = {
                                id: newTabId,
                                viewId: newViewId,
                                url: oldTab.url,
                                title: oldTab.title,
                                groupId: newGroup.id
                              }
                              
                              if (window.electronAPI) {
                                await window.electronAPI.createBrowserView(newViewId, oldTab.url)
                              }
                              
                              newTabs.push(newTab)
                              newTabIds.push(newTabId)
                            }
                            
                            newGroup.tabIds = newTabIds
                            setGroups(prev => [...prev, newGroup])
                            setTabs(prev => [...prev, ...newTabs])
                            if (newTabs.length > 0) {
                              setActiveTabId(newTabs[0].id)
                            }
                            if (closedGroup.splitWidths.length > 0) {
                              setGroupSplitWidths(prev => ({ ...prev, [newGroup.id]: closedGroup.splitWidths }))
                            }
                            
                            // Remove from recently closed
                            setRecentlyClosedGroups(prev => prev.filter((_, i) => i !== index))
                            setShowRecentlyClosed(false)
                          }}
                        >
                          <div className="history-title">{closedGroup.group.name}</div>
                          <div className="history-url">{closedGroup.tabs.length} tab{closedGroup.tabs.length !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recently Closed Tabs */}
              <div>
                <h3 style={{ fontSize: '14px', color: '#a0aec0', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recently Closed Tabs</h3>
                {recentlyClosed.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#718096', padding: '40px 20px' }}>
                    No recently closed tabs
                  </div>
                ) : (
                  <div className="history-list">
                    {[...recentlyClosed].reverse().map((tab, index) => (
                      <div key={`${tab.id}-${index}`} className="history-item">
                        <div 
                          className="history-link"
                          onClick={async () => {
                            const newTabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                            const newViewId = `view-${newTabId}`
                            
                            const newTab: Tab = {
                              id: newTabId,
                              viewId: newViewId,
                              url: tab.url,
                              title: tab.title,
                              groupId: null
                            }
                            
                            if (window.electronAPI) {
                              await window.electronAPI.createBrowserView(newViewId, tab.url)
                            }
                            
                            setTabs(prevTabs => [...prevTabs, newTab])
                            setActiveTabId(newTabId)
                            setShowRecentlyClosed(false)
                          }}
                        >
                          <div className="history-title">{tab.title || tab.url}</div>
                          <div className="history-url">{tab.url}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Monitor */}
      {showPerformance && (
        <div className="modal-overlay" onClick={() => setShowPerformance(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Performance Monitor</h2>
              <button className="modal-close" onClick={() => setShowPerformance(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="performance-stats">
                <div className="perf-stat-item">
                  <h3>Memory Usage</h3>
                  <div className="memory-bar">
                    <div 
                      className="memory-bar-fill"
                      style={{ width: `${(memoryUsage.used / memoryUsage.total) * 100}%` }}
                    />
                  </div>
                  <p>{memoryUsage.used} MB / {memoryUsage.total} MB</p>
                </div>
                
                <div className="perf-stat-item">
                  <h3>Active Tabs</h3>
                  <p className="perf-stat-value">{tabs.length - sleepingTabs.size} / {tabs.length}</p>
                </div>
                
                <div className="perf-stat-item">
                  <h3>Sleeping Tabs</h3>
                  <p className="perf-stat-value">{sleepingTabs.size}</p>
                  {sleepingTabs.size > 0 && (
                    <div className="sleeping-tabs-list">
                      {Array.from(sleepingTabs).map(tabId => {
                        const tab = tabs.find(t => t.id === tabId)
                        return tab ? (
                          <div key={tabId} className="sleeping-tab-item">
                            <span>{tab.title}</span>
                            <button onClick={() => wakeTab(tabId)}>Wake</button>
                          </div>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
                
                <div className="perf-stat-item">
                  <h3>Groups</h3>
                  <p className="perf-stat-value">{groups.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Find in Page Bar */}
      {showFindInPage && (
        <div className="find-in-page-bar">
          <input
            type="text"
            placeholder="Find in page..."
            value={findInPage}
            onChange={(e) => setFindInPage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // TODO: Implement find in page via Electron API
                if (window.electronAPI && activeTab) {
                  // window.electronAPI.findInPage(activeTab.viewId, findInPage)
                }
              }
            }}
            autoFocus
          />
          <button onClick={() => setShowFindInPage(false)}>×</button>
        </div>
      )}

      </div> {/* main-content */}
    </div>
  )
}

export default App
