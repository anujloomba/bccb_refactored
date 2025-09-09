// Default data initialization for mobile app
(function() {
    'use strict';
    
    console.log('🚀 Initializing Cricket PWA with default data...');
    
    // Check if this is the first time the app is launched
    const isFirstLaunch = !localStorage.getItem('app-initialized');
    
    if (isFirstLaunch) {
        console.log('📱 First launch detected - setting up default data');
        
        // Default cricket statistics data
        const defaultCricketStats = {
            "metadata": {
                "version": "2.0",
                "lastUpdated": new Date().toISOString(),
                "source": "mobile-app-default",
                "totalPlayers": 12,
                "totalMatches": 0
            },
            "players": [
                {
                    "id": 1,
                    "name": "Virat Kohli",
                    "batting": "Reliable",
                    "bowling": "DNB",
                    "is_star": true,
                    "matches": 0,
                    "runs": 0,
                    "wickets": 0,
                    "centuries": 0,
                    "halfCenturies": 0,
                    "battingAverage": 0,
                    "strikeRate": 0,
                    "economy": 0,
                    "catches": 0
                },
                {
                    "id": 2,
                    "name": "Rohit Sharma",
                    "batting": "Reliable",
                    "bowling": "DNB",
                    "is_star": true,
                    "matches": 0,
                    "runs": 0,
                    "wickets": 0,
                    "centuries": 0,
                    "halfCenturies": 0,
                    "battingAverage": 0,
                    "strikeRate": 0,
                    "economy": 0,
                    "catches": 0
                },
                {
                    "id": 3,
                    "name": "Jasprit Bumrah",
                    "batting": "Tailend",
                    "bowling": "Fast",
                    "is_star": true,
                    "matches": 0,
                    "runs": 0,
                    "wickets": 0,
                    "centuries": 0,
                    "halfCenturies": 0,
                    "battingAverage": 0,
                    "strikeRate": 0,
                    "economy": 0,
                    "catches": 0
                },
                {
                    "id": 4,
                    "name": "Hardik Pandya",
                    "batting": "So-So",
                    "bowling": "Medium",
                    "is_star": true,
                    "matches": 0,
                    "runs": 0,
                    "wickets": 0,
                    "centuries": 0,
                    "halfCenturies": 0,
                    "battingAverage": 0,
                    "strikeRate": 0,
                    "economy": 0,
                    "catches": 0
                },
                {
                    "id": 5,
                    "name": "KL Rahul",
                    "batting": "Reliable",
                    "bowling": "DNB",
                    "is_star": false,
                    "matches": 0,
                    "runs": 0,
                    "wickets": 0,
                    "centuries": 0,
                    "halfCenturies": 0,
                    "battingAverage": 0,
                    "strikeRate": 0,
                    "economy": 0,
                    "catches": 0
                },
                {
                    "id": 6,
                    "name": "Ravindra Jadeja",
                    "batting": "So-So",
                    "bowling": "Medium",
                    "is_star": false,
                    "matches": 0,
                    "runs": 0,
                    "wickets": 0,
                    "centuries": 0,
                    "halfCenturies": 0,
                    "battingAverage": 0,
                    "strikeRate": 0,
                    "economy": 0,
                    "catches": 0
                },
                {
                    "id": 7,
                    "name": "Mohammed Shami",
                    "batting": "Tailend",
                    "bowling": "Fast",
                    "is_star": false,
                    "matches": 0,
                    "runs": 0,
                    "wickets": 0,
                    "centuries": 0,
                    "halfCenturies": 0,
                    "battingAverage": 0,
                    "strikeRate": 0,
                    "economy": 0,
                    "catches": 0
                },
                {
                    "id": 8,
                    "name": "Rishabh Pant",
                    "batting": "So-So",
                    "bowling": "DNB",
                    "is_star": false,
                    "matches": 0,
                    "runs": 0,
                    "wickets": 0,
                    "centuries": 0,
                    "halfCenturies": 0,
                    "battingAverage": 0,
                    "strikeRate": 0,
                    "economy": 0,
                    "catches": 0
                },
                {
                    "id": 9,
                    "name": "Yuzvendra Chahal",
                    "batting": "Tailend",
                    "bowling": "Medium",
                    "is_star": false,
                    "matches": 0,
                    "runs": 0,
                    "wickets": 0,
                    "centuries": 0,
                    "halfCenturies": 0,
                    "battingAverage": 0,
                    "strikeRate": 0,
                    "economy": 0,
                    "catches": 0
                },
                {
                    "id": 10,
                    "name": "Shreyas Iyer",
                    "batting": "Reliable",
                    "bowling": "DNB",
                    "is_star": false,
                    "matches": 0,
                    "runs": 0,
                    "wickets": 0,
                    "centuries": 0,
                    "halfCenturies": 0,
                    "battingAverage": 0,
                    "strikeRate": 0,
                    "economy": 0,
                    "catches": 0
                },
                {
                    "id": 11,
                    "name": "Bhuvneshwar Kumar",
                    "batting": "Tailend",
                    "bowling": "Medium",
                    "is_star": false,
                    "matches": 0,
                    "runs": 0,
                    "wickets": 0,
                    "centuries": 0,
                    "halfCenturies": 0,
                    "battingAverage": 0,
                    "strikeRate": 0,
                    "economy": 0,
                    "catches": 0
                },
                {
                    "id": 12,
                    "name": "Shubman Gill",
                    "batting": "So-So",
                    "bowling": "DNB",
                    "is_star": false,
                    "matches": 0,
                    "runs": 0,
                    "wickets": 0,
                    "centuries": 0,
                    "halfCenturies": 0,
                    "battingAverage": 0,
                    "strikeRate": 0,
                    "economy": 0,
                    "catches": 0
                }
            ],
            "matches": [],
            "teams": []
        };
        
        // Set up default localStorage data
        try {
            localStorage.setItem('cricket-stats', JSON.stringify(defaultCricketStats));
            localStorage.setItem('cricket-players', JSON.stringify(defaultCricketStats.players));
            localStorage.setItem('cricket-matches', JSON.stringify([]));
            localStorage.setItem('cricket-teams', JSON.stringify([]));
            localStorage.setItem('app-initialized', 'true');
            localStorage.setItem('app-version', '1.0.0');
            localStorage.setItem('initialization-date', new Date().toISOString());
            
            console.log('✅ Default data successfully loaded to localStorage');
            console.log('📊 Players loaded:', defaultCricketStats.players.length);
            
        } catch (error) {
            console.error('❌ Error setting up default data:', error);
        }
    } else {
        console.log('📱 App already initialized - using existing data');
    }
    
    // Ensure app data is properly loaded
    if (typeof window !== 'undefined') {
        // Give the main app time to load
        setTimeout(() => {
            if (window.cricketApp || window.app) {
                const app = window.cricketApp || window.app;
                console.log('🎯 App instance found, ensuring data sync...');
                
                // Force load data from localStorage
                if (typeof app.loadData === 'function') {
                    app.loadData();
                    console.log('✅ App data refreshed from localStorage');
                }
            }
        }, 1000);
    }
    
})();

// Also expose a function to reset to defaults if needed
window.resetToDefaults = function() {
    if (confirm('This will reset all your cricket data to defaults. Are you sure?')) {
        localStorage.clear();
        localStorage.removeItem('app-initialized');
        location.reload();
    }
};

console.log('🏏 Cricket PWA Default Data Script Loaded');
