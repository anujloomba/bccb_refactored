// Cricket PWA - Data Integration with cricket_stats.json only
class CricketDataManager {
    constructor() {
        this.dataDir = '.'; // Use current directory
        this.jsonDir = '.'; // Use current directory
        this.deviceId = null;
        
        this.initializeDataManager();
    }

    async initializeDataManager() {
        try {
            // Get device ID from file
            this.deviceId = await this.loadDeviceId();
            
            // If no device ID file, generate one
            if (!this.deviceId) {
                this.deviceId = this.generateDeviceId();
            }
            
            console.log('🔧 Data Manager initialized with device ID:', this.deviceId);
        } catch (error) {
            console.error('Error initializing data manager:', error);
            this.deviceId = this.generateDeviceId();
        }
    }

    async loadDeviceId() {
        try {
            const response = await fetch('./device_id.txt');
            if (response.ok) {
                const deviceId = await response.text();
                return deviceId.trim();
            }
        } catch (error) {
            console.error('Error loading device ID:', error);
        }
        return null;
    }

    generateDeviceId() {
        return Math.random().toString(36).substr(2, 8);
    }

    async loadOrCreateData() {
        try {
            // Try to load existing JSON data first
            const jsonData = await this.loadJSONData();
            if (jsonData) {
                return jsonData;
            }

            // If no JSON data exists, return empty structure
            return this.createEmptyDataStructure();
        } catch (error) {
            console.error('Error loading/creating data:', error);
            return this.createEmptyDataStructure();
        }
    }

    async loadJSONData() {
        try {
            console.log('🔄 Attempting to load cricket_stats.json...');
            // Load from the cricket_stats.json file
            const statsResponse = await fetch(`./cricket_stats.json`);
            console.log('📡 Fetch response status:', statsResponse.status, statsResponse.statusText);
            console.log('📡 Fetch response URL:', statsResponse.url);
            
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                console.log('📊 Raw cricket_stats.json structure:', {
                    keys: Object.keys(statsData),
                    player_info_count: statsData.player_info?.length || 0,
                    matches_count: statsData.matches?.length || 0,
                    batting_count: statsData.match_batting_performance?.length || 0,
                    bowling_count: statsData.match_bowling_performance?.length || 0
                });

                if (statsData && (statsData.players || statsData.player_info)) {
                    console.log('✅ cricket_stats.json loaded successfully');
                    return this.convertStatsToAppData(statsData);
                } else {
                    console.log('⚠️ cricket_stats.json exists but has unexpected structure');
                }
            } else {
                console.log('❌ Failed to fetch cricket_stats.json:', {
                    status: statsResponse.status,
                    statusText: statsResponse.statusText,
                    url: statsResponse.url
                });
            }
        } catch (error) {
            console.error('💥 Error loading cricket_stats.json:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
        }
        
        console.log('🔄 cricket_stats.json loading failed, will try fallback methods');
        return null;
    }

    convertStatsToAppData(statsData) {
        console.log('🔄 Converting cricket_stats data to app format...');
        
        const players = [];
        const matches = [];
        const teams = [];

        // Convert player_info to players
        if (statsData.player_info && Array.isArray(statsData.player_info)) {
            console.log(`📊 Processing ${statsData.player_info.length} players...`);
            
            statsData.player_info.forEach(playerInfo => {
                const player = {
                    playerId: playerInfo['Player ID'] || this.generatePlayerId(),
                    name: playerInfo.Name || playerInfo.name || '',
                    role: this.determineRole(playerInfo['Batting Style'], playerInfo['Bowling Style']),
                    battingStyle: playerInfo['Batting Style'] || '',
                    bowlingStyle: playerInfo['Bowling Style'] || '',
                    school: playerInfo.School || playerInfo.school || '',
                    skillLevel: this.convertToSkillLevel(
                        playerInfo['Batting Style'], 
                        playerInfo['Bowling Style'], 
                        playerInfo.Star === 'TRUE' || playerInfo.star === true
                    ),
                    isActive: true
                };

                // Add batting stats if available
                if (statsData.match_batting_performance) {
                    const playerBatting = statsData.match_batting_performance.filter(
                        b => b['Player ID'] === player.playerId
                    );
                    player.batting = this.calculateBattingStats(playerBatting);
                }

                // Add bowling stats if available
                if (statsData.match_bowling_performance) {
                    const playerBowling = statsData.match_bowling_performance.filter(
                        b => b['Player ID'] === player.playerId
                    );
                    player.bowling = this.calculateBowlingStats(playerBowling);
                }

                players.push(player);
            });
        }

        // Convert matches if available
        if (statsData.matches && Array.isArray(statsData.matches)) {
            console.log(`📊 Processing ${statsData.matches.length} matches...`);
            
            statsData.matches.forEach(match => {
                const normalizedMatch = this.validateAndNormalizeLoadedMatch(match);
                if (normalizedMatch) {
                    matches.push(normalizedMatch);
                }
            });
        }

        // Convert teams if available
        if (statsData.teams && Array.isArray(statsData.teams)) {
            console.log(`📊 Processing ${statsData.teams.length} teams...`);
            teams.push(...statsData.teams);
        }

        const result = {
            players: players,
            matches: matches,
            teams: teams
        };

        console.log('✅ Conversion complete:', {
            players: result.players.length,
            matches: result.matches.length,
            teams: result.teams.length
        });

        return result;
    }

