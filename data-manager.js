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

    convertToSkillLevel(battingStyle, bowlingStyle, isStar) {
        let skill = 5; // Base skill
        
        // Batting style bonus
        if (battingStyle === 'R') skill += 2;      // Reliable
        else if (battingStyle === 'S') skill += 1; // Slogger
        // 'U' (Unreliable) gets no bonus
        
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
        if (battingStyle !== 'U' && bowlingStyle !== 'DNB') {
            return 'allrounder';
        } else if (battingStyle === 'U' && bowlingStyle !== 'DNB') {
            return 'bowler';
        } else if (battingStyle !== 'U' && bowlingStyle === 'DNB') {
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
                const battingStats = statsData.batting_stats?.find(b => b.Player === playerInfo.Name) || {};
                const bowlingStats = statsData.bowling_stats?.find(b => b.Player === playerInfo.Name) || {};

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
        if (statsData.history) {
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
            
            // Also convert and save to cricket_stats.json format
            const statsData = this.convertAppDataToStats(data);
            localStorage.setItem('cricket-stats', JSON.stringify(statsData));
            
            // Also save metadata
            const metadata = {
                lastSync: new Date().toISOString(),
                deviceId: this.deviceId,
                csvFiles: this.csvFiles,
                source: 'json-files'
            };
            localStorage.setItem('cricket-metadata', JSON.stringify(metadata));
            
            console.log('Data saved to localStorage');
        } catch (error) {
            console.error('Error saving JSON data:', error);
        }
    }

    convertAppDataToStats(data) {
        const statsData = {
            player_info: [],
            // batting_stats: [], // Removed aggregate
            // bowling_stats: [], // Removed aggregate
            matches: [],
            match_batting_performance: [],
            match_bowling_performance: [],
            device_id: {
                id: this.deviceId
            },
            history: []
        };

        // Create player ID mapping
        const playerIdMap = new Map();
        let playerIdCounter = 1;

        // Convert players back to cricket_stats format
        if (data.players) {
            data.players.forEach(player => {
                // Generate Player_ID
                const playerId = `P${playerIdCounter.toString().padStart(3, '0')}`;
                playerIdMap.set(player.name, playerId);
                playerIdCounter++;

                // Player info with Player_ID
                statsData.player_info.push({
                    Player_ID: playerId,
                    Name: player.name,
                    Bowling_Style: player.bowlingStyle || 'Medium',
                    Batting_Style: player.battingStyle || 'R',
                    Is_Star: player.isStar || false,
                    Last_Updated: player.lastUpdated || new Date().toISOString().split('T')[0],
                    Last_Edit_Date: player.lastEditDate || new Date().toISOString().split('T')[0]
                });
            });
        }

        // Convert matches back to history format
        if (data.matches) {
            data.matches.forEach(match => {
                statsData.history.push({
                    Match_ID: match.id,
                    Date_Saved: match.date || new Date().toISOString().replace('T', ' ').substring(0, 19),
                    Winning_Captain: match.winningCaptain || '',
                    Losing_Captain: match.losingCaptain || '',
                    Winning_Team_Score: match.winningTeamScore || '',
                    Losing_Team_Score: match.losingTeamScore || '',
                    Man_of_the_Match: match.manOfTheMatch || '',
                    Winning_Team_Overs_Played: match.winningTeamOvers || '',
                    Losing_Team_Overs_Played: match.losingTeamOvers || ''
                });

                // Add match performance data if available, ensuring Player_ID is included
                if (match.battingPerformance) {
                    const battingWithIds = match.battingPerformance.map(perf => ({
                        Match_ID: perf.Match_ID || match.id,
                        Player_ID: perf.Player_ID || playerIdMap.get(perf.Player) || perf.Player,
                        Player: perf.Player,
                        Runs: perf.Runs || 0,
                        Balls_Faced: perf.Balls_Faced || 0,
                        Strike_Rate: perf.Strike_Rate || "0.00",
                        Fours: perf.Fours || 0,
                        Sixes: perf.Sixes || 0,
                        Out: perf.Out || false,
                        Dismissal_Type: perf.Dismissal_Type || '',
                        Dismissal_Details: perf.Dismissal_Details || (perf.Out ? 'out' : 'not out'),
                        Position: perf.Position || 0
                    }));
                    statsData.match_batting_performance.push(...battingWithIds);
                }
                if (match.bowlingPerformance) {
                    const bowlingWithIds = match.bowlingPerformance.map(perf => ({
                        Match_ID: perf.Match_ID || match.id,
                        Player_ID: perf.Player_ID || playerIdMap.get(perf.Player) || perf.Player,
                        Player: perf.Player,
                        Overs: perf.Overs || "0.0",
                        Maidens: perf.Maidens || 0,
                        Runs: perf.Runs || 0,
                        Wickets: perf.Wickets || 0,
                        Economy: perf.Economy || "0.00",
                        Balls: perf.Balls || 0
                    }));
                    statsData.match_bowling_performance.push(...bowlingWithIds);
                }
            });
        }

        // Convert matches to cricket_stats format
        if (data.matches) {
            data.matches.forEach(match => {
                const convertPlayersToIds = (players) => {
                    return players.map(player => {
                        const playerId = playerIdMap.get(player.name);
                        return playerId || player.name; // fallback to name if ID not found
                    });
                };

                statsData.matches.push({
                    match_id: match.match_id,
                    date: match.date,
                    status: match.status,
                    team1: {
                        name: match.team1?.name || '',
                        captain_id: playerIdMap.get(match.team1?.captain) || match.team1?.captain || '',
                        player_ids: convertPlayersToIds(match.team1?.players || []),
                        strength: match.team1?.strength || 0
                    },
                    team2: {
                        name: match.team2?.name || '',
                        captain_id: playerIdMap.get(match.team2?.captain) || match.team2?.captain || '',
                        player_ids: convertPlayersToIds(match.team2?.players || []),
                        strength: match.team2?.strength || 0
                    },
                    created: match.created || match.date
                });
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
        if (player.skill >= 8) return 'R';
        if (player.skill >= 6) return 'S';
        return 'U';
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
            const statsData = this.convertAppDataToStats(appData);
            
            // Save to localStorage (since browsers can't write files directly)
            localStorage.setItem('cricket-stats', JSON.stringify(statsData));
            
            // Determine filename based on whether to include device ID
            let filename = 'cricket_stats.json';
            if (includeDeviceId) {
                const deviceId = await this.getDeviceId();
                if (deviceId) {
                    filename = `cricket_stats_${deviceId}.json`;
                }
            }
            
            // In a real environment, this would make an API call to save the file
            // For now, trigger a download of the updated cricket_stats.json
            this.downloadJSON(statsData, filename);
            
            console.log('Cricket stats JSON updated');
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
}
