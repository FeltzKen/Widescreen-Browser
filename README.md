# WideScreen Browser

A feature-rich, widescreen-focused web browser built with Electron that allows multiple pages to be displayed side-by-side in resizable panels with advanced management features.

## Features

### Core Browsing
- **Split View**: Display multiple web pages side-by-side (up to 4 panes)
- **Resizable Panels**: Each pane spans full height and shares width proportionally
- **Tab Grouping**: Organize tabs into named groups with synchronized navigation
- **Tab Management**: Create, switch, close, pin, and duplicate tabs
- **Navigation Controls**: Back, forward, reload, and URL bar for each active pane
- **Tab Search**: Quickly find and switch to tabs by name

### Sidebar & Appearance
- **Always-Visible Sidebar**: Compact 180px sidebar with quick access to features
- **Dark/Light Mode**: Toggle between dark and light themes with full UI support
- **Modern UI**: Clean, gradient-themed interface optimized for wide screens

### Library & History
- **Bookmarks System**: Save favorite pages with folder organization
  - Create bookmark folders
  - Quick bookmark current page (Ctrl+D)
  - Browse bookmarks by folder
  - One-click navigation to saved pages
- **History Tracking**: Automatic browsing history with search
  - Visit count tracking
  - Timestamp tracking
  - Search by title or URL
  - Clear history option
- **Downloads Manager**: Track downloads (framework in place)

### Sessions
- **Session Save/Load**: Save and restore entire browsing sessions
  - Save current tabs, groups, and layouts
  - Name sessions for easy identification
  - Restore sessions with one click
  - Automatic layout restoration
- **Recently Closed Tabs**: Reopen last closed tab (Ctrl+Shift+T)

### Settings & Privacy
- **Comprehensive Settings Panel**:
  - Default search engine (Google, DuckDuckGo, Bing)
  - Homepage configuration
  - Default zoom level
  - Notification preferences
  - Private browsing mode toggle
- **Cache Management**: Clear browser cache and storage

### Keyboard Shortcuts
- `Ctrl+T` - New tab
- `Ctrl+W` - Close current tab
- `Ctrl+Shift+T` - Reopen last closed tab
- `Ctrl+Tab` - Next tab
- `Ctrl+Shift+Tab` - Previous tab
- `Ctrl+D` - Bookmark current page
- `Ctrl+B` - Toggle bookmarks
- `Ctrl+H` - Toggle history
- `Ctrl+F` - Find in page
- `Ctrl+,` - Open settings
- `Ctrl+R` - Reload
- `Ctrl+[` - Go back
- `Ctrl+]` - Go forward
- `Ctrl+1-9` - Switch to tab by number
- `Escape` - Close search/find bars

### Context Menus
Right-click on tabs for quick actions:
- Pin/Unpin tab
- Duplicate tab
- Reload tab
- Close tabs to right
- Close other tabs
- Close tab

### Tab Features
- **Tab Pinning**: Pin important tabs to keep them open
- **Tab Truncation**: Smart title truncation at first punctuation
- **Drag & Drop**: Reorder tabs and create groups by dragging
- **Visual Indicators**: Pin indicators for pinned tabs
- **Group Management**: Create, rename, and close groups

## Tech Stack

- **Electron**: Desktop app framework with Chromium engine
- **React**: UI component library
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server

## Installation

```bash
npm install
```

## Building

Build for production:

```bash
# Build for current platform
npm run electron:build

# Build for Windows (from Linux)
npm run build:win

# Build for Linux
npm run build:linux
```

Builds will be available in the `dist` folder.

## Usage

### Basic Navigation
1. **Create New Tab**: Click the `+` button or press `Ctrl+T`
2. **Navigate**: Enter URL in the address bar and press Enter
3. **Switch Active Tab**: Click on any tab or use `Ctrl+Tab` / `Ctrl+Shift+Tab`
4. **Close Tab**: Click the `×` button or press `Ctrl+W`

### Creating Groups
1. Drag a tab onto another tab to create a group
2. Groups display tabs side-by-side in resizable panels
3. Each tab in a group has its own navigation controls
4. Drag resize handles between tabs to adjust panel widths
5. Remove tabs from groups by dragging them out

### Managing Bookmarks
1. Open bookmarks with `Ctrl+B` or sidebar
2. Click "Bookmark Current Page" to save the active page
3. Create folders to organize bookmarks
4. Click any bookmark to navigate
5. Delete unwanted bookmarks with the × button

### Using Sessions
1. Open Sessions from the sidebar
2. Click "Save Current Session" and name it
3. Load any saved session to restore tabs and layout
4. Delete sessions you no longer need

### Customizing Settings
1. Open Settings with `Ctrl+,` or from sidebar
2. Configure search engine, homepage, and zoom
3. Toggle notifications and private mode
4. Changes are saved automatically

## Architecture

- **Main Process** (`electron/main.ts`): Manages BrowserWindow and BrowserView instances
- **Renderer Process** (`src/App.tsx`): React UI for all features and layout management
- **IPC Communication**: Bidirectional communication for view management and navigation events
- **Local Storage**: Persists bookmarks, history, sessions, settings, and preferences

## Data Storage

All user data is stored locally:
- **Bookmarks**: LocalStorage (`bookmarks`, `bookmarkFolders`)
- **History**: LocalStorage (`history`) - Last 1000 items
- **Sessions**: LocalStorage (`savedSessions`)
- **Settings**: LocalStorage (`appSettings`)
- **UI State**: LocalStorage (`sidebarOpen`, `darkMode`)

## Features in Development

- Find in page functionality (UI ready, needs Electron integration)
- Download tracking and management (framework in place)
- Favicon display for tabs
- Loading indicators for tabs
- Audio playing indicators
- Tab preview on hover
- DevTools integration per panel
- Advanced split layouts (2x2 grid)
- Theme customization
- Performance monitoring
- Extensions system (ad blocker, screenshot tool)

## License

MIT
