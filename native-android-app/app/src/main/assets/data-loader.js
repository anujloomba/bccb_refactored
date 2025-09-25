// Android-compatible data loader
// This script provides an alternative way to load cricket_stats.json data in Android WebView

class AndroidDataLoader {
    constructor() {
        this.dataLoaded = false;
        this.cricketData = null;
    }

    // Load data using XMLHttpRequest instead of fetch for Android compatibility
    async loadCricketStats() {
        return new Promise((resolve, reject) => {
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', './cricket_stats.json', true);
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200 || xhr.status === 0) { // status 0 for file:// protocol
                            try {
                                const rawData = JSON.parse(xhr.responseText);
                                // Return raw data instead of converting it
                                // The main app will handle the conversion
                                resolve(rawData);
                            } catch (parseError) {
                                reject(parseError);
                            }
                        } else {
                            reject(new Error(`Failed to load: ${xhr.status}`));
                        }
                    }
                };
                xhr.send();
            } catch (error) {
                reject(error);
            }
        });
    }

    // Utility to convert schema-compliant JSON to app format with aggregation
    static convertStatsToAppData(statsData) {
        // Use the aggregator if available, otherwise fallback to basic conversion
        if (window.cricketStatsAggregator) {
            return window.cricketStatsAggregator.getAggregatedData();
        }
        
        // Fallback: Basic conversion without aggregation
        const players = [];
        const matches = [];
        const performanceData = [];

        if (Array.isArray(statsData.player_data)) {
            statsData.player_data.forEach(playerInfo => {
                players.push({
                    playerId: playerInfo.Player_ID,
                    name: playerInfo.Name,
                    battingStyle: playerInfo.Batting_Style,
                    bowlingStyle: playerInfo.Bowling_Style,
                    isStar: playerInfo.Is_Star,
                    lastUpdated: playerInfo.Last_Updated,
                    lastEditDate: playerInfo.Last_Edit_Date
                });
            });
        }
        if (Array.isArray(statsData.match_data)) {
            statsData.match_data.forEach(match => {
                matches.push({
                    matchId: match.Match_ID,
                    date: match.Date,
                    venue: match.Venue,
                    team1: match.Team1,
                    team2: match.Team2,
                    team1Captain: match.Team1_Captain,
                    team2Captain: match.Team2_Captain,
                    team1Composition: match.Team1_Composition,
                    team2Composition: match.Team2_Composition,
                    winningTeam: match.Winning_Team,
                    losingTeam: match.Losing_Team,
                    gameStartTime: match.Game_Start_Time,
                    gameFinishTime: match.Game_Finish_Time,
                    winningTeamScore: match.Winning_Team_Score,
                    losingTeamScore: match.Losing_Team_Score,
                    result: match.Result,
                    overs: match.Overs,
                    manOfTheMatch: match.Man_Of_The_Match
                });
            });
        }
        if (Array.isArray(statsData.performance_data)) {
            statsData.performance_data.forEach(perf => {
                performanceData.push({
                    matchId: perf.Match_ID,
                    playerId: perf.Player_ID,
                    notOuts: perf.notOuts,
                    runs: perf.runs,
                    ballsFaced: perf.ballsFaced,
                    fours: perf.fours,
                    sixes: perf.sixes,
                    ballsBowled: perf.ballsBowled,
                    runsConceded: perf.runsConceded,
                    wickets: perf.wickets,
                    extras: perf.extras,
                    maidenOvers: perf.maidenOvers,
                    isOut: perf.isOut,
                    dismissalType: perf.dismissalType,
                    dismissalBowler: perf.dismissalBowler,
                    dismissalFielder: perf.dismissalFielder
                });
            });
        }
        return { players, matches, performanceData };
    }

    // Alternative method using script tag injection for Android assets
    async loadCricketStatsViaScript() {
        return new Promise((resolve, reject) => {
            // For Android assets, we need to create a dynamic script that exposes the JSON data
            // Create a script element to load cricket_stats.js (we'll create this)
            const script = document.createElement('script');
            script.type = 'text/javascript';
            
            // Try to load the JSON data as a JavaScript variable
            script.onload = () => {
                // Check if data was loaded
                if (window.cricketStatsData) {
                    // Use aggregator if available
                    if (window.cricketStatsAggregator) {
                        resolve(window.cricketStatsAggregator.getAggregatedData());
                    } else {
                        resolve(window.cricketStatsData);
                    }
                } else {
                    reject(new Error('Cricket stats data not available via script'));
                }
            };
            
            script.onerror = () => {
                reject(new Error('Failed to load cricket stats script'));
            };
            
            // Set the script source to our JSON-as-JS file
            script.src = './cricket_stats.js';
            document.head.appendChild(script);
        });
    }

    // Main loading method with fallbacks
    async loadData() {
        if (this.dataLoaded && this.cricketData) {
            return this.cricketData;
        }

        // Try XMLHttpRequest first
        try {
            const rawData = await this.loadCricketStats();
            // Apply aggregation if data is raw JSON
            if (rawData && rawData.player_data && window.cricketStatsAggregator) {
                this.cricketData = window.cricketStatsAggregator.getAggregatedData();
            } else {
                this.cricketData = rawData;
            }
            this.dataLoaded = true;
            return this.cricketData;
        } catch (error) {
            }

        // Try script tag method
        try {
            this.cricketData = await this.loadCricketStatsViaScript();
            this.dataLoaded = true;
            return this.cricketData;
        } catch (error) {
            }

        // If all methods fail, return null (app will use sample data)
        return null;
    }
}

// Make it globally available
window.androidDataLoader = new AndroidDataLoader();
