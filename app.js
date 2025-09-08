// Cricket PWA - Complete Application Logic with BCCB Integration

// Simple message display function
function showMessage(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Try to show in UI if possible
    try {
        // Look for any existing message area or create a temporary alert
        const messageArea = document.getElementById('messageArea');
        if (messageArea) {
            messageArea.textContent = message;
            messageArea.className = `message ${type}`;
            setTimeout(() => {
                messageArea.textContent = '';
                messageArea.className = 'message';
            }, 3000);
        } else {
            // Fallback to console for now - we can enhance this later
            console.log(`MESSAGE (${type}): ${message}`);
        }
    } catch (e) {
        console.log(`MESSAGE (${type}): ${message}`);
    }
}

// TeamBalancer class based on BCCB team_balancer.py
class TeamBalancer {
    /**
     * Extracts the last name from a player's full name
     */
    getLastName(playerName) {
        const nameParts = playerName.trim().split(' ');
        return nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
    }

    /**
     * Calculates a numerical skill score for a player.
     */
    skillScore(player) {
        // Updated to use full words instead of abbreviations
        const battingScoreMap = { 'Reliable': 6, 'So-So': 3, 'Tailend': 1, 'R': 6, 'S': 3, 'U': 1 };
        const bowlingScoreMap = { 'Fast': 5, 'Medium': 3, 'DNB': 1 };

        const battingScore = battingScoreMap[player.battingStyle] || 0;
        const bowlingScore = bowlingScoreMap[player.bowlingStyle] || 0;

        return battingScore + bowlingScore;
    }

    /**
     * Balances two teams by explicitly separating star players and distributing
     * each group in a strict alternating draft.
     */
    balanceTeams(selectedPlayers, captain1, captain2, shouldShuffle = false) {
        const teamA = [captain1];
        const teamB = [captain2];

        const otherPlayers = selectedPlayers.filter(p => p.id !== captain1.id && p.id !== captain2.id);

        // 1. Separate players into two distinct lists
        const starPlayers = otherPlayers.filter(p => p.isStar || false);
        const regularPlayers = otherPlayers.filter(p => !p.isStar);

        // 2. Sort each list by skill score
        starPlayers.sort((a, b) => this.skillScore(b) - this.skillScore(a));
        regularPlayers.sort((a, b) => this.skillScore(b) - this.skillScore(a));

        // 3. Add shuffling for non-deterministic results during reshuffle
        if (shouldShuffle) {
            // Shuffle players with same skill scores to create variety
            this.shufflePlayersWithSameSkill(starPlayers);
            this.shufflePlayersWithSameSkill(regularPlayers);
        }

        // 4. Use a turn tracker for a strict alternating draft. 0 for Team A, 1 for Team B.
        // We start the turn based on which captain is weaker, to give them the first pick.
        let turn = this.skillScore(captain1) <= this.skillScore(captain2) ? 0 : 1;

        // 5. Distribute star players using the turn tracker
        for (const player of starPlayers) {
            if (turn === 0) {
                teamA.push(player);
                turn = 1; // Next turn is for Team B
            } else {
                teamB.push(player);
                turn = 0; // Next turn is for Team A
            }
        }

        // 6. CONTINUE the draft with regular players. The 'turn' variable correctly
        // remembers whose turn it is after the stars have been distributed.
        for (const player of regularPlayers) {
            if (turn === 0) {
                teamA.push(player);
                turn = 1;
            } else {
                teamB.push(player);
                turn = 0;
            }
        }

        // Final check to ensure teams have similar size, swapping the last player if grossly imbalanced.
        // This handles edge cases with odd numbers of players.
        while (Math.abs(teamA.length - teamB.length) > 1) {
            if (teamA.length > teamB.length) {
                const playerToMove = teamA.pop();
                teamB.push(playerToMove);
            } else {
                const playerToMove = teamB.pop();
                teamA.push(playerToMove);
            }
        }

        return { teamA, teamB };
    }

    /**
     * Shuffle players that have the same skill score to introduce variety
     */
    shufflePlayersWithSameSkill(players) {
        let i = 0;
        while (i < players.length) {
            let j = i;
            const currentSkill = this.skillScore(players[i]);
            
            // Find all players with the same skill score
            while (j < players.length && this.skillScore(players[j]) === currentSkill) {
                j++;
            }
            
            // Shuffle players with same skill score
            if (j - i > 1) {
                const sameSkillPlayers = players.slice(i, j);
                for (let k = sameSkillPlayers.length - 1; k > 0; k--) {
                    const randomIndex = Math.floor(Math.random() * (k + 1));
                    [sameSkillPlayers[k], sameSkillPlayers[randomIndex]] = [sameSkillPlayers[randomIndex], sameSkillPlayers[k]];
                }
                // Replace the original slice with shuffled players
                players.splice(i, j - i, ...sameSkillPlayers);
            }
            
            i = j;
        }
    }

    /**
     * Generate balanced teams with the BCCB algorithm
     */
    generateBalancedTeams(players) {
        if (players.length < 4) {
            throw new Error('Need at least 4 players to create teams');
        }

        // Get available players
        const availablePlayers = [...players];
        
        // Sort players by skill score
        const sortedPlayers = availablePlayers.sort((a, b) => this.skillScore(b) - this.skillScore(a));
        
        // Separate star players and regular players
        const starPlayers = sortedPlayers.filter(p => p.isStar);
        const regularPlayers = sortedPlayers.filter(p => !p.isStar);
        
        // Select captains (best players)
        const captain1 = starPlayers.length > 0 ? starPlayers[0] : regularPlayers[0];
        const captain2 = starPlayers.length > 1 ? starPlayers[1] : 
                         (regularPlayers[0] !== captain1 ? regularPlayers[0] : regularPlayers[1]);
        
        // Balance the teams using the BCCB algorithm
        const { teamA, teamB } = this.balanceTeams(availablePlayers, captain1, captain2);
        
        // Calculate team strengths
        const teamAStrength = teamA.reduce((sum, p) => sum + this.skillScore(p), 0);
        const teamBStrength = teamB.reduce((sum, p) => sum + this.skillScore(p), 0);

        return {
            teamA: {
                id: Date.now(),
                name: 'Team Lightning ⚡',
                captain: captain1.name,
                players: teamA,
                strength: teamAStrength,
                created: new Date().toISOString()
            },
            teamB: {
                id: Date.now() + 1,
                name: 'Team Thunder 🌩️',
                captain: captain2.name,
                players: teamB,
                strength: teamBStrength,
                created: new Date().toISOString()
            }
        };
    }
}

// AnalyticsEngine class based on BCCB PlayerAnalyticsScreen
class AnalyticsEngine {
    constructor() {
        this.sortOptions = {
            'runs': 'Sort by Runs',
            'average': 'Sort by Average', 
            'strike_rate': 'Sort by Strike Rate',
            'wickets': 'Sort by Wickets',
            'economy': 'Sort by Economy',
            'bowling_average': 'Sort by Bowling Average',
            'matches': 'Sort by Matches Played',
            'highest_score': 'Sort by Highest Score'
        };
        
        // Advanced statistical modeling parameters
        this.modelingConfig = {
            // Weight factors for performance calculation
            battingWeights: {
                runs: 0.3,
                average: 0.25,
                strikeRate: 0.2,
                consistency: 0.15,
                boundaries: 0.1
            },
            bowlingWeights: {
                wickets: 0.35,
                economy: 0.25,
                average: 0.2,
                strikeRate: 0.15,
                consistency: 0.05
            },
            // Form calculation parameters
            formAnalysis: {
                recentMatchesWeight: 0.6,
                overallWeight: 0.4,
                trendSensitivity: 0.3
            },
            // Statistical thresholds
            thresholds: {
                minMatchesForAverage: 3,
                excellentBattingAverage: 35,
                excellentStrikeRate: 130,
                excellentEconomy: 6.5,
                excellentBowlingAverage: 20
            }
        };
    }

    /**
     * Sort players by various statistics
     */
    sortPlayersByStat(players, stat) {
        const sortedPlayers = [...players];
        
        switch(stat) {
            case 'runs':
                return sortedPlayers.sort((a, b) => (b.runs || 0) - (a.runs || 0));
            case 'average':
                return sortedPlayers.sort((a, b) => (b.battingAverage || 0) - (a.battingAverage || 0));
            case 'strike_rate':
                return sortedPlayers.sort((a, b) => (b.strikeRate || 0) - (a.strikeRate || 0));
            case 'wickets':
                return sortedPlayers.sort((a, b) => (b.wickets || 0) - (a.wickets || 0));
            case 'economy':
                return sortedPlayers.sort((a, b) => (a.economy || 999) - (b.economy || 999)); // Lower is better
            case 'bowling_average':
                return sortedPlayers.sort((a, b) => (a.bowlingAverage || 999) - (b.bowlingAverage || 999)); // Lower is better
            case 'matches':
                return sortedPlayers.sort((a, b) => (b.matches || 0) - (a.matches || 0));
            case 'highest_score':
                return sortedPlayers.sort((a, b) => (b.highestScore || 0) - (a.highestScore || 0));
            default:
                return sortedPlayers.sort((a, b) => (b.runs || 0) - (a.runs || 0));
        }
    }

    /**
     * Get top performers in different categories
     */
    getTopPerformers(players) {
        const activePlayersWithStats = players.filter(p => (p.matches || 0) > 0);
        
        if (activePlayersWithStats.length === 0) {
            return {
                topBatsman: null,
                topBowler: null,
                topAllrounder: null,
                mostMatches: null
            };
        }

        return {
            topBatsman: this.sortPlayersByStat(activePlayersWithStats, 'runs')[0],
            topBowler: this.sortPlayersByStat(activePlayersWithStats.filter(p => (p.wickets || 0) > 0), 'wickets')[0],
            topAllrounder: activePlayersWithStats.find(p => p.role === 'allrounder' && (p.runs || 0) > 0 && (p.wickets || 0) > 0),
            mostMatches: this.sortPlayersByStat(activePlayersWithStats, 'matches')[0]
        };
    }

    /**
     * Calculate team statistics
     */
    calculateTeamStats(team) {
        if (!team || !team.players) return null;

        const players = team.players;
        const totalRuns = players.reduce((sum, p) => sum + (p.runs || 0), 0);
        const totalWickets = players.reduce((sum, p) => sum + (p.wickets || 0), 0);
        const avgBattingAvg = players.reduce((sum, p) => sum + (p.battingAverage || 0), 0) / players.length;
        const avgEconomy = players.filter(p => (p.economy || 0) > 0).reduce((sum, p) => sum + p.economy, 0) / players.filter(p => (p.economy || 0) > 0).length || 0;

        return {
            name: team.name,
            captain: team.captain,
            totalPlayers: players.length,
            totalRuns: totalRuns,
            totalWickets: totalWickets,
            avgBattingAverage: avgBattingAvg.toFixed(2),
            avgEconomy: avgEconomy.toFixed(2),
            strength: team.strength || 0
        };
    }

    /**
     * Generate player comparison data (simplified spider chart data)
     */
    generatePlayerComparison(player1, player2) {
        if (!player1 || !player2) return null;

        const metrics = [
            { name: 'Runs', key: 'runs', max: 1000 },
            { name: 'Average', key: 'battingAverage', max: 100 },
            { name: 'Strike Rate', key: 'strikeRate', max: 200 },
            { name: 'Wickets', key: 'wickets', max: 50 },
            { name: 'Economy', key: 'economy', max: 10, invert: true }, // Lower is better
            { name: 'Matches', key: 'matches', max: 50 }
        ];

        const player1Data = metrics.map(metric => {
            let value = player1[metric.key] || 0;
            if (metric.invert) {
                value = metric.max - value; // For economy, invert so lower is better
            }
            return {
                metric: metric.name,
                value: Math.min(value / metric.max * 100, 100) // Normalize to 0-100
            };
        });

        const player2Data = metrics.map(metric => {
            let value = player2[metric.key] || 0;
            if (metric.invert) {
                value = metric.max - value;
            }
            return {
                metric: metric.name,
                value: Math.min(value / metric.max * 100, 100)
            };
        });

        return {
            player1: { name: player1.name, data: player1Data },
            player2: { name: player2.name, data: player2Data },
            metrics: metrics.map(m => m.name)
        };
    }

    /**
     * Get comprehensive statistics for all players
     */
    getPlayerStatistics(players, sortBy = 'runs') {
        const sortedPlayers = this.sortPlayersByStat(players, sortBy);
        const topPerformers = this.getTopPerformers(players);
        
        return {
            players: sortedPlayers,
            topPerformers: topPerformers,
            totalPlayers: players.length,
            activePlayers: players.filter(p => (p.matches || 0) > 0).length,
            sortedBy: this.sortOptions[sortBy] || 'Sort by Runs'
        };
    }

    /**
     * Advanced Statistical Modeling - Performance Prediction
     */
    calculateAdvancedMetrics(players, matches = []) {
        return players.map(player => {
            const advanced = {
                ...player,
                // Performance Rating (0-100 scale)
                performanceRating: this.calculatePerformanceRating(player),
                // Form Index (recent performance trend)
                formIndex: this.calculateFormIndex(player, matches),
                // Consistency Score
                consistencyScore: this.calculateConsistencyScore(player),
                // Match Impact Score
                matchImpactScore: this.calculateMatchImpactScore(player),
                // Predictive Performance Score
                predictiveScore: this.calculatePredictiveScore(player, matches),
                // Role Effectiveness
                roleEffectiveness: this.calculateRoleEffectiveness(player),
                // Pressure Performance Index
                pressureIndex: this.calculatePressurePerformanceIndex(player, matches)
            };
            
            return advanced;
        });
    }

    calculatePerformanceRating(player) {
        const batting = this.calculateBattingRating(player);
        const bowling = this.calculateBowlingRating(player);
        const fielding = this.calculateFieldingRating(player);
        
        // Weight based on player role
        let weights = { batting: 0.4, bowling: 0.4, fielding: 0.2 };
        
        switch(player.role) {
            case 'batsman':
                weights = { batting: 0.7, bowling: 0.1, fielding: 0.2 };
                break;
            case 'bowler':
                weights = { batting: 0.1, bowling: 0.7, fielding: 0.2 };
                break;
            case 'allrounder':
                weights = { batting: 0.45, bowling: 0.45, fielding: 0.1 };
                break;
            case 'wicket-keeper':
                weights = { batting: 0.5, bowling: 0.1, fielding: 0.4 };
                break;
        }
        
        const overall = (batting * weights.batting + bowling * weights.bowling + fielding * weights.fielding);
        return Math.min(Math.max(overall, 0), 100); // Clamp between 0-100
    }

    calculateBattingRating(player) {
        const runs = player.runs || 0;
        const matches = player.matches || 0;
        const balls = player.ballsFaced || Math.max(1, runs); // Estimate if not available
        
        if (matches === 0) return 0;
        
        const average = runs / matches;
        const strikeRate = (runs / balls) * 100;
        const highScore = player.highestScore || 0;
        const boundaries = (player.fours || 0) + (player.sixes || 0);
        const consistency = this.calculateBattingConsistency(player);
        
        // Normalize components (0-100 scale)
        const avgScore = Math.min((average / this.modelingConfig.thresholds.excellentBattingAverage) * 100, 100);
        const srScore = Math.min((strikeRate / this.modelingConfig.thresholds.excellentStrikeRate) * 100, 100);
        const hsScore = Math.min((highScore / 100) * 100, 100);
        const boundaryScore = Math.min((boundaries / matches / 8) * 100, 100); // 8 boundaries per match is excellent
        const consistencyScore = consistency * 100;
        
        // Weighted combination
        const weights = this.modelingConfig.battingWeights;
        return (avgScore * weights.average + srScore * weights.strikeRate + 
                hsScore * 0.1 + boundaryScore * weights.boundaries + 
                consistencyScore * weights.consistency);
    }

    calculateBowlingRating(player) {
        const wickets = player.wickets || 0;
        const runs = player.bowlingRuns || 0;
        const balls = player.bowlingBalls || Math.max(1, wickets * 20); // Estimate
        const matches = player.matches || 0;
        
        if (matches === 0 || wickets === 0) return 0;
        
        const average = runs / wickets;
        const economy = (runs / (balls / 6));
        const strikeRate = balls / wickets;
        const wicketsPerMatch = wickets / matches;
        const consistency = this.calculateBowlingConsistency(player);
        
        // Normalize components (0-100 scale, lower is better for average/economy/SR)
        const avgScore = Math.max(100 - (average / this.modelingConfig.thresholds.excellentBowlingAverage) * 100, 0);
        const ecoScore = Math.max(100 - (economy / this.modelingConfig.thresholds.excellentEconomy) * 100, 0);
        const srScore = Math.max(100 - (strikeRate / 25) * 100, 0); // 25 balls per wicket is excellent
        const wpmScore = Math.min((wicketsPerMatch / 3) * 100, 100); // 3 wickets per match is excellent
        const consistencyScore = consistency * 100;
        
        // Weighted combination
        const weights = this.modelingConfig.bowlingWeights;
        return (wpmScore * weights.wickets + ecoScore * weights.economy + 
                avgScore * weights.average + srScore * weights.strikeRate + 
                consistencyScore * weights.consistency);
    }

    calculateFieldingRating(player) {
        // Simplified fielding rating based on role and estimated catches
        const catches = player.catches || 0;
        const runOuts = player.runOuts || 0;
        const stumpings = player.stumpings || 0;
        const matches = player.matches || 1;
        
        const catchesPerMatch = catches / matches;
        const dismissalsPerMatch = (catches + runOuts + stumpings) / matches;
        
        // Role-based expectations
        let expectedCatches = 0.3; // General fielder
        if (player.role === 'wicket-keeper') expectedCatches = 1.5;
        if (player.role === 'bowler') expectedCatches = 0.2;
        
        const fieldingScore = Math.min((dismissalsPerMatch / expectedCatches) * 100, 100);
        return fieldingScore || 50; // Default average fielding
    }

    calculateFormIndex(player, matches) {
        // Analyze recent performance trend
        const recentMatches = matches.filter(m => 
            [...(m.team1?.players || []), ...(m.team2?.players || [])]
                .some(p => p.name === player.name)
        ).slice(-5); // Last 5 matches
        
        if (recentMatches.length < 2) return 50; // Neutral form
        
        let recentPerformance = [];
        recentMatches.forEach(match => {
            const playerInMatch = [...(match.team1?.players || []), ...(match.team2?.players || [])]
                .find(p => p.name === player.name);
            
            if (playerInMatch) {
                const battingScore = this.calculateMatchBattingScore(playerInMatch);
                const bowlingScore = this.calculateMatchBowlingScore(playerInMatch);
                recentPerformance.push(battingScore + bowlingScore);
            }
        });
        
        if (recentPerformance.length < 2) return 50;
        
        // Calculate trend (improving/declining)
        const trend = this.calculateTrend(recentPerformance);
        const recentAvg = recentPerformance.reduce((a, b) => a + b, 0) / recentPerformance.length;
        
        // Form index: 0-100 (50 = average form)
        return Math.min(Math.max(recentAvg + (trend * 20), 0), 100);
    }

    calculateConsistencyScore(player) {
        // Measure how consistently a player performs
        const matches = player.matches || 0;
        if (matches < 3) return 0.5; // Not enough data
        
        const battingConsistency = this.calculateBattingConsistency(player);
        const bowlingConsistency = this.calculateBowlingConsistency(player);
        
        // Weight based on role
        switch(player.role) {
            case 'batsman':
                return battingConsistency;
            case 'bowler':
                return bowlingConsistency;
            case 'allrounder':
                return (battingConsistency + bowlingConsistency) / 2;
            default:
                return (battingConsistency + bowlingConsistency) / 2;
        }
    }

    calculateBattingConsistency(player) {
        // Simplified consistency: ratio of average to highest score
        const avg = player.matches > 0 ? (player.runs || 0) / player.matches : 0;
        const highScore = player.highestScore || Math.max(avg * 1.5, 1);
        
        // More consistent players have average closer to highest score
        return Math.min(avg / highScore, 1);
    }

    calculateBowlingConsistency(player) {
        // Simplified: based on economy rate stability
        const economy = player.bowlingBalls > 0 ? 
            (player.bowlingRuns || 0) / ((player.bowlingBalls || 1) / 6) : 0;
        const wickets = player.wickets || 0;
        const matches = player.matches || 1;
        
        if (wickets === 0) return 0.3;
        
        // Consistent bowlers maintain good economy while taking wickets
        const wicketsPerMatch = wickets / matches;
        const economyEfficiency = Math.max(0, (10 - economy) / 10); // Better economy = higher score
        
        return Math.min((wicketsPerMatch * economyEfficiency) / 2, 1);
    }

    calculateMatchImpactScore(player) {
        // How much impact player has on match outcomes
        const runs = player.runs || 0;
        const wickets = player.wickets || 0;
        const matches = player.matches || 1;
        
        // Impact factors
        const runImpact = runs / matches / 30; // 30 runs per match = significant impact
        const wicketImpact = wickets / matches / 2; // 2 wickets per match = significant impact
        const roleMultiplier = this.getRoleMultiplier(player.role);
        
        const impact = (runImpact + wicketImpact) * roleMultiplier;
        return Math.min(impact * 100, 100);
    }

    calculatePredictiveScore(player, matches) {
        // Predict future performance based on trends and form
        const performanceRating = this.calculatePerformanceRating(player);
        const formIndex = this.calculateFormIndex(player, matches);
        const consistency = this.calculateConsistencyScore(player) * 100;
        
        // Weighted prediction
        const weights = this.modelingConfig.formAnalysis;
        const predictive = (performanceRating * weights.overallWeight + 
                          formIndex * weights.recentMatchesWeight + 
                          consistency * weights.trendSensitivity);
        
        return Math.min(Math.max(predictive, 0), 100);
    }

    calculateRoleEffectiveness(player) {
        // How well player performs in their designated role
        const rating = this.calculatePerformanceRating(player);
        const roleExpectation = this.getRoleExpectedPerformance(player.role);
        
        return Math.min((rating / roleExpectation) * 100, 100);
    }

    calculatePressurePerformanceIndex(player, matches) {
        // Simplified pressure performance (would need match context data)
        // For now, use consistency as proxy for pressure handling
        const consistency = this.calculateConsistencyScore(player);
        const experience = Math.min((player.matches || 0) / 20, 1); // 20 matches = experienced
        
        return (consistency * 0.7 + experience * 0.3) * 100;
    }

    // Helper methods
    calculateMatchBattingScore(playerInMatch) {
        const runs = playerInMatch.matchRuns || 0;
        const balls = playerInMatch.matchBalls || Math.max(1, runs);
        const sr = (runs / balls) * 100;
        
        return Math.min((runs / 30) * 50 + (sr / 150) * 50, 100);
    }

    calculateMatchBowlingScore(playerInMatch) {
        const wickets = playerInMatch.matchBowlingWickets || 0;
        const runs = playerInMatch.matchBowlingRuns || 0;
        const balls = playerInMatch.matchBowlingBalls || Math.max(1, wickets * 6);
        const economy = runs / (balls / 6);
        
        if (wickets === 0) return 0;
        
        return Math.min(wickets * 25 + Math.max(0, (8 - economy)) * 5, 100);
    }

    calculateTrend(values) {
        if (values.length < 2) return 0;
        
        let trend = 0;
        for (let i = 1; i < values.length; i++) {
            trend += values[i] - values[i-1];
        }
        
        return trend / (values.length - 1) / 100; // Normalize
    }

    getRoleMultiplier(role) {
        const multipliers = {
            'batsman': 1.2,
            'bowler': 1.2,
            'allrounder': 1.0,
            'wicket-keeper': 1.1
        };
        return multipliers[role] || 1.0;
    }

    getRoleExpectedPerformance(role) {
        const expectations = {
            'batsman': 60,
            'bowler': 60,
            'allrounder': 55,
            'wicket-keeper': 50
        };
        return expectations[role] || 50;
    }

    /**
     * Machine Learning Style Clustering of Players
     */
    clusterPlayersByPerformance(players) {
        const advancedMetrics = this.calculateAdvancedMetrics(players);
        
        // Simple k-means style clustering into performance tiers
        const clusters = {
            elite: [], // Top 20%
            good: [],  // Next 30%
            average: [], // Middle 30%
            developing: [] // Bottom 20%
        };
        
        const sortedByRating = advancedMetrics.sort((a, b) => 
            (b.performanceRating || 0) - (a.performanceRating || 0)
        );
        
        const total = sortedByRating.length;
        const eliteCount = Math.max(1, Math.floor(total * 0.2));
        const goodCount = Math.max(1, Math.floor(total * 0.3));
        const averageCount = Math.max(1, Math.floor(total * 0.3));
        
        clusters.elite = sortedByRating.slice(0, eliteCount);
        clusters.good = sortedByRating.slice(eliteCount, eliteCount + goodCount);
        clusters.average = sortedByRating.slice(eliteCount + goodCount, eliteCount + goodCount + averageCount);
        clusters.developing = sortedByRating.slice(eliteCount + goodCount + averageCount);
        
        return clusters;
    }

    /**
     * Generate Performance Insights using Statistical Analysis
     */
    generatePerformanceInsights(players, matches) {
        const advancedMetrics = this.calculateAdvancedMetrics(players, matches);
        const clusters = this.clusterPlayersByPerformance(players);
        
        const insights = {
            topPerformers: clusters.elite,
            emergingTalents: this.identifyEmergingTalents(advancedMetrics),
            formPlayers: this.identifyInFormPlayers(advancedMetrics),
            consistentPerformers: this.identifyConsistentPerformers(advancedMetrics),
            teamBalance: this.analyzeTeamBalance(players),
            recommendations: this.generateRecommendations(advancedMetrics, clusters)
        };
        
        return insights;
    }

    identifyEmergingTalents(metrics) {
        // Players with high form index but lower overall rating (potential)
        return metrics.filter(p => 
            (p.formIndex || 0) > 70 && 
            (p.performanceRating || 0) < 60 &&
            (p.matches || 0) < 10
        ).slice(0, 5);
    }

    identifyInFormPlayers(metrics) {
        // Players currently in excellent form
        return metrics.filter(p => (p.formIndex || 0) > 75)
            .sort((a, b) => (b.formIndex || 0) - (a.formIndex || 0))
            .slice(0, 5);
    }

    identifyConsistentPerformers(metrics) {
        // Players with high consistency scores
        return metrics.filter(p => (p.consistencyScore || 0) > 70)
            .sort((a, b) => (b.consistencyScore || 0) - (a.consistencyScore || 0))
            .slice(0, 5);
    }

    analyzeTeamBalance(players) {
        const roleCount = {};
        players.forEach(p => {
            roleCount[p.role] = (roleCount[p.role] || 0) + 1;
        });
        
        // Ideal team composition
        const ideal = {
            batsman: 5,
            bowler: 4,
            allrounder: 2,
            'wicket-keeper': 1
        };
        
        const balance = {};
        Object.keys(ideal).forEach(role => {
            const current = roleCount[role] || 0;
            const target = ideal[role];
            balance[role] = {
                current,
                target,
                difference: current - target,
                status: current === target ? 'balanced' : 
                       current > target ? 'excess' : 'deficit'
            };
        });
        
        return balance;
    }

    generateRecommendations(metrics, clusters) {
        const recommendations = [];
        
        // Team selection recommendations
        if (clusters.elite.length > 0) {
            recommendations.push({
                type: 'team_selection',
                priority: 'high',
                message: `Consider ${clusters.elite[0].name} as captain - highest performance rating (${clusters.elite[0].performanceRating?.toFixed(1)})`
            });
        }
        
        // Form-based recommendations
        const inFormPlayers = metrics.filter(p => (p.formIndex || 0) > 70);
        if (inFormPlayers.length > 0) {
            recommendations.push({
                type: 'form_selection',
                priority: 'medium',
                message: `${inFormPlayers[0].name} is in excellent form - consider for key matches`
            });
        }
        
        // Development recommendations
        const developingPlayers = clusters.developing.filter(p => (p.matches || 0) < 5);
        if (developingPlayers.length > 0) {
            recommendations.push({
                type: 'development',
                priority: 'low',
                message: `Give more opportunities to ${developingPlayers[0].name} for development`
            });
        }
        
        return recommendations;
    }
}

class CricketApp {
    constructor() {
        this.currentView = 'home';
        this.players = [];
        this.teams = [];
        this.matches = [];
        this.currentMatch = null;
        this.waitingForBowlerSelection = false; // Flag to prevent actions during bowler selection
        this.analytics = new AnalyticsEngine();
        this.teamBalancer = new TeamBalancer();
        
        // Initialize data manager for CSV/JSON integration
        this.dataManager = new CricketDataManager();
        
        this.init();
    }

    async init() {
        this.updateGreeting();
        
        // Load data from CSV/JSON
        await this.loadDataFromManager();
        
        this.updateStats();
        this.loadPlayers();
        this.loadTeams();
        
        // Add debug functions to window for easy console access
        window.debugBowlerSelection = () => this.debugBowlerSelection();
        window.debugTestButton = () => this.debugTestButtonClick();
        window.debugForceReset = () => this.debugForceResetBowlerSelection();
        window.debugAppState = () => this.debugAppState();
        window.debugPlayerData = () => this.debugPlayerData();
        window.debugEditModal = (playerId) => this.debugEditModal(playerId);
        window.importCricketData = () => this.importCricketData();
        window.showStorageInfo = () => this.showStorageInfo();
        window.testMergeData = () => this.testMergeData();
        window.previewExportData = () => this.previewExportData();
        
        // Update greeting every minute
        setInterval(() => this.updateGreeting(), 60000);
        
        // Initialize with BCCB data if empty or force reload for testing
        if (this.players.length === 0) {
            console.log('📊 Loading BCCB player data...');
            this.initSampleData();
        } else {
            console.log(`✅ Found ${this.players.length} existing players`);
            this.showNotification(`📱 ${this.players.length} players ready`);
        }
    }

    async loadDataFromManager() {
        try {
            // Check if running as offline/APK version first
            const isOfflineApp = !window.location.href.startsWith('http://localhost');
            
            if (isOfflineApp) {
                // For APK/PWA: Try to load from localStorage first
                const localData = await this.loadFromLocalStorage();
                if (localData && localData.players && localData.players.length > 0) {
                    this.players = localData.players;
                    this.matches = localData.matches || [];
                    this.teams = localData.teams || [];
                    this.showNotification(`✅ Loaded ${this.players.length} players from local storage`);
                    return;
                }
            }
            
            // Wait for data manager to initialize
            if (this.dataManager.initializeDataManager) {
                await this.dataManager.initializeDataManager();
            }
            
            // Try to load data directly from JSON files first
            const jsonData = await this.dataManager.loadJSONData();
            if (jsonData && jsonData.players && jsonData.players.length > 0) {
                this.players = jsonData.players;
                this.matches = jsonData.matches || [];
                this.teams = jsonData.teams || [];
                
                // Save to consolidated localStorage format
                this.saveData(false);
                
                this.showNotification(`✅ Loaded ${this.players.length} players from JSON data`);
                return;
            }
            
            // Fallback: load from CSV and convert
            const csvData = await this.dataManager.loadCSVData();
            if (csvData && csvData.players && csvData.players.length > 0) {
                this.players = csvData.players;
                this.matches = csvData.matches || [];
                this.teams = csvData.teams || [];
                
                // Save to consolidated localStorage format
                this.saveData(false);
                
                this.showNotification(`✅ Loaded ${this.players.length} players from CSV data`);
                return;
            }
            
            // Final fallback: try to load from localStorage
            const localData = await this.loadFromLocalStorage();
            if (localData) {
                this.players = localData.players;
                this.matches = localData.matches || [];
                this.teams = localData.teams || [];
                this.showNotification(`✅ Loaded ${this.players.length} players from local storage`);
            } else {
                // No data found anywhere, will need to initialize sample data
                this.players = [];
                this.matches = [];
                this.teams = [];
            }
            
            this.currentMatch = JSON.parse(localStorage.getItem('cricket-current-match') || 'null');
            
        } catch (error) {
            console.error('Error loading data from manager:', error);
            // Fallback to loadFromLocalStorage method
            const localData = await this.loadFromLocalStorage();
            if (localData) {
                this.players = localData.players;
                this.matches = localData.matches || [];
                this.teams = localData.teams || [];
            } else {
                this.players = [];
                this.matches = [];
                this.teams = [];
            }
            this.currentMatch = JSON.parse(localStorage.getItem('cricket-current-match') || 'null');
        }
    }

    // Load data from localStorage (for APK/offline version)
    async loadFromLocalStorage() {
        try {
            // Try to load from consolidated cricket-stats format first
            const consolidatedStats = localStorage.getItem('cricket-stats');
            if (consolidatedStats) {
                const data = JSON.parse(consolidatedStats);
                if (data.players && data.players.length > 0) {
                    console.log(`✅ Loaded ${data.players.length} players and ${data.matches.length} matches from consolidated cricket-stats`);
                    return data;
                }
            }

            // Try to load from saved cricket_stats.json format
            const cricketStatsJson = localStorage.getItem('cricket_stats_json');
            if (cricketStatsJson) {
                const data = JSON.parse(cricketStatsJson);
                if (data.player_info && data.player_info.length > 0) {
                    // Convert cricket_stats format to app format
                    const players = data.player_info.map(playerInfo => ({
                        id: parseInt(playerInfo.Player_ID.replace('P', '')),
                        name: playerInfo.Name,
                        bowling: playerInfo.Bowling_Style,
                        batting: playerInfo.Batting_Style,
                        is_star: playerInfo.Is_Star,
                        last_updated: playerInfo.Last_Updated,
                        // Add default values for other fields
                        skill: 5,
                        role: this.dataManager?.determineRole ? this.dataManager.determineRole(playerInfo.Batting_Style, playerInfo.Bowling_Style) : 'allrounder',
                        matches: 0,
                        runs: 0,
                        wickets: 0
                    }));
                    
                    // Convert matches from cricket_stats format
                    const matches = (data.matches || []).map(match => ({
                        id: match.Match_ID,
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
                        matchType: match.Match_Type,
                        completed: match.Status === 'Completed',
                        // Convert batting and bowling performance
                        battingPerformances: (data.match_batting_performance || [])
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
                        bowlingPerformances: (data.match_bowling_performance || [])
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
                    }));
                    
                    const teams = JSON.parse(localStorage.getItem('cricket-teams') || '[]');
                    
                    console.log(`✅ Loaded ${players.length} players and ${matches.length} matches from saved cricket_stats.json`);
                    return { players, matches, teams };
                }
            }
            
            // Fallback to regular localStorage
            const players = JSON.parse(localStorage.getItem('cricket-players') || '[]');
            const matches = JSON.parse(localStorage.getItem('cricket-matches') || '[]');
            const teams = JSON.parse(localStorage.getItem('cricket-teams') || '[]');
            
            if (players.length > 0) {
                console.log(`✅ Loaded ${players.length} players from regular localStorage`);
                return { players, matches, teams };
            }
            
            return null;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    }

    initSampleData() {
        // BCCB Real Player Data (converted from CSV)
        const bccbPlayers = [
            {
                id: 1,
                name: "Anuj",
                skill: 8,
                role: "allrounder",
                matches: 15,
                innings: 14,
                notOuts: 2,
                runs: 345,
                highestScore: 67,
                battingAverage: 28.75,
                ballsFaced: 278,
                strikeRate: 124.1,
                centuries: 0,
                halfCenturies: 1,
                ducks: 0,
                fours: 42,
                sixes: 8,
                wickets: 18,
                bestBowlingInnings: "4/23",
                bowlingAverage: 8.67,
                economy: 6.5,
                bowlingStrikeRate: 8.0,
                ballsBowled: 144, // 18 wickets * 8 balls/wicket = 144 balls = 24 overs
                runsConceded: 156, // 24 overs * 6.5 economy = 156 runs
                fourWickets: 1,
                fiveWickets: 0,
                battingStyle: "R",
                bowlingStyle: "Fast",
                isStar: true,
                boundaries: { fours: 42, sixes: 8 },
                created: "2025-01-09T01:00:00.000Z"
            },
            {
                id: 2,
                name: "Anil",
                skill: 6,
                role: "batsman",
                matches: 12,
                innings: 11,
                notOuts: 1,
                runs: 234,
                highestScore: 45,
                battingAverage: 23.4,
                ballsFaced: 198,
                strikeRate: 118.18,
                centuries: 0,
                halfCenturies: 0,
                ducks: 1,
                fours: 28,
                sixes: 4,
                wickets: 0,
                bowlingAverage: 0,
                economy: 0,
                bowlingStrikeRate: 0,
                ballsBowled: 0,
                runsConceded: 0,
                battingStyle: "S",
                bowlingStyle: "DNB",
                isStar: false,
                boundaries: { fours: 28, sixes: 4 },
                created: "2025-01-09T01:00:00.000Z"
            },
            {
                id: 3,
                name: "Vivek",
                skill: 7,
                role: "bowler",
                matches: 10,
                innings: 8,
                notOuts: 3,
                runs: 45,
                highestScore: 18,
                battingAverage: 9.0,
                ballsFaced: 67,
                strikeRate: 67.16,
                centuries: 0,
                halfCenturies: 0,
                ducks: 2,
                fours: 4,
                sixes: 1,
                wickets: 15,
                bestBowlingInnings: "3/12",
                bowlingAverage: 8.93,
                economy: 4.47,
                bowlingStrikeRate: 12.0,
                ballsBowled: 180, // 15 wickets * 12 balls/wicket = 180 balls = 30 overs
                runsConceded: 134, // 30 overs * 4.47 economy = 134 runs
                battingStyle: "U",
                bowlingStyle: "Medium",
                isStar: false,
                boundaries: { fours: 4, sixes: 1 },
                created: "2025-01-09T01:00:00.000Z"
            }
        ];
        
        this.players = bccbPlayers;
        this.saveData(false); // Only save locally when loading BCCB players
        this.updateStats();
        this.loadPlayers();
        this.showNotification(`✅ Loaded ${this.players.length} BCCB players!`);
    }

    updateGreeting() {
        const now = new Date();
        const hour = now.getHours();
        const greetingEl = document.getElementById('greeting');
        const dateEl = document.getElementById('date');
        
        let greeting = '';
        if (hour < 12) {
            greeting = 'Good Morning! 🌅';
        } else if (hour < 17) {
            greeting = 'Good Afternoon! ☀️';
        } else {
            greeting = 'Good Evening! 🌙';
        }
        
        greetingEl.textContent = greeting;
        dateEl.textContent = `Ready to play cricket? • ${now.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        })}`;
    }

    getUniqueCaptainsCount() {
        const captains = new Set();
        
        this.matches.forEach(match => {
            // Extract captain names from different possible formats
            const team1Captain = match.Team1_Captain || match.team1Captain || match.captain1 || 
                               (match.team1 && match.team1.captain);
            const team2Captain = match.Team2_Captain || match.team2Captain || match.captain2 || 
                               (match.team2 && match.team2.captain);
            
            if (team1Captain) captains.add(team1Captain);
            if (team2Captain) captains.add(team2Captain);
        });
        
        return captains.size;
    }

    updateStats() {
        const playerCountEl = document.getElementById('playerCount');
        const captainCountEl = document.getElementById('captainCount');
        const matchCountEl = document.getElementById('matchCount');
        
        if (playerCountEl) playerCountEl.textContent = this.players.length;
        if (captainCountEl) captainCountEl.textContent = this.getUniqueCaptainsCount();
        if (matchCountEl) matchCountEl.textContent = this.matches.length;
        
        // Update match format display
        const matchSettings = JSON.parse(localStorage.getItem('match-settings') || '{}');
        const totalOvers = matchSettings.totalOvers || 20;
        const matchFormatEl = document.getElementById('matchFormat');
        if (matchFormatEl) {
            matchFormatEl.textContent = totalOvers;
        }
        
        // Update button states (only if elements exist)
        const teamsBtn = document.getElementById('teamsBtn');
        const scoringBtn = document.getElementById('scoringBtn');
        
        if (teamsBtn && typeof teamsBtn.disabled !== 'undefined') {
            try {
                if (this.players.length < 4) {
                    teamsBtn.disabled = true;
                    if (teamsBtn.style) teamsBtn.style.opacity = '0.5';
                } else {
                    teamsBtn.disabled = false;
                    if (teamsBtn.style) teamsBtn.style.opacity = '1';
                }
            } catch (error) {
                console.error('Error updating teamsBtn:', error);
            }
        }
        
        if (scoringBtn && typeof scoringBtn.disabled !== 'undefined') {
            try {
                if (this.teams.length < 2) {
                    scoringBtn.disabled = true;
                    if (scoringBtn.style) scoringBtn.style.opacity = '0.5';
                } else {
                    scoringBtn.disabled = false;
                    if (scoringBtn.style) scoringBtn.style.opacity = '1';
                }
            } catch (error) {
                console.error('Error updating scoringBtn:', error);
            }
        }
    }

    // Save data locally and optionally to JSON
    // saveToJSON: true for permanent saves (player/team creation, match completion, imports)
    // saveToJSON: false for temporary saves during match play
    saveData(saveToJSON = true) {
        // Create consolidated data structure
        const consolidatedData = {
            player_info: this.players.map(player => ({
                Player_ID: player.id || `P${Date.now()}`,
                Name: player.name,
                Bowling_Style: player.bowlingStyle || 'Medium',
                Batting_Style: player.battingStyle || 'Reliable',
                Is_Star: player.isStar || false,
                Last_Updated: new Date().toISOString().split('T')[0],
                Last_Edit_Date: new Date().toISOString().split('T')[0]
            })),
            matches: this.matches.map(match => {
                // Ensure consistent match format
                return {
                    Match_ID: match.id || match.Match_ID || Date.now(),
                    Date: match.date || match.Date || new Date().toISOString().split('T')[0],
                    Venue: match.venue || match.Venue || 'Not specified',
                    Team1: match.team1?.name || match.Team1 || 'Team 1',
                    Team2: match.team2?.name || match.Team2 || 'Team 2',
                    Team1_Captain: match.team1Captain || match.Team1_Captain || '',
                    Team2_Captain: match.team2Captain || match.Team2_Captain || '',
                    Team1_Composition: match.team1Composition || match.Team1_Composition || [],
                    Team2_Composition: match.team2Composition || match.Team2_Composition || [],
                    Winning_Team: match.winningTeam || match.Winning_Team || match.winner?.name || '',
                    Losing_Team: match.losingTeam || match.Losing_Team || match.loser?.name || '',
                    Game_Start_Time: match.gameStartTime || match.Game_Start_Time || '',
                    Game_Finish_Time: match.gameFinishTime || match.Game_Finish_Time || '',
                    Winning_Team_Score: match.winningTeamScore || match.Winning_Team_Score || match.finalScore?.team1 || '',
                    Losing_Team_Score: match.losingTeamScore || match.Losing_Team_Score || match.finalScore?.team2 || '',
                    Result: match.result || match.Result || 'Match completed',
                    Overs: match.overs || match.Overs || 20,
                    Match_Type: match.matchType || match.Match_Type || 'Regular',
                    Status: match.status || match.Status || 'Completed',
                    Man_Of_The_Match: match.manOfTheMatch || match.Man_Of_The_Match || match.Man_of_the_Match || ''
                };
            }),
            match_batting_performance: this.extractAllBattingPerformance(),
            match_bowling_performance: this.extractAllBowlingPerformance(),
            index: []
        };
        
        // Save to consolidated localStorage
        localStorage.setItem('cricket-stats', JSON.stringify(consolidatedData));
        localStorage.setItem('cricket-current-match', JSON.stringify(this.currentMatch));
        
        // Only save to JSON format if explicitly requested (for match completion)
        if (saveToJSON && this.dataManager) {
            this.dataManager.editCricketStatsJSON(consolidatedData);
        }
    }

    // Show information about the new edit-in-place system
    showEditInPlaceInfo() {
        if (this.dataManager && this.dataManager.showEditInPlaceInstructions) {
            this.dataManager.showEditInPlaceInstructions();
        } else {
            this.showNotification('🔄 Edit-in-place mode is now active. JSON files will be updated instead of creating new ones.');
        }
    }

    // Helper method to restore from backup if needed
    restoreFromBackup(timestamp) {
        if (this.dataManager && this.dataManager.restoreFromBackup) {
            return this.dataManager.restoreFromBackup(timestamp);
        } else {
            this.showNotification('⚠️ Backup restore not available');
            return false;
        }
    }

    // Get list of available backups
    getBackupList() {
        if (this.dataManager && this.dataManager.getAvailableBackups) {
            return this.dataManager.getAvailableBackups();
        }
        return [];
    }

    // Enhanced data export to CSV (BCCB format)
    async exportToCSV() {
        try {
            if (this.dataManager && this.dataManager.saveToCSV) {
                const success = await this.dataManager.saveToCSV(this.players, this.matches, this.teams);
                
                // Also save the cricket_stats.json file with device ID for export
                await this.dataManager.saveCricketStatsJSON(this.players, this.matches, this.teams, true);
                
                if (success) {
                    this.showNotification('✅ Data exported to CSV and JSON files');
                } else {
                    this.showNotification('⚠️ Export failed - check console');
                }
            } else {
                this.showNotification('⚠️ Data manager not available');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('❌ Export failed');
        }
    }

    // Import from CSV functionality
    async importFromCSV() {
        try {
            if (this.dataManager) {
                await this.dataManager.initializeDataManager();
                await this.loadDataFromManager();
                this.loadPlayers();
                this.loadTeams();
                this.updateStats();
                this.showNotification('✅ Data imported from CSV files');
            }
        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('❌ Import failed');
        }
    }

    // Extract all batting performance data from all matches
    extractAllBattingPerformance() {
        const allBattingData = [];
        
        this.matches.forEach(match => {
            if (match.battingPerformance && Array.isArray(match.battingPerformance)) {
                allBattingData.push(...match.battingPerformance);
            }
        });
        
        return allBattingData;
    }

    // Extract all bowling performance data from all matches
    extractAllBowlingPerformance() {
        const allBowlingData = [];
        
        this.matches.forEach(match => {
            if (match.bowlingPerformance && Array.isArray(match.bowlingPerformance)) {
                allBowlingData.push(...match.bowlingPerformance);
            }
        });
        
        return allBowlingData;
    }

    // Player Management
    addPlayer(name, skill, role, bowlingType = 'Medium', battingStyle = 'So-So', playerType = 'Regular') {
        const newPlayer = {
            id: Date.now(),
            name: name,
            skill: parseInt(skill),
            role: role,
            bowling: bowlingType,
            batting: battingStyle,
            is_star: playerType === 'Star',
            matches: 0,
            innings: 0,
            notOuts: 0,
            runs: 0,
            highestScore: 0,
            battingAverage: 0,
            ballsFaced: 0,
            strikeRate: 0,
            centuries: 0,
            halfCenturies: 0,
            ducks: 0,
            fours: 0,
            sixes: 0,
            bowlingMatches: 0,
            bowlingInnings: 0,
            ballsBowled: 0,
            runsConceded: 0,
            wickets: 0,
            bestBowling: "0/0",
            bowlingAverage: 0,
            economy: 0,
            bowlingStrikeRate: 0,
            maidens: 0,
            fiveWickets: 0,
            catches: 0,
            runOuts: 0,
            stumpings: 0,
            created: new Date().toISOString()
        };
        
        this.players.push(newPlayer);
        this.saveData(true); // Create JSON backup when adding new player
        this.updateStats();
        this.loadPlayers();
        
        // Also save to the data manager if available
        if (this.dataManager) {
            this.dataManager.addPlayer(newPlayer);
        }
        
        this.showNotification(`✅ ${name} added successfully!`);
    }

    showAddPlayerModal() {
        document.getElementById('addPlayerModal').classList.add('active');
    }

    // Scoring Analytics Methods
    showScoringAnalytics(type) {
        // Update active button
        document.querySelectorAll('.chart-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${type}AnalyticsBtn`).classList.add('active');

        const container = document.getElementById('scoringAnalyticsContent');
        
        switch(type) {
            case 'performance':
                this.renderScoringPerformanceStats(container);
                break;
            case 'comparison':
                this.renderScoringPlayerComparison(container);
                break;
        }
    }

    renderScoringPerformanceStats(container) {
        container.innerHTML = `
            <div class="performance-stats-section">
                <div class="sort-controls">
                    <label for="performanceSort">Sort by:</label>
                    <select id="performanceSort" onchange="window.cricketApp.updatePerformanceSort(this.value)">
                        <option value="matches">Number of Matches</option>
                        <option value="totalRuns">Total Runs</option>
                        <option value="totalWickets">Total Wickets</option>
                        <option value="totalOvers">Total Overs Bowled</option>
                        <option value="averageRuns">Average Runs per Game</option>
                        <option value="strikeRate">Strike Rate</option>
                        <option value="bowlingEconomy">Bowling Economy</option>
                        <option value="bowlingStrikeRate">Bowling Strike Rate</option>
                        <option value="bowlingAverage">Bowling Average</option>
                        <option value="foursPerMatch">4s per Match</option>
                        <option value="sixesPerMatch">6s per Match</option>
                        <option value="fifties">Number of 50s</option>
                        <option value="battingConsistency">Batting Consistency</option>
                        <option value="bowlingConsistency">Bowling Consistency</option>
                    </select>
                </div>
                <div id="performanceStatsGrid" class="performance-grid">
                    <!-- Stats will be loaded here -->
                </div>
            </div>
        `;
        
        // Initialize with default sort
        this.updatePerformanceSort('matches');
    }

    updatePerformanceSort(sortBy) {
        const statsData = this.calculatePlayerStatistics();
        let filteredData = statsData;
        
        // Apply specific filters based on the metric being sorted
        if (['averageRuns', 'strikeRate', 'foursPerMatch', 'sixesPerMatch', 'fifties', 'battingConsistency'].includes(sortBy)) {
            // Batting metrics - require at least 1 match with batting data
            filteredData = statsData.filter(player => 
                player.matches >= 1 && (player.runs > 0 || player.ballsFaced > 0)
            );
        } else if (['bowlingEconomy', 'bowlingStrikeRate', 'bowlingAverage', 'bowlingConsistency'].includes(sortBy)) {
            // Bowling metrics - require at least some bowling activity
            filteredData = statsData.filter(player => player.wickets > 0 || player.totalOvers >= 1);
        } else if (['totalRuns'].includes(sortBy)) {
            // Total runs - require at least some batting activity
            filteredData = statsData.filter(player => player.runs > 0);
        } else if (['totalWickets', 'totalOvers'].includes(sortBy)) {
            // Bowling totals - require some bowling activity
            filteredData = statsData.filter(player => player.wickets > 0 || player.ballsBowled > 0);
        }
        // For 'matches', show all players who have played at least 1 match (no additional filter)
        
        const sortedData = this.sortPlayersByMetric(filteredData, sortBy);
        
        const container = document.getElementById('performanceStatsGrid');
        if (!container) return;
        
        const htmlContent = `
            <div class="performance-card full-width">
                <h4>📊 ${this.getMetricDisplayName(sortBy)}</h4>
                <div class="stats-table">
                    <div class="stats-header">
                        <span>Player</span>
                        <span>${this.getMetricDisplayName(sortBy)}</span>
                    </div>
                    ${sortedData.length > 0 ? sortedData.map((player, index) => {
                        const metricValue = player[sortBy];
                        const formattedValue = this.formatMetricValue(metricValue, sortBy);
                        return `
                        <div class="stats-row ${index < 3 ? 'top-performer' : ''}">
                            <span class="player-name">${player.name}</span>
                            <span class="metric-value">${formattedValue}</span>
                        </div>`;
                    }).join('') : `
                        <div class="stats-row">
                            <span class="player-name" style="text-align: center; grid-column: 1 / -1;">No players meet the minimum requirements for this metric</span>
                        </div>
                    `}
                </div>
            </div>
        `;
        
        console.log(`Filtered ${filteredData.length} players for ${sortBy} from ${statsData.length} total`);
        container.innerHTML = htmlContent;
        
        // Force re-apply styles after DOM update
        setTimeout(() => {
            const statsRows = container.querySelectorAll('.stats-row');
            statsRows.forEach(row => {
                row.style.display = 'grid';
                row.style.gridTemplateColumns = '2fr 1fr';
                row.style.gap = '10px';
                row.style.position = 'relative';
                row.style.width = '100%';
                row.style.alignItems = 'center';
            });
            
            const statsHeader = container.querySelector('.stats-header');
            if (statsHeader) {
                statsHeader.style.display = 'grid';
                statsHeader.style.gridTemplateColumns = '2fr 1fr';
                statsHeader.style.gap = '10px';
                statsHeader.style.position = 'relative';
                statsHeader.style.width = '100%';
                statsHeader.style.alignItems = 'center';
            }
            
            // Fix all spans to ensure they stay in their grid cells
            const allSpans = container.querySelectorAll('span');
            allSpans.forEach(span => {
                span.style.position = 'relative';
                span.style.display = 'flex';
                span.style.alignItems = 'center';
                span.style.width = '100%';
                span.style.height = '100%';
                span.style.minHeight = '1.4em';
                span.style.transform = 'none';
                span.style.float = 'none';
                span.style.clear = 'none';
                span.style.margin = '0';
                span.style.padding = '0';
                span.style.textShadow = 'none';
                span.style.boxShadow = 'none';
            });
            
            // Apply specific styles to player names
            const playerNames = container.querySelectorAll('.player-name');
            playerNames.forEach(name => {
                name.style.justifyContent = 'flex-start';
            });
            
            // Apply specific styles to metric values
            const metricValues = container.querySelectorAll('.metric-value');
            metricValues.forEach(value => {
                value.style.color = 'white';
                value.style.fontSize = '1.4em';
                value.style.fontWeight = '700';
                value.style.textShadow = 'none';
                value.style.boxShadow = 'none';
                value.style.justifyContent = 'center';
            });
        }, 10);
    }

    calculatePlayerStatistics() {
        const allPlayerStats = this.players.map(player => {
            const stats = {
                name: player.name,
                matches: player.matches || 0,
                runs: player.runs || 0,
                ballsFaced: player.ballsFaced || 0,
                wickets: player.wickets || 0,
                ballsBowled: player.ballsBowled || 0,
                runsConceded: player.runsConceded || 0,
                fours: player.fours || 0,
                sixes: player.sixes || 0,
                halfCenturies: player.halfCenturies || 0
            };

            // Add total stats
            stats.totalRuns = stats.runs;
            stats.totalWickets = stats.wickets;
            stats.totalOvers = stats.ballsBowled > 0 ? stats.ballsBowled / 6 : 0;

            // Calculate metrics
            stats.averageRuns = stats.matches > 0 ? stats.runs / stats.matches : 0;
            stats.strikeRate = stats.ballsFaced > 0 ? (stats.runs / stats.ballsFaced) * 100 : 0;
            stats.bowlingEconomy = stats.ballsBowled > 0 ? (stats.runsConceded / (stats.ballsBowled / 6)) : 0;
            stats.bowlingStrikeRate = stats.wickets > 0 ? stats.ballsBowled / stats.wickets : 0;
            stats.bowlingAverage = stats.wickets > 0 ? stats.runsConceded / stats.wickets : 0;
            stats.foursPerMatch = stats.matches > 0 ? stats.fours / stats.matches : 0;
            stats.sixesPerMatch = stats.matches > 0 ? stats.sixes / stats.matches : 0;
            stats.fifties = stats.halfCenturies;

            // Calculate coefficient of variation for consistency (will be refined later)
            stats.battingCV = this.calculateBattingCV(player);
            stats.bowlingCV = this.calculateBowlingCV(player);

            return stats;
        }).filter(player => {
            // Filter based on minimum requirements - more flexible
            const hasBattingData = player.matches >= 1 && (player.runs > 0 || player.ballsFaced > 0);
            const hasBowlingData = player.wickets > 0 || player.totalOvers >= 1;
            
            return player.matches > 0 && (hasBattingData || hasBowlingData);
        });

        // Now calculate relative consistency based on the group distribution
        return allPlayerStats.map(player => {
            player.battingConsistency = this.calculateRelativeBattingConsistency(player, allPlayerStats);
            player.bowlingConsistency = this.calculateRelativeBowlingConsistency(player, allPlayerStats);
            return player;
        });
    }

    calculateBattingCV(player) {
        // Simulate runs per match variation based on average
        if (!player.matches || player.matches < 2) return 1; // High variation for insufficient data
        
        const avgRuns = (player.runs || 0) / (player.matches || 1);
        if (avgRuns === 0) return 1;
        
        // Simulate coefficient of variation based on player's performance profile
        // Players with higher averages tend to be more consistent
        const baseCV = 0.3 + (0.5 * Math.random()); // Random between 0.3 and 0.8
        const performanceBonus = Math.min(avgRuns / 30, 0.3); // Up to 0.3 reduction for good performers
        return Math.max(0.1, baseCV - performanceBonus);
    }

    calculateBowlingCV(player) {
        // Simulate economy rate variation
        if (!player.ballsBowled || (player.ballsBowled / 6) < 2) return 1; // High variation for insufficient data
        
        const economy = (player.runsConceded || 0) / ((player.ballsBowled || 1) / 6);
        if (economy === 0) return 1;
        
        // Better bowlers (lower economy) tend to be more consistent
        const baseCV = 0.2 + (0.6 * Math.random()); // Random between 0.2 and 0.8
        const economyPenalty = Math.min(economy / 8, 0.3); // Penalty for high economy rates
        return Math.max(0.1, baseCV + economyPenalty);
    }

    calculateRelativeBattingConsistency(player, allPlayers) {
        // Get all batting CVs for players with sufficient data
        const battingCVs = allPlayers
            .filter(p => p.matches >= 2 && p.runs > 0)
            .map(p => p.battingCV)
            .filter(cv => cv < 1); // Exclude players with insufficient data
        
        if (battingCVs.length < 3 || player.battingCV >= 1) return 'Low';
        
        // Calculate percentiles
        const sortedCVs = battingCVs.sort((a, b) => a - b);
        const playerPercentile = (sortedCVs.indexOf(player.battingCV) / (sortedCVs.length - 1)) * 100;
        
        // Lower CV = better consistency = higher ranking
        if (playerPercentile <= 33) return 'High';   // Top 33% (most consistent)
        if (playerPercentile <= 66) return 'Medium'; // Middle 33%
        return 'Low';  // Bottom 33% (least consistent)
    }

    calculateRelativeBowlingConsistency(player, allPlayers) {
        // Get all bowling CVs for players with sufficient data
        const bowlingCVs = allPlayers
            .filter(p => p.totalOvers >= 2)
            .map(p => p.bowlingCV)
            .filter(cv => cv < 1); // Exclude players with insufficient data
        
        if (bowlingCVs.length < 3 || player.bowlingCV >= 1) return 'Low';
        
        // Calculate percentiles
        const sortedCVs = bowlingCVs.sort((a, b) => a - b);
        const playerPercentile = (sortedCVs.indexOf(player.bowlingCV) / (sortedCVs.length - 1)) * 100;
        
        // Lower CV = better consistency = higher ranking
        if (playerPercentile <= 33) return 'High';   // Top 33% (most consistent)
        if (playerPercentile <= 66) return 'Medium'; // Middle 33%
        return 'Low';  // Bottom 33% (least consistent)
    }

    calculateBattingConsistency(player) {
        // This function is now replaced by the relative consistency calculations above
        // Keeping for backwards compatibility, but not used
        return 'Medium';
    }

    calculateBowlingConsistency(player) {
        // This function is now replaced by the relative consistency calculations above
        // Keeping for backwards compatibility, but not used
        return 'Medium';
    }

    sortPlayersByMetric(players, metric) {
        return players.sort((a, b) => {
            if (metric === 'battingConsistency' || metric === 'bowlingConsistency') {
                const order = { 'High': 3, 'Medium': 2, 'Low': 1 };
                return order[b[metric]] - order[a[metric]];
            }
            
            // For bowling economy, lower is better
            if (metric === 'bowlingEconomy') {
                return a[metric] - b[metric];
            }
            
            // For all other metrics, higher is better
            return b[metric] - a[metric];
        });
    }

    getMetricDisplayName(metric) {
        const names = {
            matches: 'Number of Matches',
            totalRuns: 'Total Runs',
            totalWickets: 'Total Wickets',
            totalOvers: 'Total Overs Bowled',
            averageRuns: 'Average Runs per Game',
            strikeRate: 'Strike Rate',
            bowlingEconomy: 'Bowling Economy',
            bowlingStrikeRate: 'Bowling Strike Rate',
            bowlingAverage: 'Bowling Average',
            foursPerMatch: '4s per Match',
            sixesPerMatch: '6s per Match',
            fifties: 'Number of 50s',
            battingConsistency: 'Batting Consistency',
            bowlingConsistency: 'Bowling Consistency'
        };
        return names[metric] || metric;
    }

    formatMetricValue(value, metric) {
        // Handle undefined/null values
        if (value === undefined || value === null) {
            return '0';
        }
        
        if (metric === 'battingConsistency' || metric === 'bowlingConsistency') {
            return value;
        }
        if (metric === 'fifties' || metric === 'matches' || metric === 'totalRuns' || metric === 'totalWickets') {
            return value.toString();
        }
        if (typeof value === 'number') {
            return value.toFixed(1);
        }
        return value.toString();
    }

    renderScoringPlayerComparison(container) {
        const player1Options = this.players.map(p => 
            `<option value="${p.id}" style="color: #00ff88; font-weight: bold; background-color: #1a1a1a;">${p.name}</option>`
        ).join('');
        
        const player2Options = this.players.map(p => 
            `<option value="${p.id}" style="color: #00ccff; font-weight: bold; background-color: #1a1a1a;">${p.name}</option>`
        ).join('');

        container.innerHTML = `
            <div class="player-comparison-container">
                <div class="comparison-selectors">
                    <div class="comparison-selector">
                        <label>Player 1</label>
                        <select id="scoringPlayer1Select" onchange="console.log('Player 1 changed:', this.value); window.cricketApp.updateScoringSpiderChart();" style="color: #00ff88; font-weight: bold; background-color: #1a1a1a;">
                            <option value="" style="color: #ffffff;">Select Player 1</option>
                            ${player1Options}
                        </select>
                    </div>
                    <div class="comparison-selector">
                        <label>Player 2</label>
                        <select id="scoringPlayer2Select" onchange="console.log('Player 2 changed:', this.value); window.cricketApp.updateScoringSpiderChart();" style="color: #00ccff; font-weight: bold; background-color: #1a1a1a;">
                            <option value="" style="color: #ffffff;">Select Player 2</option>
                            ${player2Options}
                        </select>
                    </div>
                </div>
                <div class="comparison-charts-container">
                    <div class="chart-section">
                        <h4>🏏 Batting Performance</h4>
                        <div id="battingSpiderChartContainer" class="spider-chart-container">
                            <div class="no-data-message">
                                Select two players to compare batting performance
                            </div>
                        </div>
                    </div>
                    <div class="chart-section">
                        <h4>🎯 Bowling Performance</h4>
                        <div id="bowlingSpiderChartContainer" class="spider-chart-container">
                            <div class="no-data-message">
                                Select two players to compare bowling performance
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateScoringSpiderChart() {
        console.log('🔄 updateScoringSpiderChart called');
        
        const player1Id = document.getElementById('scoringPlayer1Select').value;
        const player2Id = document.getElementById('scoringPlayer2Select').value;
        
        console.log('Selected players:', player1Id, player2Id);
        
        if (!player1Id || !player2Id) {
            console.log('❌ Not both players selected, showing no-data messages');
            document.getElementById('battingSpiderChartContainer').innerHTML = `
                <div class="no-data-message">
                    Select two players to compare batting performance
                </div>
            `;
            document.getElementById('bowlingSpiderChartContainer').innerHTML = `
                <div class="no-data-message">
                    Select two players to compare bowling performance
                </div>
            `;
            return;
        }

        const player1 = this.players.find(p => p.id == player1Id);
        const player2 = this.players.find(p => p.id == player2Id);
        
        console.log('Found players:', player1?.name, player2?.name);
        
        if (!player1 || !player2) {
            console.log('❌ Players not found in array');
            return;
        }

        console.log('✅ Both players found, rendering charts...');
        this.renderBattingSpiderChart(player1, player2);
        this.renderBowlingSpiderChart(player1, player2);
    }

    renderScoringSpiderChart(player1, player2) {
        const metrics = [
            { name: 'Batting Avg', key: 'battingAverage', max: 50 },
            { name: 'Strike Rate', key: 'strikeRate', max: 150 },
            { name: 'Wickets', key: 'wickets', max: 30 },
            { name: 'Economy', key: 'economy', max: 8, invert: true },
            { name: 'Catches', key: 'catches', max: 15 },
            { name: 'Matches', key: 'matches', max: 30 }
        ];

        const normalize = (value, max, invert = false) => {
            let normalized = Math.min(value / max, 1);
            return invert ? (1 - normalized) : normalized;
        };

        document.getElementById('scoringSpiderChartContainer').innerHTML = `
            <div class="spider-chart">
                <canvas id="scoringSpiderCanvas" width="400" height="400"></canvas>
            </div>
        `;

        // Draw spider chart on canvas
        this.drawSpiderChart(player1, player2, metrics);
    }

    drawSpiderChart(player1, player2, metrics) {
        const canvas = document.getElementById('scoringSpiderCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = 150;
        const centerY = 150;
        const radius = 120;
        
        // Clear canvas
        ctx.clearRect(0, 0, 300, 300);
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, (radius / 5) * i, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw axes
        const angleStep = (Math.PI * 2) / metrics.length;
        for (let i = 0; i < metrics.length; i++) {
            const angle = (i * angleStep) - (Math.PI / 2);
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();
            
            // Draw labels
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial'; // Increased from 16px to 20px
            ctx.textAlign = 'center';
            const labelX = centerX + Math.cos(angle) * (radius + 30); // Increased from 25 to 30 for larger text
            const labelY = centerY + Math.sin(angle) * (radius + 30);
            ctx.fillText(metrics[i].name, labelX, labelY);
        }
        
        // Draw player1 data
        ctx.strokeStyle = '#22c55e';
        ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < metrics.length; i++) {
            const metric = metrics[i];
            const value = player1[metric.key] || 0;
            const normalized = Math.min(value / metric.max, 1);
            const adjustedValue = metric.invert ? (1 - normalized) : normalized;
            
            const angle = (i * angleStep) - (Math.PI / 2);
            const x = centerX + Math.cos(angle) * radius * adjustedValue;
            const y = centerY + Math.sin(angle) * radius * adjustedValue;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw player2 data
        ctx.strokeStyle = '#3b82f6';
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.beginPath();
        
        for (let i = 0; i < metrics.length; i++) {
            const metric = metrics[i];
            const value = player2[metric.key] || 0;
            const normalized = Math.min(value / metric.max, 1);
            const adjustedValue = metric.invert ? (1 - normalized) : normalized;
            
            const angle = (i * angleStep) - (Math.PI / 2);
            const x = centerX + Math.cos(angle) * radius * adjustedValue;
            const y = centerY + Math.sin(angle) * radius * adjustedValue;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    renderBattingSpiderChart(player1, player2) {
        console.log('🏏 Rendering batting spider chart for:', player1.name, 'vs', player2.name);
        
        const container = document.getElementById('battingSpiderChartContainer');
        if (!container) {
            console.error('❌ battingSpiderChartContainer not found!');
            return;
        }
        
        const battingMetrics = [
            { name: 'Strike Rate', key: 'strikeRate', max: 200 },
            { name: 'Average', key: 'battingAverage', max: 50 },
            { name: '4s/Match', key: 'foursPerMatch', max: 5 },
            { name: '6s/Match', key: 'sixesPerMatch', max: 3 }
        ];

        const getBattingMetricValue = (player, metric) => {
            switch(metric.key) {
                case 'foursPerMatch':
                    return player.matches > 0 ? (player.fours || 0) / player.matches : 0;
                case 'sixesPerMatch':
                    return player.matches > 0 ? (player.sixes || 0) / player.matches : 0;
                default:
                    return player[metric.key] || 0;
            }
        };

        document.getElementById('battingSpiderChartContainer').innerHTML = `
            <div class="spider-chart">
                <canvas id="battingSpiderCanvas" width="400" height="400"></canvas>
            </div>
        `;

        console.log('✅ Batting chart HTML set, drawing canvas...');
        // Add a small delay to ensure DOM is ready before drawing
        setTimeout(() => {
            this.drawSpiderChartCanvas('battingSpiderCanvas', player1, player2, battingMetrics, getBattingMetricValue);
        }, 50);
    }

    renderBowlingSpiderChart(player1, player2) {
        console.log('🎯 Rendering bowling spider chart for:', player1.name, 'vs', player2.name);
        
        const container = document.getElementById('bowlingSpiderChartContainer');
        if (!container) {
            console.error('❌ bowlingSpiderChartContainer not found!');
            return;
        }
        
        const bowlingMetrics = [
            { name: 'Economy', key: 'economy', max: 10, invert: true },
            { name: 'Bowling Avg', key: 'bowlingAverage', max: 30, invert: true },
            { name: 'Strike Rate', key: 'bowlingStrikeRate', max: 30, invert: true },
            { name: 'Wickets', key: 'wickets', max: 20 }
        ];

        const getBowlingMetricValue = (player, metric) => {
            return player[metric.key] || 0;
        };

        // Check if both players have bowling data
        const player1HasBowling = (player1.wickets || 0) > 0 || (player1.ballsBowled || 0) > 0;
        const player2HasBowling = (player2.wickets || 0) > 0 || (player2.ballsBowled || 0) > 0;

        if (!player1HasBowling && !player2HasBowling) {
            document.getElementById('bowlingSpiderChartContainer').innerHTML = `
                <div class="no-data-message">
                    Neither player has bowling data to compare
                </div>
            `;
            return;
        }

        console.log('✅ Bowling chart HTML will be set...');
        document.getElementById('bowlingSpiderChartContainer').innerHTML = `
            <div class="spider-chart">
                <canvas id="bowlingSpiderCanvas" width="400" height="400"></canvas>
            </div>
        `;

        console.log('✅ Bowling chart HTML set, drawing canvas...');
        // Add a small delay to ensure DOM is ready before drawing
        setTimeout(() => {
            this.drawSpiderChartCanvas('bowlingSpiderCanvas', player1, player2, bowlingMetrics, getBowlingMetricValue);
        }, 100);
    }

    drawSpiderChartCanvas(canvasId, player1, player2, metrics, getMetricValue) {
        console.log('🎨 Drawing spider chart on canvas:', canvasId);
        
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error('❌ Canvas not found:', canvasId);
            return;
        }
        
        console.log('✅ Canvas found, starting drawing...');
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) * 0.3; // Increased from 0.25 to 0.3 for better centering
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        
        // Draw concentric circles with value labels
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, (radius / 5) * i, 0, Math.PI * 2);
            ctx.stroke();
            
            // Add percentage labels on the grid lines
            if (i % 2 === 0) { // Only show labels on 2nd and 4th circles to avoid clutter
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.font = '18px Arial'; // Increased from 14px to 18px
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const percentage = (i / 5) * 100;
                ctx.fillText(`${percentage}%`, centerX + (radius / 5) * i + 10, centerY - 5);
            }
        }
        
        // Draw axes
        const angleStep = (Math.PI * 2) / metrics.length;
        for (let i = 0; i < metrics.length; i++) {
            const angle = (i * angleStep) - (Math.PI / 2);
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();
            
            // Draw labels with better positioning to prevent cutoff
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial'; // Increased from 16px to 20px
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Calculate label position with proper padding for centering
            const labelDistance = radius + 35; // Increased from 30 to 35 to accommodate larger text
            const labelX = centerX + Math.cos(angle) * labelDistance;
            const labelY = centerY + Math.sin(angle) * labelDistance;
            
            // Adjust text alignment based on position to prevent cutoff
            if (labelX < centerX * 0.4) { // Adjusted thresholds for better centering
                ctx.textAlign = 'start';
            } else if (labelX > centerX * 1.6) {
                ctx.textAlign = 'end';
            } else {
                ctx.textAlign = 'center';
            }
            
            if (labelY < centerY * 0.4) {
                ctx.textBaseline = 'bottom';
            } else if (labelY > centerY * 1.6) {
                ctx.textBaseline = 'top';
            } else {
                ctx.textBaseline = 'middle';
            }
            
            ctx.fillText(metrics[i].name, labelX, labelY);
        }
        
        // Draw player1 data
        ctx.strokeStyle = '#00ff88'; // Bright green for better visibility
        ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        console.log(`📊 ${player1.name} values:`);
        for (let i = 0; i < metrics.length; i++) {
            const metric = metrics[i];
            const value = getMetricValue(player1, metric);
            const normalized = Math.min(value / metric.max, 1);
            const adjustedValue = metric.invert ? (1 - normalized) : normalized;
            
            console.log(`  ${metric.name}: ${value.toFixed(2)} (max: ${metric.max}) = ${(adjustedValue * 100).toFixed(1)}%`);
            
            const angle = (i * angleStep) - (Math.PI / 2);
            const x = centerX + Math.cos(angle) * radius * adjustedValue;
            const y = centerY + Math.sin(angle) * radius * adjustedValue;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw player2 data
        ctx.strokeStyle = '#00ccff'; // Bright cyan-blue for better visibility
        ctx.fillStyle = 'rgba(0, 204, 255, 0.2)';
        ctx.beginPath();
        
        console.log(`📊 ${player2.name} values:`);
        for (let i = 0; i < metrics.length; i++) {
            const metric = metrics[i];
            const value = getMetricValue(player2, metric);
            const normalized = Math.min(value / metric.max, 1);
            const adjustedValue = metric.invert ? (1 - normalized) : normalized;
            
            console.log(`  ${metric.name}: ${value.toFixed(2)} (max: ${metric.max}) = ${(adjustedValue * 100).toFixed(1)}%`);
            
            const angle = (i * angleStep) - (Math.PI / 2);
            const x = centerX + Math.cos(angle) * radius * adjustedValue;
            const y = centerY + Math.sin(angle) * radius * adjustedValue;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    renderScoringInsights(container) {
        const insights = this.generateInsights();
        
        container.innerHTML = `
            <div class="insights-container">
                ${insights.map(insight => `
                    <div class="insight-card">
                        <div class="insight-title">${insight.title}</div>
                        <div class="insight-description">${insight.description}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    generateInsights() {
        const insights = [];
        
        // Batting insights
        const topBatsman = this.getTopBatsmen(1)[0];
        if (topBatsman && topBatsman.battingAverage > 0) {
            insights.push({
                title: `🏏 Top Batsman: ${topBatsman.name}`,
                description: `Averaging ${topBatsman.battingAverage.toFixed(1)} runs with a strike rate of ${topBatsman.strikeRate.toFixed(1)}. Has scored ${topBatsman.runs} runs in ${topBatsman.matches} matches.`
            });
        }
        
        // Bowling insights
        const topBowler = this.getTopBowlers(1)[0];
        if (topBowler && topBowler.wickets > 0) {
            insights.push({
                title: `🎯 Top Bowler: ${topBowler.name}`,
                description: `Has taken ${topBowler.wickets} wickets with an economy rate of ${topBowler.economy.toFixed(2)}. Best bowling figures: ${topBowler.bestBowling}.`
            });
        }
        
        // Form insights
        const consistentPlayers = this.players.filter(p => p.matches >= 5 && p.battingAverage > 20).length;
        if (consistentPlayers > 0) {
            insights.push({
                title: `📈 Consistent Performers`,
                description: `${consistentPlayers} players have maintained an average above 20 with at least 5 matches played, showing good consistency.`
            });
        }
        
        // Match insights
        if (this.matches.length > 0) {
            const totalRuns = this.matches.reduce((sum, match) => {
                return sum + (match.team1Runs || 0) + (match.team2Runs || 0);
            }, 0);
            
            insights.push({
                title: `📊 Match Statistics`,
                description: `${this.matches.length} matches played with ${totalRuns} total runs scored. Average runs per match: ${(totalRuns / this.matches.length / 2).toFixed(1)}.`
            });
        }
        
        // Team balance insights
        const allrounders = this.players.filter(p => p.role === 'allrounder').length;
        const specialists = this.players.filter(p => p.role === 'batsman' || p.role === 'bowler').length;
        
        insights.push({
            title: `⚖️ Squad Balance`,
            description: `Your squad has ${allrounders} all-rounders and ${specialists} specialists. ${allrounders > specialists ? 'Good balance with flexible options' : 'Consider adding more all-rounders for flexibility'}.`
        });
        
        return insights.length > 0 ? insights : [{
            title: '🌟 Getting Started',
            description: 'Play more matches to see detailed insights about player performance, team balance, and trends.'
        }];
    }

    getTopBatsmen(count) {
        return this.players
            .filter(p => p.matches > 0)
            .sort((a, b) => (b.battingAverage || 0) - (a.battingAverage || 0))
            .slice(0, count);
    }

    getTopBowlers(count) {
        return this.players
            .filter(p => p.wickets > 0)
            .sort((a, b) => b.wickets - a.wickets)
            .slice(0, count);
    }

    getRecentFormPlayers() {
        // Simple recent form based on last few matches
        return this.players
            .filter(p => p.matches > 0)
            .sort((a, b) => (b.strikeRate || 0) - (a.strikeRate || 0))
            .slice(0, 3)
            .map(p => ({
                name: p.name,
                recentForm: p.strikeRate > 120 ? 'Excellent' : p.strikeRate > 100 ? 'Good' : 'Average'
            }));
    }

    // Method to toggle between analytics and live scoring
    updateScoringTabView() {
        const hasActiveMatch = this.currentMatch && this.currentMatch.status !== 'completed';
        const preGameView = document.getElementById('preGameAnalytics');
        const liveView = document.getElementById('liveMatchView');
        const titleElement = document.getElementById('scoringPageTitle');
        
        // Find the scoring tab label in navigation
        const navItems = document.querySelectorAll('.nav-item');
        let scoringNavItem = null;
        navItems.forEach(item => {
            if (item.onclick && item.onclick.toString().includes("showPage('scoring')")) {
                scoringNavItem = item.querySelector('.nav-label');
            }
        });
        
        if (hasActiveMatch) {
            preGameView.style.display = 'none';
            liveView.style.display = 'block';
            titleElement.textContent = 'Live Scoring';
            
            // Change tab label to "Scoring" during active match
            if (scoringNavItem) {
                scoringNavItem.textContent = 'Scoring';
            }
        } else {
            preGameView.style.display = 'block';
            liveView.style.display = 'none';
            titleElement.textContent = 'Player Analytics';
            
            // Change tab label to "Analytics" before match starts
            if (scoringNavItem) {
                scoringNavItem.textContent = 'Analytics';
            }
            
            // Initialize analytics view
            this.showScoringAnalytics('performance');
        }
        
        // Update bye button visibility based on current settings
        this.updateByeButtonVisibility();
    }

    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
        this.saveData(true); // Create JSON backup when removing player (player info change)
        this.updateStats();
        this.loadPlayers();
        
        this.showNotification('🗑️ Player removed');
    }

    loadPlayers() {
        console.log('🎯 loadPlayers called, player count:', this.players.length);
        const playerList = document.getElementById('playerList');
        
        if (!playerList) {
            console.error('❌ playerList element not found');
            return;
        }
        
        console.log('✅ playerList element found');
        
        if (this.players.length === 0) {
            console.log('⚠️ No players found, showing empty state');
            playerList.innerHTML = `
                <div class="glass-card" style="text-align: center; color: rgba(255,255,255,0.8);">
                    <h3>🎯 No players yet</h3>
                    <p>Add your first player to get started!</p>
                </div>
            `;
            return;
        }
        
        console.log('🎯 Rendering', this.players.length, 'players');
        
        try {
            playerList.innerHTML = this.players.map(player => `
                <div class="player-item fade-in" onclick="openEditPlayerModal(${player.id})" style="cursor: pointer;">
                    <div class="player-name-only">${player.name}</div>
                </div>
            `).join('');
            
            console.log('✅ Players rendered successfully');
        } catch (error) {
            console.error('❌ Error rendering players:', error);
            playerList.innerHTML = `
                <div class="glass-card" style="text-align: center; color: rgba(255,255,255,0.8);">
                    <h3>❌ Error loading players</h3>
                    <p>Please try refreshing the page</p>
                </div>
            `;
        }
    }

    // Team Management with BCCB workflow - Inline Steps
    generateBalancedTeams() {
        if (this.players.length < 4) {
            this.showNotification('❌ Need at least 4 players to create teams');
            return;
        }
        
        // Validate that all players have valid IDs
        const playersWithoutValidIds = this.players.filter(player => 
            !player.id || player.id === '' || player.id === null || player.id === undefined
        );
        
        if (playersWithoutValidIds.length > 0) {
            const invalidPlayerNames = playersWithoutValidIds.map(p => p.name || 'Unknown').join(', ');
            this.showNotification(`❌ Cannot form teams: Some players don't have valid Player IDs: ${invalidPlayerNames}`);
            console.error('Players without valid IDs:', playersWithoutValidIds);
            return;
        }
        
        // Show Step 1: Player Selection inline
        this.showInlinePlayerSelection();
    }
    
    showInlinePlayerSelection() {
        const teamList = document.getElementById('teamList');
        
        teamList.innerHTML = `
            <div class="glass-card fade-in">
                <div class="step-header">
                    <h3>🎯 Today's players</h3>
                    <span id="selectedPlayerCount" class="player-count">0</span>
                </div>
                
                <div class="selection-controls">
                    <button type="button" onclick="window.selectAllPlayersInline()" class="btn btn-small">Select All</button>
                    <button type="button" onclick="window.unselectAllPlayersInline()" class="btn btn-small">Unselect All</button>
                </div>
                
                <div class="today-player-list" id="playerListContainer">
                    ${this.players.map(player => `
                        <label class="player-checkbox-item" data-player-id="${player.id}">
                            <input type="checkbox" name="todayPlayers" value="${player.id}">
                            <div class="player-checkbox-info">
                                <div class="player-name">${player.name}</div>
                            </div>
                            <div class="selection-indicator"></div>
                        </label>
                    `).join('')}
                </div>
                
                <div class="step-actions">
                    <button type="button" onclick="window.cancelTeamGeneration()" class="btn">Cancel</button>
                    <button type="button" onclick="window.proceedToCaptainSelectionInline()" class="btn btn-primary">
                        Next: Select Captains
                    </button>
                </div>
            </div>
        `;
        
        // Add event delegation for player selection with a slight delay to ensure DOM is ready
        setTimeout(() => {
            const playerListContainer = document.getElementById('playerListContainer');
            console.log('Setting up event delegation, container found:', !!playerListContainer);
            
            if (playerListContainer) {
                // Remove any existing listeners first
                playerListContainer.replaceWith(playerListContainer.cloneNode(true));
                const newContainer = document.getElementById('playerListContainer');
                
                newContainer.addEventListener('click', function(event) {
                    console.log('Click event fired on container, target:', event.target);
                    const playerCard = event.target.closest('.player-checkbox-item');
                    console.log('Found player card:', !!playerCard);
                    
                    if (playerCard) {
                        console.log('Player card clicked:', playerCard);
                        event.preventDefault();
                        event.stopPropagation();
                        window.togglePlayerSelection(playerCard);
                    }
                });
                
                console.log('Event listener added successfully');
            }
        }, 100);
    }
    
    showInlineCaptainSelection(selectedPlayers) {
        const teamList = document.getElementById('teamList');
        
        teamList.innerHTML = `
            <div class="glass-card fade-in">
                <div class="step-header">
                    <h3>Choose Captains</h3>
                </div>
                
                <div class="captain-selection-inline">
                    <div class="form-group">
                        <label for="captain1SelectInline">Captain 1:</label>
                        <select id="captain1SelectInline" class="form-control">
                            <option value="">Select Captain 1</option>
                            ${selectedPlayers.map(player => 
                                `<option value="${player.id}">${player.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="captain2SelectInline">Captain 2:</label>
                        <select id="captain2SelectInline" class="form-control">
                            <option value="">Select Captain 2</option>
                            ${selectedPlayers.map(player => 
                                `<option value="${player.id}">${player.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="step-actions">
                    <button type="button" onclick="backToPlayerSelectionInline()" class="btn">Back</button>
                    <button type="button" onclick="generateTeamsInline()" class="btn btn-success">
                        Generate Balanced Teams
                    </button>
                </div>
            </div>
        `;
        
        // Store selected players for later use
        this.todaySelectedPlayers = selectedPlayers;
    }
    
    generateTeamsWithSelectedPlayersInline() {
        const captain1Id = parseInt(document.getElementById('captain1SelectInline').value);
        const captain2Id = parseInt(document.getElementById('captain2SelectInline').value);
        
        if (!captain1Id || !captain2Id) {
            this.showNotification('❌ Please select both captains');
            return;
        }
        
        if (captain1Id === captain2Id) {
            this.showNotification('❌ Please select two different captains');
            return;
        }
        
        const captain1 = this.todaySelectedPlayers.find(p => p.id === captain1Id);
        const captain2 = this.todaySelectedPlayers.find(p => p.id === captain2Id);
        
        if (!captain1 || !captain2) {
            this.showNotification('❌ Error finding selected captains');
            return;
        }
        
        try {
            // Store selections for potential regeneration
            this.lastSelectedPlayers = [...this.todaySelectedPlayers];
            this.lastCaptain1 = captain1;
            this.lastCaptain2 = captain2;
            
            // Use the BCCB team balancer with selected players and captains
            const { teamA, teamB } = this.teamBalancer.balanceTeams(this.todaySelectedPlayers, captain1, captain2);
            
            // Calculate team strengths
            const teamAStrength = teamA.reduce((sum, p) => sum + this.teamBalancer.skillScore(p), 0);
            const teamBStrength = teamB.reduce((sum, p) => sum + this.teamBalancer.skillScore(p), 0);
            
            const newTeams = [
                {
                    id: Date.now(),
                    name: `Team ${this.teamBalancer.getLastName(captain1.name)}`,
                    captain: captain1.name,
                    players: teamA,
                    strength: teamAStrength,
                    created: new Date().toISOString()
                },
                {
                    id: Date.now() + 1,
                    name: `Team ${this.teamBalancer.getLastName(captain2.name)}`,
                    captain: captain2.name,
                    players: teamB,
                    strength: teamBStrength,
                    created: new Date().toISOString()
                }
            ];
            
            // Store teams temporarily without saving to JSON
            this.tempTeams = newTeams;
            
            const strengthDiff = Math.abs(teamAStrength - teamBStrength);
            this.showNotification(`🎯 Balanced teams created using BCCB algorithm! Strength difference: ${strengthDiff} points`);
            
            // Show teams result inline
            this.showInlineTeamsResult(newTeams[0], newTeams[1]);
            
        } catch (error) {
            console.error('Error generating teams:', error);
            this.showNotification(`❌ Error: ${error.message}`);
        }
    }
    
    reshuffleTeamsWithSameSelections() {
        // Regenerate teams using the same players and captains
        if (!this.lastSelectedPlayers || !this.lastCaptain1 || !this.lastCaptain2) {
            this.showNotification('❌ No previous selections found to reshuffle');
            return;
        }
        
        try {
            // Use the BCCB team balancer with shuffling enabled for variety
            const { teamA, teamB } = this.teamBalancer.balanceTeams(this.lastSelectedPlayers, this.lastCaptain1, this.lastCaptain2, true);
            
            // Calculate team strengths
            const teamAStrength = teamA.reduce((sum, p) => sum + this.teamBalancer.skillScore(p), 0);
            const teamBStrength = teamB.reduce((sum, p) => sum + this.teamBalancer.skillScore(p), 0);
            
            const newTeams = [
                {
                    id: Date.now(),
                    name: `Team ${this.teamBalancer.getLastName(this.lastCaptain1.name)}`,
                    captain: this.lastCaptain1.name,
                    players: teamA,
                    strength: teamAStrength,
                    created: new Date().toISOString()
                },
                {
                    id: Date.now() + 1,
                    name: `Team ${this.teamBalancer.getLastName(this.lastCaptain2.name)}`,
                    captain: this.lastCaptain2.name,
                    players: teamB,
                    strength: teamBStrength,
                    created: new Date().toISOString()
                }
            ];
            
            // Store teams temporarily without saving to JSON
            this.tempTeams = newTeams;
            
            const strengthDiff = Math.abs(teamAStrength - teamBStrength);
            this.showNotification(`🔄 Teams reshuffled with same players and captains! Strength difference: ${strengthDiff} points`);
            
            // Show teams result inline
            this.showInlineTeamsResult(newTeams[0], newTeams[1]);
            
        } catch (error) {
            console.error('Error reshuffling teams:', error);
            this.showNotification(`❌ Error: ${error.message}`);
        }
    }
    
    showInlineTeamsResult(team1, team2) {
        const teamList = document.getElementById('teamList');
        
        teamList.innerHTML = `
            <div class="glass-card fade-in">
                <div class="step-header">
                    <h3>🎯 Balanced Teams Generated!</h3>
                </div>
                
                <div class="teams-result-inline">
                    <div class="team-result-card">
                        <h4>${team1.name}</h4>
                        <div class="team-players">
                            ${team1.players.map(p => {
                                const isCaptain = p.name === team1.captain;
                                return `<span class="player-tag ${isCaptain ? 'captain' : 'clickable'}" 
                                             data-player-id="${p.id}" 
                                             data-team="1" 
                                             ${!isCaptain ? 'onclick="movePlayerDirectly(this)"' : ''}>${p.name}${isCaptain ? ' (C)' : ''}</span>`;
                            }).join('')}
                        </div>
                    </div>
                    
                    <div class="team-result-card">
                        <h4>${team2.name}</h4>
                        <div class="team-players">
                            ${team2.players.map(p => {
                                const isCaptain = p.name === team2.captain;
                                return `<span class="player-tag ${isCaptain ? 'captain' : 'clickable'}" 
                                             data-player-id="${p.id}" 
                                             data-team="2" 
                                             ${!isCaptain ? 'onclick="movePlayerDirectly(this)"' : ''}>${p.name}${isCaptain ? ' (C)' : ''}</span>`;
                            }).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="step-actions">
                    <button type="button" onclick="regenerateTeams()" class="btn btn-primary">Reshuffle</button>
                    <button type="button" onclick="confirmTeams()" class="btn btn-success">
                        Great! Let's Play
                    </button>
                </div>
            </div>
        `;
    }

    calculatePlayerSkillScore(player) {
        // Use the BCCB team balancer skill score as base
        const bccbScore = this.teamBalancer.skillScore(player);
        
        // Enhanced scoring system with additional factors
        let baseScore = bccbScore;
        
        // Role-based bonuses
        const roleBonuses = {
            'allrounder': 2,    // Most valuable
            'wicketkeeper': 1.5, // Specialist role
            'batsman': 1,       // Batting specialist
            'bowler': 1         // Bowling specialist
        };
        
        const roleBonus = roleBonuses[player.role] || 1;
        
        // Performance-based bonuses
        const matchBonus = Math.min((player.matches || 0) * 0.1, 2); // Max 2 points for experience
        const runsBonus = Math.min((player.runs || 0) / 500, 2);     // Max 2 points for runs
        const wicketsBonus = Math.min((player.wickets || 0) / 20, 2); // Max 2 points for wickets
        
        return baseScore * roleBonus + matchBonus + runsBonus + wicketsBonus;
    }

    createCustomTeam(name, selectedPlayerIds) {
        const teamPlayers = this.players.filter(p => selectedPlayerIds.includes(p.id));
        
        // Validate that all selected players have valid IDs
        const playersWithoutValidIds = teamPlayers.filter(player => 
            !player.id || player.id === '' || player.id === null || player.id === undefined
        );
        
        if (playersWithoutValidIds.length > 0) {
            const invalidPlayerNames = playersWithoutValidIds.map(p => p.name || 'Unknown').join(', ');
            this.showNotification(`❌ Cannot create team: Some players don't have valid Player IDs: ${invalidPlayerNames}`);
            console.error('Players without valid IDs:', playersWithoutValidIds);
            return;
        }
        
        const strength = teamPlayers.reduce((sum, p) => sum + p.skill, 0);
        
        const newTeam = {
            id: Date.now(),
            name: name,
            players: teamPlayers,
            strength: strength,
            created: new Date().toISOString()
        };
        
        this.teams.push(newTeam);
        this.saveData(false); // Only save locally when creating teams
        this.updateStats();
        this.loadTeams();
        
        this.showNotification(`✅ Team "${name}" created!`);
    }

    loadTeams() {
        const teamList = document.getElementById('teamList');
        
        if (this.teams.length === 0) {
            teamList.innerHTML = `
                <div class="glass-card" style="text-align: center; color: rgba(255,255,255,0.8);">
                    <h3>⚡ No teams yet</h3>
                    <p>Generate balanced teams or create custom ones!</p>
                </div>
            `;
        } else {
            // Simple team display with only player names
            teamList.innerHTML = this.teams.map(team => `
                <div class="simple-team-box">
                    <div class="team-title">${team.name}</div>
                    <div class="players-list">
                        ${team.players.map(p => p.name).join(', ')}
                    </div>
                </div>
            `).join('');

            // Add toss button if we have exactly 2 teams
            if (this.teams.length === 2) {
                teamList.innerHTML += `
                    <div style="text-align: center; margin: 30px 0;">
                        <button class="toss-btn" onclick="startToss()">
                            🎯 TOSS
                        </button>
                    </div>
                `;
            }
        }
        
        // Always load captain stats as an additional section
        this.loadCaptainStats();
    }

    loadCaptainStats() {
        const container = document.getElementById('captainsStatsContainer');
        
        if (!container) return;

        console.log('🏏 Loading captain stats...');
        console.log('Available matches:', this.matches.length);
        console.log('Available players:', this.players.length);
        console.log('Sample player:', this.players[0]);
        console.log('Data manager data available:', !!this.dataManager?.data);
        console.log('Player info in data manager:', this.dataManager?.data?.player_info?.length || 0);

        const captainStats = this.calculateCaptainStatistics();
        
        console.log('Calculated captain stats:', captainStats);
        
        if (captainStats.length === 0) {
            container.innerHTML = `
                <div class="glass-card" style="text-align: center; color: rgba(255,255,255,0.8);">
                    <h3>👑 No captain data yet</h3>
                    <p>Play some matches to see captain statistics!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = captainStats.map((captain, index) => {
            const isTopCaptain = captain.isTopCaptain; // Use the calculated isTopCaptain property
            const isTiedLeader = captain.isTiedLeader; // Check if tied with other leaders
            const cardClass = isTopCaptain ? 'captain-card top-captain' : 'captain-card secondary-captain';
            const avatarIcon = isTopCaptain ? '👑' : '🔸';
            const tiedIndicator = isTiedLeader ? ' 🤝' : ''; // Show handshake for tied leaders
            
            return `
            <div class="${cardClass}">
                <div class="captain-header">
                    <div class="captain-avatar">${avatarIcon}</div>
                    <div class="captain-info">
                        <h3 ${isTiedLeader ? 'title="Tied Leader"' : ''}>${captain.name}${tiedIndicator}</h3>
                    </div>
                </div>
                
                <div class="captain-stats-grid">
                    <div class="stat-card">
                        <span class="stat-value">${captain.gamesPlayed}</span>
                        <div class="stat-label">Games Played</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${captain.gamesWon}</span>
                        <div class="stat-label">Games Won</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${captain.gamesLost}</span>
                        <div class="stat-label">Games Lost</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value win-rate ${captain.winRateClass}">${captain.winRate}%</span>
                        <div class="stat-label">Win Rate</div>
                    </div>
                </div>

                <div class="player-highlights">
                    <div class="highlight-section">
                        <div class="highlight-title">🍀 Lucky Player (Most MOMs)</div>
                        <div class="highlight-player lucky">${captain.luckyPlayer}</div>
                    </div>
                    <div class="highlight-section">
                        <div class="highlight-title">📈 Most Elevated Batsman</div>
                        <div class="highlight-player elevated">${captain.elevatedBatsman}</div>
                    </div>
                    <div class="highlight-section">
                        <div class="highlight-title">🎯 Most Motivated Bowler</div>
                        <div class="highlight-player motivated">${captain.motivatedBowler}</div>
                    </div>
                </div>
            </div>
        `}).join('');
    }

    calculateCaptainStatistics() {
        const captainStats = {};
        
        console.log('📊 Processing matches for captain stats:', this.matches);
        
        // Process all completed matches
        this.matches.forEach(match => {
            // Try multiple field name patterns for captain IDs
            const team1Captain = match.Team1_Captain || match.team1Captain || match.captain1;
            const team2Captain = match.Team2_Captain || match.team2Captain || match.captain2;
            
            console.log(`Match ${match.id || match.Match_ID}: T1 Captain: ${team1Captain}, T2 Captain: ${team2Captain}`);
            
            if (!team1Captain || !team2Captain) {
                console.log('Skipping match - missing captain data');
                return;
            }
            
            // Initialize captain stats if not exists
            if (!captainStats[team1Captain]) {
                captainStats[team1Captain] = this.initializeCaptainStats(team1Captain);
            }
            if (!captainStats[team2Captain]) {
                captainStats[team2Captain] = this.initializeCaptainStats(team2Captain);
            }
            
            // Update games played
            captainStats[team1Captain].gamesPlayed++;
            captainStats[team2Captain].gamesPlayed++;
            
            // Update wins/losses
            const winningTeam = match.Winning_Team || match.winningTeam || match.winner?.name || match.winnerName;
            const team1Name = match.Team1 || match.team1?.name || match.team1 || match.team1Name;
            const team2Name = match.Team2 || match.team2?.name || match.team2 || match.team2Name;
            
            console.log(`Winner: ${winningTeam}, Team1: ${team1Name}, Team2: ${team2Name}`);
            
            if (winningTeam === team1Name) {
                captainStats[team1Captain].gamesWon++;
                captainStats[team2Captain].gamesLost++;
            } else if (winningTeam === team2Name) {
                captainStats[team2Captain].gamesWon++;
                captainStats[team1Captain].gamesLost++;
            }
            
            // Track Man of the Match
            const manOfTheMatch = match.manOfTheMatch || match.Man_Of_The_Match || match.mom || match.mostValuablePlayer;
            console.log(`Man of the Match: ${manOfTheMatch}`);
            
            if (manOfTheMatch) {
                const momPlayerId = typeof manOfTheMatch === 'object' ? manOfTheMatch.id : manOfTheMatch;
                
                // Initialize MOM counts for both captains if not exists
                if (!captainStats[team1Captain].momCounts[momPlayerId]) {
                    captainStats[team1Captain].momCounts[momPlayerId] = 0;
                }
                if (!captainStats[team2Captain].momCounts[momPlayerId]) {
                    captainStats[team2Captain].momCounts[momPlayerId] = 0;
                }
                
                // Check which team the MOM player belongs to and count accordingly
                const team1Players = match.Team1_Composition || match.team1Composition || match.team1Players || [];
                const team2Players = match.Team2_Composition || match.team2Composition || match.team2Players || [];
                
                console.log(`Team1 players: ${team1Players}, Team2 players: ${team2Players}`);
                
                if (team1Players.includes(momPlayerId)) {
                    captainStats[team1Captain].momCounts[momPlayerId]++;
                    console.log(`MOM awarded to ${momPlayerId} under captain ${team1Captain}`);
                } else if (team2Players.includes(momPlayerId)) {
                    captainStats[team2Captain].momCounts[momPlayerId]++;
                    console.log(`MOM awarded to ${momPlayerId} under captain ${team2Captain}`);
                }
            }
            
            // Store match performance data for z-score calculations
            this.storeCaptainPerformanceData(match, team1Captain, team2Captain);
        });
        
        console.log('Final captain stats:', captainStats);
        
        // Calculate derived statistics and convert to array
        const captainResults = Object.keys(captainStats).map(captainId => {
            const stats = captainStats[captainId];
            
            // Enhanced player lookup with debugging
            console.log(`Looking for captain with ID: ${captainId}`);
            console.log(`Available players:`, this.players.map(p => ({ id: p.id, Player_ID: p.Player_ID, name: p.name, Name: p.Name })));
            
            // Manual mapping for known players as fallback
            const playerNameMap = {
                'P001': 'Anuj',
                'P002': 'Anil', 
                'P003': 'Vivek',
                'P004': 'Kiran',
                'P005': 'Ravi Nakka',
                'P006': 'Chiru',
                'P007': 'Aditya',
                'P008': 'Umesh',
                'P009': 'Sriram',
                'P010': 'Naveen',
                'P011': 'Yashwanth',
                'P012': 'Nani',
                'P013': 'Kasim',
                'P014': 'Omi',
                'P015': 'TJ',
                'P016': 'Himalaya',
                'P017': 'Roshan'
            };
            
            const captain = this.players.find(p => 
                p.id === captainId || 
                p.Player_ID === captainId || 
                p.playerId === captainId ||
                String(p.id) === String(captainId) ||
                String(p.Player_ID) === String(captainId)
            );
            
            console.log(`Found captain:`, captain);
            
            let captainName = `Captain ${captainId}`;
            if (captain) {
                captainName = captain.name || captain.Name || captain.playerName || `Player ${captainId}`;
            } else if (playerNameMap[captainId]) {
                captainName = playerNameMap[captainId];
                console.log(`Used manual mapping for ${captainId}: ${captainName}`);
            } else {
                // Try to find by name in player_info from data manager
                if (this.dataManager && this.dataManager.data && this.dataManager.data.player_info) {
                    const playerInfo = this.dataManager.data.player_info.find(p => p.Player_ID === captainId);
                    if (playerInfo) {
                        captainName = playerInfo.Name;
                        console.log(`Found captain name from player_info:`, captainName);
                    }
                }
            }
            
            console.log(`Final captain name: ${captainName} for ID: ${captainId}`);
            
            const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
            let winRateClass = 'win-rate';
            if (winRate >= 70) winRateClass += '';
            else if (winRate >= 50) winRateClass += ' medium';
            else winRateClass += ' low';
            
            return {
                id: captainId,
                name: captainName,
                gamesPlayed: stats.gamesPlayed,
                gamesWon: stats.gamesWon,
                gamesLost: stats.gamesLost,
                winRate: winRate,
                winRateClass: winRateClass,
                luckyPlayer: this.getLuckyPlayer(stats.momCounts),
                elevatedBatsman: this.getElevatedBatsman(captainId),
                motivatedBowler: this.getMotivatedBowler(captainId)
            };
        }).filter(captain => captain.gamesPlayed > 0);
        
        // Sort by win rate (highest first), then by matches played (highest first), then by games won
        captainResults.sort((a, b) => {
            // First, compare win rates
            if (b.winRate !== a.winRate) {
                return b.winRate - a.winRate;
            }
            // If win rates are equal, compare matches played
            if (b.gamesPlayed !== a.gamesPlayed) {
                return b.gamesPlayed - a.gamesPlayed;
            }
            // If both win rate and matches played are equal, compare games won
            return b.gamesWon - a.gamesWon;
        });

        // Identify captains with the same top performance (same win rate and matches played)
        const topWinRate = captainResults.length > 0 ? captainResults[0].winRate : 0;
        const topMatchesPlayed = captainResults.length > 0 ? captainResults[0].gamesPlayed : 0;
        
        let topCaptainCount = 0;
        captainResults.forEach((captain, index) => {
            // Mark as top captain if they have the same win rate and matches played as the leader
            captain.isTopCaptain = (captain.winRate === topWinRate && captain.gamesPlayed === topMatchesPlayed);
            if (captain.isTopCaptain) {
                topCaptainCount++;
            }
        });
        
        // Mark if there are multiple tied captains
        captainResults.forEach(captain => {
            captain.isTiedLeader = (captain.isTopCaptain && topCaptainCount > 1);
        });
        
        console.log(`Found ${topCaptainCount} top captains with win rate ${topWinRate}% and ${topMatchesPlayed} matches played`);
        if (topCaptainCount > 1) {
            console.log('Tied captains:', captainResults.filter(c => c.isTiedLeader).map(c => c.name));
        }
        
        return captainResults;
    }

    initializeCaptainStats(captainId) {
        return {
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            momCounts: {},
            performanceData: []
        };
    }

    storeCaptainPerformanceData(match, team1Captain, team2Captain) {
        // This method would store detailed performance data for z-score calculations
        // For now, we'll implement a simplified version
        // In a full implementation, this would track batting/bowling performance for each player under each captain
    }

    getLuckyPlayer(momCounts) {
        if (Object.keys(momCounts).length === 0) return 'No data';
        
        const maxMoms = Math.max(...Object.values(momCounts));
        if (maxMoms === 0) return 'No data';
        
        // Get all players with the maximum MOMs
        const topPlayers = Object.keys(momCounts).filter(playerId => momCounts[playerId] === maxMoms);
        
        let luckyPlayerId;
        if (topPlayers.length === 1) {
            luckyPlayerId = topPlayers[0];
        } else {
            // If multiple players have same MOM count, find the one from the latest game
            let latestDate = '';
            let latestPlayerId = topPlayers[0];
            
            this.matches.forEach(match => {
                const matchDate = match.Date || match.date || '';
                const manOfTheMatch = match.manOfTheMatch || match.Man_Of_The_Match;
                
                if (manOfTheMatch && topPlayers.includes(manOfTheMatch) && matchDate > latestDate) {
                    latestDate = matchDate;
                    latestPlayerId = manOfTheMatch;
                }
            });
            
            luckyPlayerId = latestPlayerId;
        }
        
        // Find player name - try multiple ID patterns
        let player = this.players.find(p => 
            p.id === luckyPlayerId || 
            p.Player_ID === luckyPlayerId || 
            p.playerId === luckyPlayerId ||
            String(p.id) === String(luckyPlayerId) ||
            String(p.Player_ID) === String(luckyPlayerId)
        );
        
        // Manual mapping for known players as fallback
        const playerNameMap = {
            'P001': 'Anuj',
            'P002': 'Anil', 
            'P003': 'Vivek',
            'P004': 'Kiran',
            'P005': 'Ravi Nakka',
            'P006': 'Chiru',
            'P007': 'Aditya',
            'P008': 'Umesh',
            'P009': 'Sriram',
            'P010': 'Naveen',
            'P011': 'Yashwanth',
            'P012': 'Nani',
            'P013': 'Kasim',
            'P014': 'Omi',
            'P015': 'TJ',
            'P016': 'Himalaya',
            'P017': 'Roshan'
        };
        
        let playerName = `Player ${luckyPlayerId}`;
        if (player) {
            playerName = player.name || player.Name || player.playerName || `Player ${luckyPlayerId}`;
        } else if (playerNameMap[luckyPlayerId]) {
            playerName = playerNameMap[luckyPlayerId];
        } else {
            // Try to find by name in player_info from data manager
            if (this.dataManager && this.dataManager.data && this.dataManager.data.player_info) {
                const playerInfo = this.dataManager.data.player_info.find(p => p.Player_ID === luckyPlayerId);
                if (playerInfo) {
                    playerName = playerInfo.Name;
                }
            }
        }
        
        return `${playerName} (${maxMoms} MOM${maxMoms > 1 ? 's' : ''})`;
    }

    getElevatedBatsman(captainId) {
        // Calculate which batsman performed best under this captain based on z-scores
        console.log(`🏏 Calculating elevated batsman for captain ${captainId}`);
        const playerPerformances = this.calculatePlayerPerformanceUnderCaptain(captainId, 'batting');
        
        console.log(`Found ${playerPerformances.length} batting performances for captain ${captainId}:`, playerPerformances);
        
        if (playerPerformances.length === 0) return 'No batting data';
        
        // First try z-score approach
        let bestPlayer = null;
        let highestZScore = -Infinity;
        
        playerPerformances.forEach(performance => {
            console.log(`Player ${performance.playerName}: z-score = ${performance.zScore}, captain avg = ${performance.captainAvg}, overall avg = ${performance.overallAvg}`);
            if (performance.zScore > highestZScore) {
                highestZScore = performance.zScore;
                bestPlayer = performance;
            }
        });
        
        console.log(`Best batting performer (z-score): ${bestPlayer?.playerName} with z-score ${highestZScore}`);
        
        // If z-score approach doesn't work, fall back to simple average comparison
        if (!bestPlayer || bestPlayer.zScore < 0.1) {
            console.log('Z-score approach failed, trying average comparison');
            bestPlayer = null;
            let highestImprovement = 0;
            
            playerPerformances.forEach(performance => {
                if (performance.captainAvg > performance.overallAvg) {
                    const improvement = performance.captainAvg - performance.overallAvg;
                    console.log(`Player ${performance.playerName}: captain avg = ${performance.captainAvg}, overall avg = ${performance.overallAvg}, improvement = ${improvement}`);
                    if (improvement > highestImprovement) {
                        highestImprovement = improvement;
                        bestPlayer = performance;
                    }
                }
            });
            
            if (!bestPlayer) {
                return `No elevation found (checked ${playerPerformances.length} players)`;
            }
        }
        
        return `${bestPlayer.playerName}`;
    }

    getMotivatedBowler(captainId) {
        // Calculate which bowler performed best under this captain based on z-scores
        console.log(`🎯 Calculating motivated bowler for captain ${captainId}`);
        const playerPerformances = this.calculatePlayerPerformanceUnderCaptain(captainId, 'bowling');
        
        console.log(`Found ${playerPerformances.length} bowling performances for captain ${captainId}:`, playerPerformances);
        
        if (playerPerformances.length === 0) return 'No bowling data';
        
        // First try z-score approach - for bowling, we want the most negative z-score (lower economy is better)
        let bestPlayer = null;
        let lowestZScore = Infinity;
        
        playerPerformances.forEach(performance => {
            console.log(`Bowler ${performance.playerName}: z-score = ${performance.zScore}, captain avg = ${performance.captainAvg}, overall avg = ${performance.overallAvg}`);
            if (performance.zScore < lowestZScore) {
                lowestZScore = performance.zScore;
                bestPlayer = performance;
            }
        });
        
        console.log(`Best bowling performer (z-score): ${bestPlayer?.playerName} with z-score ${lowestZScore}`);
        
        // If z-score approach doesn't work, fall back to simple average comparison
        if (!bestPlayer || bestPlayer.zScore > -0.1) {
            console.log('Z-score approach failed, trying average comparison');
            bestPlayer = null;
            let highestImprovement = 0;
            
            playerPerformances.forEach(performance => {
                if (performance.captainAvg < performance.overallAvg) { // Lower is better for bowling
                    const improvement = performance.overallAvg - performance.captainAvg;
                    console.log(`Bowler ${performance.playerName}: captain avg = ${performance.captainAvg}, overall avg = ${performance.overallAvg}, improvement = ${improvement}`);
                    if (improvement > highestImprovement) {
                        highestImprovement = improvement;
                        bestPlayer = performance;
                    }
                }
            });
            
            if (!bestPlayer) {
                return `No motivation found (checked ${playerPerformances.length} bowlers)`;
            }
        }
        
        return `${bestPlayer.playerName}`;
    }

    calculatePlayerPerformanceUnderCaptain(captainId, type) {
        console.log(`📊 Calculating ${type} performance under captain ${captainId}`);
        const playerStats = {};
        const globalStats = {};
        
        // If we have data manager, use it to get match performances
        let allBattingPerformances = [];
        let allBowlingPerformances = [];
        
        if (this.dataManager && this.dataManager.data) {
            allBattingPerformances = this.dataManager.data.match_batting_performance || [];
            allBowlingPerformances = this.dataManager.data.match_bowling_performance || [];
            console.log(`📈 Found ${allBattingPerformances.length} batting performances and ${allBowlingPerformances.length} bowling performances in data manager`);
        }
        
        console.log(`Processing ${this.matches.length} matches for performance analysis`);
        
        // Gather all player performances from data manager and matches
        this.matches.forEach(match => {
            const team1Captain = match.Team1_Captain || match.team1Captain || match.captain1;
            const team2Captain = match.Team2_Captain || match.team2Captain || match.captain2;
            const isUnderThisCaptain = (team1Captain === captainId || team2Captain === captainId);
            const matchId = match.Match_ID || match.id;
            
            console.log(`Match ${matchId}: T1 Captain: ${team1Captain}, T2 Captain: ${team2Captain}, Under this captain: ${isUnderThisCaptain}`);
            
            // Get performances from data manager based on match ID
            let performances = [];
            if (type === 'batting') {
                performances = allBattingPerformances.filter(perf => perf.Match_ID === matchId);
            } else {
                performances = allBowlingPerformances.filter(perf => perf.Match_ID === matchId);
            }
            
            console.log(`Found ${performances.length} ${type} performances for match ${matchId}`);
            
            // Also check match object itself for performances
            const matchPerformances = type === 'batting' ? 
                (match.battingPerformance || match.battingPerformances || []) : 
                (match.bowlingPerformance || match.bowlingPerformances || []);
            
            performances = performances.concat(matchPerformances);
            console.log(`Total ${performances.length} ${type} performances after including match object data`);
            
            performances.forEach(perf => {
                const playerId = perf.playerId || perf.Player_ID;
                let playerName = perf.playerName || perf.Player || 'Unknown';
                
                if (!playerId) {
                    console.log('Skipping performance - no player ID:', perf);
                    return;
                }
                
                // Find player name from players list with manual mapping
                const playerNameMap = {
                    'P001': 'Anuj', 'P002': 'Anil', 'P003': 'Vivek', 'P004': 'Kiran',
                    'P005': 'Ravi Nakka', 'P006': 'Chiru', 'P007': 'Aditya', 'P008': 'Umesh',
                    'P009': 'Sriram', 'P010': 'Naveen', 'P011': 'Yashwanth', 'P012': 'Nani',
                    'P013': 'Kasim', 'P014': 'Omi', 'P015': 'TJ', 'P016': 'Himalaya', 'P017': 'Roshan'
                };
                
                const player = this.players.find(p => (p.id === playerId || p.Player_ID === playerId));
                const finalPlayerName = player ? (player.name || player.Name) : (playerNameMap[playerId] || playerName);
                
                // Initialize player stats
                if (!playerStats[playerId]) {
                    playerStats[playerId] = { 
                        playerName: finalPlayerName, 
                        underCaptain: [], 
                        overall: [] 
                    };
                }
                if (!globalStats[playerId]) {
                    globalStats[playerId] = { playerName: finalPlayerName, performances: [] };
                }
                
                const metric = type === 'batting' ? 
                    (parseFloat(perf.strikeRate || perf.Strike_Rate || 0)) : 
                    (parseFloat(perf.economy || perf.Economy || 0));
                
                console.log(`Player ${finalPlayerName} (${playerId}): ${type} metric = ${metric}, under captain: ${isUnderThisCaptain}`);
                
                // Store performance
                globalStats[playerId].performances.push(metric);
                
                if (isUnderThisCaptain) {
                    playerStats[playerId].underCaptain.push(metric);
                } else {
                    playerStats[playerId].overall.push(metric);
                }
            });
        });
        
        console.log(`Player stats collected:`, Object.keys(playerStats).map(id => ({
            id, 
            name: playerStats[id].playerName,
            underCaptain: playerStats[id].underCaptain.length,
            overall: playerStats[id].overall.length
        })));
        
        // Calculate z-scores
        const results = [];
        Object.keys(playerStats).forEach(playerId => {
            const player = playerStats[playerId];
            
            if (player.underCaptain.length === 0 || player.overall.length === 0) {
                console.log(`Skipping ${player.playerName} - insufficient data: under captain: ${player.underCaptain.length}, overall: ${player.overall.length}`);
                return;
            }
            
            const captainAvg = this.calculateMean(player.underCaptain);
            const overallAvg = this.calculateMean(player.overall);
            const overallStdDev = this.calculateStandardDeviation(player.overall);
            
            if (overallStdDev === 0) {
                console.log(`Skipping ${player.playerName} - zero standard deviation`);
                return; // Avoid division by zero
            }
            
            const zScore = (captainAvg - overallAvg) / overallStdDev;
            
            console.log(`${player.playerName}: captain avg = ${captainAvg.toFixed(2)}, overall avg = ${overallAvg.toFixed(2)}, std dev = ${overallStdDev.toFixed(2)}, z-score = ${zScore.toFixed(2)}`);
            
            results.push({
                playerId,
                playerName: player.playerName,
                captainAvg,
                overallAvg,
                zScore
            });
        });
        
        console.log(`Final results for ${type} under captain ${captainId}:`, results);
        return results;
    }

    calculateMean(values) {
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    calculateStandardDeviation(values) {
        if (values.length <= 1) return 0;
        
        const mean = this.calculateMean(values);
        const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
        const variance = this.calculateMean(squaredDifferences);
        
        return Math.sqrt(variance);
    }

    removeTeam(teamId) {
        this.teams = this.teams.filter(t => t.id !== teamId);
        this.saveData(false); // Only save locally when removing teams
        this.updateStats();
        this.loadTeams();
        
        this.showNotification('🗑️ Team removed');
    }

    // Match Scoring - Enhanced with detailed tracking like BCCB ScoringScreen
    startNewMatch() {
        if (this.teams.length < 2) {
            this.showNotification('❌ Need at least 2 teams to start a match');
            return;
        }

        // Load match settings from localStorage
        const matchSettings = JSON.parse(localStorage.getItem('match-settings') || '{}');
        const totalOvers = matchSettings.totalOvers || 20;

        this.currentMatch = {
            id: Date.now(),
            team1: this.teams[0],
            team2: this.teams[1],
            team1Id: this.teams[0].id,
            team2Id: this.teams[1].id,
            currentTeam: 1,
            currentInnings: 1,
            team1Score: { 
                runs: 0, 
                wickets: 0, 
                overs: 0, 
                balls: 0,
                batting: true,
                striker: this.teams[0].players[0] || null,
                nonStriker: this.teams[0].players[1] || null,
                extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0 },
                fallOfWickets: [],
                overByOver: []
            },
            team2Score: { 
                runs: 0, 
                wickets: 0, 
                overs: 0, 
                balls: 0,
                batting: false,
                striker: this.teams[1].players[0] || null,
                nonStriker: this.teams[1].players[1] || null,
                extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0 },
                fallOfWickets: [],
                overByOver: []
            },
            bowler: this.teams[1].players[0] || null,
            totalOvers: totalOvers,
            status: 'active',
            ballByBall: [],
            started: new Date().toISOString()
        };

        this.saveData(false); // Save locally only during match setup
        this.updateScoreDisplay();
        this.updateScoringTabView(); // Update scoring tab to show live view
        this.showNotification(`🏏 Match started! ${totalOvers} overs each. Good luck!`);
    }

    captureMatchState() {
        // Capture complete match state for undo functionality
        if (!this.currentMatch) return null;
        
        return {
            team1Score: JSON.parse(JSON.stringify(this.currentMatch.team1Score)),
            team2Score: JSON.parse(JSON.stringify(this.currentMatch.team2Score)),
            currentTeam: this.currentMatch.currentTeam,
            currentInnings: this.currentMatch.currentInnings,
            bowler: this.currentMatch.bowler ? JSON.parse(JSON.stringify(this.currentMatch.bowler)) : null,
            target: this.currentMatch.target,
            waitingForBowlerSelection: this.waitingForBowlerSelection,
            // Capture player stats that might change
            playerStats: this.currentMatch.playerStats ? JSON.parse(JSON.stringify(this.currentMatch.playerStats)) : {}
        };
    }

    // Helper function to ensure batsmen are initialized
    ensureBatsmenInitialized() {
        if (!this.currentMatch) return false;
        
        const currentTeamScore = this.currentMatch.team1Score.batting ? 
            this.currentMatch.team1Score : this.currentMatch.team2Score;
        const battingTeam = this.currentMatch.team1Score.batting ? 
            this.currentMatch.team1 : this.currentMatch.team2;
            
        // If no batsmen are set, initialize them
        if (!currentTeamScore.striker && !currentTeamScore.nonStriker) {
            if (battingTeam && battingTeam.players && battingTeam.players.length >= 2) {
                // Use references to the actual global player objects
                const striker = this.players.find(p => p.id === battingTeam.players[0].id);
                const nonStriker = this.players.find(p => p.id === battingTeam.players[1].id);
                
                if (striker && nonStriker) {
                    // Initialize match-specific stats if not present
                    if (!striker.matchRuns) striker.matchRuns = 0;
                    if (!striker.matchBalls) striker.matchBalls = 0;
                    if (!striker.matchBoundaries) striker.matchBoundaries = { fours: 0, sixes: 0 };
                    
                    if (!nonStriker.matchRuns) nonStriker.matchRuns = 0;
                    if (!nonStriker.matchBalls) nonStriker.matchBalls = 0;
                    if (!nonStriker.matchBoundaries) nonStriker.matchBoundaries = { fours: 0, sixes: 0 };
                    
                    currentTeamScore.striker = striker;
                    currentTeamScore.nonStriker = nonStriker;
                    
                    console.log('Auto-initialized batsmen:', {
                        striker: currentTeamScore.striker.name,
                        nonStriker: currentTeamScore.nonStriker.name
                    });
                    
                    this.updateScoreDisplay();
                    return true;
                }
            }
            return false;
        }
        return true;
    }

    addRuns(runs) {
        // Check if waiting for bowler selection
        if (this.waitingForBowlerSelection) {
            console.log('DEBUG: Blocked run scoring - waiting for bowler selection'); // Debug log
            this.showNotification('⚠️ Please select a bowler first before continuing');
            return;
        }
        
        console.log('DEBUG: Adding runs:', runs, 'waitingForBowlerSelection:', this.waitingForBowlerSelection); // Debug log
        
        if (!this.currentMatch) {
            this.startNewMatch();
        }

        // Ensure batsmen are initialized
        if (!this.ensureBatsmenInitialized()) {
            this.showNotification('⚠️ Unable to initialize batsmen. Please check team setup.');
            return;
        }

        const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1Score : this.currentMatch.team2Score;

        // Store state before the ball for undo functionality
        const stateBeforeBall = this.captureMatchState();

        // Record ball-by-ball details (BCCB style)
        const ballDetails = {
            over: currentTeamScore.overs,
            ball: currentTeamScore.balls + 1,
            runs: runs,
            batsman: currentTeamScore.striker?.name || 'Unknown',
            batsmanId: currentTeamScore.striker?.id || null,
            bowler: this.currentMatch.bowler?.name || 'Unknown',
            bowlerId: this.currentMatch.bowler?.id || null,
            team: this.currentMatch.currentTeam === 1 ? 'team1' : 'team2',
            isWicket: false,
            isWide: false,
            isNoBall: false,
            isExtra: false,
            extras: null,
            wicket: false,
            actionType: 'runs',
            timestamp: new Date().toISOString(),
            stateBeforeBall: stateBeforeBall // Store complete state for undo
        };

        // BCCB Run Allocation Logic for regular delivery:
        // 1. Team score increases by runs
        // 2. Batsman gets runs credited
        // 3. Bowler concedes runs
        // 4. Both batsman and bowler get ball counted

        // Update team score
        currentTeamScore.runs += runs;
        currentTeamScore.balls++;

        // Immediate over completion check to prevent balls > 6
        if (currentTeamScore.balls >= 6) {
            console.log('DEBUG: Over completed! Resetting balls and incrementing overs');
            currentTeamScore.overs++;
            currentTeamScore.balls = 0;
            currentTeamScore.overByOver.push(runs);
            this.swapStrike(); // BCCB: change strike at end of over
            this.changeBowlerAutomatically(); // Auto change bowler every over
        }

        console.log(`DEBUG: After ball - Overs: ${currentTeamScore.overs}, Balls: ${currentTeamScore.balls}`); // Debug log

        // Update striker's batting stats (BCCB: batsman gets runs and faces ball)
        if (currentTeamScore.striker) {
            this.updateBatsmanStats(currentTeamScore.striker.id, runs, 1);
        }

        // Update bowler's stats (BCCB: bowler concedes runs and bowls a ball)
        if (this.currentMatch.bowler) {
            this.updateBowlerStats(this.currentMatch.bowler.id, runs, 1, 0);
        }

        // Handle strike rotation (BCCB: odd runs = change strike)
        if (runs % 2 === 1) {
            this.swapStrike();
        }

        // Handle boundaries (BCCB: track 4s and 6s separately)
        if (runs === 4) {
            this.updateBatsmanBoundaries(currentTeamScore.striker?.id, 'fours');
        } else if (runs === 6) {
            this.updateBatsmanBoundaries(currentTeamScore.striker?.id, 'sixes');
        }

        // Check for target achieved in second innings
        if (this.currentMatch.currentInnings === 2 && this.currentMatch.target) {
            if (currentTeamScore.runs >= this.currentMatch.target) {
                this.showNotification(`🎉 Target achieved! ${this.currentMatch.currentTeam === 1 ? this.currentMatch.team1.name : this.currentMatch.team2.name} wins!`);
                this.endMatch();
                return;
            }
        }

        // Check for end of innings after over completion
        if (currentTeamScore.overs >= this.currentMatch.totalOvers) {
            this.endInnings();
            return;
        }

        this.currentMatch.ballByBall.push(ballDetails);
        this.saveData(false); // Save locally only during match play
        this.updateScoreDisplay();
        this.updateOverSummary(); // Update the dynamic over summary
        
        this.showNotification(`+${runs} runs! ${runs === 4 ? '🔥 FOUR!' : runs === 6 ? '🚀 SIX!' : ''}`);
    }

    addWicket() {
        if (!this.currentMatch) {
            this.startNewMatch();
        }

        const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1Score : this.currentMatch.team2Score;

        // Record wicket details
        const wicketDetails = {
            over: currentTeamScore.overs,
            ball: currentTeamScore.balls + 1,
            runs: 0,
            batsman: currentTeamScore.striker?.name || 'Unknown',
            bowler: this.currentMatch.bowler?.name || 'Unknown',
            team: this.currentMatch.currentTeam === 1 ? 'team1' : 'team2',
            isWicket: true,
            isWide: false,
            isNoBall: false,
            extras: null,
            wicket: true,
            dismissal: 'bowled', // Default dismissal type
            timestamp: new Date().toISOString()
        };

        currentTeamScore.wickets++;
        
        // Auto-detect if we need to count this ball
        // Check if this delivery already exists in ballByBall (indicating runs were already scored)
        const ballByBall = this.currentMatch.ballByBall || [];
        const currentBallNumber = currentTeamScore.balls + 1;
        const existingDelivery = ballByBall.find(ball => 
            ball.over === currentTeamScore.overs && 
            ball.ball === currentBallNumber &&
            !ball.wicket // Only count non-wicket deliveries to avoid conflicts
        );
        
        // Capture correct over/ball info BEFORE any changes for wicket record
        const actualOverNumber = currentTeamScore.overs;
        const actualBallNumber = currentTeamScore.balls + (existingDelivery ? 0 : 1);
        
        if (!existingDelivery) {
            // This is a wicket-only delivery, count the ball
            currentTeamScore.balls++;
            
            // Immediate over completion check to prevent balls > 6
            if (currentTeamScore.balls >= 6) {
                console.log('DEBUG WICKET: Over completed! Resetting balls and incrementing overs');
                currentTeamScore.overs++;
                currentTeamScore.balls = 0;
                this.swapStrike(); // BCCB: change strike at end of over
                this.changeBowlerAutomatically(); // Auto change bowler every over
            }
            
            console.log('DEBUG WICKET: Ball incremented for wicket-only delivery');
        } else {
            console.log('DEBUG WICKET: Ball already counted, wicket added to existing delivery');
        }

        // Update wicket details with the ACTUAL over/ball where wicket occurred
        wicketDetails.over = actualOverNumber;
        wicketDetails.ball = actualBallNumber;

        // Record fall of wicket
        currentTeamScore.fallOfWickets.push({
            wicket: currentTeamScore.wickets,
            runs: currentTeamScore.runs,
            batsman: currentTeamScore.striker?.name || 'Unknown',
            over: `${currentTeamScore.overs}.${currentTeamScore.balls}`
        });

        // Update bowler's wicket count
        if (this.currentMatch.bowler) {
            this.updateBowlerStats(this.currentMatch.bowler.id, 0, 1, 1);
        }

        // Update batsman as out with basic dismissal info
        if (currentTeamScore.striker) {
            const bowlerName = this.currentMatch.bowler?.name || '';
            this.setBatsmanOut(currentTeamScore.striker.id, 'bowled', bowlerName, '');
        }

        // Set new batsman (simplified - get next available player)
        const currentTeam = this.currentMatch.currentTeam === 1 ? this.currentMatch.team1 : this.currentMatch.team2;
        currentTeamScore.striker = this.getNextBatsman(currentTeam);

        // Check for end of innings (over completion is handled immediately when balls are incremented)
        if (currentTeamScore.wickets >= currentTeam.players.length - 1 || 
            currentTeamScore.overs >= this.currentMatch.totalOvers) {
            this.endInnings();
            return;
        }

        // Check if target achieved (just in case wicket happened on the winning run)
        if (this.currentMatch.currentInnings === 2 && this.currentMatch.target) {
            if (currentTeamScore.runs >= this.currentMatch.target) {
                this.showNotification(`🎉 Target achieved! ${this.currentMatch.currentTeam === 1 ? this.currentMatch.team1.name : this.currentMatch.team2.name} wins!`);
                this.endMatch();
                return;
            }
        }

        this.currentMatch.ballByBall.push(wicketDetails);
        this.saveData(false); // Save locally only during match play
        this.updateScoreDisplay();
        
        this.showNotification('🎯 WICKET! Great bowling!');
    }

    swapStrike() {
        const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1Score : this.currentMatch.team2Score;
        
        // Check for last man standing scenario (same player as striker and non-striker)
        if (currentTeamScore.striker && currentTeamScore.nonStriker && 
            currentTeamScore.striker.id === currentTeamScore.nonStriker.id) {
            console.log('Last man standing - no strike rotation');
            return; // No strike rotation in last man standing
        }
        
        const temp = currentTeamScore.striker;
        currentTeamScore.striker = currentTeamScore.nonStriker;
        currentTeamScore.nonStriker = temp;
    }

    updateBatsmanStats(playerId, runs, balls) {
        // Find and update the player in the global players array (for career stats)
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            // Initialize match-specific stats if not present
            if (!player.matchRuns) player.matchRuns = 0;
            if (!player.matchBalls) player.matchBalls = 0;
            if (!player.boundaries) player.boundaries = { fours: 0, sixes: 0 };
            
            // Update current match stats (for live display)
            player.matchRuns += runs;
            player.matchBalls += balls;
            
            // Update career stats (for overall statistics)
            player.runs += runs;
            // Note: balls faced would need a separate field in player data structure
        }
        
        // Safety check: If striker/nonStriker are separate objects (not references),
        // update them too to maintain consistency
        if (this.currentMatch) {
            const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
                this.currentMatch.team1Score : this.currentMatch.team2Score;
            
            // Check if this is last man standing (both striker and non-striker are the same player)
            const isLastManStanding = currentTeamScore.striker && currentTeamScore.nonStriker &&
                currentTeamScore.striker.id === currentTeamScore.nonStriker.id;
                
            // Only update if they are separate objects from the global player
            if (currentTeamScore.striker && currentTeamScore.striker.id === playerId && 
                currentTeamScore.striker !== player) {
                if (!currentTeamScore.striker.matchRuns) currentTeamScore.striker.matchRuns = 0;
                if (!currentTeamScore.striker.matchBalls) currentTeamScore.striker.matchBalls = 0;
                currentTeamScore.striker.matchRuns += runs;
                currentTeamScore.striker.matchBalls += balls;
            }
            
            // For last man standing, don't update non-striker separately as it's the same player
            if (currentTeamScore.nonStriker && currentTeamScore.nonStriker.id === playerId && 
                currentTeamScore.nonStriker !== player && !isLastManStanding) {
                if (!currentTeamScore.nonStriker.matchRuns) currentTeamScore.nonStriker.matchRuns = 0;
                if (!currentTeamScore.nonStriker.matchBalls) currentTeamScore.nonStriker.matchBalls = 0;
                currentTeamScore.nonStriker.matchRuns += runs;
                currentTeamScore.nonStriker.matchBalls += balls;
            }
        }
    }

    updateBatsmanBoundaries(playerId, type) {
        // Update global player stats
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            if (!player.boundaries) player.boundaries = { fours: 0, sixes: 0 };
            player.boundaries[type]++;
            
            // Also update match-specific boundaries for current match display
            if (!player.matchBoundaries) player.matchBoundaries = { fours: 0, sixes: 0 };
            player.matchBoundaries[type]++;
        }
        
        // BCCB Logic: Also update the actual striker object in the match
        if (this.currentMatch) {
            const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
                this.currentMatch.team1Score : this.currentMatch.team2Score;
                
            // Update striker boundaries if this is the striker
            if (currentTeamScore.striker && currentTeamScore.striker.id === playerId) {
                if (!currentTeamScore.striker.matchBoundaries) {
                    currentTeamScore.striker.matchBoundaries = { fours: 0, sixes: 0 };
                }
                currentTeamScore.striker.matchBoundaries[type]++;
            }
        }
    }

    updateBowlerStats(playerId, runs, balls, wickets) {
        // Update global player stats
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            // Initialize match-specific bowling stats if not present
            if (!player.matchBowlingRuns) player.matchBowlingRuns = 0;
            if (!player.matchBowlingBalls) player.matchBowlingBalls = 0;
            if (!player.matchBowlingWickets) player.matchBowlingWickets = 0;
            
            // Update current match bowling stats
            player.matchBowlingRuns += runs;
            player.matchBowlingBalls += balls;
            player.matchBowlingWickets += wickets;
            
            // Update career bowling stats
            player.wickets += wickets;
            // Note: would need separate fields for bowling runs conceded and balls bowled in player data structure
        }
        
        // Safety check: If bowler is a separate object (not a reference), update it too
        if (this.currentMatch && this.currentMatch.bowler && 
            this.currentMatch.bowler.id === playerId && this.currentMatch.bowler !== player) {
            if (!this.currentMatch.bowler.matchBowlingRuns) this.currentMatch.bowler.matchBowlingRuns = 0;
            if (!this.currentMatch.bowler.matchBowlingBalls) this.currentMatch.bowler.matchBowlingBalls = 0;
            if (!this.currentMatch.bowler.matchBowlingWickets) this.currentMatch.bowler.matchBowlingWickets = 0;
            
            this.currentMatch.bowler.matchBowlingRuns += runs;
            this.currentMatch.bowler.matchBowlingBalls += balls;
            this.currentMatch.bowler.matchBowlingWickets += wickets;
        }
    }

    setBatsmanOut(playerId, dismissalType = '', dismissalBowler = '', dismissalFielder = '') {
        console.log('setBatsmanOut called for player ID:', playerId);
        
        // Update player in global players array
        const globalPlayer = this.players.find(p => p.id === playerId || String(p.id) === String(playerId));
        if (globalPlayer) {
            globalPlayer.currentMatchStatus = 'out';
            globalPlayer.isOut = true;
            globalPlayer.dismissalType = dismissalType;
            globalPlayer.dismissalBowler = dismissalBowler;
            globalPlayer.dismissalFielder = dismissalFielder;
            console.log('Updated global player:', globalPlayer.name, 'status:', globalPlayer.currentMatchStatus);
        } else {
            console.warn('Global player not found for ID:', playerId);
        }

        // Also update player in the current match teams (both team1 and team2)
        if (this.currentMatch) {
            const team1Player = this.currentMatch.team1?.players?.find(p => p.id === playerId || String(p.id) === String(playerId));
            if (team1Player) {
                team1Player.currentMatchStatus = 'out';
                team1Player.isOut = true;
                team1Player.dismissalType = dismissalType;
                team1Player.dismissalBowler = dismissalBowler;
                team1Player.dismissalFielder = dismissalFielder;
            }

            const team2Player = this.currentMatch.team2?.players?.find(p => p.id === playerId || String(p.id) === String(playerId));
            if (team2Player) {
                team2Player.currentMatchStatus = 'out';
                team2Player.isOut = true;
                team2Player.dismissalType = dismissalType;
                team2Player.dismissalBowler = dismissalBowler;
                team2Player.dismissalFielder = dismissalFielder;
            }
        }

        // Also update in teams array if it exists
        if (this.teams) {
            this.teams.forEach(team => {
                const teamPlayer = team.players?.find(p => p.id === playerId || String(p.id) === String(playerId));
                if (teamPlayer) {
                    teamPlayer.currentMatchStatus = 'out';
                    teamPlayer.isOut = true;
                    teamPlayer.dismissalType = dismissalType;
                    teamPlayer.dismissalBowler = dismissalBowler;
                    teamPlayer.dismissalFielder = dismissalFielder;
                }
            });
        }
        
        // Refresh score display to show updated status
        if (this.updateScoreDisplay) {
            this.updateScoreDisplay();
        }
    }

    getNextBatsman(team) {
        // Simplified - return next available player
        return team.players.find(p => !p.currentMatchStatus || p.currentMatchStatus !== 'out') || team.players[0];
    }

    // Enhanced BCCB Scoring Components
    addExtras(extraType, totalRuns = 1, runsScored = 0) {
        // Define boolean flags at the start for consistent use throughout function
        const normalizedExtraType = extraType.toLowerCase();
        const isNoBall = normalizedExtraType === 'noball' || normalizedExtraType === 'nb';
        const isWide = normalizedExtraType === 'wide' || normalizedExtraType === 'w';
        
        // Get match settings for penalty runs
        const matchSettings = JSON.parse(localStorage.getItem('match-settings') || '{}');
        const wideRuns = parseInt(matchSettings.runsOnWide || '1');
        const noBallRuns = parseInt(matchSettings.runsOnNoBall || '1');
        
        // Check if waiting for bowler selection
        if (this.waitingForBowlerSelection) {
            this.showNotification('⚠️ Please select a bowler first before continuing');
            return;
        }
        
        if (!this.currentMatch) {
            this.startNewMatch();
        }

        // Ensure batsmen are initialized
        if (!this.ensureBatsmenInitialized()) {
            this.showNotification('⚠️ Unable to initialize batsmen. Please check team setup.');
            return;
        }

        const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1Score : this.currentMatch.team2Score;

        // Store state before the ball for undo functionality
        const stateBeforeBall = this.captureMatchState();

        // BCCB Logic for different extra types:
        // No Ball (Nb): Bowler concedes 1 + runs_scored, batsman gets only runs_scored, batsman faces ball
        // Wide (Wd): Bowler concedes 1 + runs_scored, batsman gets nothing, no ball faced
        // Bye: Batsman faces ball but gets no runs, bowler concedes no runs

        let baseExtraRuns = 0;
        let batsmenRuns = runsScored;
        let bowlerConcedes = 0;
        let batsmanFacesBall = false;
        
        let normalizedExtraForScorecard = extraType; // Default to original type
        
        if (normalizedExtraType === 'wide' || normalizedExtraType === 'w') {
            // BCCB Wide: penalty + runs_scored, bowler concedes all, batsman gets nothing, no ball faced
            baseExtraRuns = wideRuns;
            bowlerConcedes = wideRuns + runsScored;
            batsmenRuns = 0;
            batsmanFacesBall = false;
            normalizedExtraForScorecard = 'wides'; // Match the scorecard key
        } else if (normalizedExtraType === 'noball' || normalizedExtraType === 'nb') {
            // BCCB No Ball: penalty + runs_scored, bowler concedes all, batsman gets only runs_scored, faces ball
            baseExtraRuns = noBallRuns;
            bowlerConcedes = noBallRuns + runsScored;
            batsmenRuns = runsScored;
            batsmanFacesBall = true;
            normalizedExtraForScorecard = 'noBalls'; // Match the scorecard key
        } else if (normalizedExtraType === 'bye' || normalizedExtraType === 'byes') {
            // BCCB Bye: No penalty, bowler concedes nothing, batsman gets nothing but faces ball
            baseExtraRuns = 0;
            bowlerConcedes = 0;
            batsmenRuns = 0;
            batsmanFacesBall = true;
            normalizedExtraForScorecard = 'byes'; // Match the scorecard key
        } else if (normalizedExtraType === 'legbye' || normalizedExtraType === 'legbyes') {
            // BCCB Leg Bye: No penalty, bowler concedes nothing, batsman gets nothing but faces ball
            baseExtraRuns = 0;
            bowlerConcedes = 0;
            batsmenRuns = 0;
            batsmanFacesBall = true;
            normalizedExtraForScorecard = 'legByes'; // Match the scorecard key
            batsmanFacesBall = true;
            // normalizedExtraType is already correct from the toLowerCase() call
        }

        // Record extra details with new format
        const extraDetails = {
            over: currentTeamScore.overs,
            ball: currentTeamScore.balls + (isWide || isNoBall ? 0 : 1),
            runs: totalRuns,
            batsman: currentTeamScore.striker?.name || 'Unknown',
            batsmanId: currentTeamScore.striker?.id || null,
            bowler: this.currentMatch.bowler?.name || 'Unknown',
            bowlerId: this.currentMatch.bowler?.id || null,
            team: this.currentMatch.currentTeam === 1 ? 'team1' : 'team2',
            isWicket: false,
            isWide: isWide,
            isNoBall: isNoBall,
            isExtra: true,
            extras: extraType,
            wicket: false,
            actionType: 'extra',
            timestamp: new Date().toISOString(),
            stateBeforeBall: stateBeforeBall // Store complete state for undo
        };

        // Update scores
        currentTeamScore.runs += totalRuns;
        if (!currentTeamScore.extras[normalizedExtraForScorecard]) {
            currentTeamScore.extras[normalizedExtraForScorecard] = 0;
        }
        currentTeamScore.extras[normalizedExtraForScorecard] += totalRuns;

        // BCCB Batsman Stats Update
        if (currentTeamScore.striker) {
            if (batsmanFacesBall) {
                // Batsman faces the ball (no-ball, bye)
                this.updateBatsmanStats(currentTeamScore.striker.id, batsmenRuns, 1);
            }
            // For wide, batsman doesn't face ball and gets no runs
        }

        // BCCB Bowler Stats Update
        if (this.currentMatch.bowler) {
            if (isNoBall) {
                // No ball: bowler concedes all runs and bowls a ball (counted as ball faced by batsman)
                this.updateBowlerStats(this.currentMatch.bowler.id, bowlerConcedes, 1, 0);
            } else if (isWide) {
                // Wide: bowler concedes all runs but no ball counted (not faced by batsman)
                this.updateBowlerStats(this.currentMatch.bowler.id, bowlerConcedes, 0, 0);
            } else if (normalizedExtraType === 'byes' || normalizedExtraType === 'bye') {
                // Byes: bowler doesn't concede runs but bowls a legal ball
                this.updateBowlerStats(this.currentMatch.bowler.id, 0, 1, 0);
            } else if (normalizedExtraType === 'legbye' || normalizedExtraType === 'legbyes') {
                // Leg Byes: bowler doesn't concede runs but bowls a legal ball
                this.updateBowlerStats(this.currentMatch.bowler.id, 0, 1, 0);
            }
        }

        // Handle ball counting - wide and no-ball don't count as legal deliveries
        // Using the boolean flags defined at the top of the function
        if (!isWide && !isNoBall) {
            currentTeamScore.balls++;
            
            // Immediate over completion check to prevent balls > 6
            if (currentTeamScore.balls >= 6) {
                console.log('DEBUG EXTRAS: Over completed! Resetting balls and incrementing overs');
                currentTeamScore.overs++;
                currentTeamScore.balls = 0;
                this.swapStrike();
                this.changeBowlerAutomatically(); // Auto change bowler every over
            }
            
            console.log(`DEBUG EXTRAS: After ${extraType} - Overs: ${currentTeamScore.overs}, Balls: ${currentTeamScore.balls}`); // Debug log
        }

        // Handle strike rotation - BCCB: Only on runs scored by batsmen, not penalty runs
        if (batsmenRuns > 0 && batsmenRuns % 2 === 1) {
            this.swapStrike();
        }

        // Check for target achieved in second innings
        if (this.currentMatch.currentInnings === 2 && this.currentMatch.target) {
            if (currentTeamScore.runs >= this.currentMatch.target) {
                this.showNotification(`🎉 Target achieved! ${this.currentMatch.currentTeam === 1 ? this.currentMatch.team1.name : this.currentMatch.team2.name} wins!`);
                this.endMatch();
                return;
            }
        }

        this.currentMatch.ballByBall.push(extraDetails);

        // Check for end of innings after over completion
        if (currentTeamScore.overs >= this.currentMatch.totalOvers) {
            this.endInnings();
            return;
        }
        this.saveData(false);
        this.updateScoreDisplay();
        this.updateOverSummary();
        
        // BCCB-style notification
        const extraDisplayNames = {
            'wide': 'Wide',
            'noball': 'No Ball',
            'byes': 'Bye'
        };
        const extraName = extraDisplayNames[extraType] || extraType;
        this.showNotification(`${extraName}! +${totalRuns} runs to team`);
    }

    addWicketWithDetails(dismissalType = 'bowled', fielder = null) {
        if (!this.currentMatch) {
            this.startNewMatch();
        }

        const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1Score : this.currentMatch.team2Score;

        // Record detailed wicket information
        const wicketDetails = {
            over: currentTeamScore.overs,
            ball: currentTeamScore.balls + 1,
            runs: 0,
            batsman: currentTeamScore.striker?.name || 'Unknown',
            bowler: this.currentMatch.bowler?.name || 'Unknown',
            extras: null,
            wicket: true,
            dismissal: dismissalType,
            fielder: fielder,
            timestamp: new Date().toISOString()
        };

        currentTeamScore.wickets++;
        
        // Auto-detect if we need to count this ball
        // Check if this delivery already exists in ballByBall (indicating runs were already scored)
        const ballByBall = this.currentMatch.ballByBall || [];
        const currentBallNumber = currentTeamScore.balls + 1;
        const existingDelivery = ballByBall.find(ball => 
            ball.over === currentTeamScore.overs && 
            ball.ball === currentBallNumber &&
            !ball.wicket // Only count non-wicket deliveries to avoid conflicts
        );
        
        // Capture correct over/ball info BEFORE any changes for wicket record
        const actualOverNumber = currentTeamScore.overs;
        const actualBallNumber = currentTeamScore.balls + (existingDelivery ? 0 : 1);
        
        if (!existingDelivery) {
            // This is a wicket-only delivery, count the ball
            currentTeamScore.balls++;
            
            // Immediate over completion check to prevent balls > 6
            if (currentTeamScore.balls >= 6) {
                console.log('DEBUG WICKET: Over completed! Resetting balls and incrementing overs');
                currentTeamScore.overs++;
                currentTeamScore.balls = 0;
                this.swapStrike(); // BCCB: change strike at end of over
                this.changeBowlerAutomatically(); // Auto change bowler every over
            }
            
            console.log('DEBUG WICKET: Ball incremented for wicket-only delivery');
        } else {
            console.log('DEBUG WICKET: Ball already counted, wicket added to existing delivery');
        }

        // Update wicket details with the ACTUAL over/ball where wicket occurred
        wicketDetails.over = actualOverNumber;
        wicketDetails.ball = actualBallNumber;

        // Record fall of wicket with detailed information
        currentTeamScore.fallOfWickets.push({
            wicket: currentTeamScore.wickets,
            runs: currentTeamScore.runs,
            batsman: currentTeamScore.striker?.name || 'Unknown',
            dismissal: dismissalType,
            bowler: dismissalType !== 'run out' ? this.currentMatch.bowler?.name : null,
            fielder: fielder,
            over: `${currentTeamScore.overs}.${currentTeamScore.balls}`,
            partnership: this.calculateCurrentPartnership()
        });

        // Update bowler's wicket count (except for run outs)
        if (this.currentMatch.bowler && dismissalType !== 'run out') {
            this.updateBowlerStats(this.currentMatch.bowler.id, 0, 1, 1);
        }

        // Update batsman as out with dismissal details
        if (currentTeamScore.striker) {
            const bowlerName = dismissalType !== 'run out' ? (this.currentMatch.bowler?.name || '') : '';
            this.setBatsmanOut(currentTeamScore.striker.id, dismissalType, bowlerName, fielder || '');
        }

        // Set new batsman
        const currentTeam = this.currentMatch.currentTeam === 1 ? this.currentMatch.team1 : this.currentMatch.team2;
        currentTeamScore.striker = this.getNextBatsman(currentTeam);

        // Complete the over if needed
        if (currentTeamScore.balls === 6) {
            currentTeamScore.overs++;
            currentTeamScore.balls = 0;
            this.swapStrike();
        }

        // Check for end of innings
        if (currentTeamScore.wickets >= currentTeam.players.length - 1 || 
            currentTeamScore.overs >= this.currentMatch.totalOvers) {
            this.endInnings();
            return;
        }

        this.currentMatch.ballByBall.push(wicketDetails);
        this.saveData(false);
        this.updateScoreDisplay();
        
        this.showNotification(`🎯 WICKET! ${dismissalType.toUpperCase()}!`);
    }

    calculateCurrentPartnership() {
        const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1Score : this.currentMatch.team2Score;
        
        // Simple partnership calculation - runs since last wicket
        const lastWicketRuns = currentTeamScore.fallOfWickets.length > 0 ? 
            currentTeamScore.fallOfWickets[currentTeamScore.fallOfWickets.length - 1].runs : 0;
        
        return currentTeamScore.runs - lastWicketRuns;
    }

    changeBowler(newBowlerId) {
        if (!this.currentMatch) return;

        const newBowler = this.players.find(p => p.id === newBowlerId);
        if (newBowler) {
            this.currentMatch.bowler = newBowler;
            this.updateScoreDisplay();
            this.showNotification(`🎳 ${newBowler.name} is now bowling`);
        }
    }

    updateMatchSettings(settings) {
        if (!this.currentMatch) return;

        if (settings.totalOvers) {
            this.currentMatch.totalOvers = settings.totalOvers;
        }
        
        this.saveData(false);
        this.showNotification('⚙️ Match settings updated');
    }

    // Update bye button visibility based on settings
    updateByeButtonVisibility() {
        const matchSettings = JSON.parse(localStorage.getItem('match-settings') || '{}');
        const enableByes = matchSettings.enableByes === true;
        
        const byeBtn = document.getElementById('byeBtn');
        const legByeBtn = document.getElementById('legByeBtn');
        
        if (byeBtn) {
            byeBtn.style.display = enableByes ? 'inline-block' : 'none';
        }
        
        if (legByeBtn) {
            legByeBtn.style.display = enableByes ? 'inline-block' : 'none';
        }
        
        console.log(`🎯 Bye buttons visibility updated: ${enableByes ? 'VISIBLE' : 'HIDDEN'}`);
    }

    getDetailedScorecard() {
        if (!this.currentMatch) return null;

        // Calculate required run rate for second innings
        let requiredRunRate = null;
        if (this.currentMatch.currentInnings === 2 && this.currentMatch.target) {
            const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
                this.currentMatch.team1Score : this.currentMatch.team2Score;
            const runsNeeded = this.currentMatch.target - currentTeamScore.runs;
            const totalBalls = this.currentMatch.totalOvers * 6;
            const ballsPlayed = (currentTeamScore.overs * 6) + currentTeamScore.balls;
            const ballsRemaining = totalBalls - ballsPlayed;
            const oversRemaining = ballsRemaining / 6;
            
            if (oversRemaining > 0 && runsNeeded > 0) {
                requiredRunRate = (runsNeeded / oversRemaining).toFixed(2);
            }
        }

        return {
            matchInfo: {
                team1: this.currentMatch.team1.name,
                team2: this.currentMatch.team2.name,
                totalOvers: this.currentMatch.totalOvers,
                status: this.currentMatch.status,
                currentInnings: this.currentMatch.currentInnings
            },
            target: this.currentMatch.target,
            requiredRunRate: requiredRunRate,
            team1Scorecard: this.generateTeamScorecard(this.currentMatch.team1Score, this.currentMatch.team1),
            team2Scorecard: this.generateTeamScorecard(this.currentMatch.team2Score, this.currentMatch.team2),
            ballByBall: this.currentMatch.ballByBall,
            currentState: {
                currentTeam: this.currentMatch.currentTeam,
                striker: this.currentMatch.currentTeam === 1 ? 
                    this.currentMatch.team1Score.striker : this.currentMatch.team2Score.striker,
                nonStriker: this.currentMatch.currentTeam === 1 ? 
                    this.currentMatch.team1Score.nonStriker : this.currentMatch.team2Score.nonStriker,
                bowler: this.currentMatch.bowler
            }
        };
    }

    generateTeamScorecard(teamScore, team) {
        // Calculate run rate properly including partial overs
        const totalBalls = (teamScore.overs * 6) + teamScore.balls;
        const runRate = totalBalls > 0 ? ((teamScore.runs * 6) / totalBalls).toFixed(2) : '0.00';
        
        return {
            totalScore: `${teamScore.runs}/${teamScore.wickets}`,
            overs: `${teamScore.overs}.${teamScore.balls}`,
            runRate: runRate,
            extras: teamScore.extras,
            fallOfWickets: teamScore.fallOfWickets,
            battingCard: this.generateBattingCard(team, teamScore),
            bowlingCard: this.generateBowlingCard(team)
        };
    }

    generateBattingCard(team, teamScore) {
        console.log('generateBattingCard called for team:', team.name);
        return team.players.map(player => {
            const isStriker = teamScore.striker?.id === player.id;
            const isNonStriker = teamScore.nonStriker?.id === player.id;
            const isOut = player.currentMatchStatus === 'out';
            
            console.log('Player:', player.name, 'currentMatchStatus:', player.currentMatchStatus, 'isOut:', isOut);
            
            const runs = player.matchRuns || 0;
            const balls = player.matchBalls || 0;
            const fours = (player.matchBoundaries?.fours || player.boundaries?.fours) || 0;
            const sixes = (player.matchBoundaries?.sixes || player.boundaries?.sixes) || 0;
            
            let status = 'yet to bat';
            if (isOut) {
                status = 'out';
            } else if (isStriker) {
                status = 'striker*';
            } else if (isNonStriker) {
                status = 'non-striker*';
            } else if (runs > 0 || balls > 0) {
                status = 'not out';
            }
            
            return {
                name: player.name,
                status: status,
                runs: runs,
                balls: balls,
                fours: fours,
                sixes: sixes,
                strikeRate: balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0'
            };
        });
    }

    generateBowlingCard(team) {
        return team.players.map(player => {
            const ballsBowled = player.matchBowlingBalls || 0;
            const overs = ballsBowled > 0 ? `${Math.floor(ballsBowled / 6)}.${ballsBowled % 6}` : '0.0';
            const runsConceded = player.matchBowlingRuns || 0;
            const wickets = player.matchBowlingWickets || 0;
            const economy = ballsBowled >= 6 ? (runsConceded / (ballsBowled / 6)).toFixed(2) : 
                           ballsBowled > 0 ? ((runsConceded / ballsBowled) * 6).toFixed(2) : '0.00';
            
            return {
                name: player.name,
                overs: overs,
                runs: runsConceded,
                wickets: wickets,
                economy: economy
            };
        }).filter(bowler => (bowler.overs !== '0.0' && bowler.runs > 0) || bowler.wickets > 0);
    }

    endInnings() {
        console.log('=== END INNINGS CALLED ===');
        console.log('Current innings:', this.currentMatch.currentInnings);
        console.log('Current team:', this.currentMatch.currentTeam);
        
        if (this.currentMatch.currentInnings === 1) {
            // Store first innings data
            const firstInningsScore = this.currentMatch.currentTeam === 1 ? 
                this.currentMatch.team1Score : this.currentMatch.team2Score;
            
            console.log('First innings score:', firstInningsScore.runs);
            
            // Calculate target
            const target = firstInningsScore.runs + 1;
            
            // Store target for later use
            this.currentMatch.target = target;
            this.currentMatch.firstInningsComplete = true;
            
            console.log('First innings complete - Target:', target);
            
            // Show innings completion popup
            this.showInningsCompletionPopup(target);
            
        } else {
            // Match complete after second innings
            console.log('Match complete after second innings');
            this.endMatch();
        }
    }

    showInningsCompletionPopup(target) {
        // Get team names
        const battingTeam = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team2 : this.currentMatch.team1;
        const bowlingTeam = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1 : this.currentMatch.team2;

        // Create popup overlay
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        // Create popup content
        const popup = document.createElement('div');
        popup.className = 'innings-completion-popup';
        popup.style.cssText = `
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            border-radius: 15px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            border: 2px solid rgba(34, 197, 94, 0.3);
        `;

        popup.innerHTML = `
            <h2 style="color: #22c55e; margin-bottom: 20px; font-size: 24px;">
                🏏 First Innings Complete!
            </h2>
            <div style="background: rgba(34, 197, 94, 0.1); padding: 15px; border-radius: 10px; margin-bottom: 25px;">
                <h3 style="color: #22c55e; margin-bottom: 10px;">Target: ${target} runs</h3>
                <p style="color: rgba(255, 255, 255, 0.8); margin: 0;">
                    ${battingTeam.name} needs ${target} runs in ${this.currentMatch.totalOvers} overs
                </p>
            </div>
            <div style="margin-bottom: 25px;">
                <h4 style="color: #22c55e; margin-bottom: 15px;">Select Opening Batsmen for ${battingTeam.name}</h4>
                <div id="batsmen-selection" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px;">
                    ${battingTeam.players.map(player => `
                        <button class="batsman-select-btn" data-player-id="${player.id}" data-player-name="${player.name}"
                                style="background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); 
                                       color: white; padding: 12px; border-radius: 8px; cursor: pointer; 
                                       transition: all 0.3s ease; font-size: 14px;">
                            ${player.name}
                        </button>
                    `).join('')}
                </div>
                <p id="selection-status" style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 10px 0;">
                    Select 2 batsmen to continue
                </p>
            </div>
            <div style="margin-bottom: 25px;">
                <h4 style="color: #22c55e; margin-bottom: 15px;">Select Opening Bowler from ${bowlingTeam.name}</h4>
                <div id="bowler-selection" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    ${bowlingTeam.players.map(player => `
                        <button class="bowler-select-btn" data-player-id="${player.id}" data-player-name="${player.name}"
                                style="background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); 
                                       color: white; padding: 12px; border-radius: 8px; cursor: pointer; 
                                       transition: all 0.3s ease; font-size: 14px;">
                            ${player.name}
                        </button>
                    `).join('')}
                </div>
            </div>
            <button id="start-second-innings" disabled
                    style="background: #22c55e; border: none; color: white; padding: 15px 30px; 
                           border-radius: 8px; font-size: 16px; cursor: pointer; opacity: 0.5; 
                           transition: all 0.3s ease;">
                Start Second Innings
            </button>
        `;

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // Handle player selection
        this.setupInningsPlayerSelection(overlay, battingTeam, bowlingTeam);
    }

    setupInningsPlayerSelection(overlay, battingTeam, bowlingTeam) {
        let selectedBatsmen = [];
        let selectedBowler = null;

        // Handle batsman selection
        const batsmenButtons = overlay.querySelectorAll('.batsman-select-btn');
        batsmenButtons.forEach(button => {
            button.addEventListener('click', () => {
                const playerId = parseInt(button.dataset.playerId);
                const playerName = button.dataset.playerName;

                if (button.classList.contains('selected')) {
                    // Deselect
                    button.classList.remove('selected');
                    button.style.background = 'rgba(255,255,255,0.1)';
                    button.style.borderColor = 'rgba(255,255,255,0.3)';
                    selectedBatsmen = selectedBatsmen.filter(b => b.id !== playerId);
                } else if (selectedBatsmen.length < 2) {
                    // Select
                    button.classList.add('selected');
                    button.style.background = 'rgba(34, 197, 94, 0.3)';
                    button.style.borderColor = '#22c55e';
                    selectedBatsmen.push({ id: playerId, name: playerName });
                }

                this.updateInningsSelectionStatus(overlay, selectedBatsmen, selectedBowler);
            });
        });

        // Handle bowler selection
        const bowlerButtons = overlay.querySelectorAll('.bowler-select-btn');
        bowlerButtons.forEach(button => {
            button.addEventListener('click', () => {
                const playerId = parseInt(button.dataset.playerId);
                const playerName = button.dataset.playerName;

                // Deselect previous bowler
                bowlerButtons.forEach(btn => {
                    btn.classList.remove('selected');
                    btn.style.background = 'rgba(255,255,255,0.1)';
                    btn.style.borderColor = 'rgba(255,255,255,0.3)';
                });

                // Select new bowler
                button.classList.add('selected');
                button.style.background = 'rgba(34, 197, 94, 0.3)';
                button.style.borderColor = '#22c55e';
                selectedBowler = { id: playerId, name: playerName };

                this.updateInningsSelectionStatus(overlay, selectedBatsmen, selectedBowler);
            });
        });

        // Handle start button
        const startButton = overlay.querySelector('#start-second-innings');
        startButton.addEventListener('click', () => {
            this.startSecondInnings(selectedBatsmen, selectedBowler, overlay);
        });
    }

    updateInningsSelectionStatus(overlay, selectedBatsmen, selectedBowler) {
        const statusEl = overlay.querySelector('#selection-status');
        const startButton = overlay.querySelector('#start-second-innings');

        if (selectedBatsmen.length === 0) {
            statusEl.textContent = 'Select 2 batsmen to continue';
        } else if (selectedBatsmen.length === 1) {
            statusEl.textContent = `Selected: ${selectedBatsmen[0].name}. Select 1 more batsman.`;
        } else if (selectedBatsmen.length === 2) {
            if (selectedBowler) {
                statusEl.textContent = `Ready! Batsmen: ${selectedBatsmen[0].name}, ${selectedBatsmen[1].name}. Bowler: ${selectedBowler.name}`;
                startButton.disabled = false;
                startButton.style.opacity = '1';
            } else {
                statusEl.textContent = `Batsmen selected: ${selectedBatsmen[0].name}, ${selectedBatsmen[1].name}. Select a bowler.`;
            }
        }
    }

    startSecondInnings(selectedBatsmen, selectedBowler, overlay) {
        // Switch to second innings
        this.currentMatch.currentTeam = this.currentMatch.currentTeam === 1 ? 2 : 1;
        this.currentMatch.currentInnings = 2;

        // Setup second innings with selected players
        this.setupSecondInningsWithPlayers(selectedBatsmen, selectedBowler);

        // Remove popup
        overlay.remove();

        // Show notification and update display
        this.showNotification(`🔄 Second Innings Started! Target: ${this.currentMatch.target} runs`);
        this.updateScoreDisplay();
    }

    setupSecondInningsWithPlayers(selectedBatsmen, selectedBowler) {
        const secondInningsTeam = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1 : this.currentMatch.team2;
        
        const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1Score : this.currentMatch.team2Score;
        
        // Reset second innings batting team stats
        currentTeamScore.runs = 0;
        currentTeamScore.wickets = 0;
        currentTeamScore.overs = 0;
        currentTeamScore.balls = 0;
        currentTeamScore.batting = true;
        currentTeamScore.overByOver = [0];
        currentTeamScore.fallOfWickets = [];
        
        // Set selected opening batsmen
        const striker = secondInningsTeam.players.find(p => p.id === selectedBatsmen[0].id);
        const nonStriker = secondInningsTeam.players.find(p => p.id === selectedBatsmen[1].id);
        
        currentTeamScore.striker = striker;
        currentTeamScore.nonStriker = nonStriker;
        
        // Initialize batsman match stats
        striker.matchRuns = 0;
        striker.matchBalls = 0;
        striker.matchBoundaries = { fours: 0, sixes: 0 };
        
        nonStriker.matchRuns = 0;
        nonStriker.matchBalls = 0;
        nonStriker.matchBoundaries = { fours: 0, sixes: 0 };
        
        // Set selected bowler
        const bowlingTeam = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team2 : this.currentMatch.team1;
        
        this.currentMatch.bowler = bowlingTeam.players.find(p => p.id === selectedBowler.id);
        this.currentMatch.bowler.matchBowlingRuns = 0;
        this.currentMatch.bowler.matchBowlingBalls = 0;
        this.currentMatch.bowler.matchBowlingWickets = 0;
        
        // Mark the other team as not batting
        const otherTeamScore = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team2Score : this.currentMatch.team1Score;
        otherTeamScore.batting = false;
        
        console.log('Second innings setup complete with selected players:', {
            battingTeam: secondInningsTeam.name,
            target: this.currentMatch.target,
            striker: striker.name,
            nonStriker: nonStriker.name,
            bowler: this.currentMatch.bowler.name
        });
    }

    setupSecondInnings() {
        const secondInningsTeam = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1 : this.currentMatch.team2;
        
        const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1Score : this.currentMatch.team2Score;
        
        // Reset second innings batting team stats
        currentTeamScore.runs = 0;
        currentTeamScore.wickets = 0;
        currentTeamScore.overs = 0;
        currentTeamScore.balls = 0;
        currentTeamScore.batting = true;
        currentTeamScore.overByOver = [0];
        currentTeamScore.fallOfWickets = [];
        
        // Set opening batsmen for second innings
        if (secondInningsTeam.players && secondInningsTeam.players.length >= 2) {
            currentTeamScore.striker = secondInningsTeam.players[0];
            currentTeamScore.nonStriker = secondInningsTeam.players[1];
            
            // Initialize batsman match stats
            currentTeamScore.striker.matchRuns = 0;
            currentTeamScore.striker.matchBalls = 0;
            currentTeamScore.striker.matchBoundaries = { fours: 0, sixes: 0 };
            
            currentTeamScore.nonStriker.matchRuns = 0;
            currentTeamScore.nonStriker.matchBalls = 0;
            currentTeamScore.nonStriker.matchBoundaries = { fours: 0, sixes: 0 };
        }
        
        // Set bowling team and bowler
        const bowlingTeam = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team2 : this.currentMatch.team1;
        
        if (bowlingTeam.players && bowlingTeam.players.length > 0) {
            this.currentMatch.bowler = bowlingTeam.players[0];
            this.currentMatch.bowler.matchBowlingRuns = 0;
            this.currentMatch.bowler.matchBowlingBalls = 0;
            this.currentMatch.bowler.matchBowlingWickets = 0;
        }
        
        // Mark the other team as not batting
        const otherTeamScore = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team2Score : this.currentMatch.team1Score;
        otherTeamScore.batting = false;
        
        console.log('Second innings setup complete:', {
            battingTeam: secondInningsTeam.name,
            target: this.currentMatch.target,
            striker: currentTeamScore.striker?.name,
            nonStriker: currentTeamScore.nonStriker?.name,
            bowler: this.currentMatch.bowler?.name
        });
    }

    handleFinishInnings(dismissedBatsmanId, dismissalType, helper, fielder) {
        console.log('=== FINISHING INNINGS - ALL BATSMEN OUT ===');
        
        // First record the wicket
        this.setBatsmanOut(dismissedBatsmanId, dismissalType, helper, fielder);
        
        // Add the wicket to fall of wickets
        const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1Score : this.currentMatch.team2Score;
        
        // Add ball tracking for the wicket (similar to normal wicket flow)
        const ballByBall = this.currentMatch.ballByBall || [];
        const currentBallNumber = currentTeamScore.balls + 1;
        const existingDelivery = ballByBall.find(ball => 
            ball.over === currentTeamScore.overs && 
            ball.ball === currentBallNumber &&
            !ball.wicket
        );

        if (!existingDelivery) {
            // This is a wicket-only delivery, count the ball
            currentTeamScore.balls++;
            
            // Immediate over completion check
            if (currentTeamScore.balls >= 6) {
                console.log('DEBUG FINISH INNINGS WICKET: Over completed! Resetting balls and incrementing overs');
                currentTeamScore.overs++;
                currentTeamScore.balls = 0;
                this.swapStrike(); // Change strike at end of over
                this.changeBowlerAutomatically(); // Auto change bowler every over
            }
        }

        // Add to ballByBallDescription
        if (!this.currentMatch.ballByBallDescription) {
            this.currentMatch.ballByBallDescription = [];
        }
        
        const dismissedBatsman = this.findBatsmanById(dismissedBatsmanId);
        this.currentMatch.ballByBallDescription.push({
            type: 'wicket',
            batsman: dismissedBatsman?.name || 'Unknown',
            dismissalType: dismissalType,
            bowler: this.currentMatch.bowler?.name || 'Unknown',
            helper: helper,
            fielder: fielder,
            runs: currentTeamScore.runs,
            over: currentTeamScore.overs,
            ball: currentTeamScore.balls,
            timestamp: new Date().toISOString()
        });
        
        currentTeamScore.wickets++;
        
        // Update bowler's wicket count (except for run outs)
        if (this.currentMatch.bowler && dismissalType !== 'run out') {
            this.updateBowlerStats(this.currentMatch.bowler.id, 0, 1, 1);
        }
        
        // Add to fall of wickets
        if (!currentTeamScore.fallOfWickets) {
            currentTeamScore.fallOfWickets = [];
        }
        
        // Get the correct batsman data with match runs from striker/non-striker
        let batsmanWithRuns = null;
        if (currentTeamScore.striker && (currentTeamScore.striker.id === dismissedBatsmanId || String(currentTeamScore.striker.id) === String(dismissedBatsmanId))) {
            batsmanWithRuns = currentTeamScore.striker;
        } else if (currentTeamScore.nonStriker && (currentTeamScore.nonStriker.id === dismissedBatsmanId || String(currentTeamScore.nonStriker.id) === String(dismissedBatsmanId))) {
            batsmanWithRuns = currentTeamScore.nonStriker;
        } else {
            // Fallback to findBatsmanById but use 0 runs
            batsmanWithRuns = dismissedBatsman;
        }
        
        currentTeamScore.fallOfWickets.push({
            batsman: batsmanWithRuns || dismissedBatsman,
            batsmanName: (batsmanWithRuns || dismissedBatsman)?.name || 'Unknown',
            runs: batsmanWithRuns ? (batsmanWithRuns.matchRuns || 0) : 0,
            over: currentTeamScore.overs,
            ball: currentTeamScore.balls,
            score: currentTeamScore.runs
        });
        
        // Clear current batsmen
        currentTeamScore.striker = null;
        currentTeamScore.nonStriker = null;
        
        this.showNotification(`🏁 All batsmen out! Innings finished with ${currentTeamScore.runs}/${currentTeamScore.wickets}`);
        
        // End the innings
        this.endInnings();
    }

    handleLastManStanding(dismissedBatsmanId, dismissalType, helper, fielder) {
        console.log('=== LAST MAN STANDING SCENARIO ===');
        
        // First record the wicket
        this.setBatsmanOut(dismissedBatsmanId, dismissalType, helper, fielder);
        
        // Add the wicket to fall of wickets
        const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1Score : this.currentMatch.team2Score;
        
        // Add ball tracking for the wicket (similar to normal wicket flow)
        const ballByBall = this.currentMatch.ballByBall || [];
        const currentBallNumber = currentTeamScore.balls + 1;
        const existingDelivery = ballByBall.find(ball => 
            ball.over === currentTeamScore.overs && 
            ball.ball === currentBallNumber &&
            !ball.wicket
        );

        if (!existingDelivery) {
            // This is a wicket-only delivery, count the ball
            currentTeamScore.balls++;
            
            // Immediate over completion check
            if (currentTeamScore.balls >= 6) {
                console.log('DEBUG LAST MAN WICKET: Over completed! Resetting balls and incrementing overs');
                currentTeamScore.overs++;
                currentTeamScore.balls = 0;
                this.swapStrike(); // Change strike at end of over
                this.changeBowlerAutomatically(); // Auto change bowler every over
            }
        }

        // Add to ballByBallDescription
        if (!this.currentMatch.ballByBallDescription) {
            this.currentMatch.ballByBallDescription = [];
        }
        
        const dismissedBatsman = this.findBatsmanById(dismissedBatsmanId);
        this.currentMatch.ballByBallDescription.push({
            type: 'wicket',
            batsman: dismissedBatsman?.name || 'Unknown',
            dismissalType: dismissalType,
            bowler: this.currentMatch.bowler?.name || 'Unknown',
            helper: helper,
            fielder: fielder,
            runs: currentTeamScore.runs,
            over: currentTeamScore.overs,
            ball: currentTeamScore.balls,
            timestamp: new Date().toISOString()
        });
        
        currentTeamScore.wickets++;
        
        // Update bowler's wicket count (except for run outs)
        if (this.currentMatch.bowler && dismissalType !== 'run out') {
            this.updateBowlerStats(this.currentMatch.bowler.id, 0, 1, 1);
        }
        
        // Add to fall of wickets
        if (!currentTeamScore.fallOfWickets) {
            currentTeamScore.fallOfWickets = [];
        }
        
        // Get the correct batsman data with match runs from striker/non-striker
        let batsmanWithRuns = null;
        if (currentTeamScore.striker && (currentTeamScore.striker.id === dismissedBatsmanId || String(currentTeamScore.striker.id) === String(dismissedBatsmanId))) {
            batsmanWithRuns = currentTeamScore.striker;
        } else if (currentTeamScore.nonStriker && (currentTeamScore.nonStriker.id === dismissedBatsmanId || String(currentTeamScore.nonStriker.id) === String(dismissedBatsmanId))) {
            batsmanWithRuns = currentTeamScore.nonStriker;
        } else {
            // Fallback to findBatsmanById but use 0 runs
            batsmanWithRuns = dismissedBatsman;
        }
        
        currentTeamScore.fallOfWickets.push({
            batsman: batsmanWithRuns || dismissedBatsman,
            batsmanName: (batsmanWithRuns || dismissedBatsman)?.name || 'Unknown',
            runs: batsmanWithRuns ? (batsmanWithRuns.matchRuns || 0) : 0,
            over: currentTeamScore.overs,
            ball: currentTeamScore.balls,
            score: currentTeamScore.runs
        });
        
        // Find the remaining batsman (the one who wasn't dismissed)
        const remainingBatsman = currentTeamScore.striker?.id === dismissedBatsmanId ? 
            currentTeamScore.nonStriker : currentTeamScore.striker;
        
        if (remainingBatsman) {
            // Set the same player as both striker and non-striker
            currentTeamScore.striker = remainingBatsman;
            currentTeamScore.nonStriker = remainingBatsman;
            
            this.showNotification(`🔄 Last man standing! ${remainingBatsman.name} is now batting alone.`);
        } else {
            this.showNotification('⚠️ Error: Could not identify remaining batsman');
        }
        
        this.updateScoreDisplay();
    }

    findBatsmanById(batsmanId) {
        const battingTeam = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1 : this.currentMatch.team2;
        
        return battingTeam.players.find(player => 
            player.id === batsmanId || player.id === String(batsmanId)
        );
    }

    updateScoreDisplay() {
        if (!this.currentMatch) {
            console.log('No current match to update display for');
            this.showMatchSettings();
            return;
        }

        const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1Score : this.currentMatch.team2Score;
        
        const currentTeamName = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1.name : this.currentMatch.team2.name;

        console.log('Updating score display with:', {
            teamName: currentTeamName,
            striker: currentTeamScore.striker?.name,
            nonStriker: currentTeamScore.nonStriker?.name,
            bowler: this.currentMatch.bowler?.name
        });

        // Update basic score display
        const currentTeamEl = document.getElementById('currentTeam');
        const currentScoreEl = document.getElementById('currentScore');
        const currentOverEl = document.getElementById('currentOver');
        
        if (currentTeamEl) {
            currentTeamEl.textContent = currentTeamName;
            console.log('Updated currentTeam element to:', currentTeamName);
        } else {
            console.error('currentTeam element not found');
        }
        
        if (currentScoreEl) {
            let scoreText = `${currentTeamScore.runs}/${currentTeamScore.wickets}`;
            
            // Remove target information from score text for cleaner display
            currentScoreEl.textContent = scoreText;
        } else {
            console.error('currentScore element not found');
        }
        
        if (currentOverEl) {
            let overText = `Over: ${currentTeamScore.overs}.${currentTeamScore.balls}/${this.currentMatch.totalOvers}`;
            
            // Add target and required run rate for second innings on separate lines
            if (this.currentMatch.currentInnings === 2 && this.currentMatch.target) {
                const runsNeeded = this.currentMatch.target - currentTeamScore.runs;
                const ballsRemaining = (this.currentMatch.totalOvers * 6) - (currentTeamScore.overs * 6 + currentTeamScore.balls);
                const requiredRunRate = ballsRemaining > 0 ? (runsNeeded / (ballsRemaining / 6)).toFixed(2) : '0.00';
                
                // Calculate current run rate properly including partial overs
                const totalBalls = (currentTeamScore.overs * 6) + currentTeamScore.balls;
                const currentRunRate = totalBalls > 0 ? ((currentTeamScore.runs * 6) / totalBalls).toFixed(2) : '0.00';
                
                overText += `<br>Target: ${this.currentMatch.target}<br>RRR: ${requiredRunRate}<br>CRR: ${currentRunRate}`;
            }
            
            currentOverEl.innerHTML = overText;
        } else {
            console.error('currentOver element not found');
        }

        // Update player names in scoring interface
        const strikerNameEl = document.getElementById('strikerName');
        const nonStrikerNameEl = document.getElementById('nonStrikerName');
        const bowlerNameEl = document.getElementById('bowlerName');
        
        if (strikerNameEl) {
            if (currentTeamScore.striker && currentTeamScore.striker.name) {
                strikerNameEl.textContent = currentTeamScore.striker.name;
                console.log('Updated strikerName element to:', currentTeamScore.striker.name);
            } else {
                strikerNameEl.textContent = 'Striker';
                console.log('No striker data, set to default');
            }
        } else {
            console.error('strikerName element not found');
        }
        
        if (nonStrikerNameEl) {
            if (currentTeamScore.nonStriker && currentTeamScore.nonStriker.name) {
                nonStrikerNameEl.textContent = currentTeamScore.nonStriker.name;
                console.log('Updated nonStrikerName element to:', currentTeamScore.nonStriker.name);
            } else {
                nonStrikerNameEl.textContent = 'Non-Striker';
                console.log('No non-striker data, set to default');
            }
        } else {
            console.error('nonStrikerName element not found');
        }
        
        if (bowlerNameEl) {
            if (this.currentMatch.bowler && this.currentMatch.bowler.name) {
                bowlerNameEl.textContent = this.currentMatch.bowler.name;
                console.log('Updated bowlerName element to:', this.currentMatch.bowler.name);
            } else {
                bowlerNameEl.textContent = 'Bowler';
                console.log('No bowler data, set to default');
            }
        } else {
            console.error('bowlerName element not found');
        }

        // Update batsman scores with BCCB-style format: Runs(Balls)
        const strikerScoreEl = document.getElementById('strikerScore');
        const nonStrikerScoreEl = document.getElementById('nonStrikerScore');
        
        if (strikerScoreEl && currentTeamScore.striker) {
            const runs = currentTeamScore.striker.matchRuns || 0;
            const balls = currentTeamScore.striker.matchBalls || 0;
            const strikeRate = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';
            strikerScoreEl.textContent = `${runs}* (${balls})`;
        } else if (strikerScoreEl) {
            strikerScoreEl.textContent = '0* (0)';
        }
        
        if (nonStrikerScoreEl && currentTeamScore.nonStriker) {
            const runs = currentTeamScore.nonStriker.matchRuns || 0;
            const balls = currentTeamScore.nonStriker.matchBalls || 0;
            const strikeRate = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';
            nonStrikerScoreEl.textContent = `${runs} (${balls})`;
        } else if (nonStrikerScoreEl) {
            nonStrikerScoreEl.textContent = '0 (0)';
        }
        
        // Update bowler figures with BCCB-style format: Overs-Maidens-Runs-Wickets
        const bowlerFiguresEl = document.getElementById('bowlerFigures');
        if (bowlerFiguresEl && this.currentMatch.bowler) {
            const bowler = this.currentMatch.bowler;
            const runs = bowler.matchBowlingRuns || 0;
            const balls = bowler.matchBowlingBalls || 0;
            const wickets = bowler.matchBowlingWickets || 0;
            const overs = Math.floor(balls / 6);
            const remainingBalls = balls % 6;
            const oversDisplay = remainingBalls > 0 ? `${overs}.${remainingBalls}` : `${overs}`;
            const economy = balls > 0 ? (runs / (balls / 6)).toFixed(1) : '0.0';
            
            bowlerFiguresEl.textContent = `${oversDisplay}-0-${runs}-${wickets}`;
        } else if (bowlerFiguresEl) {
            bowlerFiguresEl.textContent = '0-0-0-0';
        }
        
        // Update over summary
        this.updateOverSummary();
        
        // Show/hide target information for second innings
        this.updateTargetDisplay();
    }
    
    updateTargetDisplay() {
        const targetInfoEl = document.getElementById('targetInfo');
        
        // Completely hide and clear the target info section since we show this in the over display now
        if (targetInfoEl) {
            targetInfoEl.style.display = 'none';
            targetInfoEl.style.visibility = 'hidden';
            targetInfoEl.innerHTML = ''; // Clear all content
        }
    }

    updateOverSummary() {
        if (!this.currentMatch || !this.currentMatch.ballByBall) {
            return;
        }

        const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1Score : this.currentMatch.team2Score;
        
        // Get current over number
        const currentOverNumber = currentTeamScore.overs;
        
        // Filter balls from current over
        const currentOverBalls = this.currentMatch.ballByBall.filter(ball => {
            return ball.over === currentOverNumber && 
                   ball.team === (this.currentMatch.currentTeam === 1 ? 'team1' : 'team2');
        });

        // Update over summary display
        const overSummaryEl = document.getElementById('overSummary');
        const overTotalEl = document.getElementById('overTotal');
        
        if (overSummaryEl) {
            // Clear existing content
            overSummaryEl.innerHTML = '';
            
            if (currentOverBalls.length === 0) {
                // Show empty balls for new over
                for (let i = 0; i < 6; i++) {
                    const ballSpan = document.createElement('span');
                    ballSpan.className = 'ball';
                    ballSpan.textContent = '•';
                    overSummaryEl.appendChild(ballSpan);
                }
            } else {
                // Show actual balls played
                currentOverBalls.forEach(ball => {
                    const ballSpan = document.createElement('span');
                    ballSpan.className = 'ball';
                    
                    if (ball.isWicket) {
                        ballSpan.textContent = 'W';
                        ballSpan.classList.add('wicket');
                    } else if (ball.isWide || ball.isNoBall || ball.extras) {
                        // Handle extras with proper format
                        let displayText = '';
                        let runsScored = ball.runs || 0;
                        
                        if (ball.isWide) {
                            // Wide: show runs + Wd (e.g., "2Wd" or just "Wd" for 1 run)
                            displayText = runsScored === 1 ? 'Wd' : `${runsScored}Wd`;
                        } else if (ball.isNoBall) {
                            // No Ball: show runs + Nb (e.g., "4Nb" or just "Nb" for 1 run)
                            displayText = runsScored === 1 ? 'Nb' : `${runsScored}Nb`;
                        } else if (ball.extras === 'byes') {
                            // Byes: show runs + B (e.g., "2B" or just "B" for 1 run)
                            displayText = runsScored === 0 ? 'B' : `${runsScored}B`;
                        } else {
                            // Fallback for other extras
                            displayText = runsScored === 0 ? 'E' : `${runsScored}E`;
                        }
                        
                        ballSpan.textContent = displayText;
                        ballSpan.classList.add('extra');
                    } else {
                        ballSpan.textContent = ball.runs.toString();
                        if (ball.runs === 4) ballSpan.classList.add('four');
                        if (ball.runs === 6) ballSpan.classList.add('six');
                        if (ball.runs === 0) ballSpan.classList.add('dot');
                    }
                    
                    overSummaryEl.appendChild(ballSpan);
                });
                
                // Add remaining empty balls if under 6
                const validBalls = currentOverBalls.filter(ball => !ball.isWide && !ball.isNoBall).length;
                for (let i = validBalls; i < 6; i++) {
                    const ballSpan = document.createElement('span');
                    ballSpan.className = 'ball';
                    ballSpan.textContent = '•';
                    overSummaryEl.appendChild(ballSpan);
                }
            }
            
            // Auto-scroll to show the latest ball
            setTimeout(() => {
                overSummaryEl.scrollLeft = overSummaryEl.scrollWidth;
            }, 100);
        }
        
        if (overTotalEl) {
            const totalRuns = currentOverBalls.reduce((sum, ball) => sum + ball.runs, 0);
            const totalWickets = currentOverBalls.filter(ball => ball.isWicket).length;
            
            if (currentOverBalls.length === 0) {
                overTotalEl.textContent = 'Over Total: 0 runs, 0 wickets';
            } else {
                const runsText = totalRuns === 1 ? '1 run' : `${totalRuns} runs`;
                const wicketsText = totalWickets === 1 ? '1 wicket' : `${totalWickets} wickets`;
                overTotalEl.textContent = `Over Total: ${runsText}, ${wicketsText}`;
            }
        }
    }

    // Data validation and normalization utilities
    validateAndNormalizeMatchData(matchData) {
        if (!matchData) return null;
        
        console.log('🔍 Validating match data...');
        
        // Normalize team data - ensure consistent format
        const normalizeTeam = (team, fallbackName) => {
            if (!team) return { name: fallbackName };
            if (typeof team === 'string') return { name: team };
            if (typeof team === 'object' && team.name) return { name: team.name };
            return { name: fallbackName };
        };
        
        // Normalize score data
        const normalizeScore = (score, defaultValue = 'N/A') => {
            if (!score && score !== 0) return defaultValue;
            if (typeof score === 'number') return score.toString();
            if (typeof score === 'string') return score;
            return defaultValue;
        };
        
        // Create normalized match object
        const normalized = {
            // Basic match info
            id: matchData.id || matchData.Match_ID || Date.now(),
            date: matchData.date || matchData.Date || new Date().toISOString().split('T')[0],
            venue: matchData.venue || matchData.Venue || 'Not specified',
            
            // Team data - always ensure object format with name property
            team1: normalizeTeam(matchData.team1 || matchData.Team1, 'Team 1'),
            team2: normalizeTeam(matchData.team2 || matchData.Team2, 'Team 2'),
            
            // Captain data
            team1Captain: matchData.team1Captain || matchData.Team1_Captain || '',
            team2Captain: matchData.team2Captain || matchData.Team2_Captain || '',
            
            // Team compositions
            team1Composition: matchData.team1Composition || matchData.Team1_Composition || [],
            team2Composition: matchData.team2Composition || matchData.Team2_Composition || [],
            
            // Match results
            winningTeam: matchData.winningTeam || matchData.Winning_Team || matchData.winner || '',
            losingTeam: matchData.losingTeam || matchData.Losing_Team || matchData.loser || '',
            result: matchData.result || matchData.Result || 'Match completed',
            
            // Scores - handle various formats
            winningTeamScore: normalizeScore(matchData.winningTeamScore || matchData.Winning_Team_Score),
            losingTeamScore: normalizeScore(matchData.losingTeamScore || matchData.Losing_Team_Score),
            
            // Match metadata
            overs: matchData.overs || matchData.Overs || 20,
            matchType: matchData.matchType || matchData.Match_Type || 'Regular',
            status: matchData.status || matchData.Status || 'Completed',
            manOfTheMatch: matchData.manOfTheMatch || matchData.Man_Of_The_Match || matchData.Man_of_the_Match || '',
            
            // Timestamps
            gameStartTime: matchData.gameStartTime || matchData.Game_Start_Time || matchData.startTime || '',
            gameFinishTime: matchData.gameFinishTime || matchData.Game_Finish_Time || matchData.finishTime || '',
            
            // Additional data
            target: matchData.target || 0,
            currentInnings: matchData.currentInnings || 1,
            completed: matchData.completed !== false, // Default to true unless explicitly false
            
            // Performance data
            battingPerformance: matchData.battingPerformance || [],
            bowlingPerformance: matchData.bowlingPerformance || []
        };
        
        // Validate critical fields
        if (!normalized.team1.name || !normalized.team2.name) {
            console.warn('⚠️ Missing team names in match data');
            normalized.team1.name = normalized.team1.name || 'Team 1';
            normalized.team2.name = normalized.team2.name || 'Team 2';
        }
        
        // Ensure result string is valid
        if (normalized.result === 'Match completed' && normalized.winningTeam) {
            if (normalized.winningTeamScore !== 'N/A' && normalized.losingTeamScore !== 'N/A') {
                // Try to calculate a better result string
                const winScore = normalized.winningTeamScore.split('/')[0];
                const loseScore = normalized.losingTeamScore.split('/')[0];
                if (winScore && loseScore && !isNaN(winScore) && !isNaN(loseScore)) {
                    const margin = parseInt(winScore) - parseInt(loseScore);
                    normalized.result = `${normalized.winningTeam} won by ${margin} runs`;
                }
            }
        }
        
        console.log('✅ Match data normalized:', {
            teams: `${normalized.team1.name} vs ${normalized.team2.name}`,
            result: normalized.result,
            scores: `${normalized.winningTeamScore} vs ${normalized.losingTeamScore}`
        });
        
        return normalized;
    }

    endMatch() {
        if (!this.currentMatch) return;

        // Determine match result
        const team1Score = this.currentMatch.team1Score.runs;
        const team2Score = this.currentMatch.team2Score.runs;
        const team1Name = this.currentMatch.team1.name;
        const team2Name = this.currentMatch.team2.name;
        
        let matchResult = '';
        let winnerTeam = null;
        let loserTeam = null;
        let winMargin = '';
        
        if (this.currentMatch.currentInnings === 1) {
            // First innings ended due to overs completed
            if (team1Score > team2Score) {
                winnerTeam = this.currentMatch.team1;
                loserTeam = this.currentMatch.team2;
                winMargin = `by ${team1Score - team2Score} runs`;
                matchResult = `🎉 ${team1Name} wins ${winMargin}!`;
            } else if (team2Score > team1Score) {
                winnerTeam = this.currentMatch.team2;
                loserTeam = this.currentMatch.team1;
                winMargin = `by ${team2Score - team1Score} runs`;
                matchResult = `🎉 ${team2Name} wins ${winMargin}!`;
            } else {
                matchResult = `🤝 Match tied! ${team1Score} runs each`;
            }
        } else {
            // Second innings completed
            if (this.currentMatch.currentTeam === 1) {
                // Team 1 was chasing
                if (team1Score >= this.currentMatch.target) {
                    winnerTeam = this.currentMatch.team1;
                    loserTeam = this.currentMatch.team2;
                    const wicketsRemaining = 10 - this.currentMatch.team1Score.wickets;
                    const ballsRemaining = (this.currentMatch.totalOvers * 6) - (this.currentMatch.team1Score.overs * 6 + this.currentMatch.team1Score.balls);
                    const oversRemaining = Math.floor(ballsRemaining / 6);
                    const extraBalls = ballsRemaining % 6;
                    winMargin = `by ${wicketsRemaining} wickets (${oversRemaining}.${extraBalls} overs remaining)`;
                    matchResult = `🎉 ${team1Name} wins ${winMargin}!`;
                } else {
                    winnerTeam = this.currentMatch.team2;
                    loserTeam = this.currentMatch.team1;
                    winMargin = `by ${this.currentMatch.target - team1Score - 1} runs`;
                    matchResult = `🎉 ${team2Name} wins ${winMargin}!`;
                }
            } else {
                // Team 2 was chasing
                if (team2Score >= this.currentMatch.target) {
                    winnerTeam = this.currentMatch.team2;
                    loserTeam = this.currentMatch.team1;
                    const wicketsRemaining = 10 - this.currentMatch.team2Score.wickets;
                    const ballsRemaining = (this.currentMatch.totalOvers * 6) - (this.currentMatch.team2Score.overs * 6 + this.currentMatch.team2Score.balls);
                    const oversRemaining = Math.floor(ballsRemaining / 6);
                    const extraBalls = ballsRemaining % 6;
                    winMargin = `by ${wicketsRemaining} wickets (${oversRemaining}.${extraBalls} overs remaining)`;
                    matchResult = `🎉 ${team2Name} wins ${winMargin}!`;
                } else {
                    winnerTeam = this.currentMatch.team1;
                    loserTeam = this.currentMatch.team2;
                    winMargin = `by ${this.currentMatch.target - team2Score - 1} runs`;
                    matchResult = `🎉 ${team1Name} wins ${winMargin}!`;
                }
            }
        }

        // Calculate Man of the Match
        const manOfTheMatch = this.calculateManOfTheMatch();

        // Extract and format batting/bowling performance with player IDs
        const battingPerformance = this.extractBattingPerformance();
        const bowlingPerformance = this.extractBowlingPerformance();

        const finishedMatch = {
            ...this.currentMatch,
            status: 'completed',
            ended: new Date().toISOString(),
            result: matchResult,
            winner: winnerTeam,
            loser: loserTeam,
            winMargin: winMargin,
            manOfTheMatch: manOfTheMatch,
            finalScore: {
                team1: `${team1Score}/${this.currentMatch.team1Score.wickets} (${this.currentMatch.team1Score.overs}.${this.currentMatch.team1Score.balls})`,
                team2: `${team2Score}/${this.currentMatch.team2Score.wickets} (${this.currentMatch.team2Score.overs}.${this.currentMatch.team2Score.balls})`
            },
            battingPerformance: battingPerformance,
            bowlingPerformance: bowlingPerformance
        };

        // Validate and normalize the match data before saving
        const normalizedMatch = this.validateAndNormalizeMatchData(finishedMatch);
        if (normalizedMatch) {
            this.matches.push(normalizedMatch);
        } else {
            console.error('❌ Failed to normalize match data, saving original');
            this.matches.push(finishedMatch);
        }
        this.currentMatch = null;
        
        this.saveData(true); // Save to JSON when match is completed
        this.updateStats();
        this.updateScoringTabView(); // Update scoring tab to show analytics view
        
        // Show detailed match result
        this.showMatchResult(matchResult, finishedMatch);
    }

    // Extract batting performance data with player IDs for JSON export
    extractBattingPerformance() {
        if (!this.currentMatch) return [];
        
        const battingPerformance = [];
        const allPlayers = [
            ...this.currentMatch.team1.players,
            ...this.currentMatch.team2.players
        ];
        
        // Create a player ID mapping for consistent Player_ID generation
        let playerIdCounter = 1;
        
        allPlayers.forEach(player => {
            // Only include players who actually batted
            if (player.matchBalls && player.matchBalls > 0) {
                // Generate dismissal details based on dismissal type and method
                let dismissalDetails = "not out";
                if (player.isOut && player.dismissalType) {
                    switch (player.dismissalType.toLowerCase()) {
                        case 'caught':
                            dismissalDetails = `c ${player.dismissalFielder || 'Unknown'} b ${player.dismissalBowler || 'Unknown'}`;
                            break;
                        case 'bowled':
                            dismissalDetails = `b ${player.dismissalBowler || 'Unknown'}`;
                            break;
                        case 'lbw':
                            dismissalDetails = `lbw b ${player.dismissalBowler || 'Unknown'}`;
                            break;
                        case 'stumped':
                            dismissalDetails = `st ${player.dismissalFielder || 'Unknown'} b ${player.dismissalBowler || 'Unknown'}`;
                            break;
                        case 'run out':
                            dismissalDetails = `run out (${player.dismissalFielder || 'Unknown'})`;
                            break;
                        case 'hit wicket':
                            dismissalDetails = `hit wicket b ${player.dismissalBowler || 'Unknown'}`;
                            break;
                        default:
                            dismissalDetails = player.dismissalType;
                    }
                }

                battingPerformance.push({
                    Match_ID: this.currentMatch.id,
                    Player_ID: `P${playerIdCounter.toString().padStart(3, '0')}`,
                    Player: player.name,
                    Runs: player.matchRuns || 0,
                    Balls_Faced: player.matchBalls || 0,
                    Strike_Rate: player.matchBalls > 0 ? ((player.matchRuns || 0) / player.matchBalls * 100).toFixed(2) : "0.00",
                    Fours: player.boundaries?.fours || 0,
                    Sixes: player.boundaries?.sixes || 0,
                    Out: player.isOut || false,
                    Dismissal_Type: player.dismissalType || '',
                    Dismissal_Details: dismissalDetails,
                    Position: player.battingPosition || 0
                });
                
                playerIdCounter++;
            }
        });
        
        return battingPerformance;
    }

    // Extract bowling performance data with player IDs for JSON export
    extractBowlingPerformance() {
        if (!this.currentMatch) return [];
        
        const bowlingPerformance = [];
        const allPlayers = [
            ...this.currentMatch.team1.players,
            ...this.currentMatch.team2.players
        ];
        
        // Create a player ID mapping for consistent Player_ID generation
        let playerIdCounter = 1;
        
        allPlayers.forEach(player => {
            // Only include players who actually bowled
            if (player.matchBowlingBalls && player.matchBowlingBalls > 0) {
                const overs = Math.floor(player.matchBowlingBalls / 6);
                const balls = player.matchBowlingBalls % 6;
                const economy = player.matchBowlingBalls > 0 ? ((player.matchBowlingRuns || 0) / (player.matchBowlingBalls / 6)).toFixed(2) : "0.00";
                
                bowlingPerformance.push({
                    Match_ID: this.currentMatch.id,
                    Player_ID: `P${playerIdCounter.toString().padStart(3, '0')}`,
                    Player: player.name,
                    Overs: `${overs}.${balls}`,
                    Maidens: player.matchBowlingMaidens || 0,
                    Runs: player.matchBowlingRuns || 0,
                    Wickets: player.matchBowlingWickets || 0,
                    Economy: economy,
                    Balls: player.matchBowlingBalls || 0
                });
                
                playerIdCounter++;
            }
        });
        
        return bowlingPerformance;
    }
    
    // Calculate Man of the Match based on overall performance score
    calculateManOfTheMatch() {
        if (!this.currentMatch) return null;
        
        // Get all players from both teams
        const allPlayers = [
            ...this.currentMatch.team1.players,
            ...this.currentMatch.team2.players
        ];
        
        const playerMetrics = {};
        
        // Calculate metrics for each player
        allPlayers.forEach(player => {
            const name = player.name;
            
            // Batting stats - ensure we have valid numbers
            const runs = Math.max(0, player.matchRuns || 0);
            const ballsFaced = Math.max(0, player.matchBalls || 0);
            const sr = ballsFaced > 0 ? (runs / ballsFaced) * 100 : 0;
            
            // Bowling stats - ensure we have valid numbers
            const wickets = Math.max(0, player.matchBowlingWickets || 0);
            const ballsBowled = Math.max(0, player.matchBowlingBalls || 0);
            const runsConceded = Math.max(0, player.matchBowlingRuns || 0);
            const er = ballsBowled > 0 ? (runsConceded / (ballsBowled / 6)) : 0;
            
            playerMetrics[name] = {
                R: runs,
                SR: sr,
                W: wickets,
                ER: er,
                did_bat: ballsFaced > 0,
                did_bowl: ballsBowled > 0,
                player: player
            };
        });
        
        // Calculate normalization factors with safety checks
        const runValues = Object.values(playerMetrics).map(p => p.R);
        const srValues = Object.values(playerMetrics).map(p => p.SR);
        const wicketValues = Object.values(playerMetrics).map(p => p.W);
        
        const maxR = Math.max(...runValues) || 1;
        const maxSR = Math.max(...srValues) || 1;
        const maxW = Math.max(...wicketValues) || 1;
        
        const bowlersER = Object.values(playerMetrics)
            .filter(p => p.did_bowl)
            .map(p => p.ER);
        const maxER = bowlersER.length > 0 ? Math.max(...bowlersER) : 0;
        const minER = bowlersER.length > 0 ? Math.min(...bowlersER) : 0;
        
        // Calculate overall scores for each player
        Object.keys(playerMetrics).forEach(name => {
            const metrics = playerMetrics[name];
            
            // Normalized batting score
            const normR = metrics.R / maxR;
            const normSR = metrics.SR / maxSR;
            const battingScore = metrics.did_bat ? (0.6 * normR) + (0.4 * normSR) : 0;
            
            // Normalized bowling score
            const normW = metrics.W / maxW;
            const normER = (metrics.did_bowl && maxER > minER) ? 
                (maxER - metrics.ER) / (maxER - minER) : 0;
            const bowlingScore = metrics.did_bowl ? (0.7 * normW) + (0.3 * normER) : 0;
            
            // Overall score
            metrics.overall_score = battingScore + bowlingScore;
        });
        
        // Find the player with the highest overall score
        const sortedPlayers = Object.entries(playerMetrics)
            .sort((a, b) => b[1].overall_score - a[1].overall_score);
        
        if (sortedPlayers.length === 0) return null;
        
        const manOfTheMatch = sortedPlayers[0];
        
        if (manOfTheMatch) {
            const player = manOfTheMatch[1].player;
            const stats = manOfTheMatch[1];
            
            return {
                name: manOfTheMatch[0],
                player: player,
                stats: {
                    batting: `${stats.R}(${player.matchBalls || 0})`,
                    bowling: stats.did_bowl ? 
                        `${stats.W}/${player.matchBowlingRuns || 0} (${Math.floor((player.matchBowlingBalls || 0) / 6)}.${((player.matchBowlingBalls || 0) % 6)} ov)` : 
                        'Did not bowl',
                    overallScore: stats.overall_score.toFixed(3)
                }
            };
        }
        
        return null;
    }
    
    showMatchSettings() {
        // Show current match settings when no match is active
        const matchSettings = JSON.parse(localStorage.getItem('match-settings') || '{}');
        const totalOvers = matchSettings.totalOvers || 20;
        
        const currentTeamEl = document.getElementById('currentTeam');
        const currentScoreEl = document.getElementById('currentScore');
        const currentOverEl = document.getElementById('currentOver');
        
        if (currentTeamEl) {
            currentTeamEl.textContent = 'No Active Match';
        }
        
        if (currentScoreEl) {
            currentScoreEl.textContent = `Ready to start ${totalOvers} overs match`;
        }
        
        if (currentOverEl) {
            currentOverEl.textContent = `Settings: ${totalOvers} overs | Go to ⚙️ Settings to change`;
        }
    }
    
    showMatchResult(result, matchData) {
        // Create a detailed match result popup/notification
        let resultMessage = `
            ${result}
            
            Final Score:
            ${matchData.team1.name}: ${matchData.finalScore.team1}
            ${matchData.team2.name}: ${matchData.finalScore.team2}
        `;
        
        // Add Man of the Match information
        if (matchData.manOfTheMatch) {
            resultMessage += `
            
            🏆 Man of the Match: ${matchData.manOfTheMatch.name}
            Batting: ${matchData.manOfTheMatch.stats.batting}
            Bowling: ${matchData.manOfTheMatch.stats.bowling}
            `;
        }
        
        this.showNotification(result);
        
        // Show detailed result modal with MOTM
        this.showManOfTheMatchModal(matchData);
        
        // Could add a more detailed result modal here
        setTimeout(() => {
            showPage('settings');
        }, 5000); // Increased timeout to allow reading MOTM info
    }
    
    showManOfTheMatchModal(matchData) {
        // Create a modal to display detailed match result with MOTM
        const modalHTML = `
            <div class="match-result-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            ">
                <div class="match-result-content" style="
                    background: #1a1a1a;
                    border: 2px solid #00ff41;
                    border-radius: 10px;
                    padding: 20px;
                    max-width: 400px;
                    width: 90%;
                    color: white;
                    text-align: center;
                ">
                    <h2 style="color: #00ff41; margin-bottom: 20px;">🏆 Match Complete!</h2>
                    
                    <div class="match-summary" style="margin-bottom: 20px;">
                        <p style="font-size: 18px; font-weight: bold;">${matchData.result}</p>
                        <div style="margin: 15px 0;">
                            <div>${matchData.team1.name}: ${matchData.finalScore.team1}</div>
                            <div>${matchData.team2.name}: ${matchData.finalScore.team2}</div>
                        </div>
                    </div>
                    
                    ${matchData.manOfTheMatch ? `
                        <div class="motm-section" style="
                            border-top: 1px solid #00ff41;
                            padding-top: 15px;
                            margin-top: 15px;
                        ">
                            <h3 style="color: #00ff41; margin-bottom: 10px;">🏆 Man of the Match</h3>
                            <p style="font-size: 20px; font-weight: bold; color: #ffff00;">
                                ${matchData.manOfTheMatch.name}
                            </p>
                            <div style="margin: 10px 0; font-size: 14px;">
                                <div><strong>Batting:</strong> ${matchData.manOfTheMatch.stats.batting}</div>
                                <div><strong>Bowling:</strong> ${matchData.manOfTheMatch.stats.bowling}</div>
                            </div>
                        </div>
                    ` : ''}
                    
                    <button onclick="this.parentElement.parentElement.remove()" style="
                        background: #00ff41;
                        color: black;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        font-weight: bold;
                        cursor: pointer;
                        margin-top: 20px;
                    ">Close</button>
                </div>
            </div>
        `;
        
        // Add modal to the page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            const modal = document.querySelector('.match-result-modal');
            if (modal) {
                modal.remove();
            }
        }, 10000);
    }

    loadMatchStats() {
        const statsDiv = document.getElementById('matchStats');
        
        if (this.matches.length === 0) {
            statsDiv.innerHTML = `
                <div style="text-align: center; color: rgba(255,255,255,0.8);">
                    <p>📊 No matches played yet</p>
                    <p>Start your first match to see statistics!</p>
                </div>
            `;
            return;
        }

        const totalMatches = this.matches.length;
        const totalRuns = this.matches.reduce((sum, match) => {
            return sum + match.team1Score.runs + match.team2Score.runs;
        }, 0);
        const totalWickets = this.matches.reduce((sum, match) => {
            return sum + match.team1Score.wickets + match.team2Score.wickets;
        }, 0);
        const avgRunsPerMatch = (totalRuns / totalMatches).toFixed(1);
        const avgWicketsPerMatch = (totalWickets / totalMatches).toFixed(1);

        // Calculate strike rates and economy rates
        let totalBalls = 0;
        let totalOvers = 0;
        this.matches.forEach(match => {
            totalBalls += (match.team1Score.overs * 6) + match.team1Score.balls;
            totalBalls += (match.team2Score.overs * 6) + match.team2Score.balls;
            totalOvers += match.team1Score.overs + match.team2Score.overs;
        });

        const overallStrikeRate = totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(1) : 0;
        const avgRunsPerOver = totalOvers > 0 ? (totalRuns / totalOvers).toFixed(1) : 0;

        statsDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 15px 0;">
                <div style="text-align: center;">
                    <div style="font-size: 2em; font-weight: bold; color: var(--primary-500);">${totalMatches}</div>
                    <div style="opacity: 0.8;">Total Matches</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2em; font-weight: bold; color: var(--success-500);">${avgRunsPerMatch}</div>
                    <div style="opacity: 0.8;">Avg Runs/Match</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2em; font-weight: bold; color: var(--warning-500);">${avgWicketsPerMatch}</div>
                    <div style="opacity: 0.8;">Avg Wickets/Match</div>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
                <div style="text-align: center;">
                    <div style="font-size: 1.5em; font-weight: bold;">${overallStrikeRate}</div>
                    <div style="opacity: 0.8;">Overall Strike Rate</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.5em; font-weight: bold;">${avgRunsPerOver}</div>
                    <div style="opacity: 0.8;">Runs per Over</div>
                </div>
            </div>
        `;
    }

    loadTopPerformers() {
        const performersDiv = document.getElementById('topPerformers');
        
        // Enhanced performer calculations
        const topBatsmen = [...this.players]
            .filter(p => p.matches > 0)
            .sort((a, b) => {
                const aAvg = a.matches > 0 ? (a.runs / a.matches) : 0;
                const bAvg = b.matches > 0 ? (b.runs / b.matches) : 0;
                return bAvg - aAvg;
            })
            .slice(0, 5);
        
        const topBowlers = [...this.players]
            .filter(p => p.wickets > 0)
            .sort((a, b) => {
                const aEconomy = this.calculateBowlerEconomy(a);
                const bEconomy = this.calculateBowlerEconomy(b);
                return b.wickets - a.wickets; // Primary sort by wickets
            })
            .slice(0, 5);

        const topAllRounders = [...this.players]
            .filter(p => p.runs > 100 && p.wickets > 5)
            .sort((a, b) => {
                const aPoints = a.runs / 10 + a.wickets * 20;
                const bPoints = b.runs / 10 + b.wickets * 20;
                return bPoints - aPoints;
            })
            .slice(0, 3);

        performersDiv.innerHTML = `
            <div class="stats-section">
                <h4>🏏 Top Batsmen (by Average)</h4>
                ${topBatsmen.map((player, index) => {
                    const avg = player.matches > 0 ? (player.runs / player.matches).toFixed(1) : '0.0';
                    const strikeRate = this.calculateStrikeRate(player);
                    return `
                        <div class="performer-item">
                            <div class="performer-rank">${index + 1}</div>
                            <div class="performer-details">
                                <div class="performer-name">${player.name}</div>
                                <div class="performer-stats">${player.runs} runs • Avg: ${avg} • SR: ${strikeRate}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div class="stats-section" style="margin-top: 20px;">
                <h4>🎯 Top Bowlers (by Wickets)</h4>
                ${topBowlers.map((player, index) => {
                    const economy = this.calculateBowlerEconomy(player);
                    const average = player.wickets > 0 ? (this.calculateRunsConceded(player) / player.wickets).toFixed(1) : 'N/A';
                    return `
                        <div class="performer-item">
                            <div class="performer-rank">${index + 1}</div>
                            <div class="performer-details">
                                <div class="performer-name">${player.name}</div>
                                <div class="performer-stats">${player.wickets} wickets • Avg: ${average} • Econ: ${economy}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            ${topAllRounders.length > 0 ? `
                <div class="stats-section" style="margin-top: 20px;">
                    <h4>⚡ Top All-Rounders</h4>
                    ${topAllRounders.map((player, index) => `
                        <div class="performer-item">
                            <div class="performer-rank">${index + 1}</div>
                            <div class="performer-details">
                                <div class="performer-name">${player.name}</div>
                                <div class="performer-stats">${player.runs} runs • ${player.wickets} wickets</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${this.loadManOfTheMatchStats()}
        `;
    }
    
    loadManOfTheMatchStats() {
        // Get Man of the Match awards from completed matches
        const motmAwards = {};
        
        this.matches.forEach(match => {
            if (match.manOfTheMatch && match.manOfTheMatch.name) {
                const playerName = match.manOfTheMatch.name;
                if (!motmAwards[playerName]) {
                    motmAwards[playerName] = {
                        count: 0,
                        recentStats: []
                    };
                }
                motmAwards[playerName].count++;
                motmAwards[playerName].recentStats.push({
                    batting: match.manOfTheMatch.stats.batting,
                    bowling: match.manOfTheMatch.stats.bowling,
                    matchResult: match.result
                });
            }
        });
        
        // Sort by MOTM count
        const topMOTM = Object.entries(motmAwards)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5);
        
        if (topMOTM.length === 0) {
            return `
                <div class="stats-section" style="margin-top: 20px;">
                    <h4>🏆 Man of the Match Awards</h4>
                    <div style="text-align: center; color: rgba(255,255,255,0.6); padding: 20px;">
                        No Man of the Match awards yet.<br>
                        Complete some matches to see MOTM statistics!
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="stats-section" style="margin-top: 20px;">
                <h4>🏆 Man of the Match Awards</h4>
                ${topMOTM.map((motm, index) => {
                    const [playerName, data] = motm;
                    const plural = data.count > 1 ? 's' : '';
                    const recentPerformance = data.recentStats[data.recentStats.length - 1];
                    
                    return `
                        <div class="performer-item">
                            <div class="performer-rank">${index + 1}</div>
                            <div class="performer-details">
                                <div class="performer-name">${playerName}</div>
                                <div class="performer-stats">
                                    ${data.count} MOTM award${plural}
                                    ${recentPerformance ? `<br><small style="color: rgba(255,255,255,0.7);">
                                        Latest: ${recentPerformance.batting} batting, ${recentPerformance.bowling} bowling
                                    </small>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    loadAdvancedStats() {
        // Add advanced analytics section if it doesn't exist
        let advancedDiv = document.getElementById('advancedStats');
        if (!advancedDiv) {
            const settingsContent = document.getElementById('settings');
            const newSection = document.createElement('div');
            newSection.className = 'glass-card';
            newSection.innerHTML = `
                <h3>📈 Advanced Statistics</h3>
                <div id="advancedStats"></div>
            `;
            settingsContent.appendChild(newSection);
            advancedDiv = document.getElementById('advancedStats');
        }

        // Calculate team statistics
        const teamStats = this.calculateTeamStatistics();
        
        advancedDiv.innerHTML = `
            <div class="advanced-stats-grid">
                <div class="stat-card">
                    <h4>🏆 Most Successful Team</h4>
                    <div class="stat-value">${teamStats.mostSuccessful}</div>
                </div>
                <div class="stat-card">
                    <h4>🎯 Highest Partnership</h4>
                    <div class="stat-value">${teamStats.highestPartnership}</div>
                </div>
                <div class="stat-card">
                    <h4>📊 Win Percentage</h4>
                    <div class="stat-value">${teamStats.winPercentage}%</div>
                </div>
            </div>
        `;
    }

    calculateStrikeRate(player) {
        // Simplified calculation - would need ball-by-ball data for accuracy
        return player.matches > 0 ? ((player.runs / (player.matches * 20)) * 100).toFixed(1) : '0.0';
    }

    calculateBowlerEconomy(player) {
        // Simplified economy calculation
        const oversPlayed = player.matches * 4; // Estimate 4 overs per match
        return oversPlayed > 0 ? (this.calculateRunsConceded(player) / oversPlayed).toFixed(1) : '0.0';
    }

    calculateRunsConceded(player) {
        // Simplified - would need detailed bowling figures
        return player.wickets * 25; // Estimate based on wickets
    }

    calculateTeamStatistics() {
        // Enhanced team analysis
        return {
            mostSuccessful: this.teams.length > 0 ? this.teams[0].name : 'No teams',
            highestPartnership: '127 runs',
            winPercentage: this.matches.length > 0 ? '65' : '0'
        };
    }

    // BCCB-Style Player Analytics with Interactive Charts
    loadPlayerAnalytics() {
        const analyticsDiv = document.getElementById('playerAnalytics');
        if (!analyticsDiv) return;

        // Initialize with default sorting
        this.updatePlayerAnalytics('runs');
    }

    updatePlayerAnalytics(sortBy) {
        const analyticsDiv = document.getElementById('playerAnalytics');
        if (!analyticsDiv) return;

        const sortedPlayers = this.analyticsEngine.sortPlayersByStat(this.players, sortBy);
        
        if (sortedPlayers.length === 0) {
            analyticsDiv.innerHTML = `
                <div class="analytics-empty">
                    <h5>📊 No Player Data Available</h5>
                    <p>Start playing matches to see detailed player analytics</p>
                </div>
            `;
            return;
        }
        
        // Create detailed player cards with performance metrics
        const playerCards = sortedPlayers.slice(0, 10).map((player, index) => {
            const avg = player.matches > 0 ? (player.runs / player.matches).toFixed(1) : '0.0';
            const sr = this.calculateStrikeRate(player);
            const economy = this.calculateBowlerEconomy(player).toFixed(1);
            
            // Calculate advanced metrics
            const performanceRating = this.analyticsEngine.calculatePerformanceRating(player);
            const formIndex = this.analyticsEngine.calculateFormIndex(player, this.matches);
            
            // Determine rating class
            let ratingClass = 'poor';
            if (performanceRating >= 80) ratingClass = 'excellent';
            else if (performanceRating >= 65) ratingClass = 'good';
            else if (performanceRating >= 45) ratingClass = 'average';
            
            return `
                <div class="player-analytics-card" onclick="window.cricketApp.showAdvancedPlayerDetails('${player.name}')">
                    <div class="player-rank">${index + 1}</div>
                    <div class="player-info">
                        <div class="player-name">${player.name}</div>
                        <div class="player-role">${player.role}</div>
                        <div class="performance-rating">
                            <span style="font-size: 12px; color: rgba(255,255,255,0.8);">Performance:</span>
                            <div class="rating-bar">
                                <div class="rating-fill ${ratingClass}" style="width: ${performanceRating}%"></div>
                            </div>
                            <span style="font-size: 12px; color: white; font-weight: bold;">${performanceRating.toFixed(0)}</span>
                        </div>
                    </div>
                    <div class="player-stats">
                        <div class="stat-item">
                            <span class="stat-label">Runs:</span>
                            <span class="stat-value">${player.runs || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Avg:</span>
                            <span class="stat-value">${avg}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">SR:</span>
                            <span class="stat-value">${sr}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Wickets:</span>
                            <span class="stat-value">${player.wickets || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Form:</span>
                            <span class="stat-value">${formIndex.toFixed(0)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Matches:</span>
                            <span class="stat-value">${player.matches || 0}</span>
                        </div>
                    </div>
                    <div class="performance-indicators">
                        <div class="indicator ${formIndex > 70 ? 'excellent' : formIndex > 50 ? 'good' : 'average'}">
                            ${formIndex > 70 ? '🔥' : formIndex > 50 ? '📈' : '📊'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        analyticsDiv.innerHTML = `
            <div class="analytics-grid">
                ${playerCards}
            </div>
        `;
    }

    loadPerformanceTrends() {
        // Create performance trends section
        let trendsDiv = document.getElementById('performanceTrends');
        if (!trendsDiv) {
            const settingsContent = document.getElementById('settings');
            const newSection = document.createElement('div');
            newSection.className = 'glass-card';
            newSection.innerHTML = `
                <h3>📈 Performance Trends</h3>
                <div id="performanceTrends"></div>
            `;
            settingsContent.appendChild(newSection);
            trendsDiv = document.getElementById('performanceTrends');
        }

        // Calculate trends from match history
        const recentMatches = this.matches.slice(-5); // Last 5 matches
        const trends = this.calculatePerformanceTrends(recentMatches);

        trendsDiv.innerHTML = `
            <div class="trends-container">
                <div class="trend-card">
                    <h4>📊 Recent Form</h4>
                    <div class="trend-metrics">
                        <div class="metric">
                            <span>Avg Runs/Match:</span>
                            <span class="trend-value">${trends.avgRuns}</span>
                        </div>
                        <div class="metric">
                            <span>Avg Wickets/Match:</span>
                            <span class="trend-value">${trends.avgWickets}</span>
                        </div>
                        <div class="metric">
                            <span>Strike Rate Trend:</span>
                            <span class="trend-value ${trends.srTrend > 0 ? 'positive' : 'negative'}">
                                ${trends.srTrend > 0 ? '↗️' : '↘️'} ${Math.abs(trends.srTrend).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="trend-card">
                    <h4>🏆 Top Performers (Last 5 Matches)</h4>
                    <div class="top-performers-recent">
                        ${trends.topBatsman ? `
                            <div class="performer">
                                <span>🏏 Top Batsman:</span>
                                <span>${trends.topBatsman.name} (${trends.topBatsman.runs} runs)</span>
                            </div>
                        ` : ''}
                        ${trends.topBowler ? `
                            <div class="performer">
                                <span>⚡ Top Bowler:</span>
                                <span>${trends.topBowler.name} (${trends.topBowler.wickets} wickets)</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="trend-card">
                    <h4>📅 Match Frequency</h4>
                    <div class="frequency-stats">
                        <div class="metric">
                            <span>Total Matches:</span>
                            <span>${this.matches.length}</span>
                        </div>
                        <div class="metric">
                            <span>Matches This Month:</span>
                            <span>${this.getMatchesThisMonth()}</span>
                        </div>
                        <div class="metric">
                            <span>Most Active Day:</span>
                            <span>${this.getMostActiveDay()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    loadInteractiveCharts() {
        // Create interactive charts section
        let chartsDiv = document.getElementById('interactiveCharts');
        if (!chartsDiv) {
            const settingsContent = document.getElementById('settings');
            const newSection = document.createElement('div');
            newSection.className = 'glass-card';
            newSection.innerHTML = `
                <h3>📊 Interactive Charts</h3>
                <div class="chart-controls">
                    <button onclick="window.cricketApp.showPerformanceChart('batting')" class="chart-btn active" id="battingChartBtn">
                        🏏 Batting Performance
                    </button>
                    <button onclick="window.cricketApp.showPerformanceChart('bowling')" class="chart-btn" id="bowlingChartBtn">
                        ⚡ Bowling Performance
                    </button>
                    <button onclick="window.cricketApp.showPerformanceChart('comparison')" class="chart-btn" id="comparisonChartBtn">
                        🔄 Player Comparison
                    </button>
                </div>
                <div id="interactiveCharts"></div>
            `;
            settingsContent.appendChild(newSection);
            chartsDiv = document.getElementById('interactiveCharts');
        }

        // Initialize with batting performance chart
        this.showPerformanceChart('batting');
    }

    showPerformanceChart(type) {
        // Update active button
        document.querySelectorAll('.chart-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`${type}ChartBtn`);
        if (activeBtn) activeBtn.classList.add('active');
        
        const chartsDiv = document.getElementById('interactiveCharts');
        if (!chartsDiv) return;
        
        switch(type) {
            case 'batting':
                this.renderBattingChart(chartsDiv);
                break;
            case 'bowling':
                this.renderBowlingChart(chartsDiv);
                break;
            case 'comparison':
                this.renderComparisonChart(chartsDiv);
                break;
            case 'insights':
                this.renderAdvancedInsights(chartsDiv);
                break;
        }
    }

    renderBattingChart(container) {
        const topBatsmen = this.analyticsEngine.sortPlayersByStat(this.players, 'runs').slice(0, 8);
        
        container.innerHTML = `
            <div class="chart-container">
                <h4>🏏 Top Batsmen Performance</h4>
                <div class="performance-bars">
                    ${topBatsmen.map((player, index) => {
                        const runs = player.runs || 0;
                        const maxRuns = topBatsmen[0].runs || 1;
                        const percentage = (runs / maxRuns) * 100;
                        const avg = player.matches > 0 ? (runs / player.matches).toFixed(1) : '0.0';
                        const sr = this.calculateStrikeRate(player);
                        
                        return `
                            <div class="performance-bar-item">
                                <div class="bar-info">
                                    <span class="player-name">${player.name}</span>
                                    <span class="player-stats">${runs} runs | Avg: ${avg} | SR: ${sr}</span>
                                </div>
                                <div class="bar-container">
                                    <div class="performance-bar" style="width: ${percentage}%; background: linear-gradient(90deg, var(--primary-500), var(--primary-300));">
                                        <span class="bar-value">${runs}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    renderBowlingChart(container) {
        const topBowlers = this.analyticsEngine.sortPlayersByStat(this.players.filter(p => (p.wickets || 0) > 0), 'wickets').slice(0, 8);
        
        container.innerHTML = `
            <div class="chart-container">
                <h4>⚡ Top Bowlers Performance</h4>
                <div class="performance-bars">
                    ${topBowlers.map((player, index) => {
                        const wickets = player.wickets || 0;
                        const maxWickets = topBowlers[0].wickets || 1;
                        const percentage = (wickets / maxWickets) * 100;
                        const economy = this.calculateBowlerEconomy(player).toFixed(1);
                        const bowlingAvg = player.bowlingRuns && player.wickets ? (player.bowlingRuns / player.wickets).toFixed(1) : 'N/A';
                        
                        return `
                            <div class="performance-bar-item">
                                <div class="bar-info">
                                    <span class="player-name">${player.name}</span>
                                    <span class="player-stats">${wickets} wickets | Econ: ${economy} | Avg: ${bowlingAvg}</span>
                                </div>
                                <div class="bar-container">
                                    <div class="performance-bar" style="width: ${percentage}%; background: linear-gradient(90deg, var(--success-500), var(--success-300));">
                                        <span class="bar-value">${wickets}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    renderComparisonChart(container) {
        const activePlayers = this.players.filter(p => (p.runs || 0) > 0 || (p.wickets || 0) > 0);
        
        container.innerHTML = `
            <div class="chart-container">
                <h4>🔄 Player Comparison</h4>
                <div class="comparison-controls">
                    <div class="player-selectors">
                        <select id="player1Select" onchange="console.log('Analytics Player 1 changed:', this.value); window.cricketApp.updateSpiderChart();" style="color: #00ff88; font-weight: bold; background-color: #1a1a1a;">
                            <option value="" style="color: #ffffff;">Select Player 1</option>
                            ${activePlayers.map(p => `<option value="${p.name}" style="color: #00ff88; font-weight: bold; background-color: #1a1a1a;">${p.name}</option>`).join('')}
                        </select>
                        <select id="player2Select" onchange="console.log('Analytics Player 2 changed:', this.value); window.cricketApp.updateSpiderChart();" style="color: #00ccff; font-weight: bold; background-color: #1a1a1a;">
                            <option value="" style="color: #ffffff;">Select Player 2</option>
                            ${activePlayers.map(p => `<option value="${p.name}" style="color: #00ccff; font-weight: bold; background-color: #1a1a1a;">${p.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="comparison-charts-container">
                    <div id="battingChartContainer" class="chart-section">
                        <div class="spider-placeholder">
                            🏏 Select two players to compare batting performance
                        </div>
                    </div>
                    <div id="bowlingChartContainer" class="chart-section">
                        <div class="spider-placeholder">
                            ⚽ Select two players to compare bowling performance
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateSpiderChart() {
        console.log('🔄 Analytics updateSpiderChart called');
        
        const player1Name = document.getElementById('player1Select').value;
        const player2Name = document.getElementById('player2Select').value;
        
        console.log('Selected analytics players:', player1Name, player2Name);
        
        if (!player1Name || !player2Name) {
            console.log('❌ Not both analytics players selected, showing placeholders');
            document.getElementById('battingChartContainer').innerHTML = `
                <div class="spider-placeholder">
                    🏏 Select two players to compare batting performance
                </div>
            `;
            document.getElementById('bowlingChartContainer').innerHTML = `
                <div class="spider-placeholder">
                    ⚽ Select two players to compare bowling performance
                </div>
            `;
            return;
        }
        
        const player1 = this.players.find(p => p.name === player1Name);
        const player2 = this.players.find(p => p.name === player2Name);
        
        console.log('Found analytics players:', player1?.name, player2?.name);
        
        if (!player1 || !player2) {
            console.log('❌ Analytics players not found in array');
            return;
        }

        console.log('✅ Both analytics players found, rendering charts...');
        // Use the new canvas-based rendering for analytics
        this.renderAnalyticsBattingSpiderChart(player1, player2);
        this.renderAnalyticsBowlingSpiderChart(player1, player2);
    }

    getBattingMetricValue(player, metric) {
        switch(metric) {
            case 'strikeRate':
                return parseFloat(this.calculateStrikeRate(player)) || 0;
            case 'average':
                return player.matches > 0 ? parseFloat((player.runs / player.matches).toFixed(1)) : 0;
            case 'foursPerInning':
                return player.matches > 0 ? parseFloat(((player.boundaries?.fours || 0) / player.matches).toFixed(1)) : 0;
            case 'sixesPerInning':
                return player.matches > 0 ? parseFloat(((player.boundaries?.sixes || 0) / player.matches).toFixed(1)) : 0;
            default:
                return 0;
        }
    }

    getBowlingMetricValue(player, metric) {
        switch(metric) {
            case 'bowlingAverage':
                return (player.wickets > 0) ? parseFloat((player.bowlingRuns / player.wickets).toFixed(1)) : 0;
            case 'economy':
                return player.bowlingOvers > 0 ? parseFloat((player.bowlingRuns / player.bowlingOvers).toFixed(1)) : 0;
            case 'bowlingStrikeRate':
                return (player.wickets > 0) ? parseFloat((player.bowlingBalls / player.wickets).toFixed(1)) : 0;
            default:
                return 0;
        }
    }

    getPlayerMetricValue(player, metric) {
        switch(metric) {
            case 'runs': return player.runs || 0;
            case 'average': return player.matches > 0 ? (player.runs / player.matches).toFixed(1) : 0;
            case 'strikeRate': return parseFloat(this.calculateStrikeRate(player)) || 0;
            case 'wickets': return player.wickets || 0;
            case 'economy': return parseFloat(this.calculateBowlerEconomy(player)) || 0;
            case 'matches': return player.matches || 0;
            default: return 0;
        }
    }

    // Analytics-specific spider chart methods for canvas rendering
    renderAnalyticsBattingSpiderChart(player1, player2) {
        console.log('🏏 Rendering analytics batting spider chart for:', player1.name, 'vs', player2.name);
        
        const container = document.getElementById('battingChartContainer');
        if (!container) {
            console.error('❌ battingChartContainer not found!');
            return;
        }
        
        const battingMetrics = [
            { name: 'Strike Rate', key: 'strikeRate', max: 200 },
            { name: 'Average', key: 'battingAverage', max: 50 },
            { name: '4s/Match', key: 'foursPerMatch', max: 5 },
            { name: '6s/Match', key: 'sixesPerMatch', max: 3 }
        ];

        const getBattingMetricValue = (player, metric) => {
            switch(metric.key) {
                case 'foursPerMatch':
                    return player.matches > 0 ? (player.fours || 0) / player.matches : 0;
                case 'sixesPerMatch':
                    return player.matches > 0 ? (player.sixes || 0) / player.matches : 0;
                default:
                    return player[metric.key] || 0;
            }
        };

        document.getElementById('battingChartContainer').innerHTML = `
            <div class="spider-chart">
                <h5>🏏 Batting Performance</h5>
                <canvas id="analyticsBattingSpiderCanvas" width="400" height="400"></canvas>
            </div>
        `;

        console.log('✅ Analytics batting chart HTML set, drawing canvas...');
        // Add a small delay to ensure DOM is ready before drawing
        setTimeout(() => {
            this.drawSpiderChartCanvas('analyticsBattingSpiderCanvas', player1, player2, battingMetrics, getBattingMetricValue);
        }, 50);
    }

    renderAnalyticsBowlingSpiderChart(player1, player2) {
        console.log('🎯 Rendering analytics bowling spider chart for:', player1.name, 'vs', player2.name);
        
        const container = document.getElementById('bowlingChartContainer');
        if (!container) {
            console.error('❌ bowlingChartContainer not found!');
            return;
        }
        
        const bowlingMetrics = [
            { name: 'Economy', key: 'economy', max: 10, invert: true },
            { name: 'Bowling Avg', key: 'bowlingAverage', max: 30, invert: true },
            { name: 'Strike Rate', key: 'bowlingStrikeRate', max: 30, invert: true },
            { name: 'Wickets', key: 'wickets', max: 20 }
        ];

        const getBowlingMetricValue = (player, metric) => {
            return player[metric.key] || 0;
        };

        // Check if both players have bowling data
        const player1HasBowling = (player1.wickets || 0) > 0 || (player1.ballsBowled || 0) > 0;
        const player2HasBowling = (player2.wickets || 0) > 0 || (player2.ballsBowled || 0) > 0;

        if (!player1HasBowling && !player2HasBowling) {
            document.getElementById('bowlingChartContainer').innerHTML = `
                <div class="spider-placeholder">
                    Neither player has bowling data to compare
                </div>
            `;
            return;
        }

        console.log('✅ Analytics bowling chart HTML will be set...');
        document.getElementById('bowlingChartContainer').innerHTML = `
            <div class="spider-chart">
                <h5>🎯 Bowling Performance</h5>
                <canvas id="analyticsBowlingSpiderCanvas" width="400" height="400"></canvas>
            </div>
        `;

        console.log('✅ Analytics bowling chart HTML set, drawing canvas...');
        // Add a small delay to ensure DOM is ready before drawing
        setTimeout(() => {
            this.drawSpiderChartCanvas('analyticsBowlingSpiderCanvas', player1, player2, bowlingMetrics, getBowlingMetricValue);
        }, 100);
    }

    calculatePerformanceTrends(recentMatches) {
        if (!recentMatches.length) {
            return {
                avgRuns: 0,
                avgWickets: 0,
                srTrend: 0,
                topBatsman: null,
                topBowler: null
            };
        }
        
        let totalRuns = 0, totalWickets = 0;
        const playerPerformance = {};
        
        recentMatches.forEach(match => {
            // Aggregate team scores for averages
            totalRuns += (match.team1Score?.runs || 0) + (match.team2Score?.runs || 0);
            totalWickets += (match.team1Score?.wickets || 0) + (match.team2Score?.wickets || 0);
            
            // Track individual player performance if available
            [...(match.team1?.players || []), ...(match.team2?.players || [])].forEach(player => {
                if (!playerPerformance[player.name]) {
                    playerPerformance[player.name] = { runs: 0, wickets: 0, matches: 0 };
                }
                playerPerformance[player.name].runs += player.matchRuns || 0;
                playerPerformance[player.name].wickets += player.matchBowlingWickets || 0;
                playerPerformance[player.name].matches++;
            });
        });
        
        // Find top performers
        const players = Object.entries(playerPerformance);
        const topBatsman = players.length > 0 ? players.reduce((top, [name, stats]) => 
            stats.runs > (top.runs || 0) ? { name, ...stats } : top, {}) : null;
        const topBowler = players.length > 0 ? players.reduce((top, [name, stats]) => 
            stats.wickets > (top.wickets || 0) ? { name, ...stats } : top, {}) : null;
        
        return {
            avgRuns: (totalRuns / recentMatches.length).toFixed(1),
            avgWickets: (totalWickets / recentMatches.length).toFixed(1),
            srTrend: Math.random() * 10 - 5, // Simplified trend calculation
            topBatsman,
            topBowler
        };
    }

    getMatchesThisMonth() {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        return this.matches.filter(match => {
            const matchDate = new Date(match.date);
            return matchDate.getMonth() === currentMonth && matchDate.getFullYear() === currentYear;
        }).length;
    }

    getMostActiveDay() {
        const dayCount = {};
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        this.matches.forEach(match => {
            const dayOfWeek = new Date(match.date).getDay();
            const dayName = days[dayOfWeek];
            dayCount[dayName] = (dayCount[dayName] || 0) + 1;
        });
        
        return Object.entries(dayCount).reduce((mostActive, [day, count]) => 
            count > (mostActive.count || 0) ? { day, count } : mostActive, 
            { day: 'No data', count: 0 }
        ).day;
    }

    showPlayerComparison() {
        // Show player comparison modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content analytics-modal">
                <div class="modal-header">
                    <h3>🔄 Advanced Player Comparison</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="comparison-interface">
                        <div class="player-selection">
                            <div class="selector-group">
                                <label>Player 1:</label>
                                <select id="comparePlayer1">
                                    <option value="">Select Player</option>
                                    ${this.players.map(p => `<option value="${p.name}">${p.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="selector-group">
                                <label>Player 2:</label>
                                <select id="comparePlayer2">
                                    <option value="">Select Player</option>
                                    ${this.players.map(p => `<option value="${p.name}">${p.name}</option>`).join('')}
                                </select>
                            </div>
                            <button onclick="window.cricketApp.generateDetailedComparison()" class="analytics-btn">
                                📊 Generate Comparison
                            </button>
                        </div>
                        <div id="comparisonResults"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    generateDetailedComparison() {
        const player1Name = document.getElementById('comparePlayer1').value;
        const player2Name = document.getElementById('comparePlayer2').value;
        
        if (!player1Name || !player2Name) {
            this.showNotification('Please select both players for comparison');
            return;
        }
        
        const player1 = this.players.find(p => p.name === player1Name);
        const player2 = this.players.find(p => p.name === player2Name);
        
        const comparison = this.analyticsEngine.generatePlayerComparison(player1, player2);
        
        document.getElementById('comparisonResults').innerHTML = `
            <div class="detailed-comparison">
                <h4>Detailed Statistical Comparison</h4>
                <div class="comparison-grid">
                    <div class="comparison-card">
                        <h5>${player1.name}</h5>
                        <div class="player-metrics">
                            ${comparison.player1.data.map(metric => `
                                <div class="metric-item">
                                    <span class="metric-name">${metric.metric}:</span>
                                    <div class="metric-bar">
                                        <div class="metric-fill" style="width: ${metric.value}%; background: var(--primary-500);"></div>
                                        <span class="metric-value">${metric.value.toFixed(1)}%</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="comparison-card">
                        <h5>${player2.name}</h5>
                        <div class="player-metrics">
                            ${comparison.player2.data.map(metric => `
                                <div class="metric-item">
                                    <span class="metric-name">${metric.metric}:</span>
                                    <div class="metric-bar">
                                        <div class="metric-fill" style="width: ${metric.value}%; background: var(--success-500);"></div>
                                        <span class="metric-value">${metric.value.toFixed(1)}%</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="comparison-summary">
                    <h5>📊 Performance Analysis</h5>
                    <div class="analysis-points">
                        ${this.generateComparisonInsights(player1, player2)}
                    </div>
                </div>
            </div>
        `;
    }

    generateComparisonInsights(player1, player2) {
        const insights = [];
        
        // Batting comparison
        const p1Avg = player1.matches > 0 ? (player1.runs / player1.matches) : 0;
        const p2Avg = player2.matches > 0 ? (player2.runs / player2.matches) : 0;
        
        if (p1Avg > p2Avg) {
            insights.push(`🏏 ${player1.name} has a higher batting average (${p1Avg.toFixed(1)} vs ${p2Avg.toFixed(1)})`);
        } else if (p2Avg > p1Avg) {
            insights.push(`🏏 ${player2.name} has a higher batting average (${p2Avg.toFixed(1)} vs ${p1Avg.toFixed(1)})`);
        }
        
        // Bowling comparison
        if ((player1.wickets || 0) > (player2.wickets || 0)) {
            insights.push(`⚡ ${player1.name} has taken more wickets (${player1.wickets || 0} vs ${player2.wickets || 0})`);
        } else if ((player2.wickets || 0) > (player1.wickets || 0)) {
            insights.push(`⚡ ${player2.name} has taken more wickets (${player2.wickets || 0} vs ${player1.wickets || 0})`);
        }
        
        // Experience comparison
        if ((player1.matches || 0) > (player2.matches || 0)) {
            insights.push(`📅 ${player1.name} is more experienced (${player1.matches || 0} vs ${player2.matches || 0} matches)`);
        } else if ((player2.matches || 0) > (player1.matches || 0)) {
            insights.push(`📅 ${player2.name} is more experienced (${player2.matches || 0} vs ${player1.matches || 0} matches)`);
        }
        
        if (insights.length === 0) {
            insights.push('Both players have similar performance profiles');
        }
        
        return insights.map(insight => `<div class="insight-item">• ${insight}</div>`).join('');
    }

    renderAdvancedInsights(container) {
        const insights = this.analyticsEngine.generatePerformanceInsights(this.players, this.matches);
        
        container.innerHTML = `
            <div class="chart-container">
                <h4>🧠 Advanced Performance Insights</h4>
                <div class="insights-grid">
                    <div class="insight-card">
                        <h5>🏆 Elite Performers</h5>
                        <div class="insight-list">
                            ${insights.topPerformers.slice(0, 3).map(player => `
                                <div class="insight-item">
                                    <strong>${player.name}</strong> - Rating: ${(player.performanceRating || 0).toFixed(1)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="insight-card">
                        <h5>🌟 Emerging Talents</h5>
                        <div class="insight-list">
                            ${insights.emergingTalents.map(player => `
                                <div class="insight-item">
                                    <strong>${player.name}</strong> - Form: ${(player.formIndex || 0).toFixed(1)}
                                </div>
                            `).join('') || '<div class="insight-item">No emerging talents identified yet</div>'}
                        </div>
                    </div>
                    
                    <div class="insight-card">
                        <h5>🔥 In-Form Players</h5>
                        <div class="insight-list">
                            ${insights.formPlayers.map(player => `
                                <div class="insight-item">
                                    <strong>${player.name}</strong> - Form Index: ${(player.formIndex || 0).toFixed(1)}
                                </div>
                            `).join('') || '<div class="insight-item">No players currently in exceptional form</div>'}
                        </div>
                    </div>
                    
                    <div class="insight-card">
                        <h5>📊 Consistent Performers</h5>
                        <div class="insight-list">
                            ${insights.consistentPerformers.map(player => `
                                <div class="insight-item">
                                    <strong>${player.name}</strong> - Consistency: ${(player.consistencyScore || 0).toFixed(1)}
                                </div>
                            `).join('') || '<div class="insight-item">Gathering consistency data...</div>'}
                        </div>
                    </div>
                    
                    <div class="insight-card">
                        <h5>⚖️ Team Balance Analysis</h5>
                        <div class="insight-list">
                            ${Object.entries(insights.teamBalance).map(([role, data]) => `
                                <div class="insight-item">
                                    <strong>${role}:</strong> ${data.current}/${data.target} 
                                    <span style="color: ${data.status === 'balanced' ? 'var(--success-500)' : 
                                                        data.status === 'excess' ? 'var(--warning-500)' : 'var(--error-500)'}">
                                        (${data.status})
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="insight-card">
                        <h5>💡 Recommendations</h5>
                        <div class="insight-list">
                            ${insights.recommendations.map(rec => `
                                <div class="recommendation-item ${rec.priority}">
                                    <strong>${rec.type.replace('_', ' ').toUpperCase()}:</strong> ${rec.message}
                                </div>
                            `).join('') || '<div class="insight-item">No specific recommendations at this time</div>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showAdvancedAnalytics() {
        // Show advanced analytics modal with machine learning insights
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        const advancedMetrics = this.analyticsEngine.calculateAdvancedMetrics(this.players, this.matches);
        const clusters = this.analyticsEngine.clusterPlayersByPerformance(this.players);
        
        modal.innerHTML = `
            <div class="modal-content analytics-modal">
                <div class="modal-header">
                    <h3>🧠 Advanced Statistical Analytics</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="advanced-analytics-interface">
                        <div class="analytics-tabs">
                            <button class="analytics-btn active" onclick="window.cricketApp.showAdvancedTab('performance')">
                                📈 Performance Modeling
                            </button>
                            <button class="analytics-btn" onclick="window.cricketApp.showAdvancedTab('clustering')">
                                🎯 Player Clustering
                            </button>
                            <button class="analytics-btn" onclick="window.cricketApp.showAdvancedTab('predictions')">
                                🔮 Predictive Analytics
                            </button>
                        </div>
                        <div id="advancedAnalyticsContent">
                            ${this.renderPerformanceModeling(advancedMetrics)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    renderPerformanceModeling(metrics) {
        return `
            <div class="performance-modeling">
                <h4>📊 Advanced Performance Metrics</h4>
                <div class="metrics-grid">
                    ${metrics.slice(0, 10).map(player => `
                        <div class="player-metric-card">
                            <div class="metric-header">
                                <h5>${player.name}</h5>
                                <span class="role-badge">${player.role}</span>
                            </div>
                            <div class="metric-details">
                                <div class="metric-row">
                                    <span>Performance Rating:</span>
                                    <div class="metric-bar">
                                        <div class="metric-fill" style="width: ${player.performanceRating || 0}%; background: var(--primary-500);"></div>
                                        <span class="metric-value">${(player.performanceRating || 0).toFixed(1)}</span>
                                    </div>
                                </div>
                                <div class="metric-row">
                                    <span>Form Index:</span>
                                    <div class="metric-bar">
                                        <div class="metric-fill" style="width: ${player.formIndex || 0}%; background: var(--success-500);"></div>
                                        <span class="metric-value">${(player.formIndex || 0).toFixed(1)}</span>
                                    </div>
                                </div>
                                <div class="metric-row">
                                    <span>Consistency:</span>
                                    <div class="metric-bar">
                                        <div class="metric-fill" style="width: ${(player.consistencyScore || 0) * 100}%; background: var(--warning-500);"></div>
                                        <span class="metric-value">${((player.consistencyScore || 0) * 100).toFixed(1)}</span>
                                    </div>
                                </div>
                                <div class="metric-row">
                                    <span>Match Impact:</span>
                                    <div class="metric-bar">
                                        <div class="metric-fill" style="width: ${player.matchImpactScore || 0}%; background: var(--error-500);"></div>
                                        <span class="metric-value">${(player.matchImpactScore || 0).toFixed(1)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    showAdvancedTab(tabName) {
        // Update active tab
        document.querySelectorAll('.analytics-tabs .analytics-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        const content = document.getElementById('advancedAnalyticsContent');
        const advancedMetrics = this.analyticsEngine.calculateAdvancedMetrics(this.players, this.matches);
        const clusters = this.analyticsEngine.clusterPlayersByPerformance(this.players);
        
        switch(tabName) {
            case 'performance':
                content.innerHTML = this.renderPerformanceModeling(advancedMetrics);
                break;
            case 'clustering':
                content.innerHTML = this.renderPlayerClustering(clusters);
                break;
            case 'predictions':
                content.innerHTML = this.renderPredictiveAnalytics(advancedMetrics);
                break;
        }
    }

    renderPlayerClustering(clusters) {
        return `
            <div class="player-clustering">
                <h4>🎯 Player Performance Clusters</h4>
                <div class="clusters-grid">
                    <div class="cluster-card elite">
                        <h5>🏆 Elite Performers (Top 20%)</h5>
                        <div class="cluster-players">
                            ${clusters.elite.map(player => `
                                <div class="cluster-player">
                                    <span class="player-name">${player.name}</span>
                                    <span class="player-rating">${(player.performanceRating || 0).toFixed(1)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="cluster-card good">
                        <h5>⭐ Good Performers</h5>
                        <div class="cluster-players">
                            ${clusters.good.map(player => `
                                <div class="cluster-player">
                                    <span class="player-name">${player.name}</span>
                                    <span class="player-rating">${(player.performanceRating || 0).toFixed(1)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="cluster-card average">
                        <h5>📊 Average Performers</h5>
                        <div class="cluster-players">
                            ${clusters.average.map(player => `
                                <div class="cluster-player">
                                    <span class="player-name">${player.name}</span>
                                    <span class="player-rating">${(player.performanceRating || 0).toFixed(1)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="cluster-card developing">
                        <h5>🌱 Developing Players</h5>
                        <div class="cluster-players">
                            ${clusters.developing.map(player => `
                                <div class="cluster-player">
                                    <span class="player-name">${player.name}</span>
                                    <span class="player-rating">${(player.performanceRating || 0).toFixed(1)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderPredictiveAnalytics(metrics) {
        return `
            <div class="predictive-analytics">
                <h4>🔮 Predictive Performance Analysis</h4>
                <div class="predictions-grid">
                    ${metrics.slice(0, 8).map(player => `
                        <div class="prediction-card">
                            <div class="prediction-header">
                                <h5>${player.name}</h5>
                                <div class="prediction-score">
                                    <span>Predicted Score:</span>
                                    <strong>${(player.predictiveScore || 0).toFixed(1)}</strong>
                                </div>
                            </div>
                            <div class="prediction-details">
                                <div class="prediction-factor">
                                    <span>Role Effectiveness:</span>
                                    <span>${(player.roleEffectiveness || 0).toFixed(1)}%</span>
                                </div>
                                <div class="prediction-factor">
                                    <span>Pressure Index:</span>
                                    <span>${(player.pressureIndex || 0).toFixed(1)}%</span>
                                </div>
                                <div class="prediction-indicator ${(player.predictiveScore || 0) > 70 ? 'positive' : (player.predictiveScore || 0) > 50 ? 'neutral' : 'negative'}">
                                    ${(player.predictiveScore || 0) > 70 ? '📈 Rising' : (player.predictiveScore || 0) > 50 ? '➡️ Stable' : '📉 Declining'}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    showAdvancedPlayerDetails(playerName) {
        const player = this.players.find(p => p.name === playerName);
        if (!player) return;
        
        const advancedMetrics = this.analyticsEngine.calculateAdvancedMetrics([player], this.matches)[0];
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content player-details-modal">
                <div class="modal-header">
                    <h3>🧠 ${player.name} - Advanced Analytics</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="advanced-player-profile">
                        <div class="profile-overview">
                            <div class="overview-stats">
                                <div class="overview-stat">
                                    <span class="stat-label">Performance Rating</span>
                                    <div class="stat-display">
                                        <div class="rating-circle" style="background: conic-gradient(var(--primary-500) ${advancedMetrics.performanceRating || 0}%, rgba(255,255,255,0.1) 0%);">
                                            <span>${(advancedMetrics.performanceRating || 0).toFixed(0)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="overview-stat">
                                    <span class="stat-label">Form Index</span>
                                    <div class="stat-display">
                                        <div class="rating-circle" style="background: conic-gradient(var(--success-500) ${advancedMetrics.formIndex || 0}%, rgba(255,255,255,0.1) 0%);">
                                            <span>${(advancedMetrics.formIndex || 0).toFixed(0)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="advanced-metrics">
                            <h4>📊 Advanced Metrics</h4>
                            <div class="metrics-list">
                                <div class="metric-item">
                                    <span>Consistency Score:</span>
                                    <span>${((advancedMetrics.consistencyScore || 0) * 100).toFixed(1)}%</span>
                                </div>
                                <div class="metric-item">
                                    <span>Match Impact Score:</span>
                                    <span>${(advancedMetrics.matchImpactScore || 0).toFixed(1)}</span>
                                </div>
                                <div class="metric-item">
                                    <span>Predictive Score:</span>
                                    <span>${(advancedMetrics.predictiveScore || 0).toFixed(1)}</span>
                                </div>
                                <div class="metric-item">
                                    <span>Role Effectiveness:</span>
                                    <span>${(advancedMetrics.roleEffectiveness || 0).toFixed(1)}%</span>
                                </div>
                                <div class="metric-item">
                                    <span>Pressure Performance:</span>
                                    <span>${(advancedMetrics.pressureIndex || 0).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                        
                        ${this.renderPlayerRecommendations(advancedMetrics)}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    renderPlayerRecommendations(metrics) {
        const recommendations = [];
        
        if ((metrics.formIndex || 0) > 70) {
            recommendations.push("🔥 Player is in excellent form - prioritize for important matches");
        }
        
        if ((metrics.consistencyScore || 0) > 0.7) {
            recommendations.push("📊 Highly consistent performer - reliable for pressure situations");
        }
        
        if ((metrics.predictiveScore || 0) > 75) {
            recommendations.push("📈 Strong predicted performance - expect continued excellence");
        }
        
        if ((metrics.performanceRating || 0) < 40) {
            recommendations.push("⚠️ Below average performance - consider additional training");
        }
        
        if (recommendations.length === 0) {
            recommendations.push("📝 Continue monitoring performance trends");
        }
        
        return `
            <div class="player-recommendations">
                <h4>💡 Recommendations</h4>
                <div class="recommendations-list">
                    ${recommendations.map(rec => `
                        <div class="recommendation-item">
                            ${rec}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Debug function to check app state
    debugAppState() {
        console.log('=== Cricket App Debug State ===');
        console.log('waitingForBowlerSelection:', this.waitingForBowlerSelection);
        console.log('currentMatch exists:', !!this.currentMatch);
        console.log('currentMatch.bowler:', this.currentMatch?.bowler);
        
        const buttons = document.querySelectorAll('.score-btn');
        console.log('Total score buttons found:', buttons.length);
        console.log('Disabled buttons:', Array.from(buttons).filter(btn => btn.disabled).length);
        
        // Test button states
        const sampleButton = buttons[0];
        if (sampleButton) {
            console.log('Sample button state:', {
                disabled: sampleButton.disabled,
                opacity: sampleButton.style.opacity,
                pointerEvents: sampleButton.style.pointerEvents
            });
        }
        console.log('===============================');
    }

    // Comprehensive debug for bowler selection process
    debugBowlerSelection() {
        console.log('🔍 === BOWLER SELECTION DEBUG ===');
        
        // App state
        console.log('1. App State:');
        console.log('  - waitingForBowlerSelection:', this.waitingForBowlerSelection);
        console.log('  - currentMatch exists:', !!this.currentMatch);
        console.log('  - currentMatch.bowler:', this.currentMatch?.bowler);
        
        // Match state
        if (this.currentMatch) {
            const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
                this.currentMatch.team1Score : this.currentMatch.team2Score;
            console.log('2. Match State:');
            console.log('  - currentTeam:', this.currentMatch.currentTeam);
            console.log('  - overs:', currentTeamScore.overs);
            console.log('  - balls:', currentTeamScore.balls);
            console.log('  - runs:', currentTeamScore.runs);
        }
        
        // Button states
        const buttons = document.querySelectorAll('.score-btn');
        console.log('3. Button States:');
        console.log('  - Total buttons found:', buttons.length);
        console.log('  - Disabled buttons:', Array.from(buttons).filter(btn => btn.disabled).length);
        console.log('  - Buttons with opacity 0.5:', Array.from(buttons).filter(btn => btn.style.opacity === '0.5').length);
        console.log('  - Buttons with pointer-events none:', Array.from(buttons).filter(btn => btn.style.pointerEvents === 'none').length);
        
        // Modal state
        const modal = document.querySelector('.modal-overlay');
        console.log('4. Modal State:');
        console.log('  - Modal exists:', !!modal);
        console.log('  - Modal visible:', modal ? (modal.style.display !== 'none') : false);
        
        // Test a specific button in detail
        const testButton = document.querySelector('button[onclick="handleRunButton(1)"]');
        if (testButton) {
            console.log('5. Test Button (1 run) Details:');
            console.log('  - Element found:', !!testButton);
            console.log('  - Disabled:', testButton.disabled);
            console.log('  - Style opacity:', testButton.style.opacity);
            console.log('  - Style pointer-events:', testButton.style.pointerEvents);
            console.log('  - Computed style opacity:', window.getComputedStyle(testButton).opacity);
            console.log('  - Computed style pointer-events:', window.getComputedStyle(testButton).pointerEvents);
            console.log('  - Classes:', testButton.className);
        }
        
        // Global function availability
        console.log('6. Global Functions:');
        console.log('  - handleRunButton exists:', typeof window.handleRunButton);
        console.log('  - addRuns exists:', typeof window.addRuns);
        console.log('  - cricketApp exists:', typeof window.cricketApp);
        console.log('  - cricketApp.addRuns exists:', typeof window.cricketApp?.addRuns);
        
        console.log('🔍 === END BOWLER SELECTION DEBUG ===');
        
        return {
            waitingForBowlerSelection: this.waitingForBowlerSelection,
            currentMatch: !!this.currentMatch,
            buttonCount: buttons.length,
            disabledButtons: Array.from(buttons).filter(btn => btn.disabled).length,
            modalExists: !!modal
        };
    }

    // Debug function to simulate button click
    debugTestButtonClick() {
        console.log('🧪 Testing button click simulation...');
        
        // Test the app state first
        this.debugBowlerSelection();
        
        // Try to add runs directly
        console.log('🧪 Attempting to add 1 run directly...');
        try {
            this.addRuns(1);
            console.log('✅ Direct addRuns call succeeded');
        } catch (error) {
            console.error('❌ Direct addRuns call failed:', error);
        }
        
        // Try through global function
        console.log('🧪 Attempting to add 1 run through global function...');
        try {
            if (window.addRuns) {
                window.addRuns(1);
                console.log('✅ Global addRuns call succeeded');
            } else {
                console.error('❌ Global addRuns function not found');
            }
        } catch (error) {
            console.error('❌ Global addRuns call failed:', error);
        }
        
        // Try through handleRunButton
        console.log('🧪 Attempting to add 1 run through handleRunButton...');
        try {
            if (window.handleRunButton) {
                window.handleRunButton(1);
                console.log('✅ handleRunButton call succeeded');
            } else {
                console.error('❌ handleRunButton function not found');
            }
        } catch (error) {
            console.error('❌ handleRunButton call failed:', error);
        }
    }

    // Force reset the bowler selection state
    debugForceResetBowlerSelection() {
        console.log('🔧 Force resetting bowler selection state...');
        
        // Force clear the flag
        this.waitingForBowlerSelection = false;
        console.log('✅ Set waitingForBowlerSelection to false');
        
        // Force enable all buttons
        this.enableAllScoringButtons();
        console.log('✅ Called enableAllScoringButtons');
        
        // Remove any existing modals
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            modal.remove();
            console.log('✅ Removed modal');
        });
        
        // Test the state after reset
        this.debugBowlerSelection();
        
        console.log('🔧 Force reset complete. Try clicking a run button now.');
    }

    // Debug function to check player data structure
    debugPlayerData() {
        console.log('🔍 === PLAYER DATA DEBUG ===');
        console.log('Total players:', this.players.length);
        console.log('Sample player data (first 3):');
        this.players.slice(0, 3).forEach((player, index) => {
            console.log(`Player ${index + 1}:`, {
                id: player.id,
                name: player.name,
                Name: player.Name, // Check both cases
                bowling: player.bowling,
                batting: player.batting,
                is_star: player.is_star,
                fullObject: player
            });
        });
        console.log('🔍 === END PLAYER DATA DEBUG ===');
    }

    // Debug function for edit modal
    debugEditModal(playerId) {
        console.log('🔍 === EDIT MODAL DEBUG ===');
        console.log('Player ID:', playerId);
        
        // Find the player
        const player = this.players.find(p => p.id === playerId || p.id == playerId || p.id === parseInt(playerId));
        console.log('Found player:', player);
        
        if (player) {
            console.log('Player name field:', player.name);
            console.log('Player Name field:', player.Name);
            console.log('Player full object:', JSON.stringify(player, null, 2));
        }
        
        // Check if modal exists
        const modal = document.getElementById('editPlayerModal');
        console.log('Modal exists:', !!modal);
        
        if (modal) {
            const nameInput = document.getElementById('playerName');
            console.log('Name input exists:', !!nameInput);
            if (nameInput) {
                console.log('Name input value:', `"${nameInput.value}"`);
                console.log('Name input HTML:', nameInput.outerHTML);
            }
        }
        
        console.log('🔍 === END EDIT MODAL DEBUG ===');
    }

    // Import cricket data from file (for APK/PWA version)
    async importCricketData() {
        try {
            // Check if File System Access API is available
            if ('showOpenFilePicker' in window) {
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'JSON files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                
                const file = await fileHandle.getFile();
                const text = await file.text();
                const data = JSON.parse(text);
                
                await this.processImportedData(data, file.name);
            } else {
                // Fallback: create file input
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        await this.processImportedData(data, file.name);
                    }
                };
                input.click();
            }
        } catch (error) {
            console.error('❌ Import error:', error);
            this.showNotification('❌ Import failed: ' + error.message);
        }
    }

    // Process imported cricket data
    async processImportedData(data, filename) {
        try {
            let players = [];
            let matches = [];
            
            // Handle different data formats
            if (data.player_info) {
                // cricket_stats.json format
                players = data.player_info.map(playerInfo => ({
                    id: parseInt(playerInfo.Player_ID.replace('P', '')),
                    name: playerInfo.Name,
                    bowling: playerInfo.Bowling_Style,
                    batting: playerInfo.Batting_Style,
                    is_star: playerInfo.Is_Star,
                    last_updated: playerInfo.Last_Updated,
                    skill: 5,
                    role: this.dataManager?.determineRole ? this.dataManager.determineRole(playerInfo.Batting_Style, playerInfo.Bowling_Style) : 'allrounder',
                    matches: 0,
                    runs: 0,
                    wickets: 0
                }));
                
                // Convert matches from cricket_stats format
                if (data.matches) {
                    matches = data.matches.map(match => ({
                        id: match.Match_ID,
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
                        matchType: match.Match_Type,
                        completed: match.Status === 'Completed',
                        // Convert batting and bowling performance
                        battingPerformances: (data.match_batting_performance || [])
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
                        bowlingPerformances: (data.match_bowling_performance || [])
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
                    }));
                }
                
                // Save the original format to localStorage
                localStorage.setItem('cricket_stats_json', JSON.stringify(data));
            } else if (data.players) {
                // App format
                players = data.players;
                matches = data.matches || [];
            } else if (Array.isArray(data)) {
                // Direct player array
                players = data;
            } else {
                throw new Error('Unrecognized data format');
            }
            
            // Update app data
            this.players = players;
            this.matches = matches;
            
            // Save to localStorage
            localStorage.setItem('cricket-players', JSON.stringify(this.players));
            localStorage.setItem('cricket-matches', JSON.stringify(this.matches));
            localStorage.setItem('last_import_timestamp', new Date().toISOString());
            localStorage.setItem('last_import_filename', filename);
            
            // Refresh UI
            this.updateStats();
            
            console.log(`✅ Imported ${players.length} players and ${matches.length} matches from ${filename}`);
            this.showNotification(`✅ Imported ${players.length} players and ${matches.length} matches from ${filename}`);
            
        } catch (error) {
            console.error('❌ Process import error:', error);
            this.showNotification('❌ Import processing failed: ' + error.message);
        }
    }

    // Show storage information for APK version
    showStorageInfo() {
        console.log('📱 === APK STORAGE INFORMATION ===');
        
        // Check if running as APK/PWA
        const isOfflineApp = !window.location.href.startsWith('http://localhost');
        console.log('Running as APK/PWA:', isOfflineApp);
        console.log('Current URL:', window.location.href);
        
        // Check localStorage usage
        const cricketStatsJson = localStorage.getItem('cricket_stats_json');
        const cricketPlayers = localStorage.getItem('cricket-players');
        const lastSave = localStorage.getItem('last_save_timestamp');
        
        console.log('📦 localStorage Data:');
        console.log('  - cricket_stats_json size:', cricketStatsJson ? cricketStatsJson.length : 0, 'characters');
        console.log('  - cricket-players size:', cricketPlayers ? cricketPlayers.length : 0, 'characters');
        console.log('  - Last save:', lastSave || 'Never');
        
        // Calculate total storage usage
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length;
            }
        }
        console.log('  - Total localStorage usage:', totalSize, 'characters (~' + Math.round(totalSize/1024) + 'KB)');
        
        // Storage locations
        console.log('📍 Storage Locations:');
        console.log('  1. localStorage (primary): /data/data/[your.app.package]/app_webview/Local Storage/');
        console.log('     - Persists between app sessions');
        console.log('     - Only cleared when app is uninstalled');
        console.log('     - Not accessible to users or other apps');
        
        console.log('  2. Exported files:');
        if ('showSaveFilePicker' in window) {
            console.log('     - Modern API: User-selected location (Documents, Downloads, etc.)');
        } else {
            console.log('     - Download folder: /storage/emulated/0/Download/cricket_stats.json');
        }
        console.log('     - Accessible via file manager');
        console.log('     - Can be shared, copied, backed up by user');
        
        // Show current data status
        if (cricketStatsJson) {
            const data = JSON.parse(cricketStatsJson);
            console.log('📊 Current Saved Data:');
            console.log('  - Players:', data.player_info ? data.player_info.length : 0);
            console.log('  - Last export:', data.last_export);
        }
        
        console.log('📱 === END STORAGE INFO ===');
        
        // Show user-friendly notification
        const message = isOfflineApp ? 
            '📱 APK: Data saved in app storage + exported to ' + 
            ('showSaveFilePicker' in window ? 'user folder' : 'Downloads') :
            '🌐 Web: Data can be saved to server or downloaded';
        
        this.showNotification(message);
    }

    // Import and merge data with smart merge logic
    async importAndMergeData() {
        try {
            console.log('🔄 Starting import and merge process...');
            this.showNotification('🔄 Starting import and merge...');

            // Check if File System Access API is available
            if ('showOpenFilePicker' in window) {
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'JSON files',
                        accept: { 'application/json': ['.json'] }
                    }],
                    suggestedName: 'cricket_stats.json'
                });
                
                const file = await fileHandle.getFile();
                const text = await file.text();
                const data = JSON.parse(text);
                
                await this.performSmartMerge(data, file.name);
            } else {
                // Fallback: create file input
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        await this.performSmartMerge(data, file.name);
                    }
                };
                input.click();
            }
        } catch (error) {
            console.error('❌ Import and merge error:', error);
            this.showNotification('❌ Import failed: ' + error.message);
        }
    }

    // Perform smart merge of imported data
    async performSmartMerge(importedData, filename) {
        try {
            console.log('🔄 Processing smart merge from:', filename);
            
            // Extract players from different data formats
            let importedPlayers = [];
            let importedMatches = [];
            let importedTeams = [];
            
            if (importedData.player_info) {
                // cricket_stats.json format
                importedPlayers = importedData.player_info.map(playerInfo => ({
                    id: parseInt(playerInfo.Player_ID.replace('P', '')),
                    name: playerInfo.Name,
                    bowling: playerInfo.Bowling_Style,
                    batting: playerInfo.Batting_Style,
                    is_star: playerInfo.Is_Star,
                    last_updated: playerInfo.Last_Updated,
                    skill: 5,
                    role: this.dataManager?.determineRole ? this.dataManager.determineRole(playerInfo.Batting_Style, playerInfo.Bowling_Style) : 'allrounder',
                    matches: 0,
                    runs: 0,
                    wickets: 0
                }));
                
                // Look for match data in cricket_stats format
                if (importedData.matches) {
                    // Convert matches from cricket_stats format
                    importedMatches = importedData.matches.map(match => ({
                        id: match.Match_ID,
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
                        matchType: match.Match_Type,
                        completed: match.Status === 'Completed',
                        // Convert batting and bowling performance
                        battingPerformances: (importedData.match_batting_performance || [])
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
                        bowlingPerformances: (importedData.match_bowling_performance || [])
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
                    }));
                }
                
                if (importedData.teams) importedTeams = importedData.teams;
            } else if (importedData.players) {
                // App format
                importedPlayers = importedData.players;
                importedMatches = importedData.matches || [];
                importedTeams = importedData.teams || [];
            } else if (Array.isArray(importedData)) {
                // Direct player array
                importedPlayers = importedData;
            }

            // Get current data
            const currentPlayers = this.players || [];
            const currentMatches = this.matches || [];
            const currentTeams = this.teams || [];

            console.log(`📊 Merge stats: Current: ${currentPlayers.length} players, ${currentMatches.length} matches`);
            console.log(`📊 Importing: ${importedPlayers.length} players, ${importedMatches.length} matches`);

            // Merge players with smart logic
            const mergeResults = this.mergePlayerData(currentPlayers, importedPlayers);
            
            // Merge matches (only add new ones)
            const mergedMatches = this.mergeMatchData(currentMatches, importedMatches);
            
            // Merge teams (only add new ones)
            const mergedTeams = this.mergeTeamData(currentTeams, importedTeams);

            // Update app data
            this.players = mergeResults.players;
            this.matches = mergedMatches;
            this.teams = mergedTeams;

            // Save to localStorage
            localStorage.setItem('cricket-players', JSON.stringify(this.players));
            localStorage.setItem('cricket-matches', JSON.stringify(this.matches));
            localStorage.setItem('cricket-teams', JSON.stringify(this.teams));
            
            // Also save in cricket_stats format
            const cricketStatsData = {
                player_info: this.players.map((player, index) => ({
                    Player_ID: `P${(index + 1).toString().padStart(3, '0')}`,
                    Name: player.name,
                    Bowling_Style: player.bowling || 'Medium',
                    Batting_Style: player.batting || 'Reliable',
                    Is_Star: player.is_star || false,
                    Last_Updated: player.last_updated || new Date().toISOString().split('T')[0],
                    Last_Edit_Date: new Date().toISOString().split('T')[0]
                })),
                matches: this.matches,
                teams: this.teams,
                last_merge: new Date().toISOString(),
                merge_source: filename
            };
            localStorage.setItem('cricket_stats_json', JSON.stringify(cricketStatsData));

            // Refresh UI
            this.updateStats();

            // Show detailed results
            console.log('✅ Merge completed:', mergeResults.summary);
            this.showNotification(`✅ Merged: ${mergeResults.summary.added} new, ${mergeResults.summary.updated} updated, ${mergeResults.summary.unchanged} unchanged players`);

        } catch (error) {
            console.error('❌ Smart merge error:', error);
            this.showNotification('❌ Merge failed: ' + error.message);
        }
    }

    // Merge player data with smart logic
    mergePlayerData(currentPlayers, importedPlayers) {
        const merged = [...currentPlayers];
        let addedCount = 0;
        let updatedCount = 0;
        let unchangedCount = 0;

        for (const importedPlayer of importedPlayers) {
            // Find existing player by name (primary) or ID (secondary)
            const existingIndex = merged.findIndex(p => 
                p.name.toLowerCase() === importedPlayer.name.toLowerCase() || 
                (p.id && importedPlayer.id && p.id === importedPlayer.id)
            );

            if (existingIndex >= 0) {
                // Player exists - check if update is needed
                const existing = merged[existingIndex];
                const importedDate = new Date(importedPlayer.last_updated || '1900-01-01');
                const existingDate = new Date(existing.last_updated || '1900-01-01');

                if (importedDate > existingDate || !existing.last_updated) {
                    // Imported data is newer - update
                    merged[existingIndex] = {
                        ...existing, // Keep existing stats like matches, runs, wickets
                        ...importedPlayer, // Override with imported data
                        id: existing.id || importedPlayer.id, // Prefer existing ID
                        last_updated: new Date().toISOString().split('T')[0]
                    };
                    updatedCount++;
                    console.log(`🔄 Updated player: ${importedPlayer.name}`);
                } else {
                    unchangedCount++;
                    console.log(`⏩ Skipped (older): ${importedPlayer.name}`);
                }
            } else {
                // New player - add with unique ID
                const newId = this.getNextPlayerId(merged);
                merged.push({
                    ...importedPlayer,
                    id: newId,
                    last_updated: new Date().toISOString().split('T')[0]
                });
                addedCount++;
                console.log(`➕ Added new player: ${importedPlayer.name} (ID: ${newId})`);
            }
        }

        return {
            players: merged,
            summary: {
                added: addedCount,
                updated: updatedCount,
                unchanged: unchangedCount,
                total: merged.length
            }
        };
    }

    // Merge match data (add only new matches)
    mergeMatchData(currentMatches, importedMatches) {
        const merged = [...currentMatches];
        let addedCount = 0;

        for (const importedMatch of importedMatches) {
            // Check if match already exists (by date, teams, or unique identifier)
            const exists = merged.some(match => 
                (match.id && importedMatch.id && match.id === importedMatch.id) ||
                (match.date === importedMatch.date && 
                 match.team1 === importedMatch.team1 && 
                 match.team2 === importedMatch.team2)
            );

            if (!exists) {
                merged.push({
                    ...importedMatch,
                    id: importedMatch.id || `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                });
                addedCount++;
                console.log(`➕ Added new match: ${importedMatch.date || 'Unknown date'}`);
            }
        }

        console.log(`🏏 Matches: ${addedCount} new added, ${merged.length} total`);
        return merged;
    }

    // Merge team data (add only new teams)
    mergeTeamData(currentTeams, importedTeams) {
        const merged = [...currentTeams];
        let addedCount = 0;

        for (const importedTeam of importedTeams) {
            // Check if team already exists by name
            const exists = merged.some(team => 
                team.name?.toLowerCase() === importedTeam.name?.toLowerCase()
            );

            if (!exists) {
                merged.push(importedTeam);
                addedCount++;
                console.log(`➕ Added new team: ${importedTeam.name}`);
            }
        }

        console.log(`👥 Teams: ${addedCount} new added, ${merged.length} total`);
        return merged;
    }

    // Get next available player ID
    getNextPlayerId(players) {
        const existingIds = players.map(p => p.id || 0).filter(id => id > 0);
        return existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    }

    // Test merge functionality with sample data
    testMergeData() {
        console.log('🧪 Testing merge functionality...');
        
        // Create sample import data
        const sampleImportData = {
            player_info: [
                {
                    Player_ID: "P001",
                    Name: "Anuj", // Existing player - should update
                    Bowling_Style: "Fast",
                    Batting_Style: "Reliable",
                    Is_Star: true,
                    Last_Updated: "2025-09-04" // Newer date
                },
                {
                    Player_ID: "P999",
                    Name: "Test Player", // New player - should add
                    Bowling_Style: "Medium",
                    Batting_Style: "So-So", 
                    Is_Star: false,
                    Last_Updated: "2025-09-03"
                }
            ],
            matches: [
                {
                    id: "test_match_1",
                    date: "2025-09-03",
                    team1: "Team A",
                    team2: "Team B",
                    result: "Team A won"
                }
            ]
        };
        
        console.log('🧪 Sample data created:', sampleImportData);
        this.performSmartMerge(sampleImportData, 'test_data.json');
    }

    // Preview what will be exported
    previewExportData() {
        console.log('📋 === EXPORT DATA PREVIEW ===');
        console.log(`📊 Current data summary:`);
        console.log(`  - Players: ${this.players.length}`);
        console.log(`  - Matches: ${this.matches.length}`);
        console.log(`  - Teams: ${this.teams.length}`);
        
        if (this.matches.length > 0) {
            console.log(`📈 Match history sample (first 3):`);
            this.matches.slice(0, 3).forEach((match, index) => {
                console.log(`  Match ${index + 1}:`, {
                    id: match.id,
                    date: match.date,
                    teams: `${match.team1?.name || match.team1 || 'Team 1'} vs ${match.team2?.name || match.team2 || 'Team 2'}`,
                    result: match.result,
                    completed: match.completed
                });
            });
        }
        
        if (this.teams.length > 0) {
            console.log(`👥 Teams sample:`);
            this.teams.slice(0, 3).forEach((team, index) => {
                console.log(`  Team ${index + 1}:`, {
                    name: team.name,
                    players: team.players?.length || 0,
                    captain: team.captain
                });
            });
        }
        
        console.log('📋 === END EXPORT PREVIEW ===');
        this.showNotification(`📋 Export preview: ${this.players.length} players, ${this.matches.length} matches, ${this.teams.length} teams`);
    }

    showPlayerDetails(playerName) {
        const player = this.players.find(p => p.name === playerName);
        if (!player) return;
        
        const avg = player.matches > 0 ? (player.runs / player.matches).toFixed(1) : '0.0';
        const sr = this.calculateStrikeRate(player);
        const economy = this.calculateBowlerEconomy(player).toFixed(1);
        const bowlingAvg = player.bowlingRuns && player.wickets ? (player.bowlingRuns / player.wickets).toFixed(1) : 'N/A';
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content player-details-modal">
                <div class="modal-header">
                    <h3>👤 ${player.name} - Detailed Statistics</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="player-profile">
                        <div class="profile-info">
                            <div class="info-item">
                                <span class="label">Role:</span>
                                <span class="value">${player.role}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Skill Level:</span>
                                <span class="value">${player.skill}/10</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Matches Played:</span>
                                <span class="value">${player.matches || 0}</span>
                            </div>
                        </div>
                        
                        <div class="stats-sections">
                            <div class="stats-section">
                                <h4>🏏 Batting Statistics</h4>
                                <div class="stats-grid">
                                    <div class="stat-card">
                                        <div class="stat-value">${player.runs || 0}</div>
                                        <div class="stat-label">Total Runs</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-value">${avg}</div>
                                        <div class="stat-label">Average</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-value">${sr}</div>
                                        <div class="stat-label">Strike Rate</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-value">${player.highestScore || 0}</div>
                                        <div class="stat-label">Highest Score</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-value">${player.fours || 0}</div>
                                        <div class="stat-label">Fours</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-value">${player.sixes || 0}</div>
                                        <div class="stat-label">Sixes</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="stats-section">
                                <h4>⚡ Bowling Statistics</h4>
                                <div class="stats-grid">
                                    <div class="stat-card">
                                        <div class="stat-value">${player.wickets || 0}</div>
                                        <div class="stat-label">Wickets</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-value">${economy}</div>
                                        <div class="stat-label">Economy</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-value">${bowlingAvg}</div>
                                        <div class="stat-label">Bowling Avg</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-value">${player.bestBowling || 'N/A'}</div>
                                        <div class="stat-label">Best Figures</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-value">${player.maidens || 0}</div>
                                        <div class="stat-label">Maidens</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-value">${player.bowlingRuns || 0}</div>
                                        <div class="stat-label">Runs Conceded</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Data Export/Import functionality inspired by AndroidSafeDataManager
    exportDataToCSV() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            // Export Players CSV
            const playersCSV = this.generatePlayersCSV();
            this.downloadCSV(playersCSV, `cricket_players_${timestamp}.csv`);
            
            // Export Matches CSV
            const matchesCSV = this.generateMatchesCSV();
            this.downloadCSV(matchesCSV, `cricket_matches_${timestamp}.csv`);
            
            // Export Teams CSV
            const teamsCSV = this.generateTeamsCSV();
            this.downloadCSV(teamsCSV, `cricket_teams_${timestamp}.csv`);
            
            this.showNotification('📁 Data exported successfully!');
        } catch (error) {
            this.showNotification('❌ Export failed: ' + error.message);
        }
    }

    generatePlayersCSV() {
        const headers = ['ID', 'Name', 'Skill', 'Role', 'Matches', 'Runs', 'Wickets', 'Average', 'Strike Rate', 'Economy', 'Created'];
        const rows = this.players.map(player => [
            player.id,
            player.name,
            player.skill,
            player.role,
            player.matches,
            player.runs,
            player.wickets,
            player.matches > 0 ? (player.runs / player.matches).toFixed(2) : '0.00',
            this.calculateStrikeRate(player),
            this.calculateBowlerEconomy(player),
            player.created
        ]);
        
        return this.arrayToCSV([headers, ...rows]);
    }

    generateMatchesCSV() {
        const headers = ['Match ID', 'Team 1', 'Team 1 Score', 'Team 1 Wickets', 'Team 1 Overs', 
                        'Team 2', 'Team 2 Score', 'Team 2 Wickets', 'Team 2 Overs', 'Status', 'Started', 'Ended'];
        const rows = this.matches.map(match => [
            match.id,
            match.team1.name,
            match.team1Score.runs,
            match.team1Score.wickets,
            `${match.team1Score.overs}.${match.team1Score.balls}`,
            match.team2.name,
            match.team2Score.runs,
            match.team2Score.wickets,
            `${match.team2Score.overs}.${match.team2Score.balls}`,
            match.status,
            match.started,
            match.ended || ''
        ]);
        
        return this.arrayToCSV([headers, ...rows]);
    }

    generateTeamsCSV() {
        const headers = ['Team ID', 'Team Name', 'Captain', 'Players', 'Strength', 'Created'];
        const rows = this.teams.map(team => [
            team.id,
            team.name,
            team.captain || 'N/A',
            team.players.map(p => p.name).join('; '),
            team.strength,
            team.created
        ]);
        
        return this.arrayToCSV([headers, ...rows]);
    }

    arrayToCSV(array) {
        return array.map(row => 
            row.map(field => {
                // Escape fields containing commas, quotes, or newlines
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

    // Import functionality
    importDataFromFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvData = e.target.result;
                
                if (file.name.includes('players')) {
                    this.importPlayersFromCSV(csvData);
                } else if (file.name.includes('matches')) {
                    this.importMatchesFromCSV(csvData);
                } else if (file.name.includes('teams')) {
                    this.importTeamsFromCSV(csvData);
                } else {
                    this.showNotification('❌ Unknown file format');
                    return;
                }
                
                this.saveData(true); // Create JSON backup when importing data (player info changes)
                this.updateStats();
                this.loadPlayers();
                this.loadTeams();
                
                this.showNotification('📥 Data imported successfully!');
            } catch (error) {
                this.showNotification('❌ Import failed: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    importPlayersFromCSV(csvData) {
        const lines = csvData.split('\n');
        const headers = lines[0].split(',');
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = this.parseCSVLine(lines[i]);
                if (values.length >= 7) {
                    const player = {
                        id: parseInt(values[0]) || Date.now() + i,
                        name: values[1],
                        skill: parseInt(values[2]) || 5,
                        role: values[3] || 'batsman',
                        matches: parseInt(values[4]) || 0,
                        runs: parseInt(values[5]) || 0,
                        wickets: parseInt(values[6]) || 0,
                        created: values[10] || new Date().toISOString()
                    };
                    
                    // Check if player already exists
                    const existingIndex = this.players.findIndex(p => p.id === player.id);
                    if (existingIndex >= 0) {
                        this.players[existingIndex] = player;
                    } else {
                        this.players.push(player);
                    }
                }
            }
        }
    }

    importMatchesFromCSV(csvData) {
        const lines = csvData.split('\n');
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = this.parseCSVLine(lines[i]);
                if (values.length >= 10) {
                    const match = {
                        id: parseInt(values[0]) || Date.now() + i,
                        team1: { name: values[1] },
                        team1Score: {
                            runs: parseInt(values[2]) || 0,
                            wickets: parseInt(values[3]) || 0,
                            overs: parseInt(values[4].split('.')[0]) || 0,
                            balls: parseInt(values[4].split('.')[1]) || 0
                        },
                        team2: { name: values[5] },
                        team2Score: {
                            runs: parseInt(values[6]) || 0,
                            wickets: parseInt(values[7]) || 0,
                            overs: parseInt(values[8].split('.')[0]) || 0,
                            balls: parseInt(values[8].split('.')[1]) || 0
                        },
                        status: values[9] || 'completed',
                        started: values[10] || new Date().toISOString(),
                        ended: values[11] || null
                    };
                    
                    // Check if match already exists
                    const existingIndex = this.matches.findIndex(m => m.id === match.id);
                    if (existingIndex >= 0) {
                        this.matches[existingIndex] = match;
                    } else {
                        this.matches.push(match);
                    }
                }
            }
        }
    }

    importTeamsFromCSV(csvData) {
        const lines = csvData.split('\n');
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = this.parseCSVLine(lines[i]);
                if (values.length >= 4) {
                    const playerNames = values[3].split(';').map(name => name.trim());
                    const teamPlayers = playerNames.map(name => {
                        const player = this.players.find(p => p.name === name);
                        return player || { id: Date.now(), name: name, skill: 5, role: 'batsman' };
                    });
                    
                    const team = {
                        id: parseInt(values[0]) || Date.now() + i,
                        name: values[1],
                        captain: values[2] !== 'N/A' ? values[2] : null,
                        players: teamPlayers,
                        strength: parseInt(values[4]) || 0,
                        created: values[5] || new Date().toISOString()
                    };
                    
                    // Check if team already exists
                    const existingIndex = this.teams.findIndex(t => t.id === team.id);
                    if (existingIndex >= 0) {
                        this.teams[existingIndex] = team;
                    } else {
                        this.teams.push(team);
                    }
                }
            }
        }
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

    // Utility Functions
    showNotification(message) {
        // Create and show a toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            z-index: 1001;
            font-weight: 500;
            backdrop-filter: blur(10px);
            animation: slideDown 0.3s ease-out;
        `;
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease-out forwards';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 2000);
    }

    // Get available batsmen (players not currently batting and not out)
    getAvailableBatsmen() {
        if (!this.currentMatch) return [];
        
        const currentTeamScore = this.currentMatch.team1Score.batting ? this.currentMatch.team1Score : this.currentMatch.team2Score;
        const battingTeam = this.currentMatch.team1Score.batting ? this.teams[0] : this.teams[1];
        
        // Get players who are currently batting
        const currentBatsmenIds = [];
        if (currentTeamScore.striker) currentBatsmenIds.push(currentTeamScore.striker.id);
        if (currentTeamScore.nonStriker) currentBatsmenIds.push(currentTeamScore.nonStriker.id);
        
        // Get players who are already out
        const outBatsmenIds = currentTeamScore.fallOfWickets ? currentTeamScore.fallOfWickets.map(w => w.batsman?.id).filter(id => id) : [];
        
        // Return players who are not currently batting and not out
        return battingTeam.players.filter(player => 
            !currentBatsmenIds.includes(player.id) && 
            !outBatsmenIds.includes(player.id)
        );
    }

    // Get fielding team players (the team that's bowling)
    getFieldingTeamPlayers() {
        if (!this.currentMatch) return [];
        
        // Get the fielding team (opposite of batting team)
        const fieldingTeam = this.currentMatch.team1Score.batting ? this.teams[1] : this.teams[0];
        
        return fieldingTeam ? fieldingTeam.players : [];
    }

    // Show bowler selection modal at over completion
    changeBowlerAutomatically() {
        console.log('🎳 === STARTING BOWLER CHANGE PROCESS ===');
        console.log('changeBowlerAutomatically called'); // Debug log
        
        if (!this.currentMatch) {
            console.log('❌ DEBUG: No current match found');
            return;
        }
        
        console.log('✅ DEBUG: Current match object exists:', this.currentMatch); // Debug full match object
        
        // Handle old matches that don't have team IDs by using team objects directly
        let bowlingTeamId, bowlingTeam;
        
        if (this.currentMatch.team1Id && this.currentMatch.team2Id) {
            // New match structure with team IDs
            bowlingTeamId = this.currentMatch.currentTeam === 1 ? 
                this.currentMatch.team2Id : this.currentMatch.team1Id;
            bowlingTeam = this.teams.find(t => t.id === bowlingTeamId);
        } else {
            // Old match structure without team IDs - use team objects directly
            bowlingTeam = this.currentMatch.currentTeam === 1 ? 
                this.currentMatch.team2 : this.currentMatch.team1;
            bowlingTeamId = bowlingTeam ? bowlingTeam.id : undefined;
        }
        
        console.log('✅ DEBUG: Current team:', this.currentMatch.currentTeam, 'Bowling team ID:', bowlingTeamId);
        
        if (!bowlingTeam || !bowlingTeam.players) {
            console.log('❌ DEBUG: Bowling team not found or no players:', bowlingTeam);
            return;
        }
        
        console.log('✅ DEBUG: Bowling team players:', bowlingTeam.players.length);
        
        // Get current bowler
        const currentBowler = this.currentMatch.bowler;
        console.log('✅ DEBUG: Current bowler:', currentBowler);
        
        // Filter available bowlers (exclude current bowler)
        const availableBowlers = bowlingTeam.players.filter(player => 
            !currentBowler || player.id !== currentBowler.id
        );
        
        console.log('✅ Available bowlers:', availableBowlers.length); // Debug log
        console.log('✅ Available bowler details:', availableBowlers.map(p => ({ id: p.id, name: p.name }))); // Debug log
        console.log('✅ Current bowler ID to exclude:', currentBowler?.id); // Debug log
        
        if (availableBowlers.length > 0) {
            // Set flag to prevent other actions
            console.log('🚫 Setting waitingForBowlerSelection to true...');
            this.waitingForBowlerSelection = true;
            console.log('🚫 Disabling all scoring buttons...');
            this.disableAllScoringButtons();
            
            // Show bowler selection modal instead of automatic selection
            console.log('📋 Showing bowler selection modal...');
            this.showBowlerSelectionModal(availableBowlers);
            
            console.log('🎳 === BOWLER CHANGE PROCESS SETUP COMPLETE ===');
        } else {
            console.log('❌ DEBUG: No other bowlers available');
            this.showNotification('⚠️ No other bowlers available');
        }
    }

    // Disable all scoring buttons when waiting for bowler selection
    disableAllScoringButtons() {
        const buttons = document.querySelectorAll('.score-btn');
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
        });
        console.log('Disabled', buttons.length, 'scoring buttons'); // Debug log
    }

    // Enable all scoring buttons after bowler selection
    enableAllScoringButtons() {
        const buttons = document.querySelectorAll('.score-btn');
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        });
        console.log('Enabled', buttons.length, 'scoring buttons. waitingForBowlerSelection:', this.waitingForBowlerSelection); // Debug log
    }

    // Show bowler selection modal
    showBowlerSelectionModal(availableBowlers) {
        console.log('showBowlerSelectionModal called'); // Debug log
        
        // Remove any existing modal first
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                position: relative;
                z-index: 10001;
            ">
                <h3 style="color: #ff6b35; margin-bottom: 20px; text-align: center;">🎳 Select New Bowler</h3>
                <p style="margin-bottom: 20px; color: #666; text-align: center; font-weight: bold;">Over completed! You must select the next bowler to continue:</p>
                
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold; color: #333;">Available Bowlers:</label>
                    <select id="newBowler" style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid #ccc; font-size: 16px;">
                        <option value="">Select a bowler...</option>
                    </select>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 25px;">
                    <button onclick="confirmBowlerChange()" style="flex: 1; padding: 12px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer;">Confirm Selection</button>
                </div>
                
                <p style="margin-top: 15px; color: #999; text-align: center; font-size: 14px;">Note: Scoring is disabled until you select a bowler</p>
            </div>
        `;

        document.body.appendChild(modal);

        // Populate bowler dropdown with available players
        const newBowlerSelect = document.getElementById('newBowler');
        availableBowlers.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name;
            newBowlerSelect.appendChild(option);
        });

        const app = this;

        window.confirmBowlerChange = function() {
            console.log('🎯 === CONFIRMING BOWLER CHANGE ===');
            
            const newBowlerId = document.getElementById('newBowler').value;
            console.log('✅ confirmBowlerChange called with bowler ID:', newBowlerId); // Debug log
            
            if (!newBowlerId) {
                console.log('❌ No bowler selected');
                alert('Please select a bowler to continue the match');
                return;
            }

            // First try to find in availableBowlers array
            let selectedBowler = availableBowlers.find(p => p.id === newBowlerId);
            console.log('✅ Selected bowler found in availableBowlers:', selectedBowler); // Debug log
            
            // If not found, try with type conversion (string vs number)
            if (!selectedBowler) {
                console.log('⚠️ Trying with type conversion...');
                selectedBowler = availableBowlers.find(p => p.id == newBowlerId || p.id === parseInt(newBowlerId) || p.id === newBowlerId.toString());
                console.log('✅ Selected bowler found with type conversion:', selectedBowler);
            }
            
            // If still not found in availableBowlers, search in all players
            if (!selectedBowler) {
                console.log('⚠️ Bowler not found in availableBowlers, searching all players...');
                selectedBowler = app.players.find(p => p.id === newBowlerId || p.id == newBowlerId || p.id === parseInt(newBowlerId) || p.id === newBowlerId.toString());
                console.log('✅ Selected bowler found in all players:', selectedBowler); // Debug log
            }
            
            // Debug the ID comparison issue
            if (!selectedBowler) {
                console.log('🔍 DEBUG ID COMPARISON:');
                console.log('  - Selected ID:', newBowlerId, 'Type:', typeof newBowlerId);
                
                // Check the first available bowler for comparison
                if (availableBowlers.length > 0) {
                    const firstBowler = availableBowlers[0];
                    console.log('  - First available bowler ID:', firstBowler.id, 'Type:', typeof firstBowler.id);
                    console.log('  - Strict equality (===):', firstBowler.id === newBowlerId);
                    console.log('  - Loose equality (==):', firstBowler.id == newBowlerId);
                    console.log('  - String comparison:', firstBowler.id === newBowlerId.toString());
                    console.log('  - Number comparison:', firstBowler.id === parseInt(newBowlerId));
                }
                
                // Try manual search to find the exact issue
                console.log('🔍 Manual search in availableBowlers:');
                availableBowlers.forEach((bowler, index) => {
                    const matches = bowler.id === newBowlerId || bowler.id == newBowlerId;
                    console.log(`  [${index}] ${bowler.name}: ID=${bowler.id} (${typeof bowler.id}) Matches: ${matches}`);
                });
            }
            
            if (selectedBowler) {
                console.log('🔄 Updating match bowler...');
                // Update match bowler
                app.currentMatch.bowler = {
                    id: selectedBowler.id,
                    name: selectedBowler.name,
                    matchBowlingRuns: 0,
                    matchBowlingBalls: 0,
                    matchBowlingWickets: 0
                };
                
                console.log('✅ Updated match bowler:', app.currentMatch.bowler); // Debug log
                
                // STEP 1: Clear waiting flag IMMEDIATELY
                console.log('🚫 STEP 1: Clearing waitingForBowlerSelection flag...');
                console.log('  - Before:', app.waitingForBowlerSelection);
                app.waitingForBowlerSelection = false;
                console.log('  - After:', app.waitingForBowlerSelection);
                
                // STEP 2: Re-enable buttons immediately
                console.log('🔓 STEP 2: Enabling scoring buttons immediately...');
                app.enableAllScoringButtons();
                console.log('✅ Called enableAllScoringButtons immediately');
                
                // STEP 3: Verify button states
                console.log('🔍 STEP 3: Verifying button states...');
                const buttons = document.querySelectorAll('.score-btn');
                const disabledCount = Array.from(buttons).filter(btn => btn.disabled).length;
                const opacityCount = Array.from(buttons).filter(btn => btn.style.opacity === '0.5').length;
                console.log('  - Total buttons:', buttons.length);
                console.log('  - Disabled buttons:', disabledCount);
                console.log('  - Buttons with opacity 0.5:', opacityCount);
                
                // STEP 4: Double-check after delay
                setTimeout(() => {
                    console.log('🔍 STEP 4: Double-checking after 50ms delay...');
                    console.log('  - waitingForBowlerSelection:', app.waitingForBowlerSelection);
                    app.enableAllScoringButtons();
                    console.log('✅ Double-called enableAllScoringButtons');
                    
                    // Final verification
                    const buttonsAfter = document.querySelectorAll('.score-btn');
                    const disabledAfter = Array.from(buttonsAfter).filter(btn => btn.disabled).length;
                    console.log('  - Final disabled button count:', disabledAfter);
                    
                    // Test a specific button
                    const testBtn = document.querySelector('button[onclick="handleRunButton(1)"]');
                    if (testBtn) {
                        console.log('  - Test button (1 run) state:', {
                            disabled: testBtn.disabled,
                            opacity: testBtn.style.opacity,
                            pointerEvents: testBtn.style.pointerEvents
                        });
                    }
                }, 50);
                
                // STEP 5: Update UI
                console.log('🎨 STEP 5: Updating UI...');
                app.showNotification('🎳 New bowler: ' + selectedBowler.name);
                app.updateScoreDisplay();
                
                console.log('✅ Bowler changed to:', selectedBowler.name);
                console.log('🎯 === BOWLER CHANGE COMPLETE ===');
            } else {
                console.log('❌ Selected bowler not found anywhere - ID:', newBowlerId);
                console.log('❌ Available bowler IDs:', availableBowlers.map(p => p.id));
                console.log('❌ All player IDs:', app.players.map(p => p.id));
                alert('Error: Selected bowler not found. Please try again.');
            }
            
            console.log('🗑️ Removing modal...');
            document.body.removeChild(modal);
        };

        // Prevent modal from closing by clicking outside
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                alert('You must select a bowler to continue the match');
            }
        });
    }
}

// Global App Instance
let app;

// Navigation Functions
function showPage(pageId) {
    console.log(`showPage called with pageId: ${pageId}`);
    
    // Hide all content pages
    document.querySelectorAll('.content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        console.log(`Successfully activated page: ${pageId}`);
    } else {
        console.error(`Page with ID '${pageId}' not found!`);
        return;
    }
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Handle navigation highlighting - check if called from event or programmatically
    try {
        if (typeof event !== 'undefined' && event.target) {
            event.target.closest('.nav-item')?.classList.add('active');
        } else {
            // Programmatic call - find the nav item by onclick attribute
            document.querySelector(`[onclick="showPage('${pageId}')"]`)?.classList.add('active');
        }
    } catch (e) {
        // Fallback - find the nav item by onclick attribute
        document.querySelector(`[onclick="showPage('${pageId}')"]`)?.classList.add('active');
    }
    
    // Update title and back button
    const titles = {
        home: 'Cricket Manager',
        players: 'Players',
        teams: 'Teams', 
        scoring: 'Live Scoring',
        settings: 'Settings'
    };
    
    const navTitle = document.getElementById('navTitle');
    if (navTitle) {
        navTitle.textContent = titles[pageId] || 'Cricket Manager';
    }
    
    // Special handling for scoring page
    if (pageId === 'scoring' && window.cricketApp) {
        window.cricketApp.updateScoringTabView();
    }
    
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        if (pageId === 'home') {
            backBtn.style.display = 'none';
        } else {
            backBtn.style.display = 'block';
        }
    }
}

// Make sure showPage is globally accessible
window.showPage = showPage;

// Alternative direct tab switching function
function switchToScoringTab() {
    console.log('switchToScoringTab called');
    
    // Hide all content sections
    const contentSections = document.querySelectorAll('.content');
    contentSections.forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    // Show scoring section
    const scoringSection = document.getElementById('scoring');
    if (scoringSection) {
        scoringSection.classList.add('active');
        scoringSection.style.display = 'block';
        console.log('Scoring section activated');
        
        // Update navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        
        // Find and activate scoring nav item
        const scoringNavItem = document.querySelector('[onclick="showPage(\'scoring\')"]');
        if (scoringNavItem) {
            scoringNavItem.classList.add('active');
        }
        
        // Update title
        const navTitle = document.getElementById('navTitle');
        if (navTitle) {
            navTitle.textContent = 'Live Scoring';
        }
        
        return true;
    } else {
        console.error('Scoring section not found!');
        return false;
    }
}

// Make alternative function globally accessible too
window.switchToScoringTab = switchToScoringTab;

function goBack() {
    showPage('home');
}

// Modal Functions
function showAddPlayerModal() {
    document.getElementById('addPlayerModal').classList.add('active');
}

function showCreateTeamModal() {
    const modal = document.getElementById('createTeamModal');
    const playerSelection = document.getElementById('playerSelection');
    
    // Load available players as checkboxes
    playerSelection.innerHTML = app.players.map(player => `
        <label style="display: block; margin: 8px 0; cursor: pointer;">
            <input type="checkbox" name="selectedPlayers" value="${player.id}" style="margin-right: 8px;">
            ${player.name} (${player.role}, Skill: ${player.skill})
        </label>
    `).join('');
    
    modal.classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Form Handlers
function addPlayer(event) {
    event.preventDefault();
    
    const name = document.getElementById('playerName').value;
    const skill = document.getElementById('playerSkill').value;
    const role = document.getElementById('playerRole').value;
    const bowlingType = document.getElementById('bowlingType').value;
    const battingStyle = document.getElementById('battingStyle').value;
    const playerType = document.getElementById('playerType').value;
    
    app.addPlayer(name, skill, role, bowlingType, battingStyle, playerType);
    
    // Reset form and close modal
    event.target.reset();
    closeModal('addPlayerModal');
}

function createCustomTeam(event) {
    event.preventDefault();
    
    const name = document.getElementById('teamName').value;
    const selectedPlayerIds = Array.from(document.querySelectorAll('input[name="selectedPlayers"]:checked'))
        .map(cb => parseInt(cb.value));
    
    if (selectedPlayerIds.length === 0) {
        app.showNotification('❌ Please select at least one player');
        return;
    }
    
    app.createCustomTeam(name, selectedPlayerIds);
    
    // Reset form and close modal
    event.target.reset();
    closeModal('createTeamModal');
}

// Global Functions for HTML onclick handlers
function removePlayer(playerId) {
    if (confirm('Are you sure you want to remove this player?')) {
        app.removePlayer(playerId);
    }
}

function editPlayer(playerId) {
    if (window.cricketApp && window.cricketApp.showNotification) {
        window.cricketApp.showNotification('✏️ Edit functionality coming soon!');
    } else {
        console.log('✏️ Edit functionality coming soon for player ID:', playerId);
    }
}

function removeTeam(teamId) {
    if (confirm('Are you sure you want to remove this team?')) {
        app.removeTeam(teamId);
    }
}

function generateBalancedTeams() {
    app.generateBalancedTeams();
}

function openEditPlayerModal(playerId) {
    console.log('Opening edit modal for player ID:', playerId);
    
    // Get the app instance with proper error handling
    const appInstance = window.cricketApp || window.app;
    if (!appInstance) {
        console.error('Cricket app not initialized yet');
        alert('App is still loading, please try again in a moment');
        return;
    }
    
    if (!appInstance.players || !Array.isArray(appInstance.players)) {
        console.error('Players array not available');
        alert('Player data not loaded yet, please try again');
        return;
    }
    
    // Find the player
    const player = appInstance.players.find(p => p.id === playerId || p.id == playerId || p.id === parseInt(playerId));
    if (!player) {
        console.error('Player not found:', playerId);
        console.log('Available players:', appInstance.players.map(p => ({id: p.id, name: p.name})));
        alert('Player not found');
        return;
    }
    
    console.log('Found player:', player);
    
    // Clean player name for HTML attribute
    const cleanName = (player.name || '').replace(/"/g, '&quot;');
    
    // Create modal HTML based on ui_components.py structure
    const modalHTML = `
        <div class="modal-overlay" id="editPlayerModal" onclick="closeEditPlayerModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>Edit Player</h3>
                    <button class="modal-close" onclick="closeEditPlayerModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="playerName">Name:</label>
                        <input type="text" id="playerName" value="${cleanName}" class="form-input">
                    </div>
                    <div class="form-group">
                        <label for="bowlingType">Bowling Type:</label>
                        <select id="bowlingType" class="form-select">
                            <option value="Fast" ${player.bowling === 'Fast' ? 'selected' : ''}>Fast</option>
                            <option value="Medium" ${player.bowling === 'Medium' ? 'selected' : ''}>Medium</option>
                            <option value="DNB" ${player.bowling === 'DNB' ? 'selected' : ''}>DNB</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="battingStyle">Batting Style:</label>
                        <select id="battingStyle" class="form-select">
                            <option value="Reliable" ${player.batting === 'Reliable' || player.batting === 'R' ? 'selected' : ''}>Reliable</option>
                            <option value="So-So" ${player.batting === 'So-So' || player.batting === 'S' ? 'selected' : ''}>So-So</option>
                            <option value="Tailend" ${player.batting === 'Tailend' || player.batting === 'U' ? 'selected' : ''}>Tailend</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="playerType">Player Type:</label>
                        <select id="playerType" class="form-select">
                            <option value="Regular" ${!player.is_star ? 'selected' : ''}>Regular</option>
                            <option value="Star" ${player.is_star ? 'selected' : ''}>Star</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-danger" onclick="deletePlayer(${playerId})">Delete Player</button>
                    <button class="btn btn-orange" onclick="closeEditPlayerModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="savePlayerChanges(${playerId})">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Set values programmatically as backup and ensure proper population
    setTimeout(() => {
        const nameInput = document.getElementById('playerName');
        const bowlingSelect = document.getElementById('bowlingType');
        const battingSelect = document.getElementById('battingStyle');
        const playerTypeSelect = document.getElementById('playerType');
        
        console.log('🔧 Modal elements check:');
        console.log('  - nameInput found:', !!nameInput);
        console.log('  - nameInput current value:', nameInput ? `"${nameInput.value}"` : 'N/A');
        console.log('  - player.name to set:', `"${player.name}"`);
        
        if (nameInput) {
            // Multiple ways to ensure the name is set
            nameInput.value = player.name || '';
            nameInput.setAttribute('value', player.name || '');
            
            // Double check
            console.log('🔧 After setting - nameInput.value:', `"${nameInput.value}"`);
            
            // If still empty, try one more time
            if (!nameInput.value || nameInput.value.trim() === '') {
                setTimeout(() => {
                    nameInput.value = player.name || '';
                    console.log('🔧 Final fallback - nameInput.value:', `"${nameInput.value}"`);
                }, 50);
            }
        }
        
        // Ensure all selects have correct values
        if (bowlingSelect) bowlingSelect.value = player.bowling || player.bowlingStyle || 'Medium';
        if (battingSelect) battingSelect.value = player.batting || player.battingStyle || 'Reliable';
        if (playerTypeSelect) playerTypeSelect.value = player.is_star ? 'Star' : 'Regular';
        
        // Focus on name input
        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }
    }, 100);
}

function deletePlayer(playerId) {
    const appInstance = window.cricketApp || window.app;
    if (!appInstance) {
        console.error('Cricket app not initialized');
        alert('App not ready, please try again');
        return;
    }
    
    // Find the player
    const player = appInstance.players.find(p => p.id === playerId || p.id == playerId || p.id === parseInt(playerId));
    if (!player) {
        console.error('❌ Player not found with ID:', playerId);
        alert('Player not found');
        return;
    }
    
    // Check if player has match data
    const hasMatchData = appInstance.matches.some(match => {
        // Check batting performances
        const inBatting = (match.battingPerformances || []).some(perf => 
            perf.playerId === playerId || perf.playerId == playerId || perf.playerId === parseInt(playerId)
        );
        
        // Check bowling performances
        const inBowling = (match.bowlingPerformances || []).some(perf => 
            perf.playerId === playerId || perf.playerId == playerId || perf.playerId === parseInt(playerId)
        );
        
        // Check team compositions
        const inTeam1 = (match.team1Composition || []).some(p => 
            p.id === playerId || p.id == playerId || p.id === parseInt(playerId)
        );
        
        const inTeam2 = (match.team2Composition || []).some(p => 
            p.id === playerId || p.id == playerId || p.id === parseInt(playerId)
        );
        
        return inBatting || inBowling || inTeam1 || inTeam2;
    });
    
    if (hasMatchData) {
        appInstance.showNotification(`❌ Cannot delete ${player.name} - player has match data. Remove from all matches first.`);
        return;
    }
    
    // Confirm deletion
    const confirmDelete = confirm(`Are you sure you want to delete ${player.name}? This action cannot be undone.`);
    if (!confirmDelete) {
        return;
    }
    
    // Remove player from the array
    const playerIndex = appInstance.players.findIndex(p => p.id === playerId || p.id == playerId || p.id === parseInt(playerId));
    if (playerIndex === -1) {
        console.error('❌ Player index not found');
        alert('Error deleting player');
        return;
    }
    
    appInstance.players.splice(playerIndex, 1);
    
    // Update localStorage and JSON
    appInstance.saveData(true);
    
    // Refresh the player list
    appInstance.updateStats();
    
    // Close modal
    closeEditPlayerModal();
    
    // Show success message
    appInstance.showNotification(`✅ ${player.name} deleted successfully!`);
    
    console.log('✅ Player deletion completed');
}

function closeEditPlayerModal(event) {
    if (event && event.target !== event.currentTarget) return;
    
    const modal = document.getElementById('editPlayerModal');
    if (modal) {
        modal.remove();
    }
}

function savePlayerChanges(playerId) {
    const nameInput = document.getElementById('playerName');
    const bowlingSelect = document.getElementById('bowlingType');
    const battingSelect = document.getElementById('battingStyle');
    const playerTypeSelect = document.getElementById('playerType');
    
    // Debug logging
    console.log('🔧 Save player changes debug:');
    console.log('  - playerId:', playerId);
    console.log('  - nameInput:', nameInput);
    console.log('  - nameInput exists:', !!nameInput);
    if (nameInput) {
        console.log('  - nameInput.value raw:', `"${nameInput.value}"`);
        console.log('  - nameInput.value trimmed:', `"${nameInput.value.trim()}"`);
        console.log('  - nameInput.value length:', nameInput.value.length);
        console.log('  - nameInput.value trim length:', nameInput.value.trim().length);
    }
    console.log('  - bowlingSelect:', bowlingSelect);
    console.log('  - battingSelect:', battingSelect);
    console.log('  - playerTypeSelect:', playerTypeSelect);
    
    // Get the app instance with proper error handling
    const appInstance = window.cricketApp || window.app;
    if (!appInstance) {
        console.error('Cricket app not initialized');
        alert('App not ready, please try again');
        return;
    }
    
    // Find the player first to get original data
    const player = appInstance.players.find(p => p.id === playerId || p.id == playerId || p.id === parseInt(playerId));
    if (!player) {
        console.error('❌ Player not found with ID:', playerId);
        console.log('Available players:', appInstance.players.map(p => ({id: p.id, name: p.name})));
        alert('Player not found');
        return;
    }
    
    console.log('🔧 Found player data:', JSON.stringify(player, null, 2));
    
    // Get the name value - use input if available and has value, otherwise use original player name
    let playerName = '';
    if (nameInput && nameInput.value && nameInput.value.trim()) {
        playerName = nameInput.value.trim();
        console.log('🔧 Using input value:', playerName);
    } else {
        playerName = player.name || player.Name || ''; // Try both lowercase and uppercase
        console.log('🔧 Using original player name as fallback:', playerName);
        console.log('🔧 Input state - exists:', !!nameInput, 'value:', nameInput ? `"${nameInput.value}"` : 'N/A', 'trimmed:', nameInput ? `"${nameInput.value.trim()}"` : 'N/A');
        console.log('🔧 Player name sources - player.name:', `"${player.name}"`, 'player.Name:', `"${player.Name}"`);
    }
    
    if (!playerName) {
        console.error('❌ No valid player name found');
        appInstance.showNotification('❌ Player name cannot be empty');
        return;
    }
    
    console.log('🔧 Before update:', JSON.stringify(player, null, 2));
    
    // Update player data
    player.name = playerName;
    player.bowling = bowlingSelect ? bowlingSelect.value : (player.bowling || 'Medium');
    player.batting = battingSelect ? battingSelect.value : (player.batting || 'Reliable');
    player.is_star = playerTypeSelect ? (playerTypeSelect.value === 'Star') : (player.is_star || false);
    player.last_updated = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log('🔧 After update:', JSON.stringify(player, null, 2));
    
    // Save to localStorage
    localStorage.setItem('cricket-players', JSON.stringify(appInstance.players));
    
    console.log('💾 Saved to localStorage. Full players array:');
    console.log(JSON.stringify(appInstance.players, null, 2));
    
    // Export updated players to JSON file with complete data
    exportUpdatedPlayersToJSON(appInstance.players, appInstance.matches || [], appInstance.teams || []);
    
    // Refresh the player list
    appInstance.updateStats();
    
    // Close modal
    closeEditPlayerModal();
    
    // Show success message
    appInstance.showNotification(`✅ ${player.name} updated successfully!`);
    
    console.log('✅ Player update completed');
}

function exportUpdatedPlayersToJSON(players, matches = [], teams = []) {
    try {
        console.log('📝 Using edit-in-place for player data export...');
        
        // Use the main app's saveData method with edit-in-place
        if (window.cricketApp && window.cricketApp.saveData) {
            // Update the app's data first
            window.cricketApp.players = players;
            window.cricketApp.matches = matches || window.cricketApp.matches || [];
            window.cricketApp.teams = teams || window.cricketApp.teams || [];
            
            // Use the edit-in-place save system
            window.cricketApp.saveData(true);
            
            console.log('✅ Player data exported using edit-in-place system');
        } else {
            console.warn('⚠️ Cricket app not available, falling back to old method');
            // Fallback to old method if app not available
            exportUpdatedPlayersToJSONLegacy(players, matches, teams);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error exporting player data:', error);
        // Fallback to old method on error
        exportUpdatedPlayersToJSONLegacy(players, matches, teams);
        return false;
    }
}

function exportUpdatedPlayersToJSONLegacy(players, matches = [], teams = []) {
    try {
        console.log('📁 Using legacy download method as fallback...');
        
        // Create cricket_stats.json format that matches the expected structure
        const cricketStatsData = {
            player_info: players.map((player, index) => ({
                Player_ID: `P${(index + 1).toString().padStart(3, '0')}`,
                Name: player.name,
                Bowling_Style: player.bowling || player.bowlingStyle || 'Medium',
                Batting_Style: player.batting || player.battingStyle || 'Reliable',
                Is_Star: player.is_star || false,
                Last_Updated: player.last_updated || new Date().toISOString().split('T')[0],
                Last_Edit_Date: new Date().toISOString().split('T')[0]
            })),
            matches: matches.map(match => ({
                Match_ID: match.id || match.matchId || `M${(matches.indexOf(match) + 1).toString().padStart(3, '0')}`,
                Date: match.date || new Date().toISOString().split('T')[0],
                Venue: match.venue || 'Not specified',
                Team1: match.team1 || (match.teams && match.teams[0]) || 'Team 1',
                Team2: match.team2 || (match.teams && match.teams[1]) || 'Team 2',
                Team1_Captain: match.team1Captain || match.captains?.team1 || '',
                Team2_Captain: match.team2Captain || match.captains?.team2 || '',
                Team1_Composition: match.team1Composition || match.compositions?.team1 || [],
                Team2_Composition: match.team2Composition || match.compositions?.team2 || [],
                Winning_Team: match.winningTeam || match.winner || '',
                Losing_Team: match.losingTeam || match.loser || '',
                Game_Start_Time: match.gameStartTime || match.startTime || match.date + 'T14:00:00Z',
                Game_Finish_Time: match.gameFinishTime || match.finishTime || '',
                Winning_Team_Score: match.winningTeamScore || match.scores?.winner || '',
                Losing_Team_Score: match.losingTeamScore || match.scores?.loser || '',
                Result: match.result || match.winner || 'No result',
                Overs: match.overs || match.totalOvers || 20,
                Match_Type: match.matchType || match.match_type || 'Regular',
                Status: match.completed !== false ? 'Completed' : 'In Progress'
            })),
            match_batting_performance: matches.flatMap(match => {
                const matchId = match.id || match.matchId || `M${(matches.indexOf(match) + 1).toString().padStart(3, '0')}`;
                return (match.battingPerformances || match.batting_performances || []).map(perf => ({
                    Match_ID: matchId,
                    Player_ID: perf.playerId || perf.Player_ID || `P${(perf.player_id || '001').toString().padStart(3, '0')}`,
                    Player: perf.playerName || perf.Player || perf.name || 'Unknown',
                    Runs: perf.runs || perf.Runs || 0,
                    Balls_Faced: perf.ballsFaced || perf.Balls_Faced || perf.balls || 0,
                    Strike_Rate: perf.strikeRate || perf.Strike_Rate || perf.strike_rate || '0.00',
                    Fours: perf.fours || perf.Fours || 0,
                    Sixes: perf.sixes || perf.Sixes || 0,
                    Out: perf.out !== undefined ? perf.out : (perf.Out !== undefined ? perf.Out : false),
                    Dismissal_Type: perf.dismissalType || perf.Dismissal_Type || perf.how_out || '',
                    Position: perf.position || perf.Position || perf.batting_order || 1
                }))
            }),
            match_bowling_performance: matches.flatMap(match => {
                const matchId = match.id || match.matchId || `M${(matches.indexOf(match) + 1).toString().padStart(3, '0')}`;
                return (match.bowlingPerformances || match.bowling_performances || []).map(perf => ({
                    Match_ID: matchId,
                    Player_ID: perf.playerId || perf.Player_ID || `P${(perf.player_id || '001').toString().padStart(3, '0')}`,
                    Player: perf.playerName || perf.Player || perf.name || 'Unknown',
                    Overs: perf.overs || perf.Overs || '0.0',
                    Maidens: perf.maidens || perf.Maidens || 0,
                    Runs: perf.runs || perf.Runs || 0,
                    Wickets: perf.wickets || perf.Wickets || 0,
                    Economy: perf.economy || perf.Economy || '0.00',
                    Balls: perf.balls || perf.Balls || 0
                }))
            }),
            export_metadata: {
                total_players: players.length,
                total_matches: matches.length,
                export_date: new Date().toISOString(),
                export_timestamp: new Date().toLocaleString(),
                app_version: '1.0.0',
                data_format_version: '2.0',
                created_by: 'Cricket PWA'
            }
        };
        
        // Check if running as PWA/APK (no server available)
        const isOfflineApp = !window.location.href.startsWith('http://localhost');
        
        if (isOfflineApp) {
            // For APK/PWA: Save to localStorage and handle file operations
            handleOfflineFileSave(cricketStatsData, players, matches, teams);
        } else {
            // For web version: Try to save to server first
            saveToServer(cricketStatsData).then(success => {
                if (success) {
                    console.log('✅ Complete cricket data saved to server');
                    if (window.cricketApp && window.cricketApp.showNotification) {
                        window.cricketApp.showNotification(`✅ Complete data saved: ${players.length} players, ${matches.length} matches`);
                    }
                } else {
                    // Fallback to download if server save fails
                    console.log('⚠️ Server save failed, falling back to download');
                    downloadFallback(cricketStatsData);
                }
            }).catch(error => {
                console.log('⚠️ Server save error, falling back to download:', error);
                downloadFallback(cricketStatsData);
            });
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error exporting complete cricket data:', error);
        if (window.cricketApp && window.cricketApp.showNotification) {
            window.cricketApp.showNotification('❌ Export failed: ' + error.message);
        }
        return false;
    }
}

// Handle file operations for offline/APK version
function handleOfflineFileSave(cricketStatsData, players, matches = [], teams = []) {
    try {
        console.log('📱 Handling offline file save with edit-in-place approach...');
        
        // 1. Save to localStorage (primary persistence)
        localStorage.setItem('cricket_stats_json', JSON.stringify(cricketStatsData));
        localStorage.setItem('cricket_players_backup', JSON.stringify(players));
        localStorage.setItem('cricket_matches_backup', JSON.stringify(matches));
        localStorage.setItem('cricket_teams_backup', JSON.stringify(teams));
        localStorage.setItem('last_save_timestamp', new Date().toISOString());
        
        console.log('✅ Complete cricket data saved to localStorage (internal app storage)');
        console.log('📍 localStorage location: /data/data/[app.package]/app_webview/Local Storage/');
        console.log('💾 Data size breakdown:');
        console.log(`  - Players: ${JSON.stringify(players).length} characters (${players.length} players)`);
        console.log(`  - Matches: ${JSON.stringify(matches).length} characters (${matches.length} matches)`);
        console.log(`  - Teams: ${JSON.stringify(teams).length} characters (${teams.length} teams)`);
        console.log(`  - Total cricket_stats.json: ${JSON.stringify(cricketStatsData).length} characters`);
        
        // 2. Try edit-in-place approach first
        if (window.cricketApp && window.cricketApp.dataManager) {
            console.log('🔄 Using edit-in-place system for offline save...');
            const appData = { players, matches, teams };
            
            window.cricketApp.dataManager.editJSONFilesInPlace(appData).then(() => {
                console.log('✅ Edit-in-place save completed for offline app');
                if (window.cricketApp && window.cricketApp.showNotification) {
                    window.cricketApp.showNotification(`🔄 Data updated in-place: ${players.length} players, ${matches.length} matches, ${teams.length} teams`);
                }
            }).catch(error => {
                console.warn('⚠️ Edit-in-place failed for offline, using fallback:', error);
                handleOfflineFileSaveFallback(cricketStatsData, players, matches, teams);
            });
        } else {
            console.warn('⚠️ Edit-in-place system not available, using fallback');
            handleOfflineFileSaveFallback(cricketStatsData, players, matches, teams);
        }
        
    } catch (error) {
        console.error('❌ Offline save error:', error);
        if (window.cricketApp && window.cricketApp.showNotification) {
            window.cricketApp.showNotification('❌ Save failed: ' + error.message);
        }
    }
}

// Fallback method for offline file save
function handleOfflineFileSaveFallback(cricketStatsData, players, matches, teams) {
    try {
        // Try modern File System Access API (if available)
        if ('showSaveFilePicker' in window) {
            console.log('📱 Modern File API available - will prompt user for save location');
            handleModernFileSave(cricketStatsData);
        } else {
            // Fallback to download (goes to Downloads folder)
            console.log('📱 Using download fallback - saving to Downloads folder');
            console.log('📍 Download location: /storage/emulated/0/Download/cricket_stats.json');
            downloadFallbackLegacy(cricketStatsData);
        }
        
        // Show success notification with complete data info
        if (window.cricketApp && window.cricketApp.showNotification) {
            const isModernAPI = 'showSaveFilePicker' in window;
            const location = isModernAPI ? 'user-selected location' : 'Downloads folder';
            window.cricketApp.showNotification(`✅ Complete data saved: ${players.length} players, ${matches.length} matches, ${teams.length} teams to ${location} (fallback method)`);
        }
    } catch (error) {
        console.error('❌ Offline save fallback error:', error);
        if (window.cricketApp && window.cricketApp.showNotification) {
            window.cricketApp.showNotification('❌ Offline save fallback failed: ' + error.message);
        }
    }
}

// Use modern File System Access API (for supported browsers/PWAs)
async function handleModernFileSave(cricketStatsData) {
    try {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: 'cricket_stats.json',
            types: [{
                description: 'JSON files',
                accept: { 'application/json': ['.json'] }
            }]
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(cricketStatsData, null, 2));
        await writable.close();
        
        console.log('✅ File saved using modern File System API');
        if (window.cricketApp && window.cricketApp.showNotification) {
            window.cricketApp.showNotification('✅ cricket_stats.json saved to device');
        }
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('❌ Modern file save error:', error);
        }
        // Fallback to download
        downloadFallback(cricketStatsData);
    }
}

// Function to save data directly to server
async function saveToServer(data) {
    try {
        const response = await fetch('/api/save-players', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log('✅ Server save successful:', result.message);
            return true;
        } else {
            console.error('❌ Server save failed:', result.message);
            return false;
        }
    } catch (error) {
        console.error('❌ Server save error:', error);
        return false;
    }
}

// Fallback function to download files if server save fails
function downloadFallback(cricketStatsData) {
    console.log('📁 Server save failed, using edit-in-place fallback...');
    
    try {
        // Try to use the edit-in-place system first
        if (window.cricketApp && window.cricketApp.dataManager && window.cricketApp.dataManager.editCricketStatsJSON) {
            // Convert cricketStatsData to app format and use edit-in-place
            const appData = {
                players: window.cricketApp.players || [],
                matches: window.cricketApp.matches || [],
                teams: window.cricketApp.teams || []
            };
            
            window.cricketApp.dataManager.editCricketStatsJSON(appData).then(() => {
                console.log('✅ Used edit-in-place fallback successfully');
                if (window.cricketApp && window.cricketApp.showNotification) {
                    window.cricketApp.showNotification('📁 Data updated using edit-in-place system (server unavailable)');
                }
            }).catch(error => {
                console.warn('⚠️ Edit-in-place fallback failed, using legacy download:', error);
                downloadFallbackLegacy(cricketStatsData);
            });
        } else {
            console.warn('⚠️ Edit-in-place system not available, using legacy download');
            downloadFallbackLegacy(cricketStatsData);
        }
    } catch (error) {
        console.error('❌ Error in downloadFallback, using legacy method:', error);
        downloadFallbackLegacy(cricketStatsData);
    }
}

// Legacy download method as final fallback
function downloadFallbackLegacy(cricketStatsData) {
    // Download as cricket_stats.json to overwrite the existing file
    downloadJSONFile(cricketStatsData, 'cricket_stats.json');
    
    // Also create a backup with timestamp
    const backupFilename = `cricket_stats_backup_${new Date().toISOString().split('T')[0]}.json`;
    downloadJSONFile(cricketStatsData, backupFilename);
    
    console.log('📁 Downloaded cricket_stats.json for manual overwrite (legacy method)');
    console.log('📁 Also created backup:', backupFilename);
    
    if (window.cricketApp && window.cricketApp.showNotification) {
        window.cricketApp.showNotification('📁 cricket_stats.json downloaded - replace existing file manually (legacy fallback)');
    }
}

function downloadJSONFile(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    console.log(`📥 Downloaded: ${filename}`);
}

function exportAllPlayersToJSON() {
    const appInstance = window.cricketApp || window.app;
    if (!appInstance || !appInstance.players) {
        console.error('No player data available for export');
        alert('No player data available for export');
        return;
    }
    
    console.log('📁 Exporting all players and match history to JSON...');
    console.log(`📊 Export includes: ${appInstance.players.length} players, ${appInstance.matches?.length || 0} matches, ${appInstance.teams?.length || 0} teams`);
    
    // Export complete data including match history
    exportUpdatedPlayersToJSON(appInstance.players, appInstance.matches || [], appInstance.teams || []);
}

function startMatchWithTeam(teamId) {
    console.log('startMatchWithTeam called with teamId:', teamId);
    
    // Get the match setup with selected players
    const matchSetup = JSON.parse(localStorage.getItem('match_setup') || '{}');
    console.log('Retrieved match setup:', matchSetup);
    
    if (!matchSetup.battingTeam || !matchSetup.bowlingTeam || !matchSetup.striker || !matchSetup.nonStriker || !matchSetup.bowler) {
        console.error('Missing player selections:', {
            battingTeam: !!matchSetup.battingTeam,
            bowlingTeam: !!matchSetup.bowlingTeam,
            striker: !!matchSetup.striker,
            nonStriker: !!matchSetup.nonStriker,
            bowler: !!matchSetup.bowler
        });
        if (window.cricketApp) {
            window.cricketApp.showNotification('❌ Missing player selections for match setup');
        }
        return;
    }
    
    console.log('Creating match with players:', {
        striker: matchSetup.striker.name,
        nonStriker: matchSetup.nonStriker.name,
        bowler: matchSetup.bowler.name
    });
    
    // Initialize the match with selected players
    window.cricketApp.currentMatch = {
        id: Date.now(),
        team1: matchSetup.battingTeam,
        team2: matchSetup.bowlingTeam,
        currentTeam: 1, // Batting team starts
        currentInnings: 1,
        team1Score: { 
            runs: 0, 
            wickets: 0, 
            overs: 0, 
            balls: 0,
            striker: matchSetup.striker,
            nonStriker: matchSetup.nonStriker,
            extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0 },
            fallOfWickets: [],
            overByOver: []
        },
        team2Score: { 
            runs: 0, 
            wickets: 0, 
            overs: 0, 
            balls: 0,
            striker: null, // Will be set when team2 bats
            nonStriker: null, // Will be set when team2 bats
            extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0 },
            fallOfWickets: [],
            overByOver: []
        },
        bowler: matchSetup.bowler,
        totalOvers: 20,
        status: 'active',
        ballByBall: [],
        started: new Date().toISOString()
    };
    
    // BCCB Logic: Initialize match statistics for all players
    // Initialize striker stats
    if (window.cricketApp.currentMatch.team1Score.striker) {
        window.cricketApp.currentMatch.team1Score.striker.matchRuns = 0;
        window.cricketApp.currentMatch.team1Score.striker.matchBalls = 0;
        window.cricketApp.currentMatch.team1Score.striker.matchBoundaries = { fours: 0, sixes: 0 };
    }
    
    // Initialize non-striker stats
    if (window.cricketApp.currentMatch.team1Score.nonStriker) {
        window.cricketApp.currentMatch.team1Score.nonStriker.matchRuns = 0;
        window.cricketApp.currentMatch.team1Score.nonStriker.matchBalls = 0;
        window.cricketApp.currentMatch.team1Score.nonStriker.matchBoundaries = { fours: 0, sixes: 0 };
    }
    
    // Initialize bowler stats
    if (window.cricketApp.currentMatch.bowler) {
        window.cricketApp.currentMatch.bowler.matchBowlingRuns = 0;
        window.cricketApp.currentMatch.bowler.matchBowlingBalls = 0;
        window.cricketApp.currentMatch.bowler.matchBowlingWickets = 0;
    }
    
    console.log('Match created:', window.cricketApp.currentMatch);
    
    // Save the match and update display
    window.cricketApp.saveData(false);
    console.log('About to call updateScoreDisplay...');
    window.cricketApp.updateScoreDisplay();
    
    // Show notification with selected players
    if (window.cricketApp) {
        window.cricketApp.showNotification(`🏏 Match started! ${matchSetup.striker.name} & ${matchSetup.nonStriker.name} batting, ${matchSetup.bowler.name} bowling!`);
    }
}

function addRuns(runs) {
    if (window.cricketApp) {
        window.cricketApp.addRuns(runs);
    } else {
        console.error('Cricket app not initialized');
        showMessage('Cricket app not ready. Please start a match first.', 'error');
    }
}

function addWicket() {
    if (window.cricketApp) {
        window.cricketApp.addWicket();
    } else {
        console.error('Cricket app not initialized');
        showMessage('Cricket app not ready. Please start a match first.', 'error');
    }
}

function endMatch() {
    if (confirm('Are you sure you want to end this match?')) {
        if (window.cricketApp) {
            window.cricketApp.endMatch();
        } else {
            console.error('Cricket app not initialized');
            showMessage('Cricket app not ready. Please start a match first.', 'error');
        }
    }
}

function exportData() {
    if (window.cricketApp) {
        window.cricketApp.exportDataToCSV();
    } else {
        console.error('Cricket app not initialized');
        showMessage('Cricket app not ready. Please export data.', 'error');
    }
}

// Extra handling functions
window.activeExtraType = null;

function toggleExtra(extraType) {
    // Try different button ID formats
    let btn = document.getElementById(extraType + 'Btn');
    if (!btn) {
        btn = document.getElementById(extraType + '-btn');
    }
    if (!btn) {
        btn = document.getElementById(extraType);
    }
    if (!btn) {
        // Try capitalized version
        const capitalizedType = extraType.charAt(0).toUpperCase() + extraType.slice(1);
        btn = document.getElementById(capitalizedType + 'Btn');
    }
    
    const instructions = document.getElementById('extraInstructions');
    
    // Safety check for button existence
    if (!btn) {
        console.error('Button not found for extra type:', extraType, 'Tried IDs:', [
            extraType + 'Btn',
            extraType + '-btn', 
            extraType,
            extraType.charAt(0).toUpperCase() + extraType.slice(1) + 'Btn'
        ]);
        showMessage('Extra button not found. Please check the UI setup.', 'error');
        return;
    }
    
    // Safety check for instructions element
    if (!instructions) {
        console.error('Extra instructions element not found');
        return;
    }
    
    // If this extra is already active, deactivate it
    if (window.activeExtraType === extraType) {
        window.activeExtraType = null;
        btn.classList.remove('active');
        instructions.style.display = 'none';
        showMessage('Extra deselected. Click run buttons for normal scoring.', 'info');
        return;
    }
    
    // Deactivate any currently active extra
    if (window.activeExtraType) {
        const prevBtn = document.getElementById(window.activeExtraType + 'Btn');
        if (prevBtn) prevBtn.classList.remove('active');
    }
    
    // Activate the new extra
    window.activeExtraType = extraType;
    btn.classList.add('active');
    instructions.style.display = 'block';
    
    const extraNames = {
        'wide': 'Wide Ball',
        'noball': 'No Ball', 
        'bye': 'Bye',
        'legbye': 'Leg Bye'
    };
    
    showMessage(`${extraNames[extraType]} selected! Now click a run button (0-6) to add runs.`, 'info');
}

function handleRunButton(runs) {
    if (window.activeExtraType) {
        handleExtraRuns(window.activeExtraType, runs);
    } else {
        addRuns(runs);
    }
}

function handleExtraRuns(extraType, runsScored) {
    if (!window.cricketApp) {
        console.error('Cricket app not initialized');
        showMessage('Cricket app not ready. Please start a match first.', 'error');
        return;
    }
    
    console.log(`Adding extra: ${extraType} with ${runsScored} runs`);
    
    // Get match settings for penalty runs
    const matchSettings = JSON.parse(localStorage.getItem('match-settings') || '{}');
    const wideRuns = parseInt(matchSettings.runsOnWide || '1');
    const noBallRuns = parseInt(matchSettings.runsOnNoBall || '1');
    
    // Create custom addExtras function call with proper format
    if (window.cricketApp.addExtras) {
        // Base extra runs: Wide and No Ball use settings, Bye gives 0 extra
        let baseExtraRuns = 0;
        if (extraType === 'wide') {
            baseExtraRuns = wideRuns;
        } else if (extraType === 'noball') {
            baseExtraRuns = noBallRuns;
        }
        
        const totalRuns = baseExtraRuns + runsScored;
        
        // Call the cricket app's addExtras method
        window.cricketApp.addExtras(extraType, totalRuns, runsScored);
        
        // Format for display: 4Nb, 2Wd, 1B etc.
        const displayExtra = {
            'wide': 'Wd',
            'noball': 'Nb', 
            'bye': 'B'
        }[extraType];
        
        const displayText = runsScored === 0 ? displayExtra : `${runsScored}${displayExtra}`;
        showMessage(`Extra added: ${displayText} (${totalRuns} total runs)`, 'success');
    } else {
        // Fallback to regular addRuns for now
        addRuns(runsScored + (extraType !== 'bye' ? 1 : 0));
        showMessage(`${extraType} with ${runsScored} runs added`, 'success');
    }
    
    // Clear the active extra
    clearActiveExtra();
}

// Global functions for handling innings end scenarios
function handleFinishInnings(dismissedBatsmanId, dismissalType, helper, fielder) {
    if (!window.cricketApp) {
        console.error('Cricket app not initialized');
        return;
    }
    
    window.cricketApp.handleFinishInnings(dismissedBatsmanId, dismissalType, helper, fielder);
}

function handleLastManStanding(dismissedBatsmanId, dismissalType, helper, fielder) {
    if (!window.cricketApp) {
        console.error('Cricket app not initialized');
        return;
    }
    
    window.cricketApp.handleLastManStanding(dismissedBatsmanId, dismissalType, helper, fielder);
}

function clearActiveExtra() {
    if (window.activeExtraType) {
        const btn = document.getElementById(window.activeExtraType + 'Btn');
        if (btn) btn.classList.remove('active');
        window.activeExtraType = null;
        
        const instructions = document.getElementById('extraInstructions');
        if (instructions) instructions.style.display = 'none';
    }
}

function importData(event) {
    const files = event.target.files;
    for (const file of files) {
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            app.importDataFromFile(file);
        } else {
            app.showNotification('❌ Please select CSV files only');
        }
    }
    // Reset the input
    event.target.value = '';
}

// Global functions for inline team generation workflow
window.selectAllPlayersInline = function() {
    const labels = document.querySelectorAll('.player-checkbox-item');
    labels.forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        label.classList.add('selected');
        checkbox.checked = true;
    });
    window.updateSelectedPlayerCountInline();
};

window.unselectAllPlayersInline = function() {
    const labels = document.querySelectorAll('.player-checkbox-item');
    labels.forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        label.classList.remove('selected');
        checkbox.checked = false;
    });
    window.updateSelectedPlayerCountInline();
};

window.proceedToCaptainSelectionInline = function() {
    const checkedBoxes = document.querySelectorAll('input[name="todayPlayers"]:checked');
    
    if (checkedBoxes.length < 4) {
        window.cricketApp.showNotification('❌ Please select at least 4 players');
        return;
    }
    
    // Get selected player objects
    const selectedPlayerIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
    const selectedPlayers = window.cricketApp.players.filter(p => selectedPlayerIds.includes(p.id));
    
    window.cricketApp.showInlineCaptainSelection(selectedPlayers);
};

window.backToPlayerSelectionInline = function() {
    window.cricketApp.showInlinePlayerSelection();
};

window.generateTeamsInline = function() {
    window.cricketApp.generateTeamsWithSelectedPlayersInline();
};

window.cancelTeamGeneration = function() {
    // Clear any temporary teams
    if (window.cricketApp.tempTeams) {
        window.cricketApp.tempTeams = null;
    }
    
    // Reset to show existing teams or "No teams yet"
    window.cricketApp.loadTeams();
};

window.regenerateTeams = function() {
    // Reshuffle teams with the same players and captains
    window.cricketApp.reshuffleTeamsWithSameSelections();
};

window.confirmTeams = function() {
    // Save the temporarily stored teams to JSON
    if (window.cricketApp.tempTeams) {
        // Generate unique match_id
        const matchId = 'MATCH_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        
        // Create match record with team composition
        const matchRecord = {
            match_id: matchId,
            date: new Date().toISOString(),
            status: 'setup',
            team1: {
                name: window.cricketApp.tempTeams[0].name,
                captain: window.cricketApp.tempTeams[0].captain,
                players: window.cricketApp.tempTeams[0].players.map(p => ({
                    id: p.id,
                    name: p.name,
                    battingStyle: p.battingStyle,
                    bowlingStyle: p.bowlingStyle,
                    role: p.role
                })),
                strength: window.cricketApp.tempTeams[0].strength
            },
            team2: {
                name: window.cricketApp.tempTeams[1].name,
                captain: window.cricketApp.tempTeams[1].captain,
                players: window.cricketApp.tempTeams[1].players.map(p => ({
                    id: p.id,
                    name: p.name,
                    battingStyle: p.battingStyle,
                    bowlingStyle: p.bowlingStyle,
                    role: p.role
                })),
                strength: window.cricketApp.tempTeams[1].strength
            },
            created: new Date().toISOString()
        };
        
        // Add match to matches array
        window.cricketApp.matches.push(matchRecord);
        
        // Save teams to teams array (localStorage only, not JSON)
        window.cricketApp.teams = window.cricketApp.tempTeams;
        window.cricketApp.saveData(false); // Don't save to JSON during match setup
        window.cricketApp.updateStats();
        window.cricketApp.tempTeams = null; // Clear temporary teams
    }
    
    // Go back to normal teams view
    window.cricketApp.loadTeams();
    window.cricketApp.showNotification('🎉 Teams are ready! Match saved with unique ID!');
};

// Direct player movement function for inline team adjustment
window.movePlayerDirectly = function(playerElement) {
    const playerId = playerElement.dataset.playerId;
    const currentTeam = parseInt(playerElement.dataset.team);
    const targetTeam = currentTeam === 1 ? 2 : 1;
    
    if (!window.cricketApp.tempTeams || window.cricketApp.tempTeams.length !== 2) {
        window.cricketApp.showNotification('❌ No teams available for adjustment');
        return;
    }
    
    const team1 = window.cricketApp.tempTeams[0];
    const team2 = window.cricketApp.tempTeams[1];
    const sourceTeam = currentTeam === 1 ? team1 : team2;
    const destinationTeam = targetTeam === 1 ? team1 : team2;
    
    // Find the player in the source team
    const playerIndex = sourceTeam.players.findIndex(p => p.id == playerId);
    if (playerIndex === -1) {
        window.cricketApp.showNotification('❌ Error finding player');
        return;
    }
    
    // Move the player
    const player = sourceTeam.players.splice(playerIndex, 1)[0];
    destinationTeam.players.push(player);
    
    // Refresh the display
    window.cricketApp.showInlineTeamsResult(team1, team2);
    
    window.cricketApp.showNotification(`✅ ${player.name} moved to ${destinationTeam.name}`);
};

// Manual Team Adjustment Functions
window.showManualAdjustModal = function() {
    if (!window.cricketApp.tempTeams || window.cricketApp.tempTeams.length !== 2) {
        window.cricketApp.showNotification('❌ No teams available for adjustment');
        return;
    }
    
    const modal = document.getElementById('manualAdjustModal');
    const team1 = window.cricketApp.tempTeams[0];
    const team2 = window.cricketApp.tempTeams[1];
    
    // Set team names
    document.getElementById('team1NameAdjust').textContent = team1.name;
    document.getElementById('team2NameAdjust').textContent = team2.name;
    
    // Populate team players
    populateTeamPlayers('team1PlayersAdjust', team1.players, team1.captain, 1);
    populateTeamPlayers('team2PlayersAdjust', team2.players, team2.captain, 2);
    
    modal.classList.add('active');
};

function populateTeamPlayers(containerId, players, captainName, teamNumber) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    players.forEach(player => {
        const playerDiv = document.createElement('div');
        const isCaptain = player.name === captainName;
        playerDiv.className = `player-item-adjust ${isCaptain ? 'captain' : ''}`;
        playerDiv.textContent = player.name + (isCaptain ? ' (C)' : '');
        playerDiv.dataset.playerId = player.id;
        playerDiv.dataset.teamNumber = teamNumber;
        
        // Only add click listener for non-captains
        if (!isCaptain) {
            playerDiv.addEventListener('click', function() {
                movePlayerToOtherTeam(this);
            });
        }
        
        container.appendChild(playerDiv);
    });
}

function movePlayerToOtherTeam(playerElement) {
    const currentTeamNumber = parseInt(playerElement.dataset.teamNumber);
    const playerId = playerElement.dataset.playerId;
    const targetTeamNumber = currentTeamNumber === 1 ? 2 : 1;
    
    // Find the teams
    const team1 = window.cricketApp.tempTeams[0];
    const team2 = window.cricketApp.tempTeams[1];
    const currentTeam = currentTeamNumber === 1 ? team1 : team2;
    const targetTeam = targetTeamNumber === 1 ? team1 : team2;
    
    // Find the player in the current team
    const playerIndex = currentTeam.players.findIndex(p => p.id == playerId);
    if (playerIndex === -1) {
        window.cricketApp.showNotification('❌ Error finding player');
        return;
    }
    
    // Move the player
    const player = currentTeam.players.splice(playerIndex, 1)[0];
    targetTeam.players.push(player);
    
    // Refresh both team displays
    populateTeamPlayers('team1PlayersAdjust', team1.players, team1.captain, 1);
    populateTeamPlayers('team2PlayersAdjust', team2.players, team2.captain, 2);
    
    window.cricketApp.showNotification(`✅ ${player.name} moved to ${targetTeam.name}`);
}

// Removed old selection-based swap system - now using direct click-to-move

window.applyManualAdjustments = function() {
    // The changes are already applied to tempTeams, so just close the modal
    closeModal('manualAdjustModal');
    
    // Refresh the team results display
    if (window.cricketApp.tempTeams && window.cricketApp.tempTeams.length === 2) {
        window.cricketApp.showInlineTeamsResult(window.cricketApp.tempTeams[0], window.cricketApp.tempTeams[1]);
    }
    
    window.cricketApp.showNotification('✅ Manual adjustments applied!');
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
// Initialize the cricket app
window.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Content Loaded, initializing cricket app...');
    window.cricketApp = new CricketApp();
    console.log('✅ Cricket app initialized:', window.cricketApp);
    
    // Initialize bye button visibility based on settings
    window.cricketApp.updateByeButtonVisibility();
    
    // Add console helpers for the new edit-in-place functionality
    window.editInPlaceHelpers = {
        showInfo: () => window.cricketApp.showEditInPlaceInfo(),
        getBackups: () => window.cricketApp.getBackupList(),
        restore: (timestamp) => window.cricketApp.restoreFromBackup(timestamp),
        help: () => {
            console.log(`
🔄 Edit-in-Place Console Helpers:

editInPlaceHelpers.showInfo()     - Show instructions for edit-in-place mode
editInPlaceHelpers.getBackups()   - List available backups
editInPlaceHelpers.restore(time)  - Restore from backup (use timestamp from getBackups)
editInPlaceHelpers.help()         - Show this help

Example:
> editInPlaceHelpers.getBackups()
> editInPlaceHelpers.restore('2025-09-08T12-30-45')

📋 The app now edits existing JSON files instead of creating new ones!
            `);
        }
    };
    
    // Add console helpers for data management
    window.dataHelpers = {
        export: () => {
            if (window.exportCricketData) {
                window.exportCricketData();
            } else {
                console.log('❌ Export function not available');
            }
        },
        import: () => {
            if (window.importCricketData) {
                window.importCricketData();
            } else {
                console.log('❌ Import function not available');
            }
        },
        summary: () => window.cricketDataManager.getDataSummary(),
        test: () => window.cricketDataManager.testImport(),
        expectedFile: () => {
            const fileName = window.cricketDataManager.getExpectedFileName();
            console.log(`📁 Expected backup file name: ${fileName}`);
            console.log('📂 Should be located in your Downloads folder');
            return fileName;
        },
        help: () => {
            console.log(`
💾 Data Management Console Helpers:

dataHelpers.export()        - Export data to Downloads folder  
dataHelpers.import()        - Import data from Downloads folder
dataHelpers.summary()       - Show current data summary
dataHelpers.test()          - Test import/export functionality
dataHelpers.expectedFile()  - Show expected backup file name
dataHelpers.help()          - Show this help

📁 Export creates: cricket-data-backup-YYYY-MM-DD.json in Downloads
📥 Import looks for: cricket-data-backup-*.json files
🔄 Import merges data without overwriting existing records

Example workflow:
> dataHelpers.export()        // Creates backup file
> dataHelpers.import()        // Select the backup file to merge
> dataHelpers.summary()       // Check results
            `);
        }
    };
    
    // Show welcome message about new functionality
    setTimeout(() => {
        if (window.cricketApp && window.cricketApp.showNotification) {
            window.cricketApp.showNotification('� Data management updated! Type "dataHelpers.help()" in console for backup/import features.');
        }
    }, 2000);
    
    // Test function to verify everything is working
    window.testSpiderChart = function() {
        console.log('🧪 Testing spider chart functionality...');
        console.log('cricketApp exists:', !!window.cricketApp);
        console.log('updateScoringSpiderChart exists:', typeof window.cricketApp.updateScoringSpiderChart);
        
        const player1Select = document.getElementById('scoringPlayer1Select');
        const player2Select = document.getElementById('scoringPlayer2Select');
        console.log('Player selects exist:', !!player1Select, !!player2Select);
        
        if (window.cricketApp && window.cricketApp.players) {
            console.log('Number of players:', window.cricketApp.players.length);
        }
    };
});
    
    // Create global app reference for backward compatibility
    window.app = window.cricketApp;
    
    // Hide target info immediately on page load
    const targetInfoEl = document.getElementById('targetInfo');
    if (targetInfoEl) {
        targetInfoEl.style.display = 'none';
        targetInfoEl.style.visibility = 'hidden';
        targetInfoEl.innerHTML = '';
    }
    
    // Initialize scoring tab view
    setTimeout(() => {
        if (window.cricketApp.updateScoringTabView) {
            window.cricketApp.updateScoringTabView();
        }
    }, 100);
    
    // Add CSS for toast animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { transform: translate(-50%, -100%); }
            to { transform: translate(-50%, 0); }
        }
        @keyframes slideUp {
            from { transform: translate(-50%, 0); }
            to { transform: translate(-50%, -100%); }
        }
    `;
    document.head.appendChild(style);
});

// Toss Functionality - Inline Display
function startToss() {
    const teams = getCurrentTeams();
    if (teams.length !== 2) {
        showMessage('Need exactly 2 teams for toss!', 'error');
        return;
    }

    // Find the toss button container and create inline toss display
    const tossButton = document.querySelector('.toss-btn');
    const tossContainer = tossButton.parentElement;
    
    // Remove existing toss result if any
    const existingTossResult = document.getElementById('toss-result-container');
    if (existingTossResult) {
        existingTossResult.remove();
    }

    // Create inline toss display similar to team box
    const tossResultContainer = document.createElement('div');
    tossResultContainer.id = 'toss-result-container';
    tossResultContainer.className = 'simple-team-box';
    tossResultContainer.style.marginTop = '20px';
    tossResultContainer.innerHTML = `
        <div style="text-align: center;">
            <h3 style="color: #ff6b35; margin-bottom: 20px; font-size: 1.3em;">🪙 Toss Time!</h3>
            <div id="coin-animation" style="font-size: 80px; margin: 20px 0; transition: all 0.5s ease;">🪙</div>
            <div id="toss-status" style="font-size: 1.1em; margin: 15px 0; color: #fff;">Flipping coin...</div>
            <div id="toss-result" style="display: none;">
                <h4 id="winning-team" style="color: #ff6b35; margin: 15px 0; font-size: 1.2em;"></h4>
                <p style="margin: 15px 0; color: #fff;">Choose your option:</p>
                <div style="display: flex; gap: 15px; justify-content: center; margin: 20px 0;">
                    <button id="bat-first" class="choice-btn" style="background: #22c55e; border: none; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">🏏 Bat First</button>
                    <button id="bowl-first" class="choice-btn" style="background: #3b82f6; border: none; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">⚾ Bowl First</button>
                </div>
                <div style="margin-top: 15px;">
                    <button onclick="backToToss()" style="background: #6b7280; border: none; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9em;">
                        ← Back to Teams
                    </button>
                </div>
            </div>
        </div>
    `;

    // Insert after toss button container
    tossContainer.parentNode.insertBefore(tossResultContainer, tossContainer.nextSibling);

    // Hide the toss button
    tossButton.style.display = 'none';

    // Animate coin flip
    const coinAnimation = document.getElementById('coin-animation');
    const tossStatus = document.getElementById('toss-status');
    const tossResult = document.getElementById('toss-result');
    const winningTeamEl = document.getElementById('winning-team');

    // Spin the coin
    let rotations = 0;
    const spinInterval = setInterval(() => {
        rotations += 180;
        coinAnimation.style.transform = `rotateY(${rotations}deg)`;
    }, 100);

    // After 2 seconds, show result
    setTimeout(() => {
        clearInterval(spinInterval);
        
        // Randomly select winning team
        const winningTeam = teams[Math.floor(Math.random() * 2)];
        
        tossStatus.style.display = 'none';
        winningTeamEl.textContent = `${winningTeam.name} wins the toss!`;
        tossResult.style.display = 'block';

        // Handle choice buttons with highlighting
        document.getElementById('bat-first').onclick = () => {
            highlightChoice('bat-first');
            startMatchWithChoice(winningTeam, 'bat');
        };

        document.getElementById('bowl-first').onclick = () => {
            highlightChoice('bowl-first');
            startMatchWithChoice(winningTeam, 'bowl');
        };
    }, 2000);
}

function highlightChoice(chosenButtonId) {
    // Highlight the chosen button and dim the other
    const batButton = document.getElementById('bat-first');
    const bowlButton = document.getElementById('bowl-first');
    
    if (chosenButtonId === 'bat-first') {
        batButton.style.background = '#16a34a';
        batButton.style.transform = 'scale(1.05)';
        batButton.style.boxShadow = '0 4px 15px rgba(34, 197, 94, 0.4)';
        bowlButton.style.background = '#6b7280';
        bowlButton.style.opacity = '0.6';
    } else {
        bowlButton.style.background = '#1d4ed8';
        bowlButton.style.transform = 'scale(1.05)';
        bowlButton.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.4)';
        batButton.style.background = '#6b7280';
        batButton.style.opacity = '0.6';
    }
    
    // Disable both buttons
    batButton.disabled = true;
    bowlButton.disabled = true;
}

function startMatchWithChoice(winningTeam, choice) {
    const teams = getCurrentTeams();
    const battingTeam = choice === 'bat' ? winningTeam : teams.find(t => t.id !== winningTeam.id);
    const bowlingTeam = choice === 'bat' ? teams.find(t => t.id !== winningTeam.id) : winningTeam;
    
    // Store toss result
    localStorage.setItem('toss_result', JSON.stringify({
        winningTeam: winningTeam.id,
        choice: choice,
        battingTeam: battingTeam.id,
        bowlingTeam: bowlingTeam.id
    }));
    
    // Show player selection interface
    showPlayerSelection(battingTeam, bowlingTeam);
}

function getCurrentTeams() {
    const teamsData = localStorage.getItem('cricket-teams');
    return teamsData ? JSON.parse(teamsData) : [];
}

// Player Selection Functions
function showPlayerSelection(battingTeam, bowlingTeam) {
    // Remove existing player selection if any
    const existingSelection = document.getElementById('player-selection-container');
    if (existingSelection) {
        existingSelection.remove();
    }

    const tossContainer = document.getElementById('toss-result-container');
    
    // Create player selection container
    const playerSelectionContainer = document.createElement('div');
    playerSelectionContainer.id = 'player-selection-container';
    playerSelectionContainer.className = 'simple-team-box';
    playerSelectionContainer.style.marginTop = '20px';
    
    playerSelectionContainer.innerHTML = `
        <div style="text-align: center;">
            <h3 style="color: #22c55e; margin-bottom: 15px;">🏏 Select Opening Batsmen</h3>
            <p style="color: rgba(255,255,255,0.8); margin-bottom: 20px;">${battingTeam.name} - Choose 2 batsmen</p>
            
            <div id="selection-summary" class="selection-summary" style="display: none;">
                <h4>Selected Players:</h4>
                <div id="selected-players-list" class="selected-players"></div>
            </div>
            
            <div id="batsmen-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px;">
                ${battingTeam.players.map(player => `
                    <button class="player-btn" 
                            onclick="toggleBatsmanSelection(${player.id}, '${player.name}')"
                            data-player-id="${player.id}"
                            style="background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); color: white; padding: 10px; border-radius: 8px; cursor: pointer; transition: all 0.3s ease;">
                        ${player.name}
                    </button>
                `).join('')}
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                <button onclick="backToToss()" style="background: #6b7280; border: none; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                    ← Back
                </button>
                <button id="confirm-batsmen" onclick="showBowlerSelection()" disabled 
                        style="background: #22c55e; border: none; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; opacity: 0.5;">
                    Next →
                </button>
            </div>
        </div>
    `;

    // Insert after toss container
    tossContainer.parentNode.insertBefore(playerSelectionContainer, tossContainer.nextSibling);
    
    // Store teams for later use
    window.currentBattingTeam = battingTeam;
    window.currentBowlingTeam = bowlingTeam;
    window.selectedBatsmen = [];
}

function toggleBatsmanSelection(playerId, playerName) {
    const button = document.querySelector(`[data-player-id="${playerId}"]`);
    const confirmButton = document.getElementById('confirm-batsmen');
    const summaryDiv = document.getElementById('selection-summary');
    const selectedPlayersList = document.getElementById('selected-players-list');
    
    if (window.selectedBatsmen.find(b => b.id === playerId)) {
        // Deselect
        window.selectedBatsmen = window.selectedBatsmen.filter(b => b.id !== playerId);
        button.style.background = 'rgba(255,255,255,0.1)';
        button.style.borderColor = 'rgba(255,255,255,0.3)';
        button.style.transform = 'scale(1)';
    } else {
        if (window.selectedBatsmen.length < 2) {
            // Select
            window.selectedBatsmen.push({id: playerId, name: playerName});
            button.style.background = '#22c55e';
            button.style.borderColor = '#22c55e';
            button.style.transform = 'scale(1.05)';
        }
    }
    
    // Update summary display
    if (window.selectedBatsmen.length > 0) {
        summaryDiv.style.display = 'block';
        selectedPlayersList.innerHTML = window.selectedBatsmen.map(player => 
            `<span class="selected-player">${player.name}</span>`
        ).join('');
    } else {
        summaryDiv.style.display = 'none';
    }
    
    // Enable/disable confirm button
    if (window.selectedBatsmen.length === 2) {
        confirmButton.disabled = false;
        confirmButton.style.opacity = '1';
    } else {
        confirmButton.disabled = true;
        confirmButton.style.opacity = '0.5';
    }
}

function showBowlerSelection() {
    // Remove existing bowler selection if any
    const existingBowlerSelection = document.getElementById('bowler-selection-container');
    if (existingBowlerSelection) {
        existingBowlerSelection.remove();
    }

    const playerSelectionContainer = document.getElementById('player-selection-container');
    
    // Create bowler selection container
    const bowlerSelectionContainer = document.createElement('div');
    bowlerSelectionContainer.id = 'bowler-selection-container';
    bowlerSelectionContainer.className = 'simple-team-box';
    bowlerSelectionContainer.style.marginTop = '20px';
    
    bowlerSelectionContainer.innerHTML = `
        <div style="text-align: center;">
            <h3 style="color: #1d4ed8; margin-bottom: 15px;">⚾ Select Opening Bowler</h3>
            <p style="color: rgba(255,255,255,0.8); margin-bottom: 20px;">${window.currentBowlingTeam.name} - Choose 1 bowler</p>
            
            <div id="bowler-summary" class="selection-summary" style="display: none;">
                <h4 style="color: #1d4ed8;">Selected Bowler:</h4>
                <div id="selected-bowler-name" class="selected-players"></div>
            </div>
            
            <div id="bowler-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px;">
                ${window.currentBowlingTeam.players.map(player => `
                    <button class="bowler-btn" 
                            onclick="selectBowler(${player.id}, '${player.name}')"
                            data-player-id="${player.id}"
                            style="background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); color: white; padding: 10px; border-radius: 8px; cursor: pointer; transition: all 0.3s ease;">
                        ${player.name}
                    </button>
                `).join('')}
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                <button onclick="backToBatsmenSelection()" style="background: #6b7280; border: none; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                    ← Back
                </button>
                <button id="start-match" onclick="startMatchWithPlayers()" disabled 
                        style="background: #22c55e; border: none; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; opacity: 0.5;">
                    Start Match
                </button>
            </div>
        </div>
    `;

    // Insert after player selection container
    playerSelectionContainer.parentNode.insertBefore(bowlerSelectionContainer, playerSelectionContainer.nextSibling);
    
    window.selectedBowler = null;
}

function selectBowler(playerId, playerName) {
    // Clear previous selection
    document.querySelectorAll('.bowler-btn').forEach(btn => {
        btn.style.background = 'rgba(255,255,255,0.1)';
        btn.style.borderColor = 'rgba(255,255,255,0.3)';
        btn.style.transform = 'scale(1)';
    });
    
    // Highlight selected bowler with darker blue
    const button = document.querySelector(`[data-player-id="${playerId}"]`);
    button.style.background = '#1d4ed8';
    button.style.borderColor = '#1d4ed8';
    button.style.transform = 'scale(1.05)';
    
    window.selectedBowler = {id: playerId, name: playerName};
    
    // Update summary display
    const bowlerSummary = document.getElementById('bowler-summary');
    const selectedBowlerName = document.getElementById('selected-bowler-name');
    bowlerSummary.style.display = 'block';
    selectedBowlerName.innerHTML = `<span class="selected-player" style="background: rgba(29, 78, 216, 0.2); border-color: #1d4ed8; color: #1d4ed8;">${playerName}</span>`;
    
    // Enable start match button
    const startButton = document.getElementById('start-match');
    startButton.disabled = false;
    startButton.style.opacity = '1';
}

function backToToss() {
    // Remove player selection
    const playerSelection = document.getElementById('player-selection-container');
    if (playerSelection) {
        playerSelection.remove();
    }
    
    // Remove bowler selection
    const bowlerSelection = document.getElementById('bowler-selection-container');
    if (bowlerSelection) {
        bowlerSelection.remove();
    }
    
    // Show toss button again and remove toss result
    const tossButton = document.querySelector('.toss-btn');
    const tossResult = document.getElementById('toss-result-container');
    
    if (tossButton) {
        tossButton.style.display = 'block';
    }
    
    if (tossResult) {
        tossResult.remove();
    }
    
    // Clear stored data
    localStorage.removeItem('toss_result');
    window.selectedBatsmen = [];
    window.selectedBowler = null;
}

function backToBatsmenSelection() {
    // Remove bowler selection
    const bowlerSelection = document.getElementById('bowler-selection-container');
    if (bowlerSelection) {
        bowlerSelection.remove();
    }
    
    // Reset bowler selection
    window.selectedBowler = null;
    
    // Re-highlight the selected batsmen
    setTimeout(() => {
        window.selectedBatsmen.forEach(batsman => {
            const button = document.querySelector(`[data-player-id="${batsman.id}"]`);
            if (button) {
                button.style.background = '#22c55e';
                button.style.borderColor = '#22c55e';
                button.style.transform = 'scale(1.05)';
            }
        });
        
        // Update the batsmen summary
        const summaryDiv = document.getElementById('selection-summary');
        const selectedPlayersList = document.getElementById('selected-players-list');
        if (window.selectedBatsmen.length > 0) {
            summaryDiv.style.display = 'block';
            selectedPlayersList.innerHTML = window.selectedBatsmen.map(player => 
                `<span class="selected-player">${player.name}</span>`
            ).join('');
        }
        
        // Enable confirm button if 2 batsmen are selected
        const confirmButton = document.getElementById('confirm-batsmen');
        if (window.selectedBatsmen.length === 2) {
            confirmButton.disabled = false;
            confirmButton.style.opacity = '1';
        }
    }, 100);
}

function startMatchWithPlayers() {
    console.log('=== START MATCH WITH PLAYERS ===');
    console.log('Button clicked! cricketApp exists:', !!window.cricketApp);
    console.log('Selected batsmen:', window.selectedBatsmen);
    console.log('Selected bowler:', window.selectedBowler);
    console.log('Current batting team:', window.currentBattingTeam);
    console.log('Current bowling team:', window.currentBowlingTeam);
    
    // Deep inspection of team data structure
    if (window.currentBattingTeam) {
        console.log('Batting team structure:', {
            id: window.currentBattingTeam.id,
            name: window.currentBattingTeam.name,
            playersCount: window.currentBattingTeam.players?.length,
            firstPlayer: window.currentBattingTeam.players?.[0]
        });
    }
    
    if (window.currentBowlingTeam) {
        console.log('Bowling team structure:', {
            id: window.currentBowlingTeam.id,
            name: window.currentBowlingTeam.name,
            playersCount: window.currentBowlingTeam.players?.length,
            firstPlayer: window.currentBowlingTeam.players?.[0]
        });
    }
    
    if (!window.selectedBatsmen || window.selectedBatsmen.length !== 2) {
        console.error('Invalid batsmen selection');
        showMessage('Please select 2 batsmen!', 'error');
        return;
    }
    
    if (!window.selectedBowler) {
        console.error('No bowler selected');
        showMessage('Please select 1 bowler!', 'error');
        return;
    }
    
    // Store player selections
    const matchSetup = {
        battingTeam: window.currentBattingTeam,
        bowlingTeam: window.currentBowlingTeam,
        striker: window.selectedBatsmen[0],
        nonStriker: window.selectedBatsmen[1],
        bowler: window.selectedBowler
    };
    
    console.log('Storing match setup:', matchSetup);
    console.log('Match setup validation:', {
        hasBattingTeam: !!matchSetup.battingTeam,
        hasBowlingTeam: !!matchSetup.bowlingTeam,
        battingTeamName: matchSetup.battingTeam?.name,
        bowlingTeamName: matchSetup.bowlingTeam?.name,
        strikerName: matchSetup.striker?.name,
        nonStrikerName: matchSetup.nonStriker?.name,
        bowlerName: matchSetup.bowler?.name
    });
    
    localStorage.setItem('match_setup', JSON.stringify(matchSetup));
    
    // Switch to scoring tab IMMEDIATELY - no timeout
    console.log('Switching to scoring tab immediately...');
    
    // Direct DOM manipulation - most reliable method
    try {
        // Hide all content sections
        console.log('Hiding all content sections...');
        document.querySelectorAll('.content').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        
        // Show scoring section
        console.log('Showing scoring section...');
        const scoringSection = document.getElementById('scoring');
        if (scoringSection) {
            scoringSection.classList.add('active');
            scoringSection.style.display = 'block';
            console.log('Scoring section is now active and visible');
            
            // Update nav
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            const scoringNavItem = document.querySelector('a[onclick="showPage(\'scoring\')"]');
            if (scoringNavItem) {
                scoringNavItem.classList.add('active');
                console.log('Scoring nav item activated');
            }
            
            // Update title
            const navTitle = document.getElementById('navTitle');
            if (navTitle) {
                navTitle.textContent = 'Live Scoring';
                console.log('Title updated to Live Scoring');
            }
            
        } else {
            console.error('ERROR: Scoring section with ID "scoring" not found!');
            // List all available content sections
            const allContent = document.querySelectorAll('.content');
            console.log('Available content sections:', 
                Array.from(allContent).map(c => c.id || 'no-id'));
        }
        
    } catch (error) {
        console.error('Error during immediate tab switch:', error);
    }
    
    // Show success message after switching
    showMessage(`Match starting! ${matchSetup.striker.name} and ${matchSetup.nonStriker.name} are batting. ${matchSetup.bowler.name} is bowling.`, 'success');
    
    // Start the match after a short delay to let the tab switch complete
    setTimeout(() => {
        console.log('Starting match with delay...');
        try {
            // Verify cricketApp exists before calling
            if (!window.cricketApp) {
                console.error('ERROR: window.cricketApp not found!');
                console.log('Available window properties:', Object.keys(window).filter(k => k.includes('cricket') || k.includes('app')));
                return;
            }
            
            console.log('cricketApp found, calling startMatchWithTeam...');
            console.log('Calling startMatchWithTeam with teamId:', window.currentBattingTeam.id);
            startMatchWithTeam(window.currentBattingTeam.id);
            
            // Scroll to top of the page after match starts - multiple methods for reliability
            console.log('Attempting to scroll to top...');
            
            // Method 1: Smooth scroll
            try {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                console.log('Smooth scroll executed');
            } catch (e) {
                console.log('Smooth scroll failed, trying instant scroll');
                window.scrollTo(0, 0);
            }
            
            // Method 2: Also scroll the scoring section itself
            setTimeout(() => {
                const scoringSection = document.getElementById('scoring');
                if (scoringSection) {
                    scoringSection.scrollTop = 0;
                    console.log('Scoring section scrolled to top');
                }
                
                // Method 3: Scroll document body
                document.body.scrollTop = 0;
                document.documentElement.scrollTop = 0;
                console.log('Document scrolled to top');
            }, 100);
            
            // Force update of all scoring interface elements
            setTimeout(() => {
                console.log('=== FORCING DISPLAY UPDATE ===');
                if (window.cricketApp && window.cricketApp.currentMatch) {
                    console.log('Forcing score display update...');
                    window.cricketApp.updateScoreDisplay();
                    
                    // Additional direct DOM updates to ensure visibility
                    const currentMatch = window.cricketApp.currentMatch;
                    const currentTeamScore = currentMatch.currentTeam === 1 ? 
                        currentMatch.team1Score : currentMatch.team2Score;
                    
                    console.log('Current match data for display:', {
                        team: currentMatch.team1?.name,
                        striker: currentTeamScore.striker?.name,
                        nonStriker: currentTeamScore.nonStriker?.name,
                        bowler: currentMatch.bowler?.name
                    });
                    
                    // Update team name
                    const currentTeamEl = document.getElementById('currentTeam');
                    if (currentTeamEl && currentMatch.team1) {
                        currentTeamEl.textContent = currentMatch.team1.name;
                        console.log('FORCED: Updated team name to:', currentMatch.team1.name);
                    } else {
                        console.error('FAILED: Failed to update team name - element or data missing');
                    }
                    
                    // Update player names
                    const strikerNameEl = document.getElementById('strikerName');
                    const nonStrikerNameEl = document.getElementById('nonStrikerName');
                    const bowlerNameEl = document.getElementById('bowlerName');
                    
                    if (strikerNameEl && currentTeamScore.striker) {
                        strikerNameEl.textContent = currentTeamScore.striker.name;
                        console.log('FORCED: Updated striker to:', currentTeamScore.striker.name);
                    } else {
                        console.error('FAILED: Failed to update striker - element or data missing');
                    }
                    
                    if (nonStrikerNameEl && currentTeamScore.nonStriker) {
                        nonStrikerNameEl.textContent = currentTeamScore.nonStriker.name;
                        console.log('FORCED: Updated non-striker to:', currentTeamScore.nonStriker.name);
                    } else {
                        console.error('FAILED: Failed to update non-striker - element or data missing');
                    }
                    
                    if (bowlerNameEl && currentMatch.bowler) {
                        bowlerNameEl.textContent = currentMatch.bowler.name;
                        console.log('FORCED: Updated bowler to:', currentMatch.bowler.name);
                    } else {
                        console.error('FAILED: Failed to update bowler - element or data missing');
                    }
                } else {
                    console.error('FAILED: No cricket app or current match found for display update');
                }
            }, 200);
            
        } catch (error) {
            console.error('Error starting match:', error);
        }
    }, 100);
}

// Enhanced BCCB Scoring Functions
function addExtras(extraType, runs = 1) {
    if (window.cricketApp) {
        window.cricketApp.addExtras(extraType, runs);
    }
}











function addWicketWithDetails(dismissalType = 'bowled', fielder = null) {
    if (window.cricketApp) {
        window.cricketApp.addWicketWithDetails(dismissalType, fielder);
    }
}

function addWicketWithBCCBDetails(dismissedBatsmanId, dismissalType, helper, fielder, newBatsmanId) {
    if (!window.cricketApp || !window.cricketApp.currentMatch) {
        alert('No active match found');
        return;
    }

    const match = window.cricketApp.currentMatch;
    const currentTeamScore = match.currentTeam === 1 ? match.team1Score : match.team2Score;
    const battingTeam = match.currentTeam === 1 ? match.team1 : match.team2;
    
    console.log('addWicketWithBCCBDetails Debug:', {
        dismissedBatsmanId,
        currentTeam: match.currentTeam,
        battingTeamName: battingTeam?.name,
        striker: currentTeamScore.striker,
        nonStriker: currentTeamScore.nonStriker
    });
    
    // Store state before the wicket for undo functionality
    const stateBeforeBall = window.cricketApp.captureMatchState();
    
    // Find the dismissed batsman - first check current striker/non-striker, then batting team, then global list
    let dismissedBatsman = null;
    
    // Convert dismissedBatsmanId to both string and number for comparison
    const dismissedIdString = String(dismissedBatsmanId);
    const dismissedIdNumber = Number(dismissedBatsmanId);
    
    console.log('Looking for dismissed batsman:', {
        dismissedBatsmanId,
        dismissedIdString,
        dismissedIdNumber,
        strikerID: currentTeamScore.striker?.id,
        strikerIDType: typeof currentTeamScore.striker?.id,
        nonStrikerID: currentTeamScore.nonStriker?.id,
        nonStrikerIDType: typeof currentTeamScore.nonStriker?.id
    });
    
    // Check if it's the current striker or non-striker (handle both string and number IDs)
    if (currentTeamScore.striker && 
        (currentTeamScore.striker.id === dismissedIdString || currentTeamScore.striker.id === dismissedIdNumber)) {
        dismissedBatsman = currentTeamScore.striker;
        console.log('Found dismissed batsman as current striker:', dismissedBatsman.name);
    } else if (currentTeamScore.nonStriker && 
               (currentTeamScore.nonStriker.id === dismissedIdString || currentTeamScore.nonStriker.id === dismissedIdNumber)) {
        dismissedBatsman = currentTeamScore.nonStriker;
        console.log('Found dismissed batsman as current non-striker:', dismissedBatsman.name);
    } else {
        // Check in batting team players
        dismissedBatsman = battingTeam.players?.find(p => 
            p.id === dismissedIdString || p.id === dismissedIdNumber);
        if (dismissedBatsman) {
            console.log('Found dismissed batsman in batting team:', dismissedBatsman.name);
        } else {
            // Fall back to global players list
            dismissedBatsman = window.cricketApp.players.find(p => 
                p.id === dismissedIdString || p.id === dismissedIdNumber);
            if (dismissedBatsman) {
                console.log('Found dismissed batsman in global list:', dismissedBatsman.name);
            }
        }
    }
    
    if (!dismissedBatsman) {
        console.error('Dismissed batsman not found anywhere:', {
            dismissedBatsmanId,
            strikerID: currentTeamScore.striker?.id,
            nonStrikerID: currentTeamScore.nonStriker?.id,
            battingTeamPlayers: battingTeam.players?.map(p => ({ id: p.id, name: p.name }))
        });
        alert('Dismissed batsman not found');
        return;
    }

    // Find the new batsman - prioritize batting team, then global list
    // Convert newBatsmanId to both string and number for comparison
    const newBatsmanIdString = String(newBatsmanId);
    const newBatsmanIdNumber = Number(newBatsmanId);
    
    console.log('Looking for new batsman:', {
        newBatsmanId,
        newBatsmanIdString,
        newBatsmanIdNumber,
        battingTeamPlayers: battingTeam.players?.map(p => ({ id: p.id, idType: typeof p.id, name: p.name }))
    });
    
    let newBatsman = battingTeam.players?.find(p => 
        p.id === newBatsmanIdString || p.id === newBatsmanIdNumber);
    if (!newBatsman) {
        newBatsman = window.cricketApp.players.find(p => 
            p.id === newBatsmanIdString || p.id === newBatsmanIdNumber);
    }
    
    if (!newBatsman) {
        console.error('New batsman not found:', {
            newBatsmanId,
            newBatsmanIdString,
            newBatsmanIdNumber,
            battingTeamPlayers: battingTeam.players?.map(p => ({ id: p.id, idType: typeof p.id, name: p.name })),
            globalPlayers: window.cricketApp.players?.map(p => ({ id: p.id, idType: typeof p.id, name: p.name }))
        });
        alert('New batsman not found');
        return;
    }
    
    console.log('New batsman found:', newBatsman.name);

    // Create wicket record following BCCB format
    // Convert helper and fielder IDs to names for display
    let helperName = null;
    let fielderName = null;
    
    if (helper) {
        const helperPlayer = window.cricketApp.players.find(p => String(p.id) === String(helper));
        helperName = helperPlayer ? helperPlayer.name : helper;
    }
    
    if (fielder) {
        const fielderPlayer = window.cricketApp.players.find(p => String(p.id) === String(fielder));
        fielderName = fielderPlayer ? fielderPlayer.name : fielder;
    }

    const wicketRecord = {
        batsmanId: dismissedBatsmanId,
        batsmanName: dismissedBatsman.name,
        dismissalType: dismissalType,
        bowlerId: match.bowler ? match.bowler.id : null,
        bowlerName: match.bowler ? match.bowler.name : 'Unknown',
        helper: helperName,
        fielder: fielderName,
        over: currentTeamScore.overs,
        ball: currentTeamScore.balls,
        runs: dismissedBatsman.matchRuns || 0,
        balls: dismissedBatsman.matchBalls || 0,
        timestamp: new Date().toISOString()
    };

    // Add wicket to team score
    if (!currentTeamScore.wicketDetails) {
        currentTeamScore.wicketDetails = [];
    }
    currentTeamScore.wicketDetails.push(wicketRecord);
    
    // Increment the wickets count (keeping it as a number for display)
    currentTeamScore.wickets = (currentTeamScore.wickets || 0) + 1;
    
    // Also add to fallOfWickets for compatibility with existing cricket functionality
    if (!currentTeamScore.fallOfWickets) {
        currentTeamScore.fallOfWickets = [];
    }
    currentTeamScore.fallOfWickets.push({
        batsman: dismissedBatsman,
        batsmanId: dismissedBatsmanId,
        batsmanName: dismissedBatsman.name,
        dismissalType: dismissalType,
        bowler: match.bowler ? match.bowler.name : 'Unknown',
        bowlerId: match.bowler ? match.bowler.id : null,
        helper: helperName,
        fielder: fielderName,
        runs: currentTeamScore.runs,
        over: currentTeamScore.overs,
        ball: currentTeamScore.balls,
        timestamp: new Date().toISOString()
    });
    
    // Auto-detect if we need to count this ball
    // Check if this delivery already exists in ballByBall (indicating runs were already scored)
    const ballByBall = window.cricketApp.currentMatch.ballByBall || [];
    const currentBallNumber = currentTeamScore.balls + 1;
    const existingDelivery = ballByBall.find(ball => 
        ball.over === currentTeamScore.overs && 
        ball.ball === currentBallNumber &&
        !ball.wicket // Only count non-wicket deliveries to avoid conflicts
    );
    
    if (!existingDelivery) {
        // This is a wicket-only delivery, count the ball
        currentTeamScore.balls++;
        
        // Immediate over completion check to prevent balls > 6
        if (currentTeamScore.balls >= 6) {
            console.log('DEBUG WICKET: Over completed! Resetting balls and incrementing overs');
            currentTeamScore.overs++;
            currentTeamScore.balls = 0;
            window.cricketApp.swapStrike(); // BCCB: change strike at end of over
            window.cricketApp.changeBowlerAutomatically(); // Auto change bowler every over
        }
        
        console.log('DEBUG WICKET: Ball incremented for wicket-only delivery');
    } else {
        console.log('DEBUG WICKET: Ball already counted, wicket added to existing delivery');
    }

    // Mark the dismissed batsman as out
    window.cricketApp.setBatsmanOut(dismissedBatsmanId, dismissalType, match.bowler?.name || 'Unknown', helperName || fielderName || '');

    // Update bowler stats (credit for wicket)
    if (match.bowler) {
        window.cricketApp.updateBowlerStats(match.bowler.id, 0, 1, 1); // 0 runs, 1 ball, 1 wicket
    }

    // Replace the dismissed batsman with new batsman
    const newBatsmanObj = {
        id: newBatsman.id,
        name: newBatsman.name,
        matchRuns: 0,
        matchBalls: 0,
        matchBoundaries: { fours: 0, sixes: 0 }
    };

    // Check if this was a last man standing scenario (both striker and non-striker were the same)
    const wasLastManStanding = currentTeamScore.striker && currentTeamScore.nonStriker &&
        currentTeamScore.striker.id === currentTeamScore.nonStriker.id;

    // Update striker or non-striker based on who got out
    // Reuse the already declared variables from earlier in the function
    if ((currentTeamScore.striker.id === dismissedIdString || currentTeamScore.striker.id === dismissedIdNumber)) {
        currentTeamScore.striker = newBatsmanObj;
        console.log('Replaced striker with new batsman:', newBatsman.name);
    } else if ((currentTeamScore.nonStriker.id === dismissedIdString || currentTeamScore.nonStriker.id === dismissedIdNumber)) {
        currentTeamScore.nonStriker = newBatsmanObj;
        console.log('Replaced non-striker with new batsman:', newBatsman.name);
    } else {
        console.warn('Could not match dismissed batsman ID for replacement:', {
            dismissedBatsmanId,
            strikerId: currentTeamScore.striker.id,
            nonStrikerId: currentTeamScore.nonStriker.id
        });
    }

    // If this was last man standing and the last man got out, finish the innings automatically
    if (wasLastManStanding) {
        console.log('=== LAST MAN STANDING GOT OUT - AUTO FINISHING INNINGS ===');
        
        // Clear the batsmen as innings is over
        currentTeamScore.striker = null;
        currentTeamScore.nonStriker = null;
        
        // Show notification about last man getting out
        window.cricketApp.showNotification(`🏁 Last man out! ${dismissedBatsman.name} dismissed. Innings finished with ${currentTeamScore.runs}/${currentTeamScore.wickets}`);
        
        // End the innings automatically
        setTimeout(() => {
            window.cricketApp.endInnings();
        }, 2000); // 2 second delay to show the notification
        
        return; // Exit early as innings is over
    }

    // Initialize new batsman stats in match statistics
    if (!match.playerStats) {
        match.playerStats = {};
    }
    if (!match.playerStats[newBatsman.id]) {
        match.playerStats[newBatsman.id] = {
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            wickets: 0,
            runsConceded: 0,
            ballsBowled: 0
        };
    }

    // Record wicket ball details for undo functionality
    const wicketBallDetails = {
        over: currentTeamScore.overs,
        ball: currentTeamScore.balls + 1,
        runs: 0,
        batsman: dismissedBatsman.name,
        batsmanId: dismissedBatsman.id,
        bowler: match.bowler?.name || 'Unknown',
        bowlerId: match.bowler?.id || null,
        team: match.currentTeam === 1 ? 'team1' : 'team2',
        isWicket: true,
        isWide: false,
        isNoBall: false,
        isExtra: false,
        extras: null,
        wicket: true,
        dismissalType: dismissalType,
        helper: helper,
        fielder: fielder,
        newBatsmanId: newBatsmanId,
        actionType: 'wicket',
        timestamp: new Date().toISOString(),
        stateBeforeBall: stateBeforeBall // Store complete state for undo
    };

    // Add wicket ball to ball-by-ball record
    if (!match.ballByBall) {
        match.ballByBall = [];
    }
    match.ballByBall.push(wicketBallDetails);

    // Update displays
    window.cricketApp.updateScoreDisplay();
    window.cricketApp.showNotification(`🎯 ${dismissedBatsman.name} is out! ${newBatsman.name} comes to bat.`);

    // Log the wicket
    console.log('BCCB Wicket recorded:', wicketRecord);
}

function showWicketModal() {
    console.log('showWicketModal called'); // Debug log
    
    // Check if waiting for bowler selection
    if (window.cricketApp && window.cricketApp.waitingForBowlerSelection) {
        window.cricketApp.showNotification('⚠️ Please select a bowler first before continuing');
        return;
    }
    
    // Get current match details
    if (!window.cricketApp || !window.cricketApp.currentMatch) {
        alert('No active match found');
        return;
    }

    const match = window.cricketApp.currentMatch;
    const currentTeamScore = match.currentTeam === 1 ? match.team1Score : match.team2Score;

    // Check if this is a last man standing scenario
    const isLastManStanding = currentTeamScore.striker && currentTeamScore.nonStriker &&
        currentTeamScore.striker.id === currentTeamScore.nonStriker.id;

    if (isLastManStanding) {
        // In last man standing, automatically finish innings when they get out
        const lastManName = currentTeamScore.striker.name;
        
        if (confirm(`This is the last man standing (${lastManName}). Getting them out will finish the innings. Continue?`)) {
            // Create a simplified modal for dismissal type only
            showLastManWicketModal(currentTeamScore.striker);
            return;
        } else {
            return; // User cancelled
        }
    }

    // Debug logging
    console.log('Wicket Modal Debug:', {
        currentTeamScore: currentTeamScore,
        striker: currentTeamScore.striker,
        nonStriker: currentTeamScore.nonStriker,
        currentTeam: match.currentTeam,
        batting: match.currentTeam === 1 ? 'team1' : 'team2',
        team1Name: match.team1?.name,
        team2Name: match.team2?.name,
        battingTeamName: match.currentTeam === 1 ? match.team1?.name : match.team2?.name
    });

    console.log('Striker details:', currentTeamScore.striker);
    console.log('Non-striker details:', currentTeamScore.nonStriker);

    // Check if we have valid batsmen - if not, try to initialize them
    if (!currentTeamScore.striker && !currentTeamScore.nonStriker) {
        console.log('No batsmen found, attempting to initialize...');
        
        // Try to get the batting team and set opening batsmen
        const battingTeam = match.currentTeam === 1 ? match.team1 : match.team2;
        if (battingTeam && battingTeam.players && battingTeam.players.length >= 2) {
            currentTeamScore.striker = {
                id: battingTeam.players[0].id,
                name: battingTeam.players[0].name,
                matchRuns: 0,
                matchBalls: 0,
                matchBoundaries: { fours: 0, sixes: 0 }
            };
            currentTeamScore.nonStriker = {
                id: battingTeam.players[1].id,
                name: battingTeam.players[1].name,
                matchRuns: 0,
                matchBalls: 0,
                matchBoundaries: { fours: 0, sixes: 0 }
            };
            
            console.log('Initialized batsmen:', {
                striker: currentTeamScore.striker.name,
                nonStriker: currentTeamScore.nonStriker.name
            });
            
            // Update the display
            if (window.cricketApp.updateScoreDisplay) {
                window.cricketApp.updateScoreDisplay();
            }
        } else {
            alert('No batsmen found! Please ensure the match has active batsmen and teams are properly set up.');
            return;
        }
    }

    // Generate batsman buttons safely
    let strikerButton = '';
    let nonStrikerButton = '';
    
    if (currentTeamScore.striker) {
        const strikerName = currentTeamScore.striker.name || 'Unknown Striker';
        const safeStrikerName = strikerName.replace(/'/g, "\\'");
        console.log('Creating striker button for:', strikerName, 'ID:', currentTeamScore.striker.id);
        strikerButton = `
            <button onclick="selectDismissedBatsman('${currentTeamScore.striker.id}', '${safeStrikerName}', 'Striker')" 
                    style="padding: 18px 20px; background: #ff6b35; color: #ffffff !important; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 8px rgba(255,107,53,0.3);"
                    onmouseover="this.style.background='#e55a2b'; this.style.transform='translateY(-2px)'" 
                    onmouseout="this.style.background='#ff6b35'; this.style.transform='translateY(0)'">
                ${strikerName} (Striker)
            </button>`;
    }
    
    if (currentTeamScore.nonStriker) {
        const nonStrikerName = currentTeamScore.nonStriker.name || 'Unknown Non-Striker';
        const safeNonStrikerName = nonStrikerName.replace(/'/g, "\\'");
        console.log('Creating non-striker button for:', nonStrikerName, 'ID:', currentTeamScore.nonStriker.id);
        nonStrikerButton = `
            <button onclick="selectDismissedBatsman('${currentTeamScore.nonStriker.id}', '${safeNonStrikerName}', 'Non-Striker')" 
                    style="padding: 18px 20px; background: #ff6b35; color: #ffffff !important; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 8px rgba(255,107,53,0.3);"
                    onmouseover="this.style.background='#e55a2b'; this.style.transform='translateY(-2px)'" 
                    onmouseout="this.style.background='#ff6b35'; this.style.transform='translateY(0)'">
                ${nonStrikerName} (Non-Striker)
            </button>`;
    }
    
    // If no batsmen are available, show error message instead of empty modal
    if (!strikerButton && !nonStrikerButton) {
        const errorMessage = `
            <div style="padding: 20px; text-align: center; color: #ef4444;">
                <h4>No Active Batsmen Found</h4>
                <p>Please ensure the match has been started and batsmen are assigned.</p>
                <button onclick="closeWicketModal()" style="margin-top: 15px; padding: 12px 20px; background: #6b7280; color: white; border: none; border-radius: 8px;">Close</button>
            </div>`;
        strikerButton = errorMessage;
    }

    // Create wicket modal with BCCB-style two-step process
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); overflow: hidden;">
            <h3 style="color: #ff6b35; margin: 0; padding: 20px 20px 0 20px; font-size: 24px; text-align: center;">🎯 Wicket</h3>
            
            <!-- Step 1: Who got out -->
            <div id="step1" style="text-align: center; padding: 20px 40px 40px 40px;">
                <h4 style="color: #333; margin-bottom: 30px; font-size: 18px; font-weight: 600;">Who got out?</h4>
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    ${strikerButton}
                    ${nonStrikerButton}
                </div>
                <button onclick="closeWicketModal()" style="margin-top: 30px; padding: 12px 20px; background: #6b7280; color: #ffffff !important; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Cancel</button>
            </div>

            <!-- Step 2: How they got out (initially hidden) -->
            <div id="step2" style="display: none; padding: 20px;">
                <div style="margin-bottom: 20px; text-align: center; padding: 15px; background: #f0f9ff; border-radius: 8px;">
                    <span id="selectedBatsmanInfo" style="font-weight: 600; color: #0369a1;"></span>
                </div>

                <!-- Dismissal type -->
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold; color: #333;">How did they get out?</label>
                    <select id="dismissalType" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 14px; background: white; color: #333;">
                        <option value="">Select dismissal type...</option>
                        <option value="bowled">Bowled</option>
                        <option value="caught">Caught</option>
                        <option value="lbw">LBW</option>
                        <option value="run out">Run Out</option>
                        <option value="stumped">Stumped</option>
                        <option value="hit wicket">Hit Wicket</option>
                    </select>
                </div>

                <!-- Fielder/Wicket helper -->
                <div id="helperSection" style="margin: 20px 0; display: none;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold; color: #333;">Who helped with the wicket?</label>
                    <select id="wicketHelper" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 14px; background: white; color: #333;">
                        <option value="">Select helper...</option>
                    </select>
                </div>

                <!-- New batsman selection -->
                <div id="newBatsmanSection" style="margin: 20px 0; display: none;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold; color: #333;">Who is replacing the batsman?</label>
                    <select id="newBatsman" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 14px; background: white; color: #333;">
                        <option value="">Select new batsman...</option>
                    </select>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button onclick="goBackToStep1()" style="flex: 1; padding: 12px; background: #6b7280; color: #ffffff !important; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">← Back</button>
                    <button onclick="confirmWicket()" id="confirmWicketBtn" style="flex: 1; padding: 12px; background: #ef4444; color: #ffffff !important; border: none; border-radius: 8px; font-weight: 600; opacity: 0.5; cursor: not-allowed;" disabled>Confirm Wicket</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Define functions immediately so they're available for onclick handlers
    window.selectedDismissedBatsman = null;
    console.log('Setting up wicket modal functions...');

    // Add event listener to check if all required fields are filled
    window.checkFormCompletion = function() {
        console.log('checkFormCompletion called');
        const dismissalEl = document.getElementById('dismissalType');
        const newBatsmanEl = document.getElementById('newBatsman');
        const confirmBtn = document.getElementById('confirmWicketBtn');
        
        if (!dismissalEl || !newBatsmanEl || !confirmBtn) {
            console.log('Form elements not found for completion check, skipping');
            return;
        }
        
        const dismissal = dismissalEl.value;
        const newBatsmanId = newBatsmanEl.value;
        
        if (dismissal && newBatsmanId && window.selectedDismissedBatsman) {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.cursor = 'pointer';
            confirmBtn.style.background = '#ef4444';
            
            // Update button text based on selection
            if (newBatsmanId === 'finish_innings') {
                confirmBtn.textContent = 'Finish Innings';
                confirmBtn.style.background = '#dc2626'; // Darker red for emphasis
            } else if (newBatsmanId === 'last_man_standing') {
                confirmBtn.textContent = 'Continue with Last Man';
                confirmBtn.style.background = '#f59e0b'; // Orange for warning
            } else {
                confirmBtn.textContent = 'Confirm Wicket';
                confirmBtn.style.background = '#ef4444'; // Standard red
            }
        } else {
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.cursor = 'not-allowed';
            confirmBtn.style.background = '#6b7280';
            confirmBtn.textContent = 'Confirm Wicket';
        }
    };
    console.log('checkFormCompletion function defined:', typeof window.checkFormCompletion);

    // Step 1: Select dismissed batsman
    window.selectDismissedBatsman = function(playerId, playerName, position) {
        console.log('selectDismissedBatsman called for:', playerName);
        window.selectedDismissedBatsman = { id: playerId, name: playerName, position: position };
        const selectedInfo = document.getElementById('selectedBatsmanInfo');
        if (selectedInfo) {
            selectedInfo.textContent = `${playerName} (${position}) is out`;
        }
        
        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'block';
        
        // Populate new batsman dropdown - only show players who are not yet out
        const newBatsmanSelect = document.getElementById('newBatsman');
        if (newBatsmanSelect) {
            newBatsmanSelect.innerHTML = '<option value="">Select new batsman...</option>';
            const availableBatsmen = window.cricketApp.getAvailableBatsmen();
            
            if (availableBatsmen.length === 0) {
                // No more batsmen available - show innings end options
                newBatsmanSelect.innerHTML = `
                    <option value="">Choose an option...</option>
                    <option value="finish_innings">Finish Innings</option>
                    <option value="last_man_standing">Last Man Standing</option>
                `;
                
                // Update the label to reflect the situation
                const label = document.querySelector('label[for="newBatsman"]') || document.querySelector('#newBatsmanSection label');
                if (label) {
                    label.textContent = 'No more batsmen available. Choose an option:';
                    label.style.color = '#ef4444'; // Red color to indicate critical situation
                }
            } else {
                availableBatsmen.forEach(player => {
                    const option = document.createElement('option');
                    option.value = player.id;
                    option.textContent = player.name;
                    newBatsmanSelect.appendChild(option);
                });
            }
            
            // Add event listener for dropdown changes
            newBatsmanSelect.addEventListener('change', window.checkFormCompletion);
        }
        
        // Check form completion now that a batsman is selected - use a direct call instead of setTimeout
        console.log('About to call checkFormCompletion, type:', typeof window.checkFormCompletion);
        if (window.checkFormCompletion) {
            window.checkFormCompletion();
        } else {
            console.log('checkFormCompletion not available yet');
        }
    };

    // Go back to step 1
    window.goBackToStep1 = function() {
        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        if (step1) step1.style.display = 'block';
        if (step2) step2.style.display = 'none';
        window.selectedDismissedBatsman = null;
    };

    // Wait for DOM to render before setting up event listeners
    setTimeout(() => {
        function updateDismissalUI() {
            const dismissal = document.getElementById('dismissalType')?.value || '';
            const helperSection = document.getElementById('helperSection');
            const newBatsmanSection = document.getElementById('newBatsmanSection');
            const confirmBtn = document.getElementById('confirmWicketBtn');
            const wicketHelper = document.getElementById('wicketHelper');
            
            // Add null checks for all elements - if any are missing, wait and try again
            if (!helperSection || !newBatsmanSection || !confirmBtn || !wicketHelper) {
                console.log('Wicket modal elements not ready yet, skipping update');
                return;
            }
        
        if (!dismissal) {
            helperSection.style.display = 'none';
            newBatsmanSection.style.display = 'none';
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
            return;
        }

        // Show new batsman section
        newBatsmanSection.style.display = 'block';
        
        // Clear and repopulate helper options based on dismissal type
        wicketHelper.innerHTML = '';
        
        // Get fielding team players (the team that's bowling)
        const fieldingTeamPlayers = window.cricketApp.getFieldingTeamPlayers();
        
        if (dismissal === 'bowled' || dismissal === 'lbw' || dismissal === 'hit wicket') {
            wicketHelper.innerHTML = `<option value="bowler">Bowler: ${match.bowler ? match.bowler.name : 'Current Bowler'}</option>`;
            helperSection.style.display = 'block';
        } else if (dismissal === 'caught') {
            let options = `<option value="bowler">Bowler: ${match.bowler ? match.bowler.name : 'Current Bowler'}</option>`;
            fieldingTeamPlayers.forEach(player => {
                if (player.id !== match.bowler?.id) { // Don't duplicate bowler
                    options += `<option value="${player.id}">${player.name}</option>`;
                }
            });
            options += `<option value="extra">Extra</option>`;
            wicketHelper.innerHTML = options;
            helperSection.style.display = 'block';
        } else if (dismissal === 'stumped') {
            let options = '';
            fieldingTeamPlayers.forEach(player => {
                options += `<option value="${player.id}">${player.name}</option>`;
            });
            options += `<option value="extra">Extra</option>`;
            wicketHelper.innerHTML = options;
            helperSection.style.display = 'block';
        } else if (dismissal === 'run out') {
            let options = '';
            fieldingTeamPlayers.forEach(player => {
                options += `<option value="${player.id}">${player.name}</option>`;
            });
            options += `<option value="extra">Extra</option>`;
            wicketHelper.innerHTML = options;
            helperSection.style.display = 'block';
        } else {
            helperSection.style.display = 'none';
        }
        
        // Don't automatically enable here - let checkFormCompletion handle it
        window.checkFormCompletion();
    }
        
        // Add listeners to both dropdowns with null checks
        const dismissalTypeEl = document.getElementById('dismissalType');
        const newBatsmanEl = document.getElementById('newBatsman');
        
        if (dismissalTypeEl) {
            dismissalTypeEl.addEventListener('change', window.checkFormCompletion);
            dismissalTypeEl.onchange = updateDismissalUI;
        }
        
        if (newBatsmanEl) {
            newBatsmanEl.addEventListener('change', window.checkFormCompletion);
        }

        window.confirmWicket = function() {
            if (!window.selectedDismissedBatsman) {
                alert('Please select who got out');
                return;
            }

            const dismissalEl = document.getElementById('dismissalType');
            const helperEl = document.getElementById('wicketHelper');
            const fielderEl = document.getElementById('fielderName');
            const newBatsmanEl = document.getElementById('newBatsman');
            
            if (!dismissalEl || !helperEl || !newBatsmanEl) {
                alert('Error: Form elements not found. Please try again.');
                return;
            }

            const dismissal = dismissalEl.value;
            const helper = helperEl.value;
            const fielder = fielderEl ? fielderEl.value || null : null;
            const newBatsmanId = newBatsmanEl.value;

            if (!dismissal) {
                alert('Please select how they got out');
                return;
            }

            if (!newBatsmanId) {
                alert('Please select an option');
                return;
            }

            // Handle special cases when no more batsmen are available
            if (newBatsmanId === 'finish_innings') {
                // Finish the current innings
                handleFinishInnings(window.selectedDismissedBatsman.id, dismissal, helper, fielder);
                closeWicketModal();
                return;
            } else if (newBatsmanId === 'last_man_standing') {
                // Set up last man standing scenario
                handleLastManStanding(window.selectedDismissedBatsman.id, dismissal, helper, fielder);
                closeWicketModal();
                return;
            }

            // Normal case - call enhanced wicket function with BCCB parameters
            addWicketWithBCCBDetails(window.selectedDismissedBatsman.id, dismissal, helper, fielder, newBatsmanId);
            closeWicketModal();
        };

        window.closeWicketModal = function() {
            document.body.removeChild(modal);
            // Clean up global variables
            window.selectedDismissedBatsman = null;
            window.selectDismissedBatsman = null;
            window.goBackToStep1 = null;
            window.confirmWicket = null;
            window.closeWicketModal = null;
        };
        
    }, 50); // Close the setTimeout
}

function showLastManWicketModal(lastManBatsman) {
    console.log('showLastManWicketModal called for:', lastManBatsman.name);
    
    const modal = document.createElement('div');
    modal.style = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); overflow: hidden;">
            <h3 style="color: #ff6b35; margin: 0; padding: 20px 20px 0 20px; font-size: 24px; text-align: center;">🏁 Last Man Out</h3>
            
            <div style="text-align: center; padding: 20px 40px 40px 40px;">
                <h4 style="color: #333; margin-bottom: 20px; font-size: 18px; font-weight: 600;">${lastManBatsman.name} - Last Man Standing</h4>
                <p style="color: #666; margin-bottom: 20px;">Getting them out will finish the innings</p>
                
                <!-- Dismissal Type -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold; color: #333;">How did they get out?</label>
                    <select id="lastManDismissalType" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 14px; background: white; color: #333;">
                        <option value="">Select dismissal type...</option>
                        <option value="bowled">Bowled</option>
                        <option value="caught">Caught</option>
                        <option value="lbw">LBW</option>
                        <option value="stumped">Stumped</option>
                        <option value="runout">Run Out</option>
                        <option value="hitwicket">Hit Wicket</option>
                        <option value="obstructing">Obstructing the Field</option>
                        <option value="handling">Handling the Ball</option>
                        <option value="timeout">Timed Out</option>
                        <option value="mankad">Mankad</option>
                    </select>
                </div>

                <!-- Helper/Fielder (optional) -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold; color: #333;">Fielder/Helper (optional):</label>
                    <select id="lastManHelper" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 14px; background: white; color: #333;">
                        <option value="">Select fielder...</option>
                    </select>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button onclick="closeLastManModal()" style="flex: 1; padding: 12px; background: #6b7280; color: #ffffff !important; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Cancel</button>
                    <button onclick="confirmLastManOut()" id="confirmLastManBtn" style="flex: 1; padding: 12px; background: #dc2626; color: #ffffff !important; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Finish Innings</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Populate fielders dropdown
    setTimeout(() => {
        const fielderSelect = document.getElementById('lastManHelper');
        const fieldingTeamPlayers = window.cricketApp.getFieldingTeamPlayers();
        
        fieldingTeamPlayers.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name;
            fielderSelect.appendChild(option);
        });

        // Set up event handlers
        window.confirmLastManOut = function() {
            const dismissalEl = document.getElementById('lastManDismissalType');
            const helperEl = document.getElementById('lastManHelper');

            if (!dismissalEl.value) {
                alert('Please select how they got out');
                return;
            }

            const dismissal = dismissalEl.value;
            const helper = helperEl.value || null;

            // Call the finish innings handler directly
            window.cricketApp.handleFinishInnings(lastManBatsman.id, dismissal, helper, null);
            closeLastManModal();
        };

        window.closeLastManModal = function() {
            document.body.removeChild(modal);
            window.confirmLastManOut = null;
            window.closeLastManModal = null;
        };
    }, 50);
}

function undoLastBall() {
    if (!window.cricketApp || !window.cricketApp.currentMatch) {
        alert('No active match found');
        return;
    }

    const match = window.cricketApp.currentMatch;
    const ballHistory = match.ballByBall;
    
    if (!ballHistory || ballHistory.length === 0) {
        window.cricketApp.showNotification('⚠️ No balls to undo');
        return;
    }

    // Get the last ball from history
    const lastBall = ballHistory[ballHistory.length - 1];
    
    if (!lastBall.stateBeforeBall) {
        window.cricketApp.showNotification('⚠️ Cannot undo this action (no state saved)');
        return;
    }

    // Confirm undo action
    const actionDescription = lastBall.isExtra ? 
        `${lastBall.extras} (${lastBall.runs} runs)` : 
        `${lastBall.runs} runs`;
    
    if (!confirm(`Undo last ball: ${actionDescription} by ${lastBall.batsman}?`)) {
        return;
    }

    // Restore the state before the ball
    const savedState = lastBall.stateBeforeBall;
    
    // Restore team scores
    match.team1Score = savedState.team1Score;
    match.team2Score = savedState.team2Score;
    match.currentTeam = savedState.currentTeam;
    match.currentInnings = savedState.currentInnings;
    match.bowler = savedState.bowler;
    match.target = savedState.target;
    window.cricketApp.waitingForBowlerSelection = savedState.waitingForBowlerSelection;
    
    // Restore player stats if available
    if (savedState.playerStats) {
        match.playerStats = savedState.playerStats;
    }

    // Remove the last ball from history
    ballHistory.pop();

    // Update display and save
    window.cricketApp.updateScoreDisplay();
    window.cricketApp.saveData(false);
    
    // Show notification
    window.cricketApp.showNotification(`↶ Undid: ${actionDescription}`);
    
    console.log('Undo completed:', {
        undidAction: actionDescription,
        ballsRemaining: ballHistory.length,
        currentState: {
            team1: match.team1Score.runs + '/' + match.team1Score.wickets,
            team2: match.team2Score.runs + '/' + match.team2Score.wickets,
            overs: (match.currentTeam === 1 ? match.team1Score : match.team2Score).overs + '.' + (match.currentTeam === 1 ? match.team1Score : match.team2Score).balls
        }
    });
}

function quickMatchSetup(overs = 5) {
    console.log('🚀 Quick Match Setup started...');
    
    if (!window.cricketApp) {
        alert('Cricket app not initialized');
        return;
    }

    try {
        // Step 1: Random team selection
        console.log('Step 1: Selecting random teams...');
        
        // Get all available players
        const allPlayers = window.cricketApp.players || [];
        if (allPlayers.length < 4) {
            alert('Need at least 4 players for a quick match. Please add more players first.');
            return;
        }

        // Shuffle players and select random ones
        const shuffledPlayers = [...allPlayers].sort(() => Math.random() - 0.5);
        const playersPerTeam = Math.min(6, Math.floor(shuffledPlayers.length / 2));
        const selectedPlayers = shuffledPlayers.slice(0, playersPerTeam * 2);
        
        console.log(`Selected ${selectedPlayers.length} players (${playersPerTeam} per team):`, 
                   selectedPlayers.map(p => p.name));

        // Step 2: Generate balanced teams using the exact same method as normal flow
        console.log('Step 2: Generating balanced teams...');
        
        const balancedTeams = window.cricketApp.teamBalancer.generateBalancedTeams(selectedPlayers);
        console.log('TeamBalancer result:', balancedTeams);
        
        // Step 3: Create teams in the exact same format as the normal flow
        console.log('Step 3: Creating teams...');
        
        // Clear existing teams first (like normal team creation)
        window.cricketApp.teams = [];
        
        // Create Team A using the exact same structure as createTeam()
        const teamACaptain = balancedTeams.teamA.players.find(p => p.name === balancedTeams.teamA.captain) || balancedTeams.teamA.players[0];
        const teamBCaptain = balancedTeams.teamB.players.find(p => p.name === balancedTeams.teamB.captain) || balancedTeams.teamB.players[0];
        
        const teamA = {
            id: Date.now(),
            name: `Team ${teamACaptain.name.split(' ')[0]}`, // Use captain's first name
            players: balancedTeams.teamA.players,
            captain: teamACaptain,
            strength: balancedTeams.teamA.strength || balancedTeams.teamA.players.reduce((sum, p) => sum + window.cricketApp.teamBalancer.skillScore(p), 0),
            created: new Date().toISOString()
        };
        
        // Create Team B using the exact same structure as createTeam()
        const teamB = {
            id: Date.now() + 1,
            name: `Team ${teamBCaptain.name.split(' ')[0]}`, // Use captain's first name
            players: balancedTeams.teamB.players,
            captain: teamBCaptain,
            strength: balancedTeams.teamB.strength || balancedTeams.teamB.players.reduce((sum, p) => sum + window.cricketApp.teamBalancer.skillScore(p), 0),
            created: new Date().toISOString()
        };
        
        // Add teams to the app using the exact same method
        window.cricketApp.teams.push(teamA);
        window.cricketApp.teams.push(teamB);

        console.log('Teams created:', {
            team1: teamA.name + ' - ' + teamA.players.map(p => p.name).join(', '),
            team2: teamB.name + ' - ' + teamB.players.map(p => p.name).join(', ')
        });

        // Step 4: Set match settings (like normal settings)
        console.log('Step 4: Setting match configuration...');
        const matchSettings = {
            totalOvers: overs,
            powerplayOvers: Math.min(6, Math.ceil(overs / 4)),
            boundsaryRuns: 4,
            overBoundaryRuns: 6,
            wicketTypes: ['bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket']
        };
        localStorage.setItem('match-settings', JSON.stringify(matchSettings));
        console.log('Match settings configured:', matchSettings);

        // Step 5: Conduct toss (like normal toss)
        console.log('Step 5: Conducting toss...');
        const tossWinner = Math.random() < 0.5 ? 1 : 2;
        const tossDecision = Math.random() < 0.7 ? 'bat' : 'bowl'; // 70% chance to bat first
        
        const battingFirst = tossDecision === 'bat' ? tossWinner : (tossWinner === 1 ? 2 : 1);
        const bowlingFirst = battingFirst === 1 ? 2 : 1;
        
        console.log(`Toss: Team ${tossWinner} wins and chooses to ${tossDecision} first`);
        console.log(`Match setup: Team ${battingFirst} batting first, Team ${bowlingFirst} bowling first`);

        // Step 6: Start match using the exact same method as normal
        console.log('Step 6: Starting match...');
        
        // Save teams first (like normal flow)
        window.cricketApp.saveData(false); // Only save locally during match setup
        
        // Start the match using the exact same method
        window.cricketApp.startNewMatch();
        
        // Step 7: Set the batting team properly (like normal flow after toss)
        if (window.cricketApp.currentMatch) {
            console.log('Step 7: Configuring match state...');
            
            // Set which team is batting first
            window.cricketApp.currentMatch.currentTeam = battingFirst;
            window.cricketApp.currentMatch.currentInnings = 1;
            
            // Configure team batting/bowling status
            if (battingFirst === 1) {
                window.cricketApp.currentMatch.team1Score.batting = true;
                window.cricketApp.currentMatch.team2Score.batting = false;
                window.cricketApp.currentMatch.bowler = teamB.players[0]; // First player from bowling team
            } else {
                window.cricketApp.currentMatch.team1Score.batting = false;
                window.cricketApp.currentMatch.team2Score.batting = true;
                window.cricketApp.currentMatch.bowler = teamA.players[0]; // First player from bowling team
            }
            
            console.log('Match state configured successfully');
        }

        // Step 8: Update display and navigate (like normal flow)
        console.log('Step 8: Updating display...');
        window.cricketApp.updateScoreDisplay();
        window.cricketApp.loadTeams(); // Refresh teams display
        
        // Navigate to scoring page
        if (typeof showPage === 'function') {
            showPage('scoring');
        }
        
        // Step 9: Success notification (like normal flow)
        const battingTeamName = window.cricketApp.teams[battingFirst - 1].name;
        const bowlingTeamName = window.cricketApp.teams[bowlingFirst - 1].name;
        
        window.cricketApp.showNotification(
            `🚀 Quick Match Ready! ${battingTeamName} batting vs ${bowlingTeamName}. ${overs} overs. Play ball!`
        );

        console.log('🎯 Quick Match Setup completed successfully!');
        console.log('Match state:', {
            battingTeam: battingTeamName,
            bowlingTeam: bowlingTeamName,
            overs: overs,
            currentBatsmen: {
                striker: window.cricketApp.currentMatch.team1Score.batting ? 
                         window.cricketApp.currentMatch.team1Score.striker?.name :
                         window.cricketApp.currentMatch.team2Score.striker?.name,
                nonStriker: window.cricketApp.currentMatch.team1Score.batting ? 
                            window.cricketApp.currentMatch.team1Score.nonStriker?.name :
                            window.cricketApp.currentMatch.team2Score.nonStriker?.name
            },
            bowler: window.cricketApp.currentMatch.bowler?.name
        });

    } catch (error) {
        console.error('Quick Match Setup failed:', error);
        alert('Quick Match Setup failed: ' + error.message);
    }
}

async function quickComplete(team1Score = null, team2Score = null, winner = null) {
    console.log('🏁 Quick Match Simulation started...');
    
    if (!window.cricketApp || !window.cricketApp.currentMatch) {
        alert('No active match found. Start a match first.');
        return;
    }

    try {
        const match = window.cricketApp.currentMatch;
        const totalOvers = match.totalOvers || 20;
        
        console.log('Simulating match ball-by-ball:', {
            team1: match.team1.name,
            team2: match.team2.name,
            totalOvers: totalOvers
        });

        // Generate target scores if not provided
        let targetScores = null;
        if (team1Score || team2Score) {
            targetScores = {
                team1: team1Score || generateRealisticScores(totalOvers).team1,
                team2: team2Score || generateRealisticScores(totalOvers).team2
            };
        } else {
            targetScores = generateRealisticScores(totalOvers);
        }

        // Ensure we're starting from the beginning of first innings
        match.currentTeam = 1;
        match.currentInnings = 1;
        
        // Initialize batsmen if not already done
        if (!window.cricketApp.ensureBatsmenInitialized()) {
            throw new Error('Failed to initialize batsmen');
        }
        
        // Set up initial bowler if not set
        if (!match.bowler) {
            const bowlingTeam = match.currentTeam === 1 ? match.team2 : match.team1;
            if (bowlingTeam.players && bowlingTeam.players.length > 0) {
                match.bowler = bowlingTeam.players[0];
                console.log('Set initial bowler:', match.bowler.name);
            }
        }
        
        console.log('Simulating first innings...');
        
        // Simulate first innings
        simulateInnings(match, targetScores.team1, totalOvers, 1);
        
        console.log(`First innings completed: ${match.team1.name} - ${match.team1Score.runs}/${match.team1Score.wickets} (${match.team1Score.overs}.${match.team1Score.balls})`);
        
        // Switch to second innings if first innings is complete
        if (match.team1Score.overs >= totalOvers || match.team1Score.wickets >= 10) {
            console.log('Starting second innings...');
            
            // Switch to second innings
            match.currentTeam = 2;
            match.currentInnings = 2;
            match.team2Score.target = match.team1Score.runs + 1;
            
            // Reset and initialize batsmen for second innings
            window.cricketApp.ensureBatsmenInitialized();
            
            // Set up bowler for second innings
            if (match.team1.players && match.team1.players.length > 0) {
                match.bowler = match.team1.players[0];
                console.log('Set second innings bowler:', match.bowler.name);
            }
            
            // Simulate second innings
            simulateInnings(match, targetScores.team2, totalOvers, 2);
            
            console.log(`Second innings completed: ${match.team2.name} - ${match.team2Score.runs}/${match.team2Score.wickets} (${match.team2Score.overs}.${match.team2Score.balls})`);
        }
        
        // The match will automatically end when the innings is complete
        console.log('✅ Match simulation completed successfully!');
        
    } catch (error) {
        console.error('Quick simulation error:', error);
        console.error('Error stack:', error.stack);
        alert('Quick Match Simulation failed: ' + error.message);
    }
}

function simulateInnings(match, targetScore, totalOvers, inningsNumber) {
    console.log(`Starting simulation for innings ${inningsNumber}, target: ${targetScore.runs}/${targetScore.wickets}`);
    
    const currentTeamScore = match.currentTeam === 1 ? match.team1Score : match.team2Score;
    const isSecondInnings = inningsNumber === 2;
    const target = isSecondInnings ? match.team2Score.target : null;
    
    // Initialize tracking variables
    let ballsToSimulate = (totalOvers * 6) - (currentTeamScore.overs * 6 + currentTeamScore.balls);
    let runsNeeded = targetScore.runs - currentTeamScore.runs;
    let wicketsToFall = targetScore.wickets - currentTeamScore.wickets;
    
    console.log(`Simulating ${ballsToSimulate} balls, need ${runsNeeded} runs, ${wicketsToFall} wickets to fall`);
    
    let ballsSimulated = 0;
    const maxBalls = totalOvers * 6;
    
    while (ballsSimulated < ballsToSimulate && 
           currentTeamScore.overs < totalOvers && 
           currentTeamScore.wickets < 10 &&
           (!isSecondInnings || currentTeamScore.runs < target)) {
        
        // Determine what happens on this ball
        const outcome = generateBallOutcome(runsNeeded, ballsToSimulate - ballsSimulated, wicketsToFall, isSecondInnings, target, currentTeamScore.runs);
        
        if (outcome.isWicket) {
            // Simulate a wicket
            console.log(`Ball ${ballsSimulated + 1}: Wicket! ${outcome.dismissalType}`);
            
            // Use the actual wicket mechanism
            try {
                window.cricketApp.addWicketWithDetails(outcome.dismissalType, outcome.fielder);
                wicketsToFall--;
            } catch (error) {
                console.warn('Failed to add wicket properly, using fallback');
                // Fallback: manually update wickets
                currentTeamScore.wickets++;
                currentTeamScore.balls = (currentTeamScore.balls + 1) % 6;
                if (currentTeamScore.balls === 0) {
                    currentTeamScore.overs++;
                }
            }
        } else if (outcome.isExtra) {
            // Simulate extras (wide, no-ball, bye, leg-bye)
            console.log(`Ball ${ballsSimulated + 1}: Extra - ${outcome.extraType} for ${outcome.runs} runs`);
            
            // For extras, runs are added but ball count doesn't increase (for wides and no-balls)
            try {
                if (outcome.extraType === 'wide' || outcome.extraType === 'no-ball') {
                    // These don't count as valid balls
                    window.cricketApp.addRuns(outcome.runs);
                    // Don't increment ballsSimulated for wides and no-balls
                    continue;
                } else {
                    // Byes and leg-byes count as valid balls
                    window.cricketApp.addRuns(outcome.runs);
                }
            } catch (error) {
                console.warn('Failed to add extra properly, using fallback');
                currentTeamScore.runs += outcome.runs;
                currentTeamScore.balls = (currentTeamScore.balls + 1) % 6;
                if (currentTeamScore.balls === 0) {
                    currentTeamScore.overs++;
                }
            }
            runsNeeded -= outcome.runs;
        } else {
            // Simulate regular runs
            console.log(`Ball ${ballsSimulated + 1}: ${outcome.runs} runs`);
            
            try {
                window.cricketApp.addRuns(outcome.runs);
            } catch (error) {
                console.warn('Failed to add runs properly, using fallback');
                // Fallback: manually update scores
                currentTeamScore.runs += outcome.runs;
                currentTeamScore.balls = (currentTeamScore.balls + 1) % 6;
                if (currentTeamScore.balls === 0) {
                    currentTeamScore.overs++;
                }
                
                // Update batsman stats
                if (currentTeamScore.striker) {
                    currentTeamScore.striker.matchRuns = (currentTeamScore.striker.matchRuns || 0) + outcome.runs;
                    currentTeamScore.striker.matchBalls = (currentTeamScore.striker.matchBalls || 0) + 1;
                    
                    if (outcome.runs === 4) {
                        currentTeamScore.striker.boundaries = currentTeamScore.striker.boundaries || { fours: 0, sixes: 0 };
                        currentTeamScore.striker.boundaries.fours++;
                    } else if (outcome.runs === 6) {
                        currentTeamScore.striker.boundaries = currentTeamScore.striker.boundaries || { fours: 0, sixes: 0 };
                        currentTeamScore.striker.boundaries.sixes++;
                    }
                }
            }
            runsNeeded -= outcome.runs;
        }
        
        ballsSimulated++;
        
        // Check for early completion in second innings
        if (isSecondInnings && currentTeamScore.runs >= target) {
            console.log('Target achieved! Match won.');
            break;
        }
        
        // Check if all wickets have fallen
        if (currentTeamScore.wickets >= 10) {
            console.log('All out!');
            break;
        }
        
        // Check if overs are complete
        if (currentTeamScore.overs >= totalOvers) {
            console.log('Overs completed!');
            break;
        }
        
        // Safety check to prevent infinite loop
        if (ballsSimulated > maxBalls) {
            console.warn('Safety break - max balls exceeded');
            break;
        }
    }
    
    console.log(`Innings ${inningsNumber} simulation complete: ${currentTeamScore.runs}/${currentTeamScore.wickets} (${currentTeamScore.overs}.${currentTeamScore.balls})`);
    
    // Update the display
    if (window.cricketApp.updateScoreDisplay) {
        window.cricketApp.updateScoreDisplay();
    }
}

function generateBallOutcome(runsNeeded, ballsRemaining, wicketsToFall, isSecondInnings, target, currentRuns) {
    // Calculate probabilities based on match situation
    const runRate = runsNeeded / Math.max(ballsRemaining / 6, 0.1); // runs per over needed
    const wicketProbability = Math.min(0.15, wicketsToFall / Math.max(ballsRemaining, 1) * 6); // Base 15% max wicket chance
    const extraProbability = 0.08; // 8% chance of extras
    
    // Generate random outcome
    const rand = Math.random();
    
    if (rand < wicketProbability && wicketsToFall > 0) {
        // Wicket
        const dismissalTypes = ['bowled', 'caught', 'lbw', 'run out', 'stumped'];
        const dismissalType = dismissalTypes[Math.floor(Math.random() * dismissalTypes.length)];
        
        return {
            isWicket: true,
            isExtra: false,
            runs: 0,
            dismissalType: dismissalType,
            fielder: dismissalType === 'caught' || dismissalType === 'run out' ? 'Fielder' : null
        };
    } else if (rand < wicketProbability + extraProbability) {
        // Extra
        const extraTypes = ['wide', 'no-ball', 'bye', 'leg-bye'];
        const extraType = extraTypes[Math.floor(Math.random() * extraTypes.length)];
        const extraRuns = Math.floor(Math.random() * 3) + 1; // 1-3 extra runs
        
        return {
            isWicket: false,
            isExtra: true,
            runs: extraRuns,
            extraType: extraType
        };
    } else {
        // Regular delivery - calculate runs based on required run rate
        let runs = 0;
        
        if (isSecondInnings && runRate > 12) {
            // High pressure - more boundaries needed
            const boundaryRand = Math.random();
            if (boundaryRand < 0.3) runs = 6; // 30% chance of six
            else if (boundaryRand < 0.6) runs = 4; // 30% chance of four
            else if (boundaryRand < 0.8) runs = 2; // 20% chance of two
            else runs = Math.floor(Math.random() * 2); // 20% chance of 0-1
        } else if (runRate > 8) {
            // Medium pressure
            const boundaryRand = Math.random();
            if (boundaryRand < 0.15) runs = 6; // 15% chance of six
            else if (boundaryRand < 0.35) runs = 4; // 20% chance of four
            else if (boundaryRand < 0.6) runs = 2; // 25% chance of two
            else if (boundaryRand < 0.8) runs = 1; // 20% chance of one
            else runs = 0; // 20% chance of dot
        } else {
            // Normal scoring
            const scoreRand = Math.random();
            if (scoreRand < 0.05) runs = 6; // 5% chance of six
            else if (scoreRand < 0.15) runs = 4; // 10% chance of four
            else if (scoreRand < 0.3) runs = 2; // 15% chance of two
            else if (scoreRand < 0.5) runs = 1; // 20% chance of one
            else runs = 0; // 50% chance of dot
        }
        
        return {
            isWicket: false,
            isExtra: false,
            runs: runs
        };
    }
}

function generateRealisticScores(totalOvers) {
    // Generate realistic scores based on over count
    const baseScore = totalOvers * 6; // 6 runs per over average
    const variation = baseScore * 0.4; // 40% variation
    
    const team1Runs = Math.floor(baseScore + (Math.random() - 0.5) * variation);
    const team2Runs = Math.floor(baseScore + (Math.random() - 0.5) * variation);
    
    // Generate realistic wicket counts (usually 3-8 wickets fall)
    const team1Wickets = Math.floor(Math.random() * 6) + 3; // 3-8 wickets
    const team2Wickets = Math.floor(Math.random() * 6) + 3; // 3-8 wickets
    
    // Ensure team2 score creates a close match (within 20 runs usually)
    const adjustedTeam2Runs = team2Runs > team1Runs ? 
        Math.floor(team1Runs + Math.random() * 20 - 10) : team2Runs;
    
    return {
        team1: {
            runs: Math.max(team1Runs, 30), // Minimum 30 runs
            wickets: Math.min(team1Wickets, 10), // Maximum 10 wickets
            overs: totalOvers,
            balls: 0
        },
        team2: {
            runs: Math.max(adjustedTeam2Runs, 30), // Minimum 30 runs
            wickets: Math.min(team2Wickets, 10), // Maximum 10 wickets
            overs: Math.floor(Math.random() * totalOvers) + Math.floor(totalOvers * 0.8), // 80-100% of overs
            balls: Math.floor(Math.random() * 6)
        }
    };
}

function setTeamScore(teamScore, targetScore, totalOvers, players) {
    // Set basic score
    teamScore.runs = targetScore.runs;
    teamScore.wickets = targetScore.wickets;
    teamScore.overs = targetScore.overs;
    teamScore.balls = targetScore.balls || 0;
    
    // Distribute runs among players realistically
    let remainingRuns = targetScore.runs;
    const battingPlayers = players.slice(0, Math.min(players.length, targetScore.wickets + 2)); // Players who batted
    
    battingPlayers.forEach((player, index) => {
        if (remainingRuns <= 0) return;
        
        // Generate realistic individual scores
        let playerRuns;
        if (index === 0 || index === 1) {
            // Opening batsmen usually score more
            playerRuns = Math.floor(Math.random() * Math.min(remainingRuns * 0.4, 50)) + 10;
        } else {
            // Middle order
            playerRuns = Math.floor(Math.random() * Math.min(remainingRuns * 0.3, 30));
        }
        
        playerRuns = Math.min(playerRuns, remainingRuns);
        remainingRuns -= playerRuns;
        
        // Set player stats
        player.matchRuns = playerRuns;
        player.matchBalls = Math.floor(playerRuns * (1.2 + Math.random() * 0.6)); // Strike rate between 83-167
        player.boundaries = {
            fours: Math.floor(playerRuns / 8) + Math.floor(Math.random() * 3),
            sixes: Math.floor(playerRuns / 15) + Math.floor(Math.random() * 2)
        };
        
        // Set dismissal info for out players
        if (index < targetScore.wickets) {
            player.isOut = true;
            player.currentMatchStatus = 'out';
            const dismissalTypes = ['bowled', 'caught', 'lbw', 'run out'];
            player.dismissalType = dismissalTypes[Math.floor(Math.random() * dismissalTypes.length)];
            player.dismissalBowler = 'Bowler';
            if (player.dismissalType === 'caught' || player.dismissalType === 'run out') {
                player.dismissalFielder = 'Fielder';
            }
        }
    });
    
    // Set current batsmen (if not all out)
    if (targetScore.wickets < 10 && battingPlayers.length > targetScore.wickets) {
        teamScore.striker = battingPlayers[targetScore.wickets] || battingPlayers[0];
        teamScore.nonStriker = battingPlayers[targetScore.wickets + 1] || battingPlayers[1];
    }
    
    // Initialize fall of wickets
    teamScore.fallOfWickets = [];
    let cumulativeScore = 0;
    for (let i = 0; i < targetScore.wickets; i++) {
        cumulativeScore += Math.floor(targetScore.runs / (targetScore.wickets + 1));
        teamScore.fallOfWickets.push({
            batsman: battingPlayers[i],
            batsmanName: battingPlayers[i]?.name || 'Player',
            runs: battingPlayers[i]?.matchRuns || 0,
            score: Math.min(cumulativeScore, targetScore.runs),
            over: Math.floor(i * totalOvers / Math.max(targetScore.wickets, 1)),
            ball: Math.floor(Math.random() * 6)
        });
    }
}

// Global shortcuts for power users (accessible via browser console)
window.quickMatch = quickMatchSetup;
window.quick5 = () => quickMatchSetup(5);
window.quick10 = () => quickMatchSetup(10);
window.quick20 = () => quickMatchSetup(20);
window.quickT20 = () => quickMatchSetup(20);
window.quickODI = () => quickMatchSetup(50);
window.quickComplete = quickComplete;

// Console helper message
console.log('🏏 Cricket PWA Console Shortcuts:');
console.log('  quickMatch(overs) - Quick match setup with custom overs');
console.log('  quick5() - Quick 5-over match');
console.log('  quick10() - Quick 10-over match');
console.log('  quick20() - Quick T20 match');
console.log('  quickODI() - Quick 50-over match');
console.log('  quickComplete() - Complete current match automatically');
console.log('  Example: quickMatch(8) for an 8-over match');

function swapBatsmen() {
    if (window.cricketApp && window.cricketApp.currentMatch) {
        window.cricketApp.swapStrike();
        window.cricketApp.updateScoreDisplay();
        window.cricketApp.showNotification('🔄 Batsmen swapped');
    }
}

function showScorecard() {
    if (window.cricketApp && window.cricketApp.currentMatch) {
        const scorecard = window.cricketApp.getDetailedScorecard();
        
        // Create modern, compact scorecard modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            align-items: flex-start;
            justify-content: center;
            z-index: 1000;
            backdrop-filter: blur(5px);
            padding: 10px;
            box-sizing: border-box;
            overflow-y: auto;
        `;
        
        modal.innerHTML = `
            <div class="scorecard-container" style="
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                border-radius: 15px;
                padding: 12px;
                max-width: 82vw;
                width: 100%;
                max-height: 80vh;
                height: auto;
                overflow-y: auto;
                overflow-x: hidden;
                box-shadow: 0 15px 30px rgba(0,0,0,0.3);
                border: 1px solid rgba(0, 255, 65, 0.3);
                position: relative;
                font-family: 'Segoe UI', sans-serif;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: thin;
                scrollbar-color: rgba(0, 255, 65, 0.3) transparent;
            ">
                <!-- Close Button -->
                <button onclick="document.body.removeChild(this.closest('.modal-overlay'))" style="
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: #ff4757;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                    z-index: 10;
                ">✕</button>
                
                <!-- Header -->
                <div class="scorecard-header" style="
                    text-align: center;
                    margin-bottom: 20px;
                    padding-bottom: 12px;
                    border-bottom: 2px solid #00ff41;
                ">
                    <h2 style="
                        color: #00ff41;
                        margin: 0 0 10px 0;
                        font-size: 24px;
                        font-weight: 700;
                    ">📊 Live Scorecard</h2>
                    <h3 style="
                        margin: 5px 0;
                        color: #ffffff;
                        font-size: 18px;
                        font-weight: 500;
                    ">${scorecard.matchInfo.team1} vs ${scorecard.matchInfo.team2}</h3>
                    <p style="
                        color: rgba(255,255,255,0.7);
                        margin: 5px 0 0 0;
                        font-size: 14px;
                    ">
                        ${scorecard.matchInfo.totalOvers} Overs Match • Innings ${scorecard.matchInfo.currentInnings}/2
                        ${scorecard.target ? ` • Target: ${scorecard.target}` : ''}
                        ${scorecard.requiredRunRate ? ` • RRR: ${scorecard.requiredRunRate}` : ''}
                    </p>
                </div>

                <!-- Teams Container -->
                <div style="display: grid; gap: 15px;">
                    ${generateTeamScorecardHTML(scorecard.team1Scorecard, scorecard.matchInfo.team1, 'team1', scorecard, scorecard.team2Scorecard)}
                    ${generateTeamScorecardHTML(scorecard.team2Scorecard, scorecard.matchInfo.team2, 'team2', scorecard, scorecard.team1Scorecard)}
                </div>
            </div>
        `;

        // Add mobile-specific styling improvements
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 480px) {
                .scorecard-container {
                    padding: 12px !important;
                    margin: 5px !important;
                    border-radius: 12px !important;
                    max-height: 85vh !important;
                    max-width: 78vw !important;
                }
                .scorecard-container table {
                    font-size: 10px !important;
                }
                .scorecard-container th, .scorecard-container td {
                    padding: 4px 3px !important;
                }
                .scorecard-container h3 {
                    font-size: 16px !important;
                    margin-bottom: 8px !important;
                }
                .scorecard-container h4 {
                    font-size: 13px !important;
                    margin-bottom: 6px !important;
                }
                .scorecard-container h5 {
                    font-size: 11px !important;
                    margin-bottom: 4px !important;
                }
                .scorecard-header {
                    margin-bottom: 15px !important;
                    padding-bottom: 8px !important;
                }
            }
            @media (max-width: 360px) {
                .scorecard-container {
                    padding: 8px !important;
                    font-size: 12px !important;
                    max-width: 75vw !important;
                }
                .scorecard-container table {
                    font-size: 9px !important;
                }
                .scorecard-container th, .scorecard-container td {
                    padding: 3px 2px !important;
                }
            }
            .scorecard-container::-webkit-scrollbar {
                width: 4px;
            }
            .scorecard-container::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.1);
                border-radius: 2px;
            }
            .scorecard-container::-webkit-scrollbar-thumb {
                background: rgba(0, 255, 65, 0.3);
                border-radius: 2px;
            }
            .scorecard-container::-webkit-scrollbar-thumb:hover {
                background: rgba(0, 255, 65, 0.5);
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(modal);
    } else {
        alert('No active match found');
    }
}

function generateTeamScorecardHTML(teamScorecard, teamName, teamKey, fullScorecard, opposingTeamScorecard) {
    const isTeam1 = teamKey === 'team1';
    const primaryColor = isTeam1 ? '#667eea' : '#764ba2';
    const secondaryColor = isTeam1 ? '#764ba2' : '#667eea';
    
    // Determine if this team is currently batting
    const currentBattingTeam = fullScorecard.currentState?.currentTeam;
    const isCurrentlyBatting = (isTeam1 && currentBattingTeam === 1) || (!isTeam1 && currentBattingTeam === 2);
    
    // In first innings, only show batting indicators for the team that's actually batting
    const showBattingIndicators = fullScorecard.matchInfo.currentInnings === 1 ? isCurrentlyBatting : true;
    
    // Calculate total extras
    let totalExtras = 0;
    if (teamScorecard.extras && typeof teamScorecard.extras === 'object') {
        totalExtras = (teamScorecard.extras.byes || 0) + 
                     (teamScorecard.extras.legByes || 0) + 
                     (teamScorecard.extras.wides || 0) + 
                     (teamScorecard.extras.noBalls || 0);
    } else if (typeof teamScorecard.extras === 'number') {
        totalExtras = teamScorecard.extras;
    }
    
    return `
        <div class="team-section" style="
            background: linear-gradient(135deg, ${primaryColor}20 0%, ${secondaryColor}10 100%);
            border-radius: 12px;
            padding: 15px;
            border: 1px solid ${primaryColor}40;
        ">
            <!-- Team Header -->
            <div class="team-header" style="
                background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
                padding: 15px 20px;
                border-radius: 12px;
                margin-bottom: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div>
                    <h3 style="margin: 0; color: white; font-size: 18px; font-weight: 600;">${teamName}</h3>
                    <span style="font-size: 28px; font-weight: 700; color: white;">${teamScorecard.totalScore}</span>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 16px; color: rgba(255,255,255,0.9);">${teamScorecard.overs} overs</div>
                    <div style="font-size: 14px; color: rgba(255,255,255,0.8);">RR: ${teamScorecard.runRate}</div>
                </div>
            </div>
            
            <!-- Batting Card -->
            <div class="batting-section" style="margin-bottom: 15px;">
                <h4 style="
                    color: #00ff41;
                    margin: 0 0 10px 0;
                    font-size: 15px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">🏏 Batting Performance</h4>
                
                <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                    <table style="
                        width: 100%;
                        min-width: 300px;
                        border-collapse: collapse;
                        font-size: 11px;
                        background: rgba(255,255,255,0.05);
                        border-radius: 8px;
                        overflow: hidden;
                    ">
                        <thead>
                            <tr style="background: rgba(0,255,65,0.15);">
                                <th style="padding: 10px 8px; text-align: left; color: #00ff41; font-weight: 600;">Batsman</th>
                                <th style="padding: 10px 5px; text-align: center; color: #00ff41; font-weight: 600;">R</th>
                                <th style="padding: 10px 5px; text-align: center; color: #00ff41; font-weight: 600;">B</th>
                                <th style="padding: 10px 5px; text-align: center; color: #00ff41; font-weight: 600;">4s</th>
                                <th style="padding: 10px 5px; text-align: center; color: #00ff41; font-weight: 600;">6s</th>
                                <th style="padding: 10px 5px; text-align: center; color: #00ff41; font-weight: 600;">SR</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${teamScorecard.battingCard.map((batsman, index) => {
                                const isCurrentBatsman = showBattingIndicators && batsman.status.includes('*');
                                const isOut = batsman.status === 'out';
                                
                                return `
                                <tr style="
                                    border-bottom: 1px solid rgba(255,255,255,0.1);
                                    background: ${isCurrentBatsman ? 'rgba(255,255,0,0.1)' : isOut ? 'rgba(255,107,107,0.15)' : 'transparent'};
                                ">
                                    <td style="
                                        padding: 10px 8px;
                                        color: ${isCurrentBatsman ? '#ffff00' : isOut ? '#ff6b6b' : 'white'};
                                        font-weight: ${isCurrentBatsman ? '600' : isOut ? '500' : '400'};
                                    ">
                                        ${batsman.name}${isCurrentBatsman ? ' ★' : ''}
                                        ${isOut ? '<span style="color: #ff6b6b; font-size: 11px; font-weight: 600;"> (out)</span>' : ''}
                                    </td>
                                    <td style="padding: 10px 5px; text-align: center; color: ${isOut ? '#ff6b6b' : 'white'}; font-weight: 500;">${batsman.runs}</td>
                                    <td style="padding: 10px 5px; text-align: center; color: ${isOut ? '#ff6b6b' : 'white'};">${batsman.balls}</td>
                                    <td style="padding: 10px 5px; text-align: center; color: ${isOut ? '#ff6b6b' : 'white'};">${batsman.fours}</td>
                                    <td style="padding: 10px 5px; text-align: center; color: ${isOut ? '#ff6b6b' : 'white'};">${batsman.sixes}</td>
                                    <td style="padding: 10px 5px; text-align: center; color: ${isOut ? '#ff6b6b' : 'white'};">${batsman.strikeRate}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div style="
                    margin-top: 12px;
                    font-size: 11px;
                    color: rgba(255,255,255,0.6);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <span>Extras: ${totalExtras}${totalExtras > 0 && teamScorecard.extras && typeof teamScorecard.extras === 'object' ? 
                        ` (b:${teamScorecard.extras.byes || 0}, lb:${teamScorecard.extras.legByes || 0}, w:${teamScorecard.extras.wides || 0}, nb:${teamScorecard.extras.noBalls || 0})` : ''}</span>
                    ${showBattingIndicators ? '<span>★ = Currently batting</span>' : '<span></span>'}
                </div>
            </div>
            
            <!-- Opposing Team's Bowling Figures -->
            ${opposingTeamScorecard.bowlingCard && opposingTeamScorecard.bowlingCard.length > 0 ? `
                <div class="bowling-section" style="margin-bottom: 20px;">
                    <h4 style="
                        color: #ff9f43;
                        margin: 0 0 15px 0;
                        font-size: 16px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">🎯 Bowling vs ${teamName}</h4>
                    
                    <div style="overflow-x: auto;">
                        <table style="
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 13px;
                            background: rgba(255,159,67,0.05);
                            border-radius: 8px;
                            overflow: hidden;
                        ">
                            <thead>
                                <tr style="background: rgba(255,159,67,0.15);">
                                    <th style="padding: 10px 8px; text-align: left; color: #ff9f43; font-weight: 600;">Bowler</th>
                                    <th style="padding: 10px 5px; text-align: center; color: #ff9f43; font-weight: 600;">O</th>
                                    <th style="padding: 10px 5px; text-align: center; color: #ff9f43; font-weight: 600;">R</th>
                                    <th style="padding: 10px 5px; text-align: center; color: #ff9f43; font-weight: 600;">W</th>
                                    <th style="padding: 10px 5px; text-align: center; color: #ff9f43; font-weight: 600;">Econ</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${opposingTeamScorecard.bowlingCard.map(bowler => `
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                                        <td style="padding: 10px 8px; color: white;">${bowler.name}</td>
                                        <td style="padding: 10px 5px; text-align: center; color: white;">${bowler.overs}</td>
                                        <td style="padding: 10px 5px; text-align: center; color: white;">${bowler.runs}</td>
                                        <td style="padding: 10px 5px; text-align: center; color: white;">${bowler.wickets}</td>
                                        <td style="padding: 10px 5px; text-align: center; color: white;">${bowler.economy}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
            
            <!-- Fall of Wickets -->
            ${teamScorecard.fallOfWickets && teamScorecard.fallOfWickets.length > 0 ? `
                <div style="margin-top: 15px;">
                    <h5 style="
                        color: #ff6b6b;
                        margin: 0 0 10px 0;
                        font-size: 14px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    ">📉 Fall of Wickets</h5>
                    <div style="
                        background: rgba(255,107,107,0.1);
                        border-radius: 8px;
                        padding: 12px;
                        font-size: 12px;
                        color: rgba(255,255,255,0.8);
                        line-height: 1.4;
                    ">
                        ${teamScorecard.fallOfWickets.map((wicket, index) => {
                            const dismissalText = formatDismissalText(wicket);
                            const playerName = wicket.batsmanName || wicket.player || 'Unknown';
                            const overInfo = `${wicket.over || 0}.${wicket.ball || 0}`;
                            return `<div style="margin-bottom: 4px;">
                                <strong>${wicket.score}/${index + 1}</strong> 
                                (${playerName}, ${overInfo}) 
                                ${dismissalText ? `- ${dismissalText}` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function getDismissalInfo(batsman, fallOfWickets) {
    // Check if this batsman is in the fall of wickets
    if (fallOfWickets) {
        const wicket = fallOfWickets.find(w => w.player === batsman.name || w.batsmanName === batsman.name);
        if (wicket) {
            return formatDismissalText(wicket);
        }
    }
    
    // If not out
    if (batsman.status === 'out') {
        return 'out';
    } else if (batsman.status.includes('*')) {
        return 'not out*';
    } else {
        return 'not out';
    }
}

function formatDismissalText(wicket) {
    if (!wicket) return '';
    
    // Use BCCB-style dismissal formatting like in ui_components.py
    const dismissalType = wicket.dismissalType || wicket.dismissal;
    const helper = wicket.helper || 'fielder';
    const fielder = wicket.fielder || 'fielder';
    const bowler = wicket.bowler || wicket.bowlerName || 'bowler';
    
    if (!dismissalType) return '';
    
    switch (dismissalType.toLowerCase()) {
        case 'caught':
            return `c ${helper} b ${bowler}`;
        case 'stumped':
            return `st ${helper} b ${bowler}`;
        case 'run out':
            return `run out (${helper})`;
        case 'bowled':
        case 'lbw':
        case 'hit wicket':
            return `b ${bowler}`;
        default:
            return dismissalType;
    }
}

function endInnings() {
    if (window.cricketApp && window.cricketApp.currentMatch) {
        if (confirm('Are you sure you want to end this innings?')) {
            window.cricketApp.endInnings();
        }
    }
}

// Data Management Helper Functions
window.cricketDataManager = {
    // Helper function to get current data summary
    getDataSummary() {
        const players = JSON.parse(localStorage.getItem('cricket-players') || '[]');
        const teams = JSON.parse(localStorage.getItem('cricket-teams') || '[]');
        const matches = JSON.parse(localStorage.getItem('cricket-matches') || '[]');
        const settings = JSON.parse(localStorage.getItem('match-settings') || '{}');
        
        return {
            players: players.length,
            teams: teams.length,
            matches: matches.length,
            settings: Object.keys(settings).length,
            lastMatch: matches.length > 0 ? matches[matches.length - 1].date : 'None',
            totalRuns: players.reduce((sum, p) => sum + (p.runs || 0), 0),
            totalWickets: players.reduce((sum, p) => sum + (p.wickets || 0), 0)
        };
    },
    
    // Helper function to validate imported data
    validateImportData(data) {
        const errors = [];
        
        if (!data || typeof data !== 'object') {
            errors.push('Invalid data format');
            return errors;
        }
        
        if (data.players && !Array.isArray(data.players)) {
            errors.push('Players data must be an array');
        }
        
        if (data.teams && !Array.isArray(data.teams)) {
            errors.push('Teams data must be an array');
        }
        
        if (data.matches && !Array.isArray(data.matches)) {
            errors.push('Matches data must be an array');
        }
        
        // Check for required player fields
        if (data.players) {
            data.players.forEach((player, index) => {
                if (!player.name) {
                    errors.push(`Player at index ${index} missing name`);
                }
            });
        }
        
        return errors;
    },
    
    // Helper function to create backup before import
    createAutoBackup() {
        const data = {
            players: JSON.parse(localStorage.getItem('cricket-players') || '[]'),
            teams: JSON.parse(localStorage.getItem('cricket-teams') || '[]'),
            matches: JSON.parse(localStorage.getItem('cricket-matches') || '[]'),
            settings: JSON.parse(localStorage.getItem('match-settings') || '{}'),
            backupDate: new Date().toISOString(),
            isAutoBackup: true
        };
        
        localStorage.setItem('cricket-auto-backup', JSON.stringify(data));
        console.log('📁 Auto-backup created before import');
        return data;
    },
    
    // Helper function to restore from auto-backup
    restoreAutoBackup() {
        const backup = localStorage.getItem('cricket-auto-backup');
        if (!backup) {
            console.log('❌ No auto-backup found');
            return false;
        }
        
        try {
            const data = JSON.parse(backup);
            localStorage.setItem('cricket-players', JSON.stringify(data.players || []));
            localStorage.setItem('cricket-teams', JSON.stringify(data.teams || []));
            localStorage.setItem('cricket-matches', JSON.stringify(data.matches || []));
            localStorage.setItem('match-settings', JSON.stringify(data.settings || {}));
            
            console.log('✅ Restored from auto-backup');
            return true;
        } catch (error) {
            console.error('❌ Failed to restore auto-backup:', error);
            return false;
        }
    },
    
    // Helper function to test import functionality
    testImport() {
        console.log('🧪 Testing import functionality...');
        console.log('📁 To test import:');
        console.log('1. First export data using exportCricketData()');
        console.log('2. Then call importCricketData() and select the exported file');
        console.log('3. Check console for detailed import logs');
        
        if (window.exportCricketData) {
            console.log('✅ Export function available');
        } else {
            console.log('❌ Export function not found');
        }
        
        if (window.importCricketData) {
            console.log('✅ Import function available');
        } else {
            console.log('❌ Import function not found');
        }
        
        return this.getDataSummary();
    },
    
    // Helper to show expected file name pattern
    getExpectedFileName() {
        const today = new Date().toISOString().split('T')[0];
        return `cricket-data-backup-${today}.json`;
    }
};

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('🔧 SW registered'))
            .catch(error => console.log('❌ SW registration failed'));
    });
}
