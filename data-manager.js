// Cricket PWA - Data Integration with BCCB CSV Files
class CricketDataManager {
    constructor() {
        this.dataDir = '.'; // Use current directory instead of ../cricket_data
        this.jsonDir = '.'; // Use current directory instead of ../cricket_data
        this.deviceId = null;
        this.csvFiles = {
            playerInfo: null,
            batting: null,
            bowling: null,
            history: null,
            index: null
        };
        
        this.initializeDataManager();
    }

    async initializeDataManager() {
        try {
            // Get device ID from file
            await this.loadDeviceId();
            
            // Identify CSV files
            await this.identifyCSVFiles();
            
            // Load existing data or create from CSV
            await this.loadOrCreateData();
        } catch (error) {
            console.error('Error initializing data manager:', error);
            this.showNotification('⚠️ Using default data - CSV integration failed');
        }
    }

    async loadDeviceId() {
        try {
            // First try to get device ID from cricket_stats.json
            const statsResponse = await fetch(`./cricket_stats.json`);
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                if (statsData.device_id && statsData.device_id.id) {
                    this.deviceId = statsData.device_id.id;
                    return;
                }
            }

            // Fallback to device_id.txt file
            const response = await fetch(`./device_id.txt`);
            if (response.ok) {
                this.deviceId = (await response.text()).trim();
            } else {
                this.deviceId = this.generateDeviceId();
            }
        } catch (error) {
            this.deviceId = this.generateDeviceId();
        }
    }

    generateDeviceId() {
        return Math.random().toString(36).substr(2, 8);
    }

    async identifyCSVFiles() {
        try {
            // Try to load index file to identify current CSV files
            const indexResponse = await fetch(`./cricket_stats_index_${this.deviceId}.csv`);
            if (indexResponse.ok) {
                const indexText = await indexResponse.text();
                const lines = indexText.split('\n');
                
                for (let i = 1; i < lines.length; i++) {
                    const parts = lines[i].split(',');
                    if (parts.length >= 2) {
                        const filename = parts[0].trim();
                        const type = parts[1].trim();
                        
                        if (type === 'player_info') this.csvFiles.playerInfo = filename;
                        else if (type === 'batting') this.csvFiles.batting = filename;
                        else if (type === 'bowling') this.csvFiles.bowling = filename;
                        else if (type === 'history') this.csvFiles.history = filename;
                    }
                }
            } else {
                // Fallback: look for files with device ID pattern
                this.csvFiles.playerInfo = `cricket_stats_player_info_${this.deviceId}.csv`;
                this.csvFiles.batting = `cricket_stats_batting_${this.deviceId}.csv`;
                this.csvFiles.bowling = `cricket_stats_bowling_${this.deviceId}.csv`;
                this.csvFiles.history = `cricket_stats_history_${this.deviceId}.csv`;
            }
        } catch (error) {
            console.error('Error identifying CSV files:', error);
        }
    }

    async loadOrCreateData() {
        try {
            // Try to load existing JSON data first
            const jsonData = await this.loadJSONData();
            if (jsonData) {
                return jsonData;
            }

            // If no JSON data, convert from CSV
            const csvData = await this.loadCSVData();
            if (csvData) {
                await this.saveJSONData(csvData);
                return csvData;
            }

            // If no data exists, return empty structure
            return this.createEmptyDataStructure();
        } catch (error) {
            console.error('Error loading/creating data:', error);
            return this.createEmptyDataStructure();
        }
    }

    async loadJSONData() {
        try {
            // Load from the cricket_stats.json file
            const statsResponse = await fetch(`./cricket_stats.json`);
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                
                // Convert the stats data to app format
                if (statsData.player_info && Array.isArray(statsData.player_info)) {
                    const appData = this.convertStatsToAppData(statsData);
                    return appData;
                }
            }

            // Fallback: Try to load from the combined JSON file
            const playersResponse = await fetch(`./cricket_players.json`);
            if (playersResponse.ok) {
                const data = await playersResponse.json();
                
                // If it's a combined file with players, matches, teams
                if (data.players && Array.isArray(data.players)) {
                    return {
                        players: data.players,
                        matches: data.matches || [],
                        teams: data.teams || []
                    };
                }
                
                // If it's just an array of players
                if (Array.isArray(data)) {
                    return {
                        players: data,
                        matches: [],
                        teams: []
                    };
                }
            }

            // Fallback: try to load separate files
            const [matchesResponse, teamsResponse] = await Promise.all([
                fetch(`./cricket_matches.json`),
                fetch(`./cricket_teams.json`)
            ]);

            if (matchesResponse.ok && teamsResponse.ok) {
                const [matches, teams] = await Promise.all([
                    matchesResponse.json(),
                    teamsResponse.json()
                ]);

                return { 
                    players: [], 
                    matches: Array.isArray(matches) ? matches : [], 
                    teams: Array.isArray(teams) ? teams : [] 
                };
            }
        } catch (error) {
            console.error('Error loading JSON data:', error);
        }
        return null;
    }

    async loadCSVData() {
        try {
            const [playerInfoData, battingData, bowlingData, historyData] = await Promise.all([
                this.loadCSVFile(this.csvFiles.playerInfo),
                this.loadCSVFile(this.csvFiles.batting),
                this.loadCSVFile(this.csvFiles.bowling),
                this.loadCSVFile(this.csvFiles.history)
            ]);

            if (playerInfoData) {
                return this.convertCSVToAppData(playerInfoData, battingData, bowlingData, historyData);
            }
        } catch (error) {
            console.error('Error loading CSV data:', error);
        }
        return null;
    }

    async loadCSVFile(filename) {
        if (!filename) return null;
        
        try {
            const response = await fetch(`./${filename}`);
            if (response.ok) {
                const csvText = await response.text();
                return this.parseCSV(csvText);
            }
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
        }
        return null;
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) return null;

        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            }
        }

        return data;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    convertCSVToAppData(playerInfoData, battingData, bowlingData, historyData) {
        const players = [];
        const matches = [];
        const teams = [];

        // Convert player data
        if (playerInfoData) {
            playerInfoData.forEach((playerInfo, index) => {
                const battingStats = battingData?.find(b => b.Player === playerInfo.Name) || {};
                const bowlingStats = bowlingData?.find(b => b.Player === playerInfo.Name) || {};

                const player = {
                    id: Date.now() + index,
                    name: playerInfo.Name,
                    skill: this.convertToSkillLevel(playerInfo.Batting_Style, playerInfo.Bowling_Style, playerInfo.Is_Star),
                    role: this.determineRole(playerInfo.Batting_Style, playerInfo.Bowling_Style),
                    
                    // Batting statistics
                    matches: parseInt(battingStats.Matches || '0'),
                    innings: parseInt(battingStats.Innings || '0'),
                    notOuts: parseInt(battingStats.Not_Outs || '0'),
                    runs: parseInt(battingStats.Runs || '0'),
                    highestScore: parseInt(battingStats.Highest_Score || '0'),
                    battingAverage: parseFloat(battingStats.Average || '0'),
                    ballsFaced: parseInt(battingStats.Balls_Faced || '0'),
                    strikeRate: parseFloat(battingStats.Strike_Rate || '0'),
                    centuries: parseInt(battingStats['100s'] || '0'),
                    halfCenturies: parseInt(battingStats['50s'] || '0'),
                    ducks: parseInt(battingStats['0s'] || '0'),
                    fours: parseInt(battingStats['4s'] || '0'),
                    sixes: parseInt(battingStats['6s'] || '0'),
                    
                    // Bowling statistics
                    bowlingMatches: parseInt(bowlingStats.Matches || '0'),
                    bowlingInnings: parseInt(bowlingStats.Innings || '0'),
                    ballsBowled: parseInt(bowlingStats.Balls || '0'),
                    runsConceded: parseInt(bowlingStats.Runs || '0'),
                    wickets: parseInt(bowlingStats.Wickets || '0'),
                    bestBowlingInnings: bowlingStats.BBI || 'N/A',
                    bowlingAverage: parseFloat(bowlingStats.Average || '0'),
                    economy: parseFloat(bowlingStats.Economy || '0'),
                    bowlingStrikeRate: parseFloat(bowlingStats.Strike_Rate || '0'),
                    fourWickets: parseInt(bowlingStats['4W'] || '0'),
                    fiveWickets: parseInt(bowlingStats['5W'] || '0'),
                    
                    // BCCB specific data
                    battingStyle: playerInfo.Batting_Style,
                    bowlingStyle: playerInfo.Bowling_Style,
                    isStar: playerInfo.Is_Star === 'True',
                    lastUpdated: playerInfo.Last_Updated,
                    lastEditDate: playerInfo.Last_Edit_Date,
                    
                    // App specific
                    boundaries: {
                        fours: parseInt(battingStats['4s'] || '0'),
                        sixes: parseInt(battingStats['6s'] || '0')
                    },
                    created: new Date().toISOString()
                };

                players.push(player);
            });
        }

        // Convert match history
        if (historyData) {
            historyData.forEach((match, index) => {
                matches.push({
                    id: match.Match_ID || (Date.now() + index),
                    dateSaved: match.Date_Saved,
                    status: 'completed',
                    created: match.Date_Saved || new Date().toISOString()
                });
            });
        }

        return { players, matches, teams };
    }

    // Validate and normalize match data when loading from JSON
    validateAndNormalizeLoadedMatch(match) {
        if (!match) return null;
        
        // Normalize team data - ensure consistent object format
        const normalizeTeam = (teamData, fallbackName) => {
            if (!teamData) return { name: fallbackName };
            if (typeof teamData === 'string') return { name: teamData };
            if (typeof teamData === 'object' && teamData.name) return { name: teamData.name };
            return { name: fallbackName };
        };
        
        // Normalize score strings
        const normalizeScore = (score) => {
            if (!score && score !== 0) return 'N/A';
            if (typeof score === 'number') return score.toString();
            if (typeof score === 'string' && score.trim() !== '') return score.trim();
            return 'N/A';
        };
        
        const normalized = {
            // Use Match_ID as primary, fallback to id
            id: match.Match_ID || match.id || Date.now(),
            
            // Date handling
            date: match.Date || match.date || new Date().toISOString().split('T')[0],
            venue: match.Venue || match.venue || 'Not specified',
            
            // Team data - ensure object format with name property
            team1: normalizeTeam(match.Team1 || match.team1, 'Team 1'),
            team2: normalizeTeam(match.Team2 || match.team2, 'Team 2'),
            
            // Captain data
            team1Captain: match.Team1_Captain || match.team1Captain || '',
            team2Captain: match.Team2_Captain || match.team2Captain || '',
            
            // Team compositions
            team1Composition: match.Team1_Composition || match.team1Composition || [],
            team2Composition: match.Team2_Composition || match.team2Composition || [],
            
            // Results
            winningTeam: match.Winning_Team || match.winningTeam || match.winner || '',
            losingTeam: match.Losing_Team || match.losingTeam || match.loser || '',
            result: match.Result || match.result || 'Match completed',
            
            // Scores
            winningTeamScore: normalizeScore(match.Winning_Team_Score || match.winningTeamScore),
            losingTeamScore: normalizeScore(match.Losing_Team_Score || match.losingTeamScore),
            
            // Match metadata
            overs: match.Overs || match.overs || 20,
            matchType: match.Match_Type || match.matchType || 'Regular',
            status: match.Status || match.status || 'Completed',
            manOfTheMatch: match.Man_Of_The_Match || match.Man_of_the_Match || match.manOfTheMatch || '',
            
            // Timestamps
            gameStartTime: match.Game_Start_Time || match.gameStartTime || match.startTime || '',
            gameFinishTime: match.Game_Finish_Time || match.gameFinishTime || match.finishTime || '',
            
            // Additional properties
            completed: match.completed !== false, // Default to true
            target: match.target || 0,
            currentInnings: match.currentInnings || 1
        };
        
        // Validate team names
        if (!normalized.team1.name || normalized.team1.name === '') {
            console.warn(`⚠️ Invalid team1 name in match ${normalized.id}, using fallback`);
            normalized.team1.name = 'Team 1';
        }
        if (!normalized.team2.name || normalized.team2.name === '') {
            console.warn(`⚠️ Invalid team2 name in match ${normalized.id}, using fallback`);
            normalized.team2.name = 'Team 2';
        }
        
        // Validate scores
        if (normalized.winningTeamScore === 'N/A' && normalized.losingTeamScore === 'N/A') {
            console.warn(`⚠️ Missing score data for match ${normalized.id}`);
        }
        
        return normalized;
    }

    convertAppDataToStats(players, matches, teams) {
    }

    convertToSkillLevel(battingStyle, bowlingStyle, isStar) {
        let skill = 5; // Base skill
        
        // Batting style bonus - handle both old (R/S/U) and new (Reliable/So-So/Tailend) formats
        if (battingStyle === 'R' || battingStyle === 'Reliable') skill += 2;
        else if (battingStyle === 'S' || battingStyle === 'So-So') skill += 1;
        // 'U' (Unreliable) or 'Tailend' gets no bonus
        
        // Bowling style bonus
        if (bowlingStyle === 'Fast') skill += 2;
        else if (bowlingStyle === 'Medium') skill += 1;
        // 'DNB' gets no bonus
        
        // Star player bonus
        if (isStar === 'True') skill += 2;
        
        // Cap at 10
        return Math.min(skill, 10);
    }

    determineRole(battingStyle, bowlingStyle) {
        // Handle both old (U) and new (Tailend) formats
        const isTailender = (battingStyle === 'U' || battingStyle === 'Tailend');
        const isNonBowler = (bowlingStyle === 'DNB');
        
        if (!isTailender && !isNonBowler) {
            return 'allrounder';
        } else if (isTailender && !isNonBowler) {
            return 'bowler';
        } else if (!isTailender && isNonBowler) {
            return 'batsman';
        } else {
            return 'batsman'; // Default
        }
    }

    convertStatsToAppData(statsData) {
        const players = [];
        const matches = [];
        const teams = [];

        // Convert player info data to app format
        if (statsData.player_info) {
            statsData.player_info.forEach((playerInfo, index) => {
                // Aggregate batting performance from match data
                const playerBattingPerformances = statsData.match_batting_performance?.filter(b => b.Player === playerInfo.Name) || [];
                const playerBowlingPerformances = statsData.match_bowling_performance?.filter(b => b.Player === playerInfo.Name) || [];
                
                // Calculate aggregated batting stats
                const totalRuns = playerBattingPerformances.reduce((sum, match) => sum + (parseInt(match.Runs) || 0), 0);
                const totalBallsFaced = playerBattingPerformances.reduce((sum, match) => sum + (parseInt(match.Balls_Faced) || 0), 0);
                const totalFours = playerBattingPerformances.reduce((sum, match) => sum + (parseInt(match.Fours) || 0), 0);
                const totalSixes = playerBattingPerformances.reduce((sum, match) => sum + (parseInt(match.Sixes) || 0), 0);
                const battingInnings = playerBattingPerformances.length;
                const notOuts = playerBattingPerformances.filter(match => !match.Out).length;
                const highestScore = Math.max(...playerBattingPerformances.map(match => parseInt(match.Runs) || 0), 0);
                const battingAverage = (battingInnings - notOuts) > 0 ? (totalRuns / (battingInnings - notOuts)) : 0;
                const strikeRate = totalBallsFaced > 0 ? ((totalRuns / totalBallsFaced) * 100) : 0;
                
                // Calculate aggregated bowling stats
                const totalRunsConceded = playerBowlingPerformances.reduce((sum, match) => sum + (parseInt(match.Runs) || 0), 0);
                const totalWickets = playerBowlingPerformances.reduce((sum, match) => sum + (parseInt(match.Wickets) || 0), 0);
                const totalBallsBowled = playerBowlingPerformances.reduce((sum, match) => sum + (parseInt(match.Balls) || 0), 0);
                const bowlingInnings = playerBowlingPerformances.length;
                const bowlingAverage = totalWickets > 0 ? (totalRunsConceded / totalWickets) : 0;
                const economy = totalBallsBowled > 0 ? ((totalRunsConceded / totalBallsBowled) * 6) : 0;
                const bowlingStrikeRate = totalWickets > 0 ? (totalBallsBowled / totalWickets) : 0;

                const player = {
                    id: Date.now() + index,
                    name: playerInfo.Name,
                    skill: this.convertToSkillLevel(playerInfo.Batting_Style, playerInfo.Bowling_Style, playerInfo.Is_Star),
                    role: this.determineRole(playerInfo.Batting_Style, playerInfo.Bowling_Style),
                    
                    // Batting statistics (calculated from match data)
                    matches: battingInnings,
                    innings: battingInnings,
                    notOuts: notOuts,
                    runs: totalRuns,
                    highestScore: highestScore,
                    battingAverage: Math.round(battingAverage * 100) / 100,
                    ballsFaced: totalBallsFaced,
                    strikeRate: Math.round(strikeRate * 100) / 100,
                    centuries: playerBattingPerformances.filter(match => parseInt(match.Runs) >= 100).length,
                    halfCenturies: playerBattingPerformances.filter(match => parseInt(match.Runs) >= 50 && parseInt(match.Runs) < 100).length,
                    ducks: playerBattingPerformances.filter(match => parseInt(match.Runs) === 0).length,
                    fours: totalFours,
                    sixes: totalSixes,
                    
                    // Bowling statistics (calculated from match data)
                    bowlingMatches: bowlingInnings,
                    bowlingInnings: bowlingInnings,
                    ballsBowled: totalBallsBowled,
                    runsConceded: totalRunsConceded,
                    wickets: totalWickets,
                    bestBowlingInnings: playerBowlingPerformances.length > 0 ? 
                        playerBowlingPerformances.reduce((best, match) => 
                            (parseInt(match.Wickets) || 0) > (parseInt(best.Wickets) || 0) ? match : best
                        ).Wickets + '/' + playerBowlingPerformances.reduce((best, match) => 
                            (parseInt(match.Wickets) || 0) > (parseInt(best.Wickets) || 0) ? match : best
                        ).Runs : 'N/A',
                    bowlingAverage: Math.round(bowlingAverage * 100) / 100,
                    economy: Math.round(economy * 100) / 100,
                    bowlingStrikeRate: Math.round(bowlingStrikeRate * 100) / 100,
                    fourWickets: playerBowlingPerformances.filter(match => parseInt(match.Wickets) >= 4).length,
                    fiveWickets: playerBowlingPerformances.filter(match => parseInt(match.Wickets) >= 5).length,
                    
                    // BCCB specific data
                    battingStyle: playerInfo.Batting_Style,
                    bowlingStyle: playerInfo.Bowling_Style,
                    isStar: playerInfo.Is_Star,
                    lastUpdated: playerInfo.Last_Updated,
                    lastEditDate: playerInfo.Last_Edit_Date,
                    
                    // Additional app-specific data
                    isActive: true,
                    position: 0,
                    team: null
                };

                players.push(player);
            });
        }

        // Convert match history to app format
        if (statsData.matches) {
            // New format with matches array
            statsData.matches.forEach((match, index) => {
                // Validate and normalize each match
                const normalizedMatch = this.validateAndNormalizeLoadedMatch(match);
                
                const appMatch = {
                    id: normalizedMatch.id,
                    matchId: normalizedMatch.id,
                    date: normalizedMatch.date,
                    venue: normalizedMatch.venue,
                    team1: normalizedMatch.team1,
                    team2: normalizedMatch.team2,
                    team1Captain: normalizedMatch.team1Captain,
                    team2Captain: normalizedMatch.team2Captain,
                    team1Composition: normalizedMatch.team1Composition,
                    team2Composition: normalizedMatch.team2Composition,
                    winningTeam: normalizedMatch.winningTeam,
                    losingTeam: normalizedMatch.losingTeam,
                    gameStartTime: normalizedMatch.gameStartTime,
                    gameFinishTime: normalizedMatch.gameFinishTime,
                    winningTeamScore: normalizedMatch.winningTeamScore,
                    losingTeamScore: normalizedMatch.losingTeamScore,
                    result: normalizedMatch.result,
                    overs: normalizedMatch.overs,
                    matchType: normalizedMatch.matchType,
                    completed: normalizedMatch.status === 'Completed',
                    status: normalizedMatch.status === 'Completed' ? 'completed' : 'in-progress',
                    manOfTheMatch: normalizedMatch.manOfTheMatch,
                    
                    // Convert performance data
                    battingPerformances: (statsData.match_batting_performance || [])
                        .filter(perf => perf.Match_ID === match.Match_ID)
                        .map(perf => ({
                            playerId: perf.Player_ID,
                            playerName: perf.Player,
                            runs: perf.Runs,
                            ballsFaced: perf.Balls_Faced,
                            strikeRate: perf.Strike_Rate,
                            fours: perf.Fours,
                            sixes: perf.Sixes,
                            out: perf.Out,
                            dismissalType: perf.Dismissal_Type,
                            position: perf.Position
                        })),
                    bowlingPerformances: (statsData.match_bowling_performance || [])
                        .filter(perf => perf.Match_ID === match.Match_ID)
                        .map(perf => ({
                            playerId: perf.Player_ID,
                            playerName: perf.Player,
                            overs: perf.Overs,
                            maidens: perf.Maidens,
                            runs: perf.Runs,
                            wickets: perf.Wickets,
                            economy: perf.Economy,
                            balls: perf.Balls
                        }))
                };

                matches.push(appMatch);
            });
        } else if (statsData.history) {
            // Legacy format with history array
            statsData.history.forEach((historyEntry, index) => {
                const match = {
                    id: historyEntry.Match_ID,
                    date: historyEntry.Date_Saved,
                    winningCaptain: historyEntry.Winning_Captain || '',
                    losingCaptain: historyEntry.Losing_Captain || '',
                    winningTeamScore: historyEntry.Winning_Team_Score || '',
                    losingTeamScore: historyEntry.Losing_Team_Score || '',
                    manOfTheMatch: historyEntry.Man_of_the_Match || '',
                    winningTeamOvers: historyEntry.Winning_Team_Overs_Played || '',
                    losingTeamOvers: historyEntry.Losing_Team_Overs_Played || '',
                    
                    // Additional match data that might be needed by the app
                    status: 'completed',
                    teams: [],
                    battingPerformance: statsData.match_batting_performance?.filter(p => p.Match_ID === historyEntry.Match_ID) || [],
                    bowlingPerformance: statsData.match_bowling_performance?.filter(p => p.Match_ID === historyEntry.Match_ID) || []
                };

                matches.push(match);
            });
        }

        // Device ID and other metadata
        const metadata = {
            deviceId: statsData.device_id?.id || this.deviceId,
            lastSync: new Date().toISOString(),
            source: 'cricket_stats_json'
        };

        return {
            players,
            matches,
            teams,
            metadata
        };
    }

    async saveJSONData(data) {
        try {
            // Save to localStorage (since we can't write files directly from browser)
            localStorage.setItem('cricket-players', JSON.stringify(data.players));
            localStorage.setItem('cricket-matches', JSON.stringify(data.matches));
            localStorage.setItem('cricket-teams', JSON.stringify(data.teams));
            
            // Edit existing JSON files in place instead of creating new ones
            await this.editJSONFilesInPlace(data);
            
            // Also save metadata
            const metadata = {
                lastSync: new Date().toISOString(),
                deviceId: this.deviceId,
                csvFiles: this.csvFiles,
                source: 'json-files'
            };
            localStorage.setItem('cricket-metadata', JSON.stringify(metadata));
            
            console.log('Data saved to localStorage and JSON files updated in place');
        } catch (error) {
            console.error('Error saving JSON data:', error);
        }
    }

    async editJSONFilesInPlace(data) {
        try {
            console.log('Starting edit-in-place for JSON files...');
            
            // Create backup before editing (for data integrity)
            await this.createBackupBeforeEdit();
            
            // Edit individual JSON files in place
            await Promise.all([
                this.editPlayersJSON(data.players),
                this.editMatchesJSON(data.matches),
                this.editTeamsJSON(data.teams),
                this.editCricketStatsJSON(data)
            ]);
            
            console.log('All JSON files updated in place successfully');
        } catch (error) {
            console.error('Error editing JSON files in place:', error);
            // If editing fails, we still have the backup and localStorage
            this.showNotification('Warning: JSON file update failed, but data is safely stored in browser storage.');
            throw error;
        }
    }

    async createBackupBeforeEdit() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            
            // Load current files and create backup
            const [players, matches, teams, stats] = await Promise.all([
                this.loadExistingJSON('./cricket_players.json', []),
                this.loadExistingJSON('./cricket_matches.json', []),
                this.loadExistingJSON('./cricket_teams.json', []),
                this.loadExistingJSON('./cricket_stats.json', this.createEmptyStatsStructure())
            ]);
            
            // Store backup in localStorage with timestamp
            localStorage.setItem(`cricket-backup-${timestamp}`, JSON.stringify({
                players, matches, teams, stats, timestamp
            }));
            
            console.log(`Backup created with timestamp: ${timestamp}`);
            
            // Keep only last 5 backups to manage storage
            this.cleanupOldBackups();
        } catch (error) {
            console.warn('Could not create backup before edit:', error);
            // Don't throw - editing can still proceed
        }
    }

    cleanupOldBackups() {
        try {
            const backupKeys = Object.keys(localStorage)
                .filter(key => key.startsWith('cricket-backup-'))
                .sort()
                .reverse(); // Most recent first
            
            // Remove backups beyond the last 5
            backupKeys.slice(5).forEach(key => {
                localStorage.removeItem(key);
                console.log(`Removed old backup: ${key}`);
            });
        } catch (error) {
            console.warn('Error cleaning up old backups:', error);
        }
    }

    async editPlayersJSON(players) {
        try {
            // Load existing players file
            const existingPlayers = await this.loadExistingJSON('./cricket_players.json', []);
            
            // Merge new players with existing ones
            const mergedPlayers = this.mergePlayersData(existingPlayers, players);
            
            // Save updated data
            await this.saveUpdatedJSON('cricket_players.json', mergedPlayers);
            console.log(`Players JSON updated: ${mergedPlayers.length} players`);
        } catch (error) {
            console.error('Error editing players JSON:', error);
            throw error;
        }
    }

    async editMatchesJSON(matches) {
        try {
            // Load existing matches file
            const existingMatches = await this.loadExistingJSON('./cricket_matches.json', []);
            
            // Merge new matches with existing ones
            const mergedMatches = this.mergeMatchesData(existingMatches, matches);
            
            // Save updated data
            await this.saveUpdatedJSON('cricket_matches.json', mergedMatches);
            console.log(`Matches JSON updated: ${mergedMatches.length} matches`);
        } catch (error) {
            console.error('Error editing matches JSON:', error);
            throw error;
        }
    }

    async editTeamsJSON(teams) {
        try {
            // Load existing teams file
            const existingTeams = await this.loadExistingJSON('./cricket_teams.json', []);
            
            // Merge new teams with existing ones
            const mergedTeams = this.mergeTeamsData(existingTeams, teams);
            
            // Save updated data
            await this.saveUpdatedJSON('cricket_teams.json', mergedTeams);
            console.log(`Teams JSON updated: ${mergedTeams.length} teams`);
        } catch (error) {
            console.error('Error editing teams JSON:', error);
            throw error;
        }
    }

    async editCricketStatsJSON(appData) {
        try {
            // Load existing cricket_stats file
            const existingStats = await this.loadExistingJSON('./cricket_stats.json', this.createEmptyStatsStructure());
            
            // Convert app data to stats format
            const newStatsData = this.convertAppDataToStats(appData);
            
            // Merge stats data intelligently
            const mergedStats = this.mergeStatsData(existingStats, newStatsData);
            
            // Save updated data
            await this.saveUpdatedJSON('cricket_stats.json', mergedStats);
            console.log('Cricket stats JSON updated in place');
        } catch (error) {
            console.error('Error editing cricket stats JSON:', error);
            throw error;
        }
    }

    convertAppDataToStats(data) {
        const statsData = {
            player_info: [],
            matches: [],
            match_batting_performance: [],
            match_bowling_performance: [],
            export_metadata: {
                total_players: data.players ? data.players.length : 0,
                total_matches: data.matches ? data.matches.length : 0,
                export_date: new Date().toISOString(),
                export_timestamp: new Date().toLocaleString(),
                app_version: '1.0.0',
                data_format_version: '2.0',
                created_by: 'Cricket PWA'
            }
        };

        // Create player ID mapping
        const playerIdMap = new Map();
        let playerIdCounter = 1;

        // Convert players back to cricket_stats format
        if (data.players) {
            data.players.forEach(player => {
                // Generate Player_ID using sequential counter for consistency
                const playerId = `P${playerIdCounter.toString().padStart(3, '0')}`;
                playerIdMap.set(player.name, playerId);
                playerIdCounter++;

                // Player info with Player_ID
                statsData.player_info.push({
                    Player_ID: playerId,
                    Name: player.name,
                    Bowling_Style: player.bowlingStyle || player.bowling || 'Medium',
                    Batting_Style: player.battingStyle || player.batting || 'Reliable',
                    Is_Star: player.isStar || player.is_star || false,
                    Last_Updated: player.lastUpdated || player.last_updated || new Date().toISOString().split('T')[0],
                    Last_Edit_Date: player.lastEditDate || new Date().toISOString().split('T')[0]
                });
            });
        }

        // Convert matches to new format
        if (data.matches) {
            data.matches.forEach(match => {
                const normalizedMatch = {
                    Match_ID: match.id || match.matchId || Date.now(),
                    Date: match.date || new Date().toISOString().split('T')[0],
                    Venue: match.venue || 'Not specified',
                    Team1: this.extractTeamName(match.team1) || 'Team 1',
                    Team2: this.extractTeamName(match.team2) || 'Team 2',
                    Team1_Captain: match.team1Captain || match.captains?.team1 || '',
                    Team2_Captain: match.team2Captain || match.captains?.team2 || '',
                    Team1_Composition: match.team1Composition || match.compositions?.team1 || [],
                    Team2_Composition: match.team2Composition || match.compositions?.team2 || [],
                    Winning_Team: this.extractTeamName(match.winner) || match.winningTeam || '',
                    Losing_Team: this.extractTeamName(match.loser) || match.losingTeam || '',
                    Game_Start_Time: match.gameStartTime || match.startTime || (match.date + 'T14:00:00Z'),
                    Game_Finish_Time: match.gameFinishTime || match.finishTime || '',
                    Winning_Team_Score: this.normalizeScore(match.winningTeamScore || match.scores?.winner) || 'N/A',
                    Losing_Team_Score: this.normalizeScore(match.losingTeamScore || match.scores?.loser) || 'N/A',
                    Result: match.result || match.winner || 'Match completed',
                    Overs: match.overs || match.totalOvers || 20,
                    Match_Type: match.matchType || match.match_type || 'Regular',
                    Status: match.completed !== false ? 'Completed' : 'In Progress',
                    Man_Of_The_Match: match.manOfTheMatch?.name || match.manOfTheMatch || ''
                };

                // Validate the normalized match
                if (!normalizedMatch.Team1 || !normalizedMatch.Team2) {
                    console.warn(`⚠️ Missing team names for match ${normalizedMatch.Match_ID}`);
                    normalizedMatch.Team1 = normalizedMatch.Team1 || 'Team 1';
                    normalizedMatch.Team2 = normalizedMatch.Team2 || 'Team 2';
                }

                statsData.matches.push(normalizedMatch);

                // Add batting performance data
                if (match.battingPerformances || match.battingPerformance) {
                    const battingData = match.battingPerformances || match.battingPerformance || [];
                    battingData.forEach(perf => {
                        statsData.match_batting_performance.push({
                            Match_ID: match.id || match.matchId,
                            Player_ID: perf.playerId || perf.Player_ID || playerIdMap.get(perf.playerName || perf.Player) || '',
                            Player: perf.playerName || perf.Player || '',
                            Runs: perf.runs || perf.Runs || 0,
                            Balls_Faced: perf.ballsFaced || perf.Balls_Faced || 0,
                            Strike_Rate: perf.strikeRate || perf.Strike_Rate || "0.00",
                            Fours: perf.fours || perf.Fours || 0,
                            Sixes: perf.sixes || perf.Sixes || 0,
                            Out: perf.out !== undefined ? perf.out : (perf.Out !== undefined ? perf.Out : false),
                            Dismissal_Type: perf.dismissalType || perf.Dismissal_Type || '',
                            Position: perf.position || perf.Position || 1
                        });
                    });
                }

                // Add bowling performance data
                if (match.bowlingPerformances || match.bowlingPerformance) {
                    const bowlingData = match.bowlingPerformances || match.bowlingPerformance || [];
                    bowlingData.forEach(perf => {
                        statsData.match_bowling_performance.push({
                            Match_ID: match.id || match.matchId,
                            Player_ID: perf.playerId || perf.Player_ID || playerIdMap.get(perf.playerName || perf.Player) || '',
                            Player: perf.playerName || perf.Player || '',
                            Overs: perf.overs || perf.Overs || '0.0',
                            Maidens: perf.maidens || perf.Maidens || 0,
                            Runs: perf.runs || perf.Runs || 0,
                            Wickets: perf.wickets || perf.Wickets || 0,
                            Economy: perf.economy || perf.Economy || '0.00',
                            Balls: perf.balls || perf.Balls || 0
                        });
                    });
                }
            });
        }

        return statsData;
    }

    async saveToCSV(players, matches, teams) {
        try {
            // Prepare data for CSV export (server-side would handle actual file writing)
            const playerInfoCSV = this.generatePlayerInfoCSV(players);
            const battingCSV = this.generateBattingCSV(players);
            const bowlingCSV = this.generateBowlingCSV(players);
            const historyCSV = this.generateHistoryCSV(matches);
            
            // For now, trigger downloads (in a real server environment, these would be saved to files)
            this.downloadCSV(playerInfoCSV, `cricket_stats_player_info_${this.deviceId}.csv`);
            this.downloadCSV(battingCSV, `cricket_stats_batting_${this.deviceId}.csv`);
            this.downloadCSV(bowlingCSV, `cricket_stats_bowling_${this.deviceId}.csv`);
            this.downloadCSV(historyCSV, `cricket_stats_history_${this.deviceId}.csv`);
            
            // Update index
            const indexCSV = this.generateIndexCSV();
            this.downloadCSV(indexCSV, `cricket_stats_index_${this.deviceId}.csv`);
            
            return true;
        } catch (error) {
            console.error('Error saving to CSV:', error);
            return false;
        }
    }

    generatePlayerInfoCSV(players) {
        const headers = ['Name', 'Bowling_Style', 'Batting_Style', 'Is_Star', 'Last_Updated', 'Last_Edit_Date'];
        const rows = players.map(player => [
            player.name,
            player.bowlingStyle || this.skillToBowlingStyle(player),
            player.battingStyle || this.skillToBattingStyle(player),
            player.isStar || player.skill >= 8 ? 'True' : 'False',
            new Date().toISOString().split('T')[0],
            new Date().toISOString().split('T')[0]
        ]);
        
        return this.arrayToCSV([headers, ...rows]);
    }

    generateBattingCSV(players) {
        const headers = ['Player', 'Matches', 'Innings', 'Not_Outs', 'Runs', 'Highest_Score', 'Average', 'Balls_Faced', 'Strike_Rate', '100s', '50s', '0s', '4s', '6s'];
        const rows = players.filter(p => p.matches > 0).map(player => [
            player.name,
            player.matches || 0,
            player.innings || 0,
            player.notOuts || 0,
            player.runs || 0,
            player.highestScore || 0,
            player.battingAverage?.toFixed(2) || '0.00',
            player.ballsFaced || 0,
            player.strikeRate?.toFixed(2) || '0.00',
            player.centuries || 0,
            player.halfCenturies || 0,
            player.ducks || 0,
            player.fours || player.boundaries?.fours || 0,
            player.sixes || player.boundaries?.sixes || 0
        ]);
        
        return this.arrayToCSV([headers, ...rows]);
    }

    generateBowlingCSV(players) {
        const headers = ['Player', 'Matches', 'Innings', 'Balls', 'Runs', 'Wickets', 'BBI', 'Average', 'Economy', 'Strike_Rate', '4W', '5W'];
        const rows = players.filter(p => p.wickets > 0).map(player => [
            player.name,
            player.bowlingMatches || player.matches || 0,
            player.bowlingInnings || player.innings || 0,
            player.ballsBowled || 0,
            player.runsConceded || 0,
            player.wickets || 0,
            player.bestBowlingInnings || `${player.wickets || 0}/${player.runsConceded || 0}`,
            player.bowlingAverage?.toFixed(2) || '0.00',
            player.economy?.toFixed(2) || '0.00',
            player.bowlingStrikeRate?.toFixed(2) || '0.00',
            player.fourWickets || 0,
            player.fiveWickets || 0
        ]);
        
        return this.arrayToCSV([headers, ...rows]);
    }

    generateHistoryCSV(matches) {
        const headers = ['Match_ID', 'Date_Saved'];
        const rows = matches.map(match => [
            match.id,
            match.dateSaved || match.created || new Date().toISOString()
        ]);
        
        return this.arrayToCSV([headers, ...rows]);
    }

    generateIndexCSV() {
        const headers = ['Filename', 'Type', 'Last_Updated'];
        const today = new Date().toISOString().split('T')[0];
        const rows = [
            [`cricket_stats_player_info_${this.deviceId}.csv`, 'player_info', today],
            [`cricket_stats_batting_${this.deviceId}.csv`, 'batting', today],
            [`cricket_stats_bowling_${this.deviceId}.csv`, 'bowling', today],
            [`cricket_stats_history_${this.deviceId}.csv`, 'history', today]
        ];
        
        return this.arrayToCSV([headers, ...rows]);
    }

    skillToBowlingStyle(player) {
        if (player.role === 'bowler' || player.role === 'allrounder') {
            return player.skill >= 8 ? 'Fast' : 'Medium';
        }
        return 'DNB';
    }

    skillToBattingStyle(player) {
        // Return new full word format
        if (player.skill >= 8) return 'Reliable';
        if (player.skill >= 6) return 'So-So';
        return 'Tailend';
    }

    arrayToCSV(array) {
        return array.map(row => 
            row.map(field => {
                if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
                    return '"' + field.replace(/"/g, '""') + '"';
                }
                return field;
            }).join(',')
        ).join('\n');
    }

    downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    async saveCricketStatsJSON(players, matches, teams, includeDeviceId = false) {
        try {
            const appData = { players, matches, teams };
            
            // Use edit-in-place instead of creating new files
            await this.editCricketStatsJSON(appData);
            
            console.log('Cricket stats JSON updated in place');
            return true;
        } catch (error) {
            console.error('Error saving cricket stats JSON:', error);
            return false;
        }
    }

    downloadJSON(data, filename) {
        try {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            // Show notification with replacement instructions
            this.showNotification(`${filename} downloaded to Downloads folder. To update the project file, copy it from Downloads to the project folder and replace the existing file.`);
        } catch (error) {
            console.error('Error downloading JSON:', error);
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
            console.log(message);
        }
    }

    addPlayer(playerData) {
        try {
            if (!this.data || !this.data.players) {
                console.warn('Data manager not properly initialized for adding player');
                return;
            }
            
            // Add player to the data structure
            this.data.players.push(playerData);
            
            // Save the updated data
            this.saveJSONData(this.data);
            
            console.log(`Player ${playerData.name} added to data manager`);
        } catch (error) {
            console.error('Error adding player to data manager:', error);
        }
    }

    // Helper function to extract team name from various formats
    extractTeamName(teamData) {
        if (!teamData) return null;
        if (typeof teamData === 'string') return teamData;
        if (typeof teamData === 'object' && teamData.name) return teamData.name;
        return null;
    }

    // Helper function to normalize score strings
    normalizeScore(score) {
        if (!score && score !== 0) return 'N/A';
        if (typeof score === 'number') return score.toString();
        if (typeof score === 'string' && score.trim() !== '') return score.trim();
        return 'N/A';
    }

    // Edit-in-place helper methods
    async loadExistingJSON(filePath, defaultValue) {
        try {
            const response = await fetch(filePath);
            if (response.ok) {
                const data = await response.json();
                return data;
            } else {
                console.warn(`File ${filePath} not found, using default value`);
                return defaultValue;
            }
        } catch (error) {
            console.warn(`Error loading ${filePath}, using default value:`, error);
            return defaultValue;
        }
    }

    async saveUpdatedJSON(filename, data) {
        try {
            // Since browsers can't directly write files, we'll trigger a download
            // with specific instructions for replacing the existing file
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            
            // Add timestamp to make downloads unique
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
            link.download = filename.replace('.json', `_updated_${timestamp}.json`);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            // Show detailed notification
            this.showUpdateNotification(filename, data);
        } catch (error) {
            console.error(`Error saving updated ${filename}:`, error);
            throw error;
        }
    }

    showUpdateNotification(filename, data) {
        let count = 'unknown';
        if (Array.isArray(data)) {
            count = data.length;
        } else if (data && typeof data === 'object') {
            if (data.player_info) count = `${data.player_info.length} players, ${data.matches?.length || 0} matches`;
            else if (data.export_metadata) count = `${data.export_metadata.total_players} players, ${data.export_metadata.total_matches} matches`;
        }
        
        const message = `📁 Updated ${filename} downloaded (${count} items). 
        
To complete the update:
1. Go to your Downloads folder
2. Copy the downloaded file
3. Replace the existing ${filename} in your project folder
        
💾 Data is safely backed up in browser storage.`;
        
        this.showNotification(message);
    }

    mergePlayersData(existingPlayers, newPlayers) {
        if (!Array.isArray(existingPlayers)) existingPlayers = [];
        if (!Array.isArray(newPlayers)) newPlayers = [];
        
        const merged = [...existingPlayers];
        const existingIds = new Set(existingPlayers.map(p => p.id).filter(id => id));
        
        newPlayers.forEach(newPlayer => {
            if (!newPlayer || !newPlayer.id) return; // Skip invalid players
            
            if (!existingIds.has(newPlayer.id)) {
                // Add new player
                merged.push(newPlayer);
                console.log(`Added new player: ${newPlayer.name || newPlayer.id}`);
            } else {
                // Update existing player
                const index = merged.findIndex(p => p.id === newPlayer.id);
                if (index !== -1) {
                    merged[index] = { ...merged[index], ...newPlayer };
                    console.log(`Updated existing player: ${newPlayer.name || newPlayer.id}`);
                }
            }
        });
        
        return merged;
    }

    mergeMatchesData(existingMatches, newMatches) {
        if (!Array.isArray(existingMatches)) existingMatches = [];
        if (!Array.isArray(newMatches)) newMatches = [];
        
        const merged = [...existingMatches];
        const existingIds = new Set(existingMatches.map(m => m.id).filter(id => id));
        
        newMatches.forEach(newMatch => {
            if (!newMatch || !newMatch.id) return; // Skip invalid matches
            
            if (!existingIds.has(newMatch.id)) {
                // Add new match
                merged.push(newMatch);
                console.log(`Added new match: ${newMatch.id} (${newMatch.date || 'no date'})`);
            } else {
                // Update existing match (be careful - matches should rarely be updated after creation)
                const index = merged.findIndex(m => m.id === newMatch.id);
                if (index !== -1) {
                    merged[index] = { ...merged[index], ...newMatch };
                    console.log(`Updated existing match: ${newMatch.id}`);
                }
            }
        });
        
        return merged;
    }

    mergeTeamsData(existingTeams, newTeams) {
        if (!Array.isArray(existingTeams)) existingTeams = [];
        if (!Array.isArray(newTeams)) newTeams = [];
        
        const merged = [...existingTeams];
        const existingIds = new Set(existingTeams.map(t => t.id).filter(id => id));
        
        newTeams.forEach(newTeam => {
            if (!newTeam || !newTeam.id) return; // Skip invalid teams
            
            if (!existingIds.has(newTeam.id)) {
                // Add new team
                merged.push(newTeam);
                console.log(`Added new team: ${newTeam.name || newTeam.id}`);
            } else {
                // Update existing team
                const index = merged.findIndex(t => t.id === newTeam.id);
                if (index !== -1) {
                    merged[index] = { ...merged[index], ...newTeam };
                    console.log(`Updated existing team: ${newTeam.name || newTeam.id}`);
                }
            }
        });
        
        return merged;
    }

    mergeStatsData(existingStats, newStatsData) {
        const merged = { ...existingStats };
        
        // Update export metadata
        merged.export_metadata = newStatsData.export_metadata;
        
        // Merge player_info
        if (newStatsData.player_info) {
            const existingPlayerIds = new Set(merged.player_info?.map(p => p.Player_ID) || []);
            
            merged.player_info = merged.player_info || [];
            
            newStatsData.player_info.forEach(newPlayer => {
                if (!existingPlayerIds.has(newPlayer.Player_ID)) {
                    merged.player_info.push(newPlayer);
                } else {
                    const index = merged.player_info.findIndex(p => p.Player_ID === newPlayer.Player_ID);
                    if (index !== -1) {
                        merged.player_info[index] = { ...merged.player_info[index], ...newPlayer };
                    }
                }
            });
        }
        
        // Merge matches
        if (newStatsData.matches) {
            const existingMatchIds = new Set(merged.matches?.map(m => m.Match_ID) || []);
            
            merged.matches = merged.matches || [];
            
            newStatsData.matches.forEach(newMatch => {
                if (!existingMatchIds.has(newMatch.Match_ID)) {
                    merged.matches.push(newMatch);
                } else {
                    const index = merged.matches.findIndex(m => m.Match_ID === newMatch.Match_ID);
                    if (index !== -1) {
                        merged.matches[index] = { ...merged.matches[index], ...newMatch };
                    }
                }
            });
        }
        
        // Merge batting performance
        if (newStatsData.match_batting_performance) {
            merged.match_batting_performance = merged.match_batting_performance || [];
            merged.match_batting_performance.push(...newStatsData.match_batting_performance);
        }
        
        // Merge bowling performance
        if (newStatsData.match_bowling_performance) {
            merged.match_bowling_performance = merged.match_bowling_performance || [];
            merged.match_bowling_performance.push(...newStatsData.match_bowling_performance);
        }
        
        return merged;
    }

    createEmptyStatsStructure() {
        return {
            player_info: [],
            matches: [],
            match_batting_performance: [],
            match_bowling_performance: [],
            export_metadata: {
                total_players: 0,
                total_matches: 0,
                export_date: new Date().toISOString(),
                export_timestamp: new Date().toLocaleString(),
                app_version: '1.0.0',
                data_format_version: '2.0',
                created_by: 'Cricket PWA'
            }
        };
    }

    // Utility method to restore from backup if needed
    async restoreFromBackup(backupTimestamp) {
        try {
            const backupKey = `cricket-backup-${backupTimestamp}`;
            const backupData = localStorage.getItem(backupKey);
            
            if (!backupData) {
                throw new Error(`Backup with timestamp ${backupTimestamp} not found`);
            }
            
            const backup = JSON.parse(backupData);
            
            // Restore to localStorage
            localStorage.setItem('cricket-players', JSON.stringify(backup.players));
            localStorage.setItem('cricket-matches', JSON.stringify(backup.matches));
            localStorage.setItem('cricket-teams', JSON.stringify(backup.teams));
            localStorage.setItem('cricket-stats', JSON.stringify(backup.stats));
            
            console.log(`Restored data from backup: ${backupTimestamp}`);
            this.showNotification(`✅ Data restored from backup: ${backupTimestamp}`);
            
            return true;
        } catch (error) {
            console.error('Error restoring from backup:', error);
            this.showNotification(`❌ Failed to restore from backup: ${error.message}`);
            return false;
        }
    }

    // List available backups
    getAvailableBackups() {
        const backupKeys = Object.keys(localStorage)
            .filter(key => key.startsWith('cricket-backup-'))
            .map(key => key.replace('cricket-backup-', ''))
            .sort()
            .reverse(); // Most recent first
        
        return backupKeys;
    }

    // Show instructions for the new edit-in-place workflow
    showEditInPlaceInstructions() {
        const message = `🔄 Edit-in-Place Mode Active

How it works:
1. When you complete a match, updated JSON files are downloaded
2. Replace the existing files in your project folder with the downloaded ones
3. Your data is always safely backed up in browser storage

Benefits:
✅ No more multiple JSON files
✅ Always editing the same files
✅ Automatic backups before each edit
✅ Data integrity protection

Available backups: ${this.getAvailableBackups().length}`;
        
        this.showNotification(message);
    }
}
