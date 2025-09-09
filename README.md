# BCCB Cricket - Progressive Web App

A comprehensive cricket team management PWA with intelligent team balancing and mobile optimization.

## Features

### 🏏 Core Functionality
- **Player Management**: Add players with batting/bowling styles and star ratings
- **Intelligent Team Balancing**: Performance-based team creation using match statistics
- **Match Management**: Complete scorecard and match history tracking
- **Mobile Optimized**: Touch-friendly interface with full-screen experience

### ⚡ Enhanced Team Balancing
- **Performance-Based**: Uses actual match data when available (≥2 matches per player)
- **Category Averaging**: Smart fallback system for mixed data scenarios
- **Dynamic Role Assignment**: Automatically calculates player roles based on styles
- **Fair Distribution**: Ensures balanced teams across all skill categories

### 📱 Mobile Experience
- **PWA Features**: Installable, offline-capable, fast loading
- **Touch Optimized**: Enhanced mobile controls and responsive design
- **Full-Screen Mode**: No browser UI when installed as app
- **Native Feel**: Optimized for mobile cricket team management

## Technology Stack
- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **PWA**: Service Worker, Web App Manifest
- **Storage**: localStorage for offline functionality
- **Mobile**: Capacitor for native app conversion
- **Build**: Bubblewrap for APK generation

## Getting Started

### Web Version
1. Open `index.html` in a modern web browser
2. Install as PWA for full mobile experience
3. Start adding players and creating teams

### Native Mobile App
1. Install via APK (when available)
2. Default players are pre-loaded on first launch
3. Full offline functionality included

## Team Balancing Algorithm

The app uses a sophisticated multi-tier approach:

1. **Performance Analysis**: When players have ≥2 matches, uses actual statistics
2. **Category Scoring**: Distributes players across performance categories
3. **Role Distribution**: Ensures balanced mix of batsmen, bowlers, all-rounders
4. **Star Rating Balance**: Considers player ratings for overall team strength

## Project Structure

```
├── index.html              # Main application interface
├── app.js                  # Core application logic with team balancing
├── default-data.js         # Pre-populated player data for mobile app
├── data-manager.js         # Data persistence and management
├── manifest.json           # PWA configuration
├── sw.js                   # Service worker for offline functionality
└── *.json                  # Cricket data and statistics
```

## Development

### Local Development
```bash
# Serve locally
python -m http.server 8000
# or
python server.py
```

### Mobile App Development
```bash
# Install dependencies
npm install

# Sync to native project
npx cap sync

# Build APK with Bubblewrap
bubblewrap init --manifest https://anujloomba.github.io/bccb_refactored/manifest.json
bubblewrap build
```

## Recent Enhancements

### v2.0 Features
- ✅ Removed skill level/role fields from player creation
- ✅ Enhanced team balancing with performance statistics
- ✅ Fixed mobile toss button functionality
- ✅ Added default player data for mobile app
- ✅ Configured for full-screen native app experience

### Performance Improvements
- Intelligent caching and offline support
- Optimized mobile touch interactions
- Enhanced team calculation algorithms
- Streamlined user interface

## License
Open source cricket team management solution.

## Live Demo
Visit: https://anujloomba.github.io/bccb_refactored/
