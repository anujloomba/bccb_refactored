(function() {
    'use strict';
    
    // This script is now disabled - all initialization is handled by the main app
    // The main app's loadDataFromManager() method now handles first launch detection
    // DISABLED: Check if this is the first time the app is launched
    // const isFirstLaunch = !localStorage.getItem('app-initialized');
    
    /*
    if (isFirstLaunch) {
        }
    
    // Ensure app data is properly loaded
    if (typeof window !== 'undefined') {
        // Give the main app time to load
        setTimeout(() => {
            if (window.cricketApp || window.app) {
                const app = window.cricketApp || window.app;
                // Force load data from localStorage
                if (typeof app.loadData === 'function') {
                    app.loadData();
                    }
            }
        }, 1000);
    }
    */
    
})();

// Also expose functions to manage data refresh
window.resetToDefaults = function() {
    if (confirm('This will reset all your cricket data to defaults from cricket_stats.json. Are you sure?')) {
        localStorage.clear();
        localStorage.removeItem('app-initialized');
        location.reload();
    }
};

// Force refresh from cricket_stats.json (useful when JSON file is updated)
window.refreshFromJson = async function() {
    try {
        const response = await fetch('./cricket_stats.json?' + Math.random());
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const statsData = await response.json();
        
        // Convert and save to localStorage
        const players = [];
        let playerId = 1;
        
        if (statsData.player_data && Array.isArray(statsData.player_data)) {
            statsData.player_data.forEach(playerInfo => {
                const player = {
                    id: playerId++,
                    name: playerInfo.Name || '',
                    batting: playerInfo.Batting_Style || 'So-So',
                    bowling: playerInfo.Bowling_Style || 'Medium',
                    is_star: playerInfo.Is_Star || false,
                    matches: 0,
                    runs: 0,
                    wickets: 0,
                    centuries: 0,
                    halfCenturies: 0,
                    battingAverage: 0,
                    strikeRate: 0,
                    economy: 0,
                    catches: 0
                };
                players.push(player);
            });
        }
        
        const cricketStats = {
            "metadata": {
                "version": "2.0",
                "lastUpdated": new Date().toISOString(),
                "source": "cricket_stats.json-refresh",
                "totalPlayers": players.length,
                "totalMatches": (statsData.match_data && statsData.match_data.length) || 0
            },
            "players": players,
            "matches": statsData.match_data || [],
            "teams": []
        };
        
        // Clear existing data and save new data
        localStorage.setItem('cricket-stats', JSON.stringify(cricketStats));
        localStorage.setItem('cricket-players', JSON.stringify(cricketStats.players));
        localStorage.setItem('cricket-matches', JSON.stringify(cricketStats.matches));
        localStorage.setItem('cricket-teams', JSON.stringify([]));
        localStorage.setItem('last-json-refresh', new Date().toISOString());
        
        // Reload the page to refresh the app
        if (confirm(`✅ Successfully loaded ${cricketStats.players.length} players from cricket_stats.json. Reload app to see changes?`)) {
            location.reload();
        }
        
        return cricketStats;
    } catch (error) {
        alert('❌ Error refreshing data: ' + error.message);
        return null;
    }
};

console.log('💡 You can call window.refreshFromJson() to refresh data from cricket_stats.json');
console.log('💡 You can call window.resetToDefaults() to reset all data');

// Add a safe initialization function for post-wipe scenarios
window.initializeWithDefaultData = async function() {
    try {
        // Set app-initialized to false to trigger default data loading
        localStorage.removeItem('app-initialized');
        
        // Load the default data from cricket_stats.js (since we're in Android, use script injection)
        if (window.loadDataFromAndroidDataLoader) {
            const data = await window.loadDataFromAndroidDataLoader();
            if (data) {
                // Force refresh the app state
                if (window.cricketApp && window.cricketApp.loadDataFromManager) {
                    await window.cricketApp.loadDataFromManager();
                    }
            }
        }
        
        return true;
    } catch (error) {
        return false;
    }
};