    convertToSkillLevel(battingStyle, bowlingStyle, isStar) {
        if (isStar) return 5;
        
        const skillMap = {
            'Aggressive': 4,
            'Defensive': 3,
            'Technical': 4,
            'Power Hitter': 5,
            'Anchor': 3,
            'Fast': 4,
            'Medium': 3,
            'Spin': 4,
            'Left-arm': 3,
            'Right-arm': 3
        };
        
        const battingSkill = skillMap[battingStyle] || 3;
        const bowlingSkill = skillMap[bowlingStyle] || 3;
        
        return Math.min(5, Math.ceil((battingSkill + bowlingSkill) / 2));
    }

    determineRole(battingStyle, bowlingStyle) {
        if (!bowlingStyle || bowlingStyle === 'None' || bowlingStyle === '') {
            return 'Batsman';
        }
        
        if (!battingStyle || battingStyle === 'None' || battingStyle === '') {
            return 'Bowler';
        }
        
        return 'All-rounder';
    }

    calculateBattingStats(battingData) {
        if (!battingData || battingData.length === 0) {
            return {
                matches: 0,
                runs: 0,
                average: 0.0,
                strikeRate: 0.0,
                highScore: 0,
                fifties: 0,
                hundreds: 0
            };
        }

        let totalRuns = 0;
        let totalBalls = 0;
        let innings = 0;
        let notOuts = 0;
        let highScore = 0;
        let fifties = 0;
        let hundreds = 0;

        battingData.forEach(match => {
            const runs = parseInt(match.Runs) || 0;
            const balls = parseInt(match.Balls) || 0;
            const isNotOut = match['Not Out'] === 'TRUE' || match['Not Out'] === true;

            totalRuns += runs;
            totalBalls += balls;
            innings++;
            
            if (isNotOut) notOuts++;
            if (runs > highScore) highScore = runs;
            if (runs >= 50 && runs < 100) fifties++;
            if (runs >= 100) hundreds++;
        });

        const completedInnings = innings - notOuts;
        const average = completedInnings > 0 ? (totalRuns / completedInnings) : totalRuns;
        const strikeRate = totalBalls > 0 ? ((totalRuns / totalBalls) * 100) : 0;

        return {
            matches: innings,
            runs: totalRuns,
            average: parseFloat(average.toFixed(2)),
            strikeRate: parseFloat(strikeRate.toFixed(2)),
            highScore: highScore,
            fifties: fifties,
            hundreds: hundreds
        };
    }

    calculateBowlingStats(bowlingData) {
        if (!bowlingData || bowlingData.length === 0) {
            return {
                matches: 0,
                overs: 0.0,
                wickets: 0,
                runs: 0,
                average: 0.0,
                economy: 0.0,
                strikeRate: 0.0,
                bestFigures: "0/0"
            };
        }

        let totalOvers = 0;
        let totalWickets = 0;
        let totalRunsConceded = 0;
        let matches = 0;
        let bestWickets = 0;
        let bestRuns = 999;

        bowlingData.forEach(match => {
            const overs = parseFloat(match.Overs) || 0;
            const wickets = parseInt(match.Wickets) || 0;
            const runsConceded = parseInt(match['Runs Conceded']) || 0;

            totalOvers += overs;
            totalWickets += wickets;
            totalRunsConceded += runsConceded;
            matches++;

            // Check for best figures
            if (wickets > bestWickets || (wickets === bestWickets && runsConceded < bestRuns)) {
                bestWickets = wickets;
                bestRuns = runsConceded;
            }
        });

        const average = totalWickets > 0 ? (totalRunsConceded / totalWickets) : 0;
        const economy = totalOvers > 0 ? (totalRunsConceded / totalOvers) : 0;
        const strikeRate = totalWickets > 0 ? ((totalOvers * 6) / totalWickets) : 0;

        return {
            matches: matches,
            overs: parseFloat(totalOvers.toFixed(1)),
            wickets: totalWickets,
            runs: totalRunsConceded,
            average: parseFloat(average.toFixed(2)),
            economy: parseFloat(economy.toFixed(2)),
            strikeRate: parseFloat(strikeRate.toFixed(2)),
            bestFigures: `${bestWickets}/${bestRuns}`
        };
    }

    validateAndNormalizeLoadedMatch(match) {
        // Ensure the match has required fields
        const normalizedMatch = {
            matchId: match.matchId || match.id || this.generateMatchId(),
            date: match.date || new Date().toISOString().split('T')[0],
            team1: match.team1 || 'Team 1',
            team2: match.team2 || 'Team 2',
            venue: match.venue || 'TBD',
            result: match.result || 'TBD',
            playerStats: match.playerStats || match.playersData || []
        };

        return normalizedMatch;
    }

    generatePlayerId() {
        return 'P' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    generateMatchId() {
        return 'M' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    async saveJSONData(data) {
        // This would be used to save data back to JSON files
        // For now, we'll use localStorage as the primary storage
        try {
            const jsonData = {
                players: data.players || [],
                matches: data.matches || [],
                teams: data.teams || [],
                lastUpdated: new Date().toISOString()
            };

            localStorage.setItem('cricket-stats', JSON.stringify(jsonData));
            return true;
        } catch (error) {
            console.error('Error saving JSON data:', error);
            return false;
        }
    }

    async getDeviceId() {
        try {
            const response = await fetch('./device_id.txt');
            const deviceId = await response.text();
            return deviceId.trim();
        } catch (error) {
            console.error('Error reading device ID:', error);
            return ''; // Return empty string if file not found
        }
    }

    createEmptyDataStructure() {
        return {
            players: [],
            matches: [],
            teams: []
        };
    }

    showNotification(message) {
        if (typeof app !== 'undefined' && app.showNotification) {
            app.showNotification(message);
        } else {
            console.log('📢 Notification:', message);
        }
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.CricketDataManager = CricketDataManager;
}
