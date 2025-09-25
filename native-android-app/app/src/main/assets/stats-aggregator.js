// Cricket Stats Aggregation Engine
// This module calculates all player statistics from the performance_data

class CricketStatsAggregator {
    constructor(statsData) {
        this.rawData = statsData;
        this.playerStats = new Map();
        this.matchStats = new Map();
        this.calculateAggregates();
    }

    calculateAggregates() {
        this.initializePlayers();
        this.processPerformanceData();
        this.calculateDerivedStats();
    }

    initializePlayers() {
        // Initialize player stats structure
        this.rawData.player_data.forEach(player => {
            this.playerStats.set(player.Player_ID, {
                // Basic Info
                playerId: player.Player_ID,
                name: player.Name,
                battingStyle: player.Batting_Style,
                bowlingStyle: player.Bowling_Style,
                isStar: player.Is_Star,
                lastUpdated: player.Last_Updated,
                
                // Batting Stats (will be calculated)
                matches: 0,
                innings: 0,
                notOuts: 0,
                runs: 0,
                ballsFaced: 0,
                fours: 0,
                sixes: 0,
                highestScore: 0,
                ducks: 0,
                centuries: 0,
                halfCenturies: 0,
                
                // Bowling Stats (will be calculated)
                bowlingMatches: 0,
                bowlingInnings: 0,
                ballsBowled: 0,
                runsConceded: 0,
                wickets: 0,
                maidenOvers: 0,
                fourWickets: 0,
                fiveWickets: 0,
                bestBowlingInnings: "N/A",
                
                // Fielding Stats
                catches: 0,
                runOuts: 0,
                stumpings: 0,
                
                // Match-by-match performance tracking
                matchPerformances: []
            });
        });
    }

    processPerformanceData() {
        this.rawData.performance_data.forEach(perf => {
            const player = this.playerStats.get(perf.Player_ID);
            if (!player) return;

            // Track this performance
            player.matchPerformances.push(perf);

            // Update batting stats
            this.updateBattingStats(player, perf);
            
            // Update bowling stats
            this.updateBowlingStats(player, perf);
            
            // Update fielding stats
            this.updateFieldingStats(player, perf);
        });
    }

    updateBattingStats(player, perf) {
        // Count matches and innings
        player.matches++;
        if (perf.ballsFaced > 0) {
            player.innings++;
        }

        // Batting aggregates
        player.notOuts += perf.notOuts;
        player.runs += perf.runs;
        player.ballsFaced += perf.ballsFaced;
        player.fours += perf.fours;
        player.sixes += perf.sixes;

        // Track highest score
        if (perf.runs > player.highestScore) {
            player.highestScore = perf.runs;
        }

        // Count special scores
        if (perf.runs === 0 && perf.isOut) {
            player.ducks++;
        }
        if (perf.runs >= 100) {
            player.centuries++;
        } else if (perf.runs >= 50) {
            player.halfCenturies++;
        }
    }

    updateBowlingStats(player, perf) {
        if (perf.ballsBowled > 0) {
            player.bowlingMatches++;
            player.bowlingInnings++;
            
            player.ballsBowled += perf.ballsBowled;
            player.runsConceded += perf.runsConceded;
            player.wickets += perf.wickets;
            player.maidenOvers += perf.maidenOvers;

            // Track best bowling figures
            if (perf.wickets > 0) {
                const currentFigures = `${perf.wickets}/${perf.runsConceded}`;
                if (this.isBetterBowlingFigures(perf.wickets, perf.runsConceded, player.bestBowlingInnings)) {
                    player.bestBowlingInnings = currentFigures;
                }

                // Count 4 and 5 wicket hauls
                if (perf.wickets >= 5) {
                    player.fiveWickets++;
                } else if (perf.wickets >= 4) {
                    player.fourWickets++;
                }
            }
        }
    }

    updateFieldingStats(player, perf) {
        // Count fielding contributions from dismissal data
        // This would need to be enhanced based on the dismissal tracking system
        if (perf.dismissalFielder === perf.Player_ID) {
            if (perf.dismissalType === "caught") {
                player.catches++;
            } else if (perf.dismissalType === "run out") {
                player.runOuts++;
            } else if (perf.dismissalType === "stumped") {
                player.stumpings++;
            }
        }
    }

    calculateDerivedStats() {
        this.playerStats.forEach((player, playerId) => {
            // Batting averages and rates
            player.battingAverage = this.calculateBattingAverage(player.runs, player.innings, player.notOuts);
            player.strikeRate = this.calculateStrikeRate(player.runs, player.ballsFaced);
            
            // Bowling averages and rates
            player.bowlingAverage = this.calculateBowlingAverage(player.runsConceded, player.wickets);
            player.economy = this.calculateEconomy(player.runsConceded, player.ballsBowled);
            player.bowlingStrikeRate = this.calculateBowlingStrikeRate(player.ballsBowled, player.wickets);
        });
    }

    // Batting Average = Runs / (Innings - Not Outs)
    calculateBattingAverage(runs, innings, notOuts) {
        const dismissals = innings - notOuts;
        return dismissals > 0 ? parseFloat((runs / dismissals).toFixed(2)) : 0;
    }

    // Strike Rate = (Runs / Balls Faced) * 100
    calculateStrikeRate(runs, ballsFaced) {
        return ballsFaced > 0 ? parseFloat(((runs / ballsFaced) * 100).toFixed(2)) : 0;
    }

    // Bowling Average = Runs Conceded / Wickets
    calculateBowlingAverage(runsConceded, wickets) {
        return wickets > 0 ? parseFloat((runsConceded / wickets).toFixed(2)) : 0;
    }

    // Economy Rate = (Runs Conceded / Balls Bowled) * 6
    calculateEconomy(runsConceded, ballsBowled) {
        return ballsBowled > 0 ? parseFloat(((runsConceded / ballsBowled) * 6).toFixed(2)) : 0;
    }

    // Bowling Strike Rate = Balls Bowled / Wickets
    calculateBowlingStrikeRate(ballsBowled, wickets) {
        return wickets > 0 ? parseFloat((ballsBowled / wickets).toFixed(2)) : 0;
    }

    isBetterBowlingFigures(wickets, runs, currentBest) {
        if (currentBest === "N/A") return true;
        
        const [currentWickets, currentRuns] = currentBest.split('/').map(Number);
        
        // More wickets is better
        if (wickets > currentWickets) return true;
        if (wickets < currentWickets) return false;
        
        // Same wickets, fewer runs is better
        return runs < currentRuns;
    }

    // Export aggregated data in app-compatible format
    getAggregatedData() {
        const players = Array.from(this.playerStats.values());
        return {
            players: players,
            matches: this.rawData.match_data,
            performanceData: this.rawData.performance_data,
            summary: this.calculateSummaryStats(players)
        };
    }

    calculateSummaryStats(players) {
        return {
            totalPlayers: players.length,
            totalMatches: this.rawData.match_data.length,
            totalRuns: players.reduce((sum, p) => sum + p.runs, 0),
            totalWickets: players.reduce((sum, p) => sum + p.wickets, 0),
            topScorer: this.findTopScorer(players),
            topWicketTaker: this.findTopWicketTaker(players),
            exportDate: new Date().toISOString()
        };
    }

    findTopScorer(players) {
        return players.reduce((top, player) => 
            player.runs > (top?.runs || 0) ? player : top, null);
    }

    findTopWicketTaker(players) {
        return players.reduce((top, player) => 
            player.wickets > (top?.wickets || 0) ? player : top, null);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CricketStatsAggregator;
} else {
    window.CricketStatsAggregator = CricketStatsAggregator;
}