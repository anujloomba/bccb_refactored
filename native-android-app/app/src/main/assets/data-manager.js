// Cricket Data Manager - Minimal stub for legacy compatibility
// Most functionality has been moved to D1 API and local storage

class CricketDataManager {
    constructor() {
        this.data = {
            player_info: [],
            match_data: [],
            performance_data: []
        };
    }

    async initializeDataManager() {
        // Legacy initialization - now handled by D1ApiManager
        console.log('CricketDataManager: Legacy initialization called');
        return true;
    }

    async saveToCSV(players, matches, teams) {
        // CSV export deprecated - data now synced to D1
        console.log('CricketDataManager: CSV export deprecated, using D1 sync');
        return true;
    }

    async saveJSONData(players, matches, teams, createBackup = false) {
        // JSON save deprecated - data now synced to D1
        console.log('CricketDataManager: JSON save deprecated, using D1 sync');
        return true;
    }

    addPlayer(player) {
        // Player management now handled directly in CricketApp
        console.log('CricketDataManager: Player management handled by CricketApp');
    }

    showEditInPlaceInstructions() {
        // Legacy instructions - no longer needed
        console.log('CricketDataManager: Edit instructions deprecated');
    }

    restoreFromBackup(timestamp) {
        // Backup restore now handled by D1
        console.log('CricketDataManager: Backup restore should use D1 API');
        return false;
    }

    getAvailableBackups() {
        // Backups now in D1
        console.log('CricketDataManager: Backups available through D1 API');
        return [];
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.CricketDataManager = CricketDataManager;
}
