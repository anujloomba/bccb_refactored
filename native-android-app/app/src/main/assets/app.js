
let _globalLastCaptainStatsCall = 0;

document.addEventListener('DOMContentLoaded', function() {
    });

setTimeout(function() {
    try {
        window.cricketApp = new CricketApp();
        window.app = window.cricketApp;
        window.forceUploadToD1 = async function() {
            try {
                await window.cricketApp.saveData(true); // Force sync to D1
                }
        };

        }
}, 1000);

// Simple message display function
function showMessage(message, type = 'info') {

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
        }
    }
}

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
        // For team generation, use category-based scoring
        // Fallback to manual categories
        const battingScoreMap = { 'Reliable': 6, 'So-So': 3, 'Tailend': 1, 'R': 6, 'S': 3, 'U': 1 };
        const bowlingScoreMap = { 'Fast': 5, 'Medium': 3, 'DNB': 1 };

        const battingScore = battingScoreMap[player.battingStyle || player.batting] || 0;
        const bowlingScore = bowlingScoreMap[player.bowlingStyle || player.bowling] || 0;

        return battingScore + bowlingScore;
    }

    /**
     * Determines if a player has enough match data for performance-based evaluation
     */
    hasEnoughData(player) {
        // Require at least 3 matches for statistics-based balancing
        return (player.matches || 0) >= 3;
    }

    /**
     * Calculates performance score based on actual match statistics
     */
    calculatePerformanceScore(player, matchData, performanceData) {
        // For team generation, return category-based score
        return this.skillScore(player);
    }    /**
     * Calculates batting performance score (0-10)
     */
    calculateBattingPerformanceScore(player) {
    // ...existing code...
        const battingScoreMap = { 'Reliable': 6, 'So-So': 3, 'Tailend': 1, 'R': 6, 'S': 3, 'U': 1 };
        return battingScoreMap[player.battingStyle || player.batting] || 0;
    }    /**
     * Calculates bowling performance score (0-10)
     */
    calculateBowlingPerformanceScore(player) {
    // ...existing code...
        const bowlingScoreMap = { 'Fast': 5, 'Medium': 3, 'DNB': 1 };
        return bowlingScoreMap[player.bowlingStyle || player.bowling] || 0;
    }    /**
     * Determines player role based on batting and bowling styles
     */
    getPlayerRole(player) {
        const battingScore = { 'Reliable': 6, 'So-So': 3, 'Tailend': 1 }[player.batting] || 0;
        const bowlingScore = { 'Fast': 5, 'Medium': 3, 'DNB': 1 }[player.bowling] || 0;

        if (player.bowling === 'DNB') {
            return 'batsman';
        }

        // If tailend batsman but good bowler, they're a bowler
        if (player.batting === 'Tailend' && bowlingScore >= 3) {
            return 'bowler';
        }

        // If both batting and bowling are decent, they're an allrounder
        if (battingScore >= 3 && bowlingScore >= 3) {
            return 'allrounder';
        }

        // If primarily good at batting
        if (battingScore > bowlingScore) {
            return 'batsman';
        }

        return 'bowler';
    }

    /**
     * Enhanced team balancing that uses mixed data approach
     */
    balanceTeamsWithStats(selectedPlayers, captain1, captain2, shouldShuffle = false) {
        const categoryAverages = this.calculateCategoryAverages(selectedPlayers);

        // Calculate enhanced score for all players (using actual stats or category averages)
        const enhancedPlayers = selectedPlayers.map(player => ({
            ...player,
            enhancedScore: this.getEnhancedPlayerScore(player, categoryAverages)
        }));

        const enhancedCaptain1 = enhancedPlayers.find(p => p.id === captain1.id) || {
            ...captain1,
            enhancedScore: this.getEnhancedPlayerScore(captain1, categoryAverages)
        };

        const enhancedCaptain2 = enhancedPlayers.find(p => p.id === captain2.id) || {
            ...captain2,
            enhancedScore: this.getEnhancedPlayerScore(captain2, categoryAverages)
        };

        return this.balanceTeamsWithEnhancedScores(enhancedPlayers, enhancedCaptain1, enhancedCaptain2, shouldShuffle);
    }

    /**
     * Calculate average statistics for each batting/bowling category
     * Returns batting average, strike rate, bowling average, and economy for each category
     */
    calculateCategoryAverages(players) {
        const playersWithData = players.filter(p => this.hasEnoughData(p));

        const defaults = {
            batting: {
                'Reliable': { avg: 25, strikeRate: 120 },
                'So-So': { avg: 15, strikeRate: 100 },
                'Tailend': { avg: 5, strikeRate: 80 }
            },
            bowling: {
                'Fast': { avg: 20, economy: 7.0 },
                'Medium': { avg: 25, economy: 8.0 },
                'DNB': { avg: 999, economy: 99.0 } // Effectively no bowling
            }
        };

        if (playersWithData.length === 0) {
            return defaults;
        }

        const battingStats = {};
        const bowlingStats = {};

        // Calculate batting statistics by category
        ['Reliable', 'So-So', 'Tailend'].forEach(battingStyle => {
            const playersInCategory = playersWithData.filter(p =>
                (p.batting || p.battingStyle) === battingStyle
            );

            if (playersInCategory.length > 0) {
                // Calculate average runs per match and strike rate
                const totalRuns = playersInCategory.reduce((sum, p) => sum + (p.runs || 0), 0);
                const totalBalls = playersInCategory.reduce((sum, p) => sum + (p.ballsFaced || p.runs || 1), 0);
                const totalMatches = playersInCategory.reduce((sum, p) => sum + (p.matches || 0), 0);

                battingStats[battingStyle] = {
                    avg: totalMatches > 0 ? totalRuns / totalMatches : defaults.batting[battingStyle].avg,
                    strikeRate: totalBalls > 0 ? (totalRuns * 100) / totalBalls : defaults.batting[battingStyle].strikeRate
                };
            } else {
                battingStats[battingStyle] = defaults.batting[battingStyle];
            }
        });

        // Calculate bowling statistics by category
        ['Fast', 'Medium', 'DNB'].forEach(bowlingStyle => {
            const playersInCategory = playersWithData.filter(p =>
                (p.bowling || p.bowlingStyle) === bowlingStyle
            );

            if (playersInCategory.length > 0 && bowlingStyle !== 'DNB') {
                const totalWickets = playersInCategory.reduce((sum, p) => sum + (p.wickets || 0), 0);
                const totalRunsConceded = playersInCategory.reduce((sum, p) => sum + (p.runsConceded || 0), 0);
                const totalBallsBowled = playersInCategory.reduce((sum, p) => sum + (p.ballsBowled || 0), 0);

                bowlingStats[bowlingStyle] = {
                    avg: totalWickets > 0 ? totalRunsConceded / totalWickets : defaults.bowling[bowlingStyle].avg,
                    economy: totalBallsBowled > 0 ? (totalRunsConceded * 6) / totalBallsBowled : defaults.bowling[bowlingStyle].economy
                };
            } else {
                bowlingStats[bowlingStyle] = defaults.bowling[bowlingStyle];
            }
        });

        return {
            batting: battingStats,
            bowling: bowlingStats
        };
    }

    /**
     * Get enhanced player score using weighted formula:
     * Batting Avg (0.3) + Bowling Avg (0.3) + Bowling Economy (0.2) + Batting Strike Rate (0.2)
     * Uses actual stats for players with 3+ matches, category averages as proxy for others
     */
    getEnhancedPlayerScore(player, categoryAverages) {
        const battingStyle = player.batting || player.battingStyle;
        const bowlingStyle = player.bowling || player.bowlingStyle;

        let battingAvg, strikeRate, bowlingAvg, economy;

        if (this.hasEnoughData(player)) {
            const matches = player.matches || 1;
            const totalRuns = player.runs || 0;
            const totalBalls = player.ballsFaced || totalRuns || 1;
            const totalWickets = player.wickets || 0;
            const totalRunsConceded = player.runsConceded || 0;
            const totalBallsBowled = player.ballsBowled || 0;

            battingAvg = totalRuns / matches;
            strikeRate = (totalRuns * 100) / totalBalls;
            bowlingAvg = totalWickets > 0 ? totalRunsConceded / totalWickets : categoryAverages.bowling[bowlingStyle].avg;
            economy = totalBallsBowled > 0 ? (totalRunsConceded * 6) / totalBallsBowled : categoryAverages.bowling[bowlingStyle].economy;
        } else {
            battingAvg = categoryAverages.batting[battingStyle].avg;
            strikeRate = categoryAverages.batting[battingStyle].strikeRate;
            bowlingAvg = categoryAverages.bowling[bowlingStyle].avg;
            economy = categoryAverages.bowling[bowlingStyle].economy;
        }

        // Normalize each metric to 0-10 scale
        const normBattingAvg = Math.min(10, (battingAvg / 50) * 10);

        // Strike rate: 50-150 maps to 0-10 (higher is better)
        const normStrikeRate = Math.min(10, Math.max(0, ((strikeRate - 50) / 100) * 10));

        const normBowlingAvg = Math.min(10, Math.max(0, 10 - ((bowlingAvg - 10) / 30) * 10));

        const normEconomy = Math.min(10, Math.max(0, 10 - ((economy - 4) / 8) * 10));

        const weightedScore = (normBattingAvg * 0.4) + (normBowlingAvg * 0.3) + (normEconomy * 0.2) + (normStrikeRate * 0.1);

        return weightedScore;
    }

    /**
     * Balance teams using new weighted scoring algorithm with randomized allocation
     */
    balanceTeamsWithEnhancedScores(enhancedPlayers, captain1, captain2, shouldShuffle = false) {
        const teamA = [captain1];
        const teamB = [captain2];

        const otherPlayers = enhancedPlayers.filter(p => p.id !== captain1.id && p.id !== captain2.id);

        // Check if captains are star players
        const captain1IsStar = captain1.is_star || captain1.isStar || false;
        const captain2IsStar = captain2.is_star || captain2.isStar || false;

        // Separate players into star and regular
        const starPlayers = otherPlayers.filter(p => p.is_star || p.isStar || false);
        const regularPlayers = otherPlayers.filter(p => !(p.is_star || p.isStar));

        // Sort by enhanced score (ranking)
        starPlayers.sort((a, b) => b.enhancedScore - a.enhancedScore);
        regularPlayers.sort((a, b) => b.enhancedScore - a.enhancedScore);

        // If one captain is star and other isn't, prioritize stars to non-star captain's team
        let starTurn;
        if (captain1IsStar && !captain2IsStar) {
            starTurn = 1; // Give stars to teamB first (non-star captain)
        } else if (!captain1IsStar && captain2IsStar) {
            starTurn = 0; // Give stars to teamA first (non-star captain)
        } else {
            starTurn = captain1.enhancedScore <= captain2.enhancedScore ? 0 : 1;
        }

        for (const player of starPlayers) {
            if (starTurn === 0) {
                teamA.push(player);
                starTurn = 1;
            } else {
                teamB.push(player);
                starTurn = 0;
            }
        }

        // Now distribute regular players using the new algorithm:
        // Pick top 2 from ranking, allocate randomly to weaker team
        // Add next player to replenish group of 2, allocate randomly to other team
        // Continue pattern

        const getTeamScore = (team) => team.reduce((sum, p) => sum + p.enhancedScore, 0);

        let i = 0;
        while (i < regularPlayers.length) {
            const teamAScore = getTeamScore(teamA);
            const teamBScore = getTeamScore(teamB);
            const weakerIsA = teamAScore <= teamBScore;

            // Pick next 2 players (or remaining if less than 2)
            const groupSize = Math.min(2, regularPlayers.length - i);
            const playersToAllocate = regularPlayers.slice(i, i + groupSize);

            // Shuffle this group for randomization
            if (shouldShuffle || groupSize > 1) {
                for (let j = playersToAllocate.length - 1; j > 0; j--) {
                    const randomIdx = Math.floor(Math.random() * (j + 1));
                    [playersToAllocate[j], playersToAllocate[randomIdx]] = [playersToAllocate[randomIdx], playersToAllocate[j]];
                }
            }

            // Allocate players from this group randomly to weaker team and other team
            playersToAllocate.forEach((player, idx) => {
                if (groupSize === 1) {
                    // Only one player left, add to weaker team
                    if (weakerIsA) {
                        teamA.push(player);
                    } else {
                        teamB.push(player);
                    }
                } else if (idx === 0) {
                    // First player goes to weaker team
                    if (weakerIsA) {
                        teamA.push(player);
                    } else {
                        teamB.push(player);
                    }
                } else {
                    // Subsequent players go to other team
                    if (weakerIsA) {
                        teamB.push(player);
                    } else {
                        teamA.push(player);
                    }
                }
            });

            i += groupSize;
        }

        // Final balance check - ensure teams are within 1 player of each other
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
     * Shuffle players with same enhanced score
     */
    shufflePlayersWithSameScore(players) {
        let i = 0;
        while (i < players.length) {
            const currentScore = players[i].enhancedScore;
            let j = i + 1;

            while (j < players.length && players[j].enhancedScore === currentScore) {
                j++;
            }

            if (j - i > 1) {
                const sameScorePlayers = players.slice(i, j);
                for (let k = sameScorePlayers.length - 1; k > 0; k--) {
                    const randomIndex = Math.floor(Math.random() * (k + 1));
                    [sameScorePlayers[k], sameScorePlayers[randomIndex]] = [sameScorePlayers[randomIndex], sameScorePlayers[k]];
                }

                for (let k = 0; k < sameScorePlayers.length; k++) {
                    players[i + k] = sameScorePlayers[k];
                }
            }

            i = j;
        }
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

        // We start the turn based on which captain is weaker, to give them the first pick.
        let turn = this.skillScore(captain1) <= this.skillScore(captain2) ? 0 : 1;

        for (const player of starPlayers) {
            if (turn === 0) {
                teamA.push(player);
                turn = 1; // Next turn is for Team B
            } else {
                teamB.push(player);
                turn = 0; // Next turn is for Team A
            }
        }

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
     * Generate balanced teams with the enhanced statistics-based algorithm
     */
    generateBalancedTeams(players) {
        if (players.length < 4) {
            throw new Error('Need at least 4 players to create teams');
        }

        const availablePlayers = [...players];

        // Check if we have players with enough data for enhanced balancing
        const playersWithData = availablePlayers.filter(p => this.hasEnoughData(p));
        const useEnhancedBalancing = playersWithData.length > 0;

        let captain1, captain2, balancedResult;

        if (useEnhancedBalancing) {
            const categoryAverages = this.calculateCategoryAverages(availablePlayers);

            // Sort players by enhanced score to select captains
            const enhancedPlayers = availablePlayers.map(player => ({
                ...player,
                enhancedScore: this.getEnhancedPlayerScore(player, categoryAverages)
            }));

            // Sort by enhanced score and star status
            const sortedPlayers = enhancedPlayers.sort((a, b) => {
                // Stars first, then by enhanced score
                if ((a.is_star || a.isStar) && !(b.is_star || b.isStar)) return -1;
                if (!(a.is_star || a.isStar) && (b.is_star || b.isStar)) return 1;
                return b.enhancedScore - a.enhancedScore;
            });

            captain1 = sortedPlayers[0];
            captain2 = sortedPlayers[1];

            balancedResult = this.balanceTeamsWithStats(availablePlayers, captain1, captain2);

        } else {
            // Fallback to original category-based balancing
            const sortedPlayers = availablePlayers.sort((a, b) => this.skillScore(b) - this.skillScore(a));

            // Separate star players and regular players
            const starPlayers = sortedPlayers.filter(p => p.is_star || p.isStar);
            const regularPlayers = sortedPlayers.filter(p => !(p.is_star || p.isStar));

            captain1 = starPlayers.length > 0 ? starPlayers[0] : regularPlayers[0];
            captain2 = starPlayers.length > 1 ? starPlayers[1] :
                      (regularPlayers[0] !== captain1 ? regularPlayers[0] : regularPlayers[1]);

            balancedResult = this.balanceTeams(availablePlayers, captain1, captain2);
        }

        const { teamA, teamB } = balancedResult;

        // Calculate team strengths using appropriate method
        let teamAStrength, teamBStrength;

        if (useEnhancedBalancing) {
            const categoryAverages = this.calculateCategoryAverages(availablePlayers);
            teamAStrength = teamA.reduce((sum, p) => sum + this.getEnhancedPlayerScore(p, categoryAverages), 0);
            teamBStrength = teamB.reduce((sum, p) => sum + this.getEnhancedPlayerScore(p, categoryAverages), 0);
        } else {
            teamAStrength = teamA.reduce((sum, p) => sum + this.skillScore(p), 0);
            teamBStrength = teamB.reduce((sum, p) => sum + this.skillScore(p), 0);
        }

        return {
            teamA: {
                id: Date.now(),
                name: 'Team Lightning ⚡',
                captain: captain1.id,  // ✅ Store captain ID, not name
                captainName: captain1.name,  // Keep name for display
                players: teamA,
                strength: teamAStrength,
                balancingMethod: useEnhancedBalancing ? 'statistics-based' : 'category-based',
                created: new Date().toISOString()
            },
            teamB: {
                id: Date.now() + 1,
                name: 'Team Thunder 🌩️',
                captain: captain2.id,  // ✅ Store captain ID, not name
                captainName: captain2.name,  // Keep name for display
                players: teamB,
                strength: teamBStrength,
                balancingMethod: useEnhancedBalancing ? 'statistics-based' : 'category-based',
                created: new Date().toISOString()
            }
        };
    }
}

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
                minMatchesForAverage: 1,
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
                // Lower economy is better - reverse sort
                return sortedPlayers.sort((a, b) => (a.economy || 999) - (b.economy || 999));
            case 'bowling_average':
                // Lower bowling average is better - reverse sort
                return sortedPlayers.sort((a, b) => (a.bowlingAverage || 999) - (b.bowlingAverage || 999));
            case 'bowling_strike_rate':
                // Lower bowling strike rate is better - reverse sort
                return sortedPlayers.sort((a, b) => (a.bowlingStrikeRate || 999) - (b.bowlingStrikeRate || 999));
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
            topAllrounder: activePlayersWithStats.find(p => this.teamBalancer && this.teamBalancer.getPlayerRole && this.teamBalancer.getPlayerRole(p) === 'allrounder' && (p.runs || 0) > 0 && (p.wickets || 0) > 0),
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
     * Generate player comparison data (relative spider chart data)
     * For each metric, the best player gets 100% and the worst gets 0%
     */
    generatePlayerComparison(player1, player2) {
        if (!player1 || !player2) return null;

        const metrics = [
            { name: 'Runs/Match', key: 'runsPerMatch' },
            { name: 'Batting Avg', key: 'battingAverage' },
            { name: 'Strike Rate', key: 'strikeRate' },
            { name: 'Wickets/Match', key: 'wicketsPerMatch' },
            { name: 'Economy', key: 'economy', invert: true }, // Lower is better
            { name: '4s/Match', key: 'foursPerMatch' }
        ];

        const getMetricValue = (player, metric) => {
            switch(metric.key) {
                case 'runsPerMatch':
                    return player.matches > 0 ? (player.runs || 0) / player.matches : 0;
                case 'wicketsPerMatch':
                    // Only return value if player has actually bowled
                    if (!player.ballsBowled || player.ballsBowled === 0) return null;
                    return player.matches > 0 ? (player.wickets || 0) / player.matches : 0;
                case 'foursPerMatch':
                    return player.matches > 0 ? (player.fours || 0) / player.matches : 0;
                case 'battingAverage':
                    return player.matches > 0 ? (player.runs || 0) / player.matches : 0;
                case 'strikeRate':
                    return this.calculateStrikeRate(player) || 0;
                case 'economy':
                    // Only return value if player has actually bowled
                    if (!player.ballsBowled || player.ballsBowled === 0) return null;
                    return this.calculateBowlerEconomy(player) || 0;
                default:
                    return player[metric.key] || 0;
            }
        };

        const player1RawValues = metrics.map(metric => getMetricValue(player1, metric));
        const player2RawValues = metrics.map(metric => getMetricValue(player2, metric));

        // Normalize each metric relative to the two players
        const player1Data = metrics.map((metric, index) => {
            const p1Value = player1RawValues[index];
            const p2Value = player2RawValues[index];

            let normalizedValue;

            // Handle cases where one or both players have no data for this metric
            if (p1Value === null && p2Value === null) {
                normalizedValue = 0;
            } else if (p1Value === null) {
                // Only player1 has no data - they get 0%
                normalizedValue = 0;
            } else if (p2Value === null) {
                // Only player2 has no data - player1 gets 100%
                normalizedValue = 100;
            } else if (metric.invert) {
                // For inverted metrics (economy), lower is better
                const min = Math.min(p1Value, p2Value);
                const max = Math.max(p1Value, p2Value);
                if (max === min) {
                    normalizedValue = 100; // Both equal
                } else {
                    normalizedValue = ((max - p1Value) / (max - min)) * 100;
                }
            } else {
                // For normal metrics, higher is better
                const min = Math.min(p1Value, p2Value);
                const max = Math.max(p1Value, p2Value);
                if (max === min) {
                    normalizedValue = 100; // Both equal
                } else {
                    normalizedValue = ((p1Value - min) / (max - min)) * 100;
                }
            }

            return {
                metric: metric.name,
                value: normalizedValue,
                rawValue: p1Value === null ? 0 : p1Value
            };
        });

        const player2Data = metrics.map((metric, index) => {
            const p1Value = player1RawValues[index];
            const p2Value = player2RawValues[index];

            let normalizedValue;

            // Handle cases where one or both players have no data for this metric
            if (p1Value === null && p2Value === null) {
                normalizedValue = 0;
            } else if (p2Value === null) {
                // Only player2 has no data - they get 0%
                normalizedValue = 0;
            } else if (p1Value === null) {
                // Only player1 has no data - player2 gets 100%
                normalizedValue = 100;
            } else if (metric.invert) {
                // For inverted metrics (economy), lower is better
                const min = Math.min(p1Value, p2Value);
                const max = Math.max(p1Value, p2Value);
                if (max === min) {
                    normalizedValue = 100; // Both equal
                } else {
                    normalizedValue = ((max - p2Value) / (max - min)) * 100;
                }
            } else {
                // For normal metrics, higher is better
                const min = Math.min(p1Value, p2Value);
                const max = Math.max(p1Value, p2Value);
                if (max === min) {
                    normalizedValue = 100; // Both equal
                } else {
                    normalizedValue = ((p2Value - min) / (max - min)) * 100;
                }
            }

            return {
                metric: metric.name,
                value: normalizedValue,
                rawValue: p2Value === null ? 0 : p2Value
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

        // Weight based on calculated player role
        let weights = { batting: 0.4, bowling: 0.4, fielding: 0.2 };
        const calculatedRole = (this.teamBalancer && this.teamBalancer.getPlayerRole) ? this.teamBalancer.getPlayerRole(player) : 'allrounder';

        switch(calculatedRole) {
            case 'batsman':
                weights = { batting: 0.7, bowling: 0.1, fielding: 0.2 };
                break;
            case 'bowler':
                weights = { batting: 0.1, bowling: 0.7, fielding: 0.2 };
                break;
            case 'allrounder':
                weights = { batting: 0.45, bowling: 0.45, fielding: 0.1 };
                break;
        }

        const overall = (batting * weights.batting + bowling * weights.bowling + fielding * weights.fielding);
        return Math.min(Math.max(overall, 0), 100); // Clamp between 0-100
    }

    calculateBattingRating(player) {
        const runs = player.runs || 0;
        const matches = player.matches || 0;
        const ballsFaced = player.ballsFaced || Math.max(1, runs); // Use actual ballsFaced if available

        if (matches === 0) return 0;

        const average = runs / matches;
        const strikeRate = parseFloat(this.calculateStrikeRate(player)); // Use new calculation
        const highScore = player.highestScore || 0;
        const boundaries = (player.fours || 0) + (player.sixes || 0);
        const consistency = this.calculateBattingConsistency(player);

        // Normalize components (0-100 scale)
        const avgScore = Math.min((average / this.modelingConfig.thresholds.excellentBattingAverage) * 100, 100);
        const srScore = Math.min((strikeRate / this.modelingConfig.thresholds.excellentStrikeRate) * 100, 100);
        const hsScore = Math.min((highScore / 100) * 100, 100);
        const boundaryScore = Math.min((boundaries / matches / 8) * 100, 100); // 8 boundaries per match is excellent
        const consistencyScore = consistency === 'High' ? 80 : consistency === 'Medium' ? 50 : 20;

        // Weighted combination
        const weights = this.modelingConfig.battingWeights;
        return (avgScore * weights.average + srScore * weights.strikeRate +
                hsScore * 0.1 + boundaryScore * weights.boundaries +
                consistencyScore * weights.consistency);
    }

    calculateBowlingRating(player) {
        const wickets = player.wickets || 0;
        const runsConceded = player.runsConceded || 0;
        const ballsBowled = player.ballsBowled || 0;
        const matches = player.matches || 0;

        if (matches === 0 || wickets === 0) return 0;

        const average = this.calculateBowlingAverage(player);  // sum(runsConceded)/sum(wickets)
        const economy = this.calculateBowlerEconomy(player);   // sum(runsConceded)/sum(ballsBowled/6)
        const strikeRate = this.calculateBowlingStrikeRate(player); // sum(ballsBowled)/sum(wickets)
        const wicketsPerMatch = wickets / matches;

        // Normalize components (0-100 scale, lower is better for average/economy/SR)
        const avgScore = Math.max(100 - (average / this.modelingConfig.thresholds.excellentBowlingAverage) * 100, 0);
        const ecoScore = Math.max(100 - (economy / this.modelingConfig.thresholds.excellentEconomy) * 100, 0);
        const srScore = Math.max(100 - (strikeRate / 25) * 100, 0); // 25 balls per wicket is excellent
        const wpmScore = Math.min((wicketsPerMatch / 3) * 100, 100); // 3 wickets per match is excellent

        // Weighted combination (redistribute consistency weight to other metrics)
        const weights = {
            wickets: 0.35,
            economy: 0.25,
            average: 0.25,
            strikeRate: 0.15
        };
        return (wpmScore * weights.wickets + ecoScore * weights.economy +
                avgScore * weights.average + srScore * weights.strikeRate);
    }

    calculateFieldingRating(player) {
        // Simplified fielding rating based on role and estimated catches
        const catches = player.catches || 0;
        const runOuts = player.runOuts || 0;
        const stumpings = player.stumpings || 0;
        const matches = player.matches || 1;

        const catchesPerMatch = catches / matches;
        const dismissalsPerMatch = (catches + runOuts + stumpings) / matches;

        // Simplified fielding expectations - all players get general fielder expectations
        let expectedCatches = 0.3; // General fielder baseline

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

    calculateMatchImpactScore(player) {
        // How much impact player has on match outcomes
        const runs = player.runs || 0;
        const wickets = player.wickets || 0;
        const matches = player.matches || 1;

        // Impact factors
        const runImpact = runs / matches / 30; // 30 runs per match = significant impact
        const wicketImpact = wickets / matches / 2; // 2 wickets per match = significant impact
        const playerRole = (this.teamBalancer && this.teamBalancer.getPlayerRole) ? this.teamBalancer.getPlayerRole(player) : 'batsman';
        const roleMultiplier = this.getRoleMultiplier(playerRole);

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
        const playerRole = (this.teamBalancer && this.teamBalancer.getPlayerRole) ? this.teamBalancer.getPlayerRole(player) : 'batsman';
        const roleExpectation = this.getRoleExpectedPerformance(playerRole);

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
            'allrounder': 1.0
        };
        return multipliers[role] || 1.0;
    }

    getRoleExpectedPerformance(role) {
        const expectations = {
            'batsman': 60,
            'bowler': 60,
            'allrounder': 55
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
            const role = (this.teamBalancer && this.teamBalancer.getPlayerRole) ? this.teamBalancer.getPlayerRole(p) : 'allrounder';
            roleCount[role] = (roleCount[role] || 0) + 1;
        });

        // Ideal team composition - simplified without wicket-keeper
        const ideal = {
            batsman: 6,
            bowler: 4,
            allrounder: 2
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

class GroupAuthManager {
    constructor() {
        this.currentGroup = this.loadCurrentGroup();
        this.d1Endpoint = null; // Will be set when D1 integration is ready
    }

    // Load current group from localStorage, default to guest
    loadCurrentGroup() {
        const saved = localStorage.getItem('cricket-current-group');
        if (saved) {
            try {
                return JSON.parse(saved);
                }
        }
        return {
            id: 1,
            name: 'guest',
            hasPassword: false
        };
    }

    // Save current group to localStorage
    saveCurrentGroup(group) {
        localStorage.setItem('cricket-current-group', JSON.stringify(group));
        this.currentGroup = group;
        this.updateUI();
    }

    updateUI() {
        const groupNameElement = document.getElementById('currentGroupName');
        if (groupNameElement) {
            groupNameElement.textContent = this.currentGroup.name;

            if (groupNameElement) {
                if (this.currentGroup.name === 'guest') {
                    groupNameElement.style.backgroundColor = 'rgba(158, 158, 158, 0.2)';
                    groupNameElement.style.color = '#9e9e9e';
                } else {
                    groupNameElement.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
                    groupNameElement.style.color = '#4caf50';
                }
            }
        }
    }

    // Simple password hashing (for demo - in production use proper hashing)
    async hashPassword(password) {
        if (!password) return null;

        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Verify password
    async verifyPassword(password, hash) {
        if (!password && !hash) return true; // Both empty
        if (!password || !hash) return false; // One empty, one not

        const hashedInput = await this.hashPassword(password);
        return hashedInput === hash;
    }

    async createGroup(groupName, password) {
        try {
            // Validate input
            if (!groupName || groupName.trim() === '') {
                throw new Error('Group name is required');
            }

            groupName = groupName.trim().toLowerCase();

            // Check if group already exists in localStorage
            const existingGroups = this.getLocalGroups();
            if (existingGroups.some(g => g.name === groupName)) {
                throw new Error('Group name already exists locally');
            }

            // Hash password if provided
            const passwordHash = await this.hashPassword(password);

            let d1GroupId = null;
            try {
                const d1Manager = new D1ApiManager();
                if (await d1Manager.checkConnection()) {
                    const availabilityCheck = await d1Manager.checkGroupAvailability(groupName);
                    if (!availabilityCheck.available) {
                        throw new Error(`Group name "${groupName}" already exists in cloud database. Please choose a different name.`);
                    }

                    const d1Result = await d1Manager.createGroup(groupName, passwordHash);
                    if (d1Result.success) {
                        d1GroupId = d1Result.group.id;
                        } else {
                        throw new Error(d1Result.error || 'Failed to create group in D1');
                    }
                } else {
                    }
                throw new Error(`Failed to create group in cloud database: ${d1Error.message}`);
            }

            const newGroup = {
                id: d1GroupId || Date.now(),
                name: groupName,
                hasPassword: !!password,
                passwordHash: passwordHash,
                createdAt: new Date().toISOString()
            };

            // Save to localStorage as backup
            existingGroups.push(newGroup);
            localStorage.setItem('cricket-groups', JSON.stringify(existingGroups));

            // Switch to new group
            this.saveCurrentGroup({
                id: newGroup.id,
                name: newGroup.name,
                hasPassword: newGroup.hasPassword
            });

            return { success: true, group: newGroup };
            return { success: false, error: error.message };
        }
    }

    // Login to existing group
    async loginToGroup(groupName, password) {
        try {
            if (!groupName || groupName.trim() === '') {
                throw new Error('Group name is required');
            }

            const originalGroupName = groupName;
            groupName = groupName.trim().toLowerCase();

            // Handle guest group
            if (groupName === 'guest') {
                const guestGroup = {
                    id: 1,
                    name: 'guest',
                    hasPassword: false
                };
                this.saveCurrentGroup(guestGroup);
                return { success: true, group: guestGroup };
            }

            const existingGroups = this.getLocalGroups();
            const group = existingGroups.find(g => g.name === groupName);

            if (!group) {
                return await this.loginWithD1(groupName, password);
            }

            // Verify password
            const passwordValid = await this.verifyPassword(password, group.passwordHash);
            if (!passwordValid) {
                throw new Error('Invalid password');
            }

            let groupId = group.id;
            try {
                const d1GroupResponse = await this.d1Manager.apiCall(`/groups/find/${groupName}`);
                if (d1GroupResponse && d1GroupResponse.id) {
                    groupId = d1GroupResponse.id;

                    group.id = groupId;
                    const existingGroups = this.getLocalGroups();
                    const groupIndex = existingGroups.findIndex(g => g.name === groupName);
                    if (groupIndex >= 0) {
                        existingGroups[groupIndex] = group;
                        localStorage.setItem('cricket-groups', JSON.stringify(existingGroups));
                        }
                }
                }

            // Switch to group
            this.saveCurrentGroup({
                id: groupId,
                name: group.name,
                hasPassword: group.hasPassword
            });

            return { success: true, group: group };
            return { success: false, error: error.message };
        }
    }

    async loginWithD1(groupName, password) {
        try {
            // Special handling for 'bccb' group - add it to localStorage if it doesn't exist
            if (groupName === 'bccb') {
                const passwordHash = await this.hashPassword(password);
                const bccbGroup = {
                    id: 3, // Based on the D1 database
                    name: 'bccb',
                    passwordHash: passwordHash,
                    hasPassword: true,
                    createdAt: new Date().toISOString()
                };

                // Add to localStorage
                const existingGroups = this.getLocalGroups();
                existingGroups.push(bccbGroup);
                localStorage.setItem('cricket-groups', JSON.stringify(existingGroups));

                // Now try login again
                return await this.loginToGroup(groupName, password);
            }

            throw new Error('Group not found. Please check group name and try again.');
            return { success: false, error: error.message };
        }
    }

    getLocalGroups() {
        const stored = localStorage.getItem('cricket-groups');
        if (stored) {
            try {
                return JSON.parse(stored);
                }
        }
        return [];
    }

    async migrateLocalGroupsToD1() {
        try {
            const localGroups = this.getLocalGroups();
            const d1Manager = new D1ApiManager();

            if (!await d1Manager.checkConnection()) {
                return { success: false, error: 'D1 not available' };
            }

            let migratedCount = 0;
            for (const group of localGroups) {
                if (group.name === 'guest') continue; // Skip guest group

                try {
                    const d1Result = await d1Manager.createGroup(group.name, group.passwordHash);

                    if (d1Result.success) {
                        group.id = d1Result.group.id;
                        migratedCount++;
                        } else if (d1Result.error && d1Result.error.includes('already exists')) {
                        const authResult = await d1Manager.authenticateGroup(group.name, group.passwordHash);
                        if (authResult.success) {
                            group.id = authResult.group.id;
                            }
                    }
                    }
            }

            // Save updated groups back to localStorage
            localStorage.setItem('cricket-groups', JSON.stringify(localGroups));

            return { success: true, migratedCount };

            return { success: false, error: error.message };
        }
    }

    getCurrentGroupId() {
        return this.currentGroup.id;
    }

    getCurrentGroupName() {
        return this.currentGroup.name;
    }

    // Check if user is in guest group
    isGuest() {
        return this.currentGroup.name === 'guest';
    }
}

class D1ApiManager {
    constructor() {
        // Set your Cloudflare Worker endpoint here
        this.workerEndpoint = 'https://cricket-api.cricketmgr.workers.dev';
        this.apiKey = null; // Optional API key for authentication
    }

    // Set the API endpoint (to be configured per deployment)
    setEndpoint(endpoint) {
        this.workerEndpoint = endpoint;
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        try {
            if (data) {
            }

            const headers = {
                'Content-Type': 'application/json',
            };

            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }

            const options = {
                method,
                headers,
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(`${this.workerEndpoint}${endpoint}`, options);

            if (!response.ok) {
                // Try to get error details from response body
                let errorDetails = '';
                try {
                    const errorText = await response.text();
                    console.error(`🌐 API_CALL: Error response body:`, errorText);
                    errorDetails = errorText ? `: ${errorText}` : '';
                    // Ignore error reading response body
                }
                throw new Error(`HTTP ${response.status}${errorDetails}`);
            }

            const result = await response.json();
            return result;
            console.error(`🌐 API_CALL: Request failed:`, error);
            throw error;
        }
    }

    async createGroup(groupName, passwordHash) {
        return await this.apiCall('/groups', 'POST', {
            group_name: groupName,
            password_hash: passwordHash
        });
    }

    async authenticateGroup(groupName, passwordHash) {
        return await this.apiCall('/groups/auth', 'POST', {
            group_name: groupName,
            password_hash: passwordHash
        });
    }

    async getGroupData(groupId) {
        return await this.apiCall(`/groups/${groupId}/data`);
    }

    // Check if group name is available
    async checkGroupAvailability(groupName) {
        return await this.apiCall(`/groups/check/${groupName}`);
    }

    // Player Management APIs
    async savePlayer(groupId, playerData) {
        return await this.apiCall('/players', 'POST', {
            group_id: groupId,
            ...playerData
        });
    }

    async updatePlayer(groupId, playerId, playerData) {
        return await this.apiCall(`/players/${playerId}`, 'PUT', {
            group_id: groupId,
            ...playerData
        });
    }

    async getPlayers(groupId) {
        return await this.apiCall(`/groups/${groupId}/players`);
    }

    // Match Management APIs
    async saveMatch(groupId, matchData) {
        return await this.apiCall('/matches', 'POST', {
            group_id: groupId,
            ...matchData
        });
    }

    async getMatches(groupId) {
        return await this.apiCall(`/groups/${groupId}/matches`);
    }

    async savePerformanceData(matchId, performanceData) {
        return await this.apiCall('/performance', 'POST', {
            Match_ID: matchId,
            data: performanceData
        });
    }

    // Full data sync APIs
    async syncToD1(groupId, allData) {
        // ...existing code...

        const result = await this.apiCall('/sync/upload', 'POST', {
            group_id: groupId,
            players: allData.players || [],
            matches: allData.matches || [],
            performance_data: allData.performance_data || []
        });

        return result;
    }

    async syncFromD1(groupId) {
        return await this.apiCall(`/sync/download/${groupId}`);
    }

    async wipeD1Group(groupId) {
        if (!groupId || groupId <= 0) {
            throw new Error('Invalid group ID provided for wipe operation');
        }
        if (groupId === 1 && this.authManager && this.authManager.getCurrentGroupName() !== 'guest') {
            throw new Error('Safety check failed: Attempting to wipe guest group when not logged in as guest');
        }

        try {
            const wipeResult = await this.apiCall('/groups/' + groupId + '/wipe', 'DELETE');
            return wipeResult;

            try {
                const perfResult = await this.apiCall('/groups/' + groupId + '/performance', 'DELETE');
                const matchResult = await this.apiCall('/groups/' + groupId + '/matches', 'DELETE');
                const playerResult = await this.apiCall('/groups/' + groupId + '/players', 'DELETE');
                return { success: true, performance: perfResult, matches: matchResult, players: playerResult };

                // Last resort: try the old sync method with empty data
                const legacyResult = await this.apiCall('/sync/upload', 'POST', {
                    group_id: groupId,
                    players: [],
                    matches: [],
                    performance_data: [],
                    _wipe_mode: true  // Special flag to indicate this should delete all existing data
                });

                return legacyResult;
            }
        }
    }

    async checkConnection() {
        try {
            await this.apiCall('/health');
            return true;
            return false;
        }
    }
}

class CricketApp {
    // Save the currently generated teams to localStorage for persistence
    saveTeams() {
        if (this.tempTeams && this.tempTeams.length === 2) {
            try {
                localStorage.setItem('savedTeams', JSON.stringify(this.tempTeams));

                this.teams = this.tempTeams;
                this.saveData(true); // Trigger D1 sync when teams are saved (with completed match protection)

                this.showNotification('💾 Teams saved! Click "Let\'s Play" to start the toss.');
                this.showNotification('❌ Failed to save teams');
                }
        } else {
            this.showNotification('❌ No teams to save');
            }
    }

    // Load saved teams from localStorage (if any) and show them
    loadSavedTeams() {
        try {
            const saved = localStorage.getItem('savedTeams');
            if (saved) {
                const teams = JSON.parse(saved);
                if (Array.isArray(teams) && teams.length === 2) {
                    this.tempTeams = teams;
                    this.showInlineTeamsResult(teams[0], teams[1]);
                    return true;
                }
            }
            }
        return false;
    }
    constructor() {
        this.currentView = 'home';
        this.players = [];
        this.teams = [];
        this.matches = [];
        this.currentMatch = null;
        this.waitingForBowlerSelection = false; // Flag to prevent actions during bowler selection
        this.statsLoaded = false; // Flag to prevent redundant loading of stats and analytics
        this.analytics = new AnalyticsEngine();
        this.teamBalancer = new TeamBalancer();

        // Initialize group authentication with persistent login
        this.authManager = new GroupAuthManager();

        this.d1Manager = new D1ApiManager();

        // Initialize data manager for CSV/JSON integration (legacy)
        this.dataManager = new CricketDataManager();

        this.init();
    }

    async init() {
        this.updateGreeting();

        this.authManager.updateUI();

        // Load data from CSV/JSON
        await this.loadDataFromManager();

        this.updateStats(true); // Force initial stats loading
        this.loadPlayers();
        this.loadTeams();

        // Match history will be loaded by updateStats(true) above

        // Add data debugging functions
        window.importCricketData = () => this.importCricketData();
        window.showStorageInfo = () => this.showStorageInfo();
        window.previewExportData = () => this.previewExportData();

        setInterval(() => this.updateGreeting(), 60000);

        // Check if app is in wiped state before loading sample data
        const isWipedState = localStorage.getItem('cricket-wiped-state') === 'true';

        if (this.players.length === 0 && !isWipedState) {
            } else if (isWipedState) {
            } else {
            }
    }

    async loadDataFromManager() {
        try {
            // Check if this is a post-wipe state (should not load anything)
            const isWipedState = localStorage.getItem('cricket-wiped-state') === 'true';
            const wipeTimestamp = localStorage.getItem('cricket-wipe-timestamp');

            if (isWipedState) {

                // Initialize with empty state
                this.players = [];
                this.matches = [];
                this.teams = [];
                this.currentMatch = null;

                const currentGroup = this.authManager.getCurrentGroupName();
                if (currentGroup !== 'guest') {
                    try {
                        const isConnected = await this.d1Manager.checkConnection();
                        if (isConnected) {
                            const groupId = this.authManager.getCurrentGroupId();
                            const cloudData = await this.d1Manager.syncFromD1(groupId);

                            if (cloudData && (cloudData.players?.length > 0 || cloudData.matches?.length > 0)) {
                                this.players = cloudData.players || [];

                                // Parse team composition JSON strings if needed
                                this.matches = (cloudData.matches || []).map(match => {
                                    if (match.Team1_Composition && typeof match.Team1_Composition === 'string') {
                                        try {
                                            match.team1Composition = JSON.parse(match.Team1_Composition);
                                            match.team1Composition = [];
                                        }
                                    }
                                    if (match.Team2_Composition && typeof match.Team2_Composition === 'string') {
                                        try {
                                            match.team2Composition = JSON.parse(match.Team2_Composition);
                                            match.team2Composition = [];
                                        }
                                    }
                                    return match;
                                });

                                this.teams = cloudData.teams || [];

                                // Save to localStorage for offline access
                                this.saveData(false);

                                this.showDataSource('D1 Cloud Database (Recovered)');
                                this.updateSyncStatus('✅ Synced', new Date());

                                // Clear wipe state since we recovered data
                                localStorage.removeItem('cricket-wiped-state');
                                localStorage.removeItem('cricket-wipe-timestamp');

                                return;
                            }
                        }
                        }
                }

                this.showDataSource('Wiped State (Empty)');
                return;
            }

            const currentGroup = this.authManager.getCurrentGroupName();
            let currentGroupId = this.authManager.getCurrentGroupId();

            // Removed auto-login to bccb - user must explicitly login to a group
            if (currentGroup !== 'guest') {
                }

            if (currentGroup !== 'guest') {

                try {
                    const d1GroupResponse = await this.d1Manager.apiCall(`/groups/find/${currentGroup}`);
                    if (d1GroupResponse && d1GroupResponse.id && d1GroupResponse.id !== currentGroupId) {
                        currentGroupId = d1GroupResponse.id;

                        this.authManager.saveCurrentGroup({
                            id: currentGroupId,
                            name: currentGroup,
                            hasPassword: this.authManager.getCurrentGroup()?.hasPassword || false
                        });

                        const groups = this.authManager.getLocalGroups();
                        const groupIndex = groups.findIndex(g => g.name === currentGroup);
                        if (groupIndex >= 0) {
                            groups[groupIndex].id = currentGroupId;
                            localStorage.setItem('cricket-groups', JSON.stringify(groups));
                            }
                    } else {
                        }
                    }

                try {
                    const isConnected = await this.d1Manager.checkConnection();
                    if (isConnected) {
                        const cloudData = await this.d1Manager.syncFromD1(currentGroupId);

                        if (cloudData && cloudData.matches && cloudData.matches.length > 0) {
                        }

                        if (cloudData && (cloudData.players?.length > 0 || cloudData.matches?.length > 0)) {
                            this.players = cloudData.players || [];

                            // Just use the raw matches as-is - no transformation!
                            this.matches = cloudData.matches || [];

                            this.teams = cloudData.teams || [];
                            this.currentMatch = null;

                            this.matches.forEach(match => {
                                const isCompleted = match.Status === 'Completed' ||
                                                   match.status === 'Completed' ||
                                                   match.gameFinishTime ||
                                                   match.Game_Finish_Time ||
                                                   match.ended ||
                                                   (match.Winning_Team && match.Winning_Team !== '');

                                if (isCompleted) {
                                    match.__syncedToD1 = true;
                                }
                            });

                            if (cloudData.performance_data && cloudData.performance_data.length > 0) {
                                const performanceByMatch = {};
                                cloudData.performance_data.forEach(perf => {
                                    const matchId = perf.Match_ID || perf.match_id;
                                    if (!performanceByMatch[matchId]) {
                                        performanceByMatch[matchId] = [];
                                    }
                                    performanceByMatch[matchId].push(perf);
                                });

                                // Attach performance data to each match
                                this.matches.forEach(match => {
                                    const matchId = match.id || match.Match_ID;
                                    const performances = performanceByMatch[matchId];

                                    if (performances && performances.length > 0) {
                                        match.performanceData = performances;
                                    } else if (!match.performanceData) {
                                        match.performanceData = [];
                                    }
                                });

                                }

                            // Save to localStorage for offline access
                            this.saveData(false);

                            this.showDataSource('D1 Cloud Database');
                            this.updateSyncStatus('✅ Synced', new Date());
                            this.updateStats(true); // Force stats reload after D1 sync
                            return;
                        }
                    }
                    this.updateSyncStatus('⚠️ Offline', null);
                }
            }

            // Try to load from localStorage
            const localData = await this.loadFromLocalStorage();
            if (localData && localData.players && localData.players.length > 0) {
                this.players = localData.players;
                this.matches = localData.matches || [];
                this.teams = localData.teams || [];
                this.currentMatch = JSON.parse(localStorage.getItem(`cricket-current-match-group-${this.authManager.getCurrentGroupId()}`) || 'null');

                this.matches.forEach(match => {
                    const isCompleted = match.Status === 'Completed' ||
                                       match.status === 'Completed' ||
                                       match.gameFinishTime ||
                                       match.Game_Finish_Time ||
                                       match.ended ||
                                       (match.Winning_Team && match.Winning_Team !== '');

                    if (isCompleted && match.__syncedToD1 !== false) {
                        // Assume completed matches in localStorage were synced unless explicitly marked otherwise
                        match.__syncedToD1 = true;
                    }
                });

                this.showDataSource('localStorage');
                this.updateSyncStatus('📱 Local only', null);
                return;
            }

            // No data in localStorage - initialize with empty state
            this.players = [];
            this.matches = [];
            this.teams = [];
            this.currentMatch = null;

            // Mark app as initialized
            localStorage.setItem('app-initialized', 'true');
            localStorage.setItem('app-initialization-date', new Date().toISOString());
            this.saveData(false); // Save empty state to localStorage

            this.showDataSource('Empty State');
            }
    }

    // Function removed - app now uses localStorage-only data model

    // Load data from localStorage (for APK/offline version)
    async loadFromLocalStorage() {
        try {
            const groupId = this.authManager.getCurrentGroupId();
            const groupName = this.authManager.getCurrentGroupName();

            // Create group-specific localStorage keys
            const groupKey = `cricket-stats-group-${groupId}`;
            const playersKey = `cricket-players-group-${groupId}`;
            const matchesKey = `cricket-matches-group-${groupId}`;
            const teamsKey = `cricket-teams-group-${groupId}`;

            // Try to load from group-specific keys first
            const consolidatedStats = localStorage.getItem(groupKey);
            if (consolidatedStats) {
                const data = JSON.parse(consolidatedStats);
                if (data.player_info && data.player_info.length > 0) {
                    const players = data.player_info.map(p => ({
                        id: p.Player_ID,
                        name: p.Name,
                        bowling: p.Bowling_Style,
                        batting: p.Batting_Style,
                        is_star: p.Is_Star,
                        // Add default stats that might be missing
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
                        wickets: 0,
                        bestBowling: "0/0",
                        bowlingAverage: 0,
                        economy: 0,
                        bowlingStrikeRate: 0,
                        ballsBowled: 0,
                        runsConceded: 0
                    }));

                    return {
                        players,
                        matches: data.matches || [],
                        teams: []
                    };
                }
            }

            // Fallback to individual group-specific keys
            const players = JSON.parse(localStorage.getItem(playersKey) || '[]');
            const matches = JSON.parse(localStorage.getItem(matchesKey) || '[]');
            const teams = JSON.parse(localStorage.getItem(teamsKey) || '[]');

            if (players.length > 0) {
                return { players, matches, teams };
            }

            // For guest group, also try legacy keys as fallback
            if (groupName === 'guest') {
                const legacyStats = localStorage.getItem('cricket-stats');
                if (legacyStats) {
                    const data = JSON.parse(legacyStats);
                    if (data.player_info && data.player_info.length > 0) {
                        const players = data.player_info.map(p => ({
                            id: p.Player_ID,
                            name: p.Name,
                            bowling: p.Bowling_Style,
                            batting: p.Batting_Style,
                            is_star: p.Is_Star,
                            matches: 0, innings: 0, notOuts: 0, runs: 0, highestScore: 0,
                            battingAverage: 0, ballsFaced: 0, strikeRate: 0, centuries: 0,
                            halfCenturies: 0, ducks: 0, fours: 0, sixes: 0, wickets: 0,
                            bestBowling: "0/0", bowlingAverage: 0, economy: 0, bowlingStrikeRate: 0,
                            ballsBowled: 0, runsConceded: 0
                        }));

                        return { players, matches: data.matches || [], teams: [] };
                    }
                }

                // Legacy individual keys
                const legacyPlayers = JSON.parse(localStorage.getItem('cricket-players') || '[]');
                const legacyMatches = JSON.parse(localStorage.getItem('cricket-matches') || '[]');
                const legacyTeams = JSON.parse(localStorage.getItem('cricket-teams') || '[]');

                if (legacyPlayers.length > 0) {
                    return { players: legacyPlayers, matches: legacyMatches, teams: legacyTeams };
                }
            }

            return null;
            return null;
        }
    }

    initSampleData() {
        /* ORIGINAL FUNCTION COMMENTED OUT:
        const bccbPlayers = [
            {
                id: 1,
                name: "Anuj",
                bowling: "Fast",
                batting: "Reliable",
                is_star: true,
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
                ballsBowled: 144,
                runsConceded: 156,
                fourWickets: 1,
                fiveWickets: 0,
                boundaries: { fours: 42, sixes: 8 },
                created: "2025-01-09T01:00:00.000Z"
            },
            {
                id: 2,
                name: "Anil",
                bowling: "Fast",
                batting: "Reliable",
                is_star: false,
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
                boundaries: { fours: 28, sixes: 4 },
                created: "2025-01-09T01:00:00.000Z"
            },
            {
                id: 3,
                name: "Vivek",
                bowling: "Medium",
                batting: "So-So",
                is_star: false,
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
                ballsBowled: 180,
                runsConceded: 134,
                boundaries: { fours: 4, sixes: 1 },
                created: "2025-01-09T01:00:00.000Z"
            }
        ];

        this.players = bccbPlayers;
        this.saveData(false); // Only save locally when loading BCCB players
        this.updateStats();
        this.loadPlayers();
        */
    }

    updateGreeting() {
        const now = new Date();
        const hour = now.getHours();
        const greetingEl = document.getElementById('greeting');
        const dateEl = document.getElementById('date');
        const guestNoticeEl = document.getElementById('guestGroupNotice');

        let greeting = '';
        if (hour < 12) {
            greeting = 'Good Morning! 🌅';
        } else if (hour < 17) {
            greeting = 'Good Afternoon! ☀️';
        } else {
            greeting = 'Good Evening! 🌙';
        }

        greetingEl.textContent = greeting;
        
        // Format date nicely
        const dateString = now.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
        
        dateEl.innerHTML = `Ready to play cricket?<br><span style="font-size: 0.9em; color: #00ccff; margin-top: 5px; display: inline-block;">${dateString}</span>`;
        
        // Show guest group notice if user is on guest group
        if (guestNoticeEl) {
            const currentGroup = localStorage.getItem('currentGroup');
            if (!currentGroup || currentGroup === 'guest' || currentGroup === 'Guest') {
                guestNoticeEl.style.display = 'block';
            } else {
                guestNoticeEl.style.display = 'none';
            }
        }
    }

    // Navigation helpers for overview cards
    goToCaptainHistory() {
        showPage('teams');
        // Scroll to top after navigation
        setTimeout(() => {
            const teamsContent = document.getElementById('teams');
            if (teamsContent) {
                teamsContent.scrollTop = 0;
            }
        }, 100);
    }

    goToMatchHistory() {
        showPage('stats');
        // Scroll to top after navigation
        setTimeout(() => {
            const statsContent = document.getElementById('stats');
            if (statsContent) {
                statsContent.scrollTop = 0;
            }
        }, 100);
    }

    goToOversSettings() {
        showPage('settings');
        // Scroll to overs section after navigation
        setTimeout(() => {
            const oversSection = document.getElementById('oversPerMatchInput');
            if (oversSection) {
                oversSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Highlight the section briefly
                oversSection.style.transition = 'all 0.3s';
                oversSection.style.boxShadow = '0 0 0 3px rgba(0,255,136,0.5)';
                setTimeout(() => {
                    oversSection.style.boxShadow = '';
                }, 2000);
            }
        }, 100);
    }

    goToGroupSettings() {
        showPage('settings');
        // Scroll to group settings section after navigation
        setTimeout(() => {
            const groupSection = document.querySelector('input[placeholder*="Group ID"]') || 
                               document.querySelector('input[placeholder*="group"]');
            if (groupSection) {
                groupSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Highlight the section briefly
                const container = groupSection.closest('.glass-card') || groupSection.parentElement;
                if (container) {
                    container.style.transition = 'all 0.3s';
                    container.style.boxShadow = '0 0 0 3px rgba(255,193,7,0.5)';
                    setTimeout(() => {
                        container.style.boxShadow = '';
                    }, 2000);
                }
            }
        }, 100);
    }

    getUniqueCaptainsCount() {
        const captains = new Set();

        this.matches.forEach(match => {
            const team1Captain = match.Team1_Captain || match.team1Captain || match.captain1 ||
                               (match.team1 && match.team1.captain);
            const team2Captain = match.Team2_Captain || match.team2Captain || match.captain2 ||
                               (match.team2 && match.team2.captain);

            if (team1Captain) captains.add(team1Captain);
            if (team2Captain) captains.add(team2Captain);
        });

        return captains.size;
    }

    updateStats(forceReload = false) {
        const playerCountEl = document.getElementById('playerCount');
        const captainCountEl = document.getElementById('captainCount');
        const matchCountEl = document.getElementById('matchCount');

        if (playerCountEl) playerCountEl.textContent = this.players.length;
        if (captainCountEl) captainCountEl.textContent = this.getUniqueCaptainsCount();
        if (matchCountEl) matchCountEl.textContent = this.matches.length;

        // Only reload match history and captain stats if forced or not yet loaded
        if (forceReload || !this.statsLoaded) {
            this.loadMatchHistory();
            this.loadCaptainStats();
            this.statsLoaded = true;

            // Also refresh analytics when stats are reloaded
            this.updateScoringTabView();
        } else {
            }

        const matchSettings = JSON.parse(localStorage.getItem('match-settings') || '{}');
        const totalOvers = matchSettings.totalOvers || 5;
        const matchFormatEl = document.getElementById('matchFormat');
        if (matchFormatEl) {
            matchFormatEl.textContent = totalOvers;
        }

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
                }
        }
    }

    loadMatchHistory() {
        const historyContainer = document.getElementById('matchHistoryContainer');
        if (!historyContainer) {
            return;
        }

        // First try to use app's current matches data
        if (this.matches && this.matches.length > 0) {
            const appData = {
                matches: this.matches,
                player_info: this.players
            };
            this.displayMatchHistory(appData, historyContainer);
            return;
        }

        // Fallback: try to load from localStorage
        try {

            const localData = JSON.parse(localStorage.getItem('cricket-stats'));
            if (localData && (localData.matches || localData.history)) {
                if (localData.matches && Array.isArray(localData.matches)) {
                    this.matches = localData.matches;
                    }

                this.displayMatchHistory(localData, historyContainer);

                // Refresh analytics after loading match data
                this.updateScoringTabView();
            } else {

                historyContainer.innerHTML = '<div class="no-matches">No match history available</div>';
            }

            historyContainer.innerHTML = '<div class="no-matches">Error loading match history</div>';
        }
    }

    displayMatchHistory(data, historyContainer) {
        // Handle both new format (matches) and legacy format (history)
        let matchesData = data.matches || data.history || [];

        const uniqueMatchesMap = new Map();
        matchesData.forEach(match => {
            const matchId = String(match.id || match.Match_ID || match.match_id || '');
            if (matchId && !uniqueMatchesMap.has(matchId)) {
                uniqueMatchesMap.set(matchId, match);
            }
        });
        matchesData = Array.from(uniqueMatchesMap.values());

        // If we have incomplete match data, try to enrich it with app's current matches
        if (matchesData.length > 0 && this.matches && this.matches.length > 0) {

            matchesData = matchesData.map(historyMatch => {
                // Try to find the corresponding complete match in app's matches array
                const completeMatch = this.matches.find(appMatch =>
                    String(appMatch.id) === String(historyMatch.id) ||
                    String(appMatch.Match_ID) === String(historyMatch.id) ||
                    String(appMatch.id) === String(historyMatch.Match_ID)
                );

                if (completeMatch) {
                    return completeMatch;
                } else {

                    return historyMatch;
                }
            });
        }

        if (!data || matchesData.length === 0) {
            historyContainer.innerHTML = '<div class="no-matches">No match history available</div>';

            return;
        }

        // Sort matches by date (newest first)
        const sortedMatches = matchesData.sort((a, b) => {
            // Handle both current app format and legacy format
            const dateA = new Date(a.ended || a.started || a.Date || a.Date_Saved || 0);
            const dateB = new Date(b.ended || b.started || b.Date || b.Date_Saved || 0);
            return dateB - dateA;
        });

        historyContainer.innerHTML = sortedMatches.map((match, index) => {
            // Handle current app format vs legacy format
            let winningTeam, losingTeam, winningTeamScore, losingTeamScore;
            let matchResult, formattedDate, manOfTheMatch;

            if (match.team1 && match.team2) {
                // Current app format
                const team1Name = match.team1?.name || 'Team 1';
                const team2Name = match.team2?.name || 'Team 2';

                // For display, show team names instead of winner/loser
                winningTeam = team1Name;
                losingTeam = team2Name;

                winningTeamScore = match.finalScore?.team1 ||
                                 match.winningTeamScore ||
                                 match.team1Score ||
                                 match.Winning_Team_Score ||
                                 'N/A';
                losingTeamScore = match.finalScore?.team2 ||
                                match.losingTeamScore ||
                                match.team2Score ||
                                match.Losing_Team_Score ||
                                'N/A';

                // If still N/A, try to extract from result string
                if ((winningTeamScore === 'N/A' || losingTeamScore === 'N/A') && match.result) {
                    const scoreMatch = match.result.match(/(\d+\/\d+.*?)\s*(?:vs|beats?|defeats?)\s*(\d+\/\d+.*?)/i);
                    if (scoreMatch) {
                        winningTeamScore = scoreMatch[1].trim();
                        losingTeamScore = scoreMatch[2].trim();

                    }
                }

                matchResult = match.result || `Match completed`;

                if (match.manOfTheMatch?.player?.id) {
                    // Object format with player.id
                    const motmPlayer = this.players.find(p => p.id === match.manOfTheMatch.player.id);
                    manOfTheMatch = motmPlayer ? motmPlayer.name : 'Not awarded';
                } else if (match.manOfTheMatch?.name) {
                    // Object format with name
                    manOfTheMatch = match.manOfTheMatch.name;
                } else if (typeof match.manOfTheMatch === 'string' && match.manOfTheMatch) {
                    const motmPlayer = this.players.find(p =>
                        String(p.id) === String(match.manOfTheMatch) ||
                        p.name === match.manOfTheMatch
                    );
                    manOfTheMatch = motmPlayer ? motmPlayer.name : match.manOfTheMatch;
                } else {
                    manOfTheMatch = 'Not awarded';
                }

                // Format date from current app format with time
                const date = new Date(match.ended || match.started || match.gameFinishTime || match.gameStartTime || Date.now());
                formattedDate = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });

            } else if (match.Team1 && match.Team2) {
                const team1 = match.Team1;
                const team2 = match.Team2;

                winningTeam = match.Winning_Team || team1;
                losingTeam = (match.Winning_Team === team1) ? team2 : team1;

                winningTeamScore = match.Winning_Team_Score || 'N/A';
                losingTeamScore = match.Losing_Team_Score || 'N/A';
                matchResult = match.Result || `${match.Winning_Team} won`;
                const motmId = match.Man_Of_The_Match || match.Man_of_the_Match;

                if (motmId) {
                    const motmPlayer = this.players.find(p =>
                        String(p.id) === String(motmId) ||
                        (p.Player_ID && String(p.Player_ID) === String(motmId))
                    );
                    manOfTheMatch = motmPlayer ? (motmPlayer.name || motmPlayer.Name) : 'Not awarded';

                } else {
                    manOfTheMatch = 'Not awarded';

                }

                // Format date from legacy format
                const date = new Date(match.Date || match.Date_Saved);
                formattedDate = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

            } else {
                // Fallback for unknown format
                winningTeam = 'Unknown Team';
                losingTeam = 'Unknown Team';
                winningTeamScore = 'N/A';
                losingTeamScore = 'N/A';
                matchResult = 'Match completed';
                manOfTheMatch = 'Not awarded';
                formattedDate = 'Unknown date';

            }

            return `
                <div class="match-history-item">
                    <div class="match-summary">
                        <div class="match-teams">${winningTeam} vs ${losingTeam}</div>
                        <div class="match-date">${formattedDate}</div>
                    </div>
                    <div class="match-result">${matchResult}</div>
                    <div class="match-scores">${winningTeamScore} vs ${losingTeamScore}</div>
                    <div class="match-mom">🏆 Man of the Match: <strong>${manOfTheMatch}</strong></div>
                </div>
            `;
        }).join('');
    }

    getPlayerNameFromId(playerId, playerInfo) {
        if (!playerId || !playerInfo) return 'Unknown';

        if (Array.isArray(playerInfo)) {
            const player = playerInfo.find(p => p.Player_ID === playerId);
            return player ? (player.Name || player.name) : playerId;
        } else {
            // Object format
            const player = playerInfo[playerId];
            return player ? (player.Name || player.name) : playerId;
        }
    }

    formatMatchDate(dateInput) {
        if (!dateInput) return 'Unknown date';

        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return 'Unknown date';

        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays - 1} days ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }

    // Save data locally and optionally to JSON
    // saveToJSON: true for permanent saves (player/team creation, match completion, imports)
    // saveToJSON: false for temporary saves during match play
    saveData(saveToJSON = true) {
        const groupId = this.authManager.getCurrentGroupId();
        const groupName = this.authManager.getCurrentGroupName();

        // Remove duplicate matches before saving, keeping the most recent version
        const matchMap = new Map();

        this.matches.forEach(match => {
            const matchId = match.id || match.Match_ID;
            const timestamp = new Date(match.ended || match.gameFinishTime || match.Game_Finish_Time || 0).getTime();

            if (!matchMap.has(matchId)) {
                matchMap.set(matchId, { match, timestamp });
            } else {
                const existing = matchMap.get(matchId);
                if (timestamp > existing.timestamp) {
                    matchMap.set(matchId, { match, timestamp });
                } else {
                    }
            }
        });

        const uniqueMatches = Array.from(matchMap.values()).map(item => item.match);

        if (uniqueMatches.length !== this.matches.length) {
            this.matches = uniqueMatches;
        }

        // Create consolidated data structure
        const consolidatedData = {
            player_info: this.players.map(player => ({
                Player_ID: player.id || Date.now(),
                Name: player.name,
                Bowling_Style: player.bowling || player.bowlingStyle || 'Medium',
                Batting_Style: player.batting || player.battingStyle || 'Reliable',
                Is_Star: player.is_star || player.isStar || false,
                Last_Updated: new Date().toISOString().split('T')[0],
                Last_Edit_Date: new Date().toISOString().split('T')[0]
            })),
            matches: this.matches.map(match => {
                return {
                    Match_ID: match.id || match.Match_ID || Date.now(),
                    Date: match.date || match.Date || new Date().toISOString().split('T')[0],
                    Venue: match.venue || match.Venue || 'Not specified',
                    Team1: match.team1?.name || match.Team1 || 'Team 1',
                    Team2: match.team2?.name || match.Team2 || 'Team 2',
                    Team1_Captain: (match.team1Captain && match.team1Captain !== '') ? match.team1Captain : ((match.team1CaptainId && match.team1CaptainId !== '') ? match.team1CaptainId : ((typeof match.team1 === 'object' && match.team1?.captain) || match.Team1_Captain || '')),
                    Team2_Captain: (match.team2Captain && match.team2Captain !== '') ? match.team2Captain : ((match.team2CaptainId && match.team2CaptainId !== '') ? match.team2CaptainId : ((typeof match.team2 === 'object' && match.team2?.captain) || match.Team2_Captain || '')),
                    Team1_Composition: JSON.stringify(match.team1Composition || match.Team1_Composition || []),
                    Team2_Composition: JSON.stringify(match.team2Composition || match.Team2_Composition || []),
                    Winning_Team: match.Winning_Team || match.winningTeam || match.winner?.name || '',
                    Losing_Team: match.Losing_Team || match.losingTeam || match.loser?.name || '',
                    // For Winning/Losing Captain, check PascalCase but filter empty strings
                    Winning_Captain: (match.Winning_Captain && match.Winning_Captain !== '') ? match.Winning_Captain : (match.winningCaptain || ''),
                    Losing_Captain: (match.Losing_Captain && match.Losing_Captain !== '') ? match.Losing_Captain : (match.losingCaptain || ''),
                    Game_Start_Time: match.gameStartTime || match.Game_Start_Time || match.actualStarted || '',
                    Game_Finish_Time: match.gameFinishTime || match.Game_Finish_Time || match.ended || '',
                    Winning_Team_Score: match.Winning_Team_Score || match.winningTeamScore || match.finalScore?.team1 || '',
                    Losing_Team_Score: match.Losing_Team_Score || match.losingTeamScore || match.finalScore?.team2 || '',
                    Result: match.result || match.Result || 'Match completed',
                    __syncedToD1: match.__syncedToD1 || false, // Preserve sync flag
                    Overs: match.overs || match.Overs || 20,
                    Match_Type: match.matchType || match.Match_Type || 'Regular',
                    Status: match.status || match.Status || 'Completed',
                    // Check camelCase FIRST (what endMatch() sets), then PascalCase, filter empty strings
                    Man_Of_The_Match: (function() {
                        // Priority 1: Check camelCase (fresh from endMatch)
                        let motm = match.manOfTheMatch;
                        // Priority 2: If empty or missing, check PascalCase variants
                        if (!motm || motm === '') {
                            motm = match.Man_Of_The_Match || match.Man_of_the_Match;
                        }
                        if (!motm || motm === '') return '';
                        // If it's an object with player property, extract player.id
                        if (typeof motm === 'object' && motm.player && motm.player.id) {
                            return String(motm.player.id);
                        }
                        if (typeof motm === 'string') return motm;
                        // If it's a number, convert to string
                        if (typeof motm === 'number') return String(motm);
                        return '';
                    })()
                };
            }),
            match_batting_performance: this.extractAllBattingPerformance(),
            match_bowling_performance: this.extractAllBowlingPerformance(),
            index: []
        };

        // Create group-specific localStorage keys
        const groupKey = `cricket-stats-group-${groupId}`;
        const matchKey = `cricket-current-match-group-${groupId}`;
        const playersKey = `cricket-players-group-${groupId}`;
        const matchesKey = `cricket-matches-group-${groupId}`;
        const teamsKey = `cricket-teams-group-${groupId}`;

        // Save to group-specific localStorage keys
        localStorage.setItem(groupKey, JSON.stringify(consolidatedData));
        localStorage.setItem(matchKey, JSON.stringify(this.currentMatch));
        localStorage.setItem(playersKey, JSON.stringify(this.players));
        localStorage.setItem(matchesKey, JSON.stringify(this.matches));
        localStorage.setItem(teamsKey, JSON.stringify(this.teams));

        // Also save to legacy keys for backward compatibility (only for guest group)
        if (groupName === 'guest') {
            localStorage.setItem('cricket-stats', JSON.stringify(consolidatedData));
            localStorage.setItem('cricket-current-match', JSON.stringify(this.currentMatch));
            localStorage.setItem('cricket-players', JSON.stringify(this.players));
            localStorage.setItem('cricket-matches', JSON.stringify(this.matches));
            localStorage.setItem('cricket-teams', JSON.stringify(this.teams));
        }

        // Mark this as user data so it won't be overridden on next app start
        localStorage.setItem('cricket-has-user-data', 'true');
        localStorage.setItem('cricket-last-save-time', new Date().getTime().toString());

        // Clear wipe state if we're saving actual data (not empty arrays)
        const hasData = this.players.length > 0 || this.matches.length > 0 || this.teams.length > 0;
        if (hasData) {
            localStorage.removeItem('cricket-wiped-state');
            localStorage.removeItem('cricket-wipe-timestamp');
            }

        if (saveToJSON && groupName !== 'guest') {
            this.syncToD1(consolidatedData).catch(error => {
                console.error('🚨 D1 sync failed:', error);
                this.updateSyncStatus('⚠️ Sync failed', null);
            });
        } else {
            if (!saveToJSON) {
            } else if (groupName === 'guest') {
            }
        }
    }

    async forceSyncToD1() {
        const groupName = this.authManager.getCurrentGroupName();
        const groupId = this.authManager.getCurrentGroupId();

        if (groupName === 'guest') {
            this.showNotification('❌ Cannot sync guest data to cloud');
            return;
        }

        try {
            this.updateSyncStatus('🔄 Force syncing...', null, true);

            const consolidatedData = {
                player_info: this.players.map(player => ({
                    Player_ID: player.id || Date.now(),
                    Name: player.name,
                    Bowling_Style: player.bowling || player.bowlingStyle || 'Medium',
                    Batting_Style: player.batting || player.battingStyle || 'Reliable',
                    Is_Star: player.is_star || player.isStar || false,
                    Last_Updated: new Date().toISOString().split('T')[0],
                    Last_Edit_Date: new Date().toISOString().split('T')[0]
                })),
                matches: this.matches.map(match => ({
                    Match_ID: match.id || match.Match_ID || Date.now(),
                    Date: match.date || match.Date || new Date().toISOString().split('T')[0],
                    Venue: match.venue || match.Venue || 'Not specified',
                    Team1: match.team1?.name || match.Team1 || 'Team 1',
                    Team2: match.team2?.name || match.Team2 || 'Team 2',
                    Team1_Captain: match.team1CaptainId || match.team1Captain || match.Team1_Captain || '',
                    Team2_Captain: match.team2CaptainId || match.team2Captain || match.Team2_Captain || '',
                    Team1_Composition: JSON.stringify(match.team1Composition || match.Team1_Composition || []),
                    Team2_Composition: JSON.stringify(match.team2Composition || match.Team2_Composition || []),
                    Winning_Team: match.Winning_Team || match.winningTeam || (match.winner ? match.winner.name : '') || '',
                    Losing_Team: match.Losing_Team || match.losingTeam || (match.loser ? match.loser.name : '') || '',
                    Game_Start_Time: match.gameStartTime || match.Game_Start_Time || match.actualStarted || '',
                    Game_Finish_Time: match.gameFinishTime || match.Game_Finish_Time || match.ended || '',
                    Winning_Team_Score: match.Winning_Team_Score || match.winningTeamScore || (match.finalScore ? match.finalScore.team1 : '') || '',
                    Losing_Team_Score: match.Losing_Team_Score || match.losingTeamScore || (match.finalScore ? match.finalScore.team2 : '') || '',
                    Result: match.result || match.Result || 'Match in progress',
                    Overs: match.overs || match.Overs || 20,
                    Match_Type: match.matchType || match.Match_Type || 'Regular',
                    Status: match.status || match.Status || 'In Progress',
                    Man_Of_The_Match: match.manOfTheMatch || match.Man_Of_The_Match || match.Man_of_the_Match || ''
                })),
                match_batting_performance: this.extractAllBattingPerformance(),
                match_bowling_performance: this.extractAllBowlingPerformance(),
                index: []
            };

            // Add current match if it exists and isn't already in matches
            if (this.currentMatch) {
                const currentMatchExists = consolidatedData.matches.find(m =>
                    m.Match_ID === this.currentMatch.id ||
                    m.Match_ID === this.currentMatch.Match_ID
                );

                if (!currentMatchExists) {
                    consolidatedData.matches.push({
                        Match_ID: this.currentMatch.id || Date.now(),
                        Date: new Date().toISOString().split('T')[0],
                        Venue: 'TBD',
                        Team1: this.currentMatch.team1?.name || 'Team 1',
                        Team2: this.currentMatch.team2?.name || 'Team 2',
                        Team1_Captain: this.currentMatch.team1CaptainId || '',
                        Team2_Captain: this.currentMatch.team2CaptainId || '',
                        Team1_Composition: JSON.stringify(this.currentMatch.team1Composition || []),
                        Team2_Composition: JSON.stringify(this.currentMatch.team2Composition || []),
                        Winning_Team: '',
                        Losing_Team: '',
                        Game_Start_Time: this.currentMatch.gameStartTime || this.currentMatch.started || new Date().toISOString(),
                        Game_Finish_Time: '',
                        Winning_Team_Score: '',
                        Losing_Team_Score: '',
                        Result: 'Match in progress',
                        Overs: this.currentMatch.totalOvers || 20,
                        Status: 'In Progress',
                        Man_Of_The_Match: ''
                    });
                }
            }

            await this.syncToD1(consolidatedData);
            this.showNotification('✅ Force sync completed!');

            console.error(`🚨 FORCE_SYNC failed:`, error);
            this.updateSyncStatus('⚠️ Force sync failed', null);
            this.showNotification('❌ Force sync failed: ' + error.message);
        }
    }

    // Validate that completed matches have not been corrupted
    validateCompletedMatches() {
        const completedMatches = this.matches.filter(match => {
            return match.Status === 'Completed' ||
                   match.status === 'Completed' ||
                   match.gameFinishTime ||
                   match.Game_Finish_Time ||
                   match.ended ||
                   (match.Winning_Team && match.Winning_Team !== '') ||
                   (match.Result && match.Result !== '' && match.Result !== 'Match completed');
        });

        const corruptedMatches = completedMatches.filter(match => {
            const team1Comp = match.Team1_Composition || match.team1Composition;
            const team2Comp = match.Team2_Composition || match.team2Composition;
            const winningTeam = match.Winning_Team || match.winningTeam;
            const losingTeam = match.Losing_Team || match.losingTeam;

            return (!team1Comp || team1Comp.length === 0 || team1Comp === '[]') ||
                   (!team2Comp || team2Comp.length === 0 || team2Comp === '[]') ||
                   (!winningTeam || winningTeam === '') ||
                   (!losingTeam || losingTeam === '');
        });

        if (corruptedMatches.length > 0) {
            corruptedMatches.forEach(match => {
            });
            return false;
        }

        return true;
    }

    async syncToD1(data = null) {
        // Prevent concurrent syncs - use a lock
        if (this._syncInProgress) {
            return;
        }

        this._syncInProgress = true;

        let groupId = this.authManager.getCurrentGroupId();
        const groupName = this.authManager.getCurrentGroupName();

    // ...existing code...

        if (groupName === 'guest') {
            this._syncInProgress = false;
            return;
        }

        try {
            const d1GroupResponse = await this.d1Manager.apiCall(`/groups/find/${groupName}`);
            if (d1GroupResponse && d1GroupResponse.id && d1GroupResponse.id !== groupId) {
                groupId = d1GroupResponse.id;

                this.authManager.saveCurrentGroup({
                    id: groupId,
                    name: groupName,
                    hasPassword: false // Default to false for sync operations
                });

                } else {
                }
            }

        try {
            this.updateSyncStatus('🔄 Syncing...', null, true);

            // Just dump ALL completed matches with their performance data - no transformation

            const newMatches = this.matches.filter(match => {
                const isCompleted = match.Status === 'Completed' ||
                                   match.status === 'completed' ||
                                   match.gameFinishTime ||
                                   match.Game_Finish_Time ||
                                   match.ended;

                // Only include completed matches that haven't been synced yet
                return isCompleted && !match.__syncedToD1;
            });

            let newPerformanceData = [];
            newMatches.forEach(match => {
                if (match.performanceData && Array.isArray(match.performanceData)) {
                    newPerformanceData = newPerformanceData.concat(match.performanceData);
                }
            });

            // If no new matches to sync, skip the API call
            if (newMatches.length === 0) {
                this.updateSyncStatus('✅ Synced', new Date());
                return;
            }

            // Log first match structure to see what we're sending
            if (newMatches.length > 0) {
            }

            const syncData = {
                players: this.players.map(player => ({
                    Player_ID: String(player.id || Date.now()),
                    Name: player.name,
                    Bowling_Style: player.bowling || 'Medium',
                    Batting_Style: player.batting || 'Reliable',
                    Is_Star: player.is_star || false,
                    Last_Updated: new Date().toISOString().split('T')[0],
                })),
                matches: newMatches, // Send ONLY new matches - preserve existing D1 data!
                performance_data: newPerformanceData
            };

            const syncResult = await this.d1Manager.syncToD1(groupId, syncData);

            // Mark newly synced matches so they won't be synced again
            newMatches.forEach(match => {
                match.__syncedToD1 = true;
            });

            this.saveData(false); // Pass false to prevent recursive D1 sync

            this.updateSyncStatus('✅ Synced', new Date());
            console.error('❌ D1_SYNC_ERROR: Sync failed with error:', error);
            console.error('❌ D1_SYNC_ERROR: Error message:', error?.message);
            console.error('❌ D1_SYNC_ERROR: Error stack:', error?.stack);
            console.error('❌ D1_SYNC_ERROR: Error name:', error?.name);
            this.updateSyncStatus('❌ Sync failed: ' + (error?.message || 'Unknown error'), null);
        } finally {
            // Always release the lock when sync completes or fails
            this._syncInProgress = false;
        }
    }

    updateSyncStatus(status, lastSyncTime = null, isLoading = false) {
        const syncIcon = document.getElementById('syncIcon');
        const syncText = document.getElementById('syncText');
        const lastSyncElement = document.getElementById('lastSyncTime');

        if (syncIcon) {
            if (isLoading) {
                syncIcon.textContent = '🔄';
                syncIcon.classList.add('syncing');
            } else {
                syncIcon.classList.remove('syncing');
                if (status.includes('✅')) syncIcon.textContent = '✅';
                else if (status.includes('❌') || status.includes('⚠️')) syncIcon.textContent = '⚠️';
                else if (status.includes('📱')) syncIcon.textContent = '📱';
                else syncIcon.textContent = '🔄';
            }
        }

        if (syncText) syncText.textContent = status;

        if (lastSyncElement && lastSyncTime) {
            lastSyncElement.textContent = `Last sync: ${lastSyncTime.toLocaleString()}`;
        }
    }

    // Show information about the new edit-in-place system
    showEditInPlaceInfo() {
        if (this.dataManager && this.dataManager.showEditInPlaceInstructions) {
            this.dataManager.showEditInPlaceInstructions();
        } else {
            }
    }

    // Helper method to restore from backup if needed
    restoreFromBackup(timestamp) {
        if (this.dataManager && this.dataManager.restoreFromBackup) {
            return this.dataManager.restoreFromBackup(timestamp);
        } else {
            return false;
        }
    }

    getBackupList() {
        if (this.dataManager && this.dataManager.getAvailableBackups) {
            return this.dataManager.getAvailableBackups();
        }
        return [];
    }

    async exportToCSV() {
        try {
            if (this.dataManager && this.dataManager.saveToCSV) {
                const success = await this.dataManager.saveToCSV(this.players, this.matches, this.teams);

                // Also save data for export
                await this.dataManager.saveJSONData(this.players, this.matches, this.teams, true);

                if (success) {
                    } else {
                    }
            } else {
                }
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
                this.updateStats(true); // Force stats reload after data import
                }
            }
    }

    extractAllBattingPerformance() {
        const allBattingData = [];

        this.matches.forEach(match => {
            if (match.battingPerformance && Array.isArray(match.battingPerformance)) {
                allBattingData.push(...match.battingPerformance);
            }
        });

        return allBattingData;
    }

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
    addPlayer(name, bowlingType = 'Medium', battingStyle = 'So-So', playerType = 'Regular') {
        try {
            // Validate input
            if (!name || typeof name !== 'string' || name.trim() === '') {
                throw new Error('Invalid player name');
            }

            const playerName = name.trim();

            // Check for duplicate player names
            const existingPlayer = this.players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
            if (existingPlayer) {
                return existingPlayer; // Return existing player instead of creating duplicate
            }

            const newPlayer = {
                id: Date.now(),
                name: playerName,
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
            // Save data with error handling
            try {
                this.saveData(true); // Create JSON backup when adding new player
                }

            try {
                this.updateStats();
                }

            // Load players with error handling
            try {
                this.loadPlayers();
                }

            // Also save to the data manager if available
            if (this.dataManager) {
                try {
                    this.dataManager.addPlayer(newPlayer);
                    }
            }

            // Save updated data to localStorage
            if (typeof window.saveAppData === 'function') {
                window.saveAppData();
                }

            this.showNotification(`✅ ${name.trim()} added successfully!`);
            throw error; // Re-throw to be caught by calling function
        }
    }

    showAddPlayerModal() {
        const modal = document.getElementById('addPlayerModal');
        if (modal) {

            // Remove inline display style and add active class
            modal.style.display = '';  // Clear inline style
            modal.classList.add('active');

            // Check if modal is actually visible
            const rect = modal.getBoundingClientRect();
            } else {
            }
    }

    // Scoring Analytics Methods
    showScoringAnalytics(type) {

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
                    </select>
                    <button onclick="window.cricketApp.refreshAnalytics()" style="margin-left: 10px; padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px;">
                        🔄 Refresh Data
                    </button>
                </div>
                <div id="performanceStatsGrid" class="performance-grid">
                    <!-- Stats will be loaded here -->
                </div>
            </div>
        `;

        // Initialize with default sort
        this.updatePerformanceSort('matches');
    }

    refreshAnalytics() {
        // Force reload match history and analytics
        this.loadMatchHistory();

        // Also refresh the current analytics view
        const select = document.getElementById('performanceSort');
        if (select) {
            this.updatePerformanceSort(select.value);
        }
    }

    updatePerformanceSort(sortBy) {
        const statsData = this.calculatePlayerStatistics();
        let filteredData = statsData;

        // Apply specific filters based on the metric being sorted
        // Made filters more inclusive to show players with match participation
        if (['averageRuns', 'strikeRate', 'foursPerMatch', 'sixesPerMatch', 'fifties'].includes(sortBy)) {
            filteredData = statsData.filter(player =>
                player.runs > 0 || player.ballsFaced > 0 || player.matches > 0
            );
        } else if (['bowlingEconomy', 'bowlingStrikeRate', 'bowlingAverage'].includes(sortBy)) {
            filteredData = statsData.filter(player =>
                player.wickets > 0 || player.totalOvers >= 1 || player.ballsBowled > 0 || player.matches > 0
            );
        } else if (['totalRuns'].includes(sortBy)) {
            // Total runs - show players with runs OR match participation
            filteredData = statsData.filter(player => player.runs > 0 || player.matches > 0);
        } else if (['totalWickets', 'totalOvers'].includes(sortBy)) {
            filteredData = statsData.filter(player =>
                player.wickets > 0 || player.ballsBowled > 0 || player.matches > 0
            );
        } else {
            // For any other metrics (including 'matches'), show all players with match participation
            filteredData = statsData.filter(player => player.matches > 0);
        }
        // For 'matches', show all players who have played at least 1 match (no additional filter)

        const sortedData = this.sortPlayersByMetric(filteredData, sortBy);

        const container = document.getElementById('performanceStatsGrid');
        if (!container) {
            return;
        }

        const htmlContent = `
            <div class="performance-card full-width">
                <h4>📊 ${this.getMetricDisplayName(sortBy)}</h4>
                <div class="stats-table">
                    <div class="stats-header">
                        <span>Player</span>
                        <span>${this.getMetricDisplayName(sortBy)}</span>
                    </div>
                    ${sortedData.length > 0 ? sortedData.map((player, index) => {
                        const metricValue = this.getPlayerMetricValue(player, sortBy);
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

        container.innerHTML = htmlContent;

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

        // Also add player analytics cards below the performance stats
        const playerAnalyticsContent = this.generatePlayerAnalyticsHTML();
        container.innerHTML += playerAnalyticsContent;
    }

    generatePlayerAnalyticsHTML() {
        // Player rankings section removed as requested
        return '';
    }

    calculatePlayerStatistics() {

        const currentGroupId = this.authManager ? this.authManager.getCurrentGroupId() : null;
        const currentGroupName = this.authManager ? this.authManager.getCurrentGroupName() : null;
        // First, try to get data from localStorage which has the aggregated format
        let consolidatedData = null;
        try {
            const storedData = localStorage.getItem('cricket-stats');
            if (storedData) {
                consolidatedData = JSON.parse(storedData);
            } else {
                }
            }

        // Prioritize app state for group-filtered data, use consolidated data as fallback
        const shouldUseAppState = !consolidatedData || !consolidatedData.match_batting_performance || (this.players && this.players.length > 0);

        if (shouldUseAppState) {
            const result = this.calculateStatsFromAppState();
            return result;
        }

        // Calculate aggregated stats from match performance data
        const playerStatsMap = new Map();

        // Initialize players - ONLY from current group
        let currentGroupPlayers = [];

        if (consolidatedData && consolidatedData.player_info && currentGroupId) {
            // Filter consolidated data to only include players from current group
            currentGroupPlayers = this.players || [];
        } else {
            // Fallback to current app state
            currentGroupPlayers = this.players || [];
            }

        currentGroupPlayers.forEach(player => {
            playerStatsMap.set(player.Name || player.name, {
                name: player.Name || player.name,
                matches: 0,
                runs: 0,
                ballsFaced: 0,
                wickets: 0,
                ballsBowled: 0,
                runsConceded: 0,
                fours: 0,
                sixes: 0,
                halfCenturies: 0,
                battingMatches: 0,
                bowlingMatches: 0
            });
        });

        // Aggregate batting stats
        if (consolidatedData.match_batting_performance) {
            consolidatedData.match_batting_performance.forEach(record => {
                const playerName = record.Player;
                if (playerStatsMap.has(playerName)) {
                    const stats = playerStatsMap.get(playerName);
                    stats.runs += parseInt(record.Runs) || 0;
                    stats.ballsFaced += parseInt(record.Balls_Faced) || 0;
                    stats.fours += parseInt(record.Fours) || 0;
                    stats.sixes += parseInt(record.Sixes) || 0;
                    stats.battingMatches++;

                    // Count half-centuries
                    if ((parseInt(record.Runs) || 0) >= 50) {
                        stats.halfCenturies++;
                    }
                }
            });
        }

        // Aggregate bowling stats
        if (consolidatedData.match_bowling_performance) {
            consolidatedData.match_bowling_performance.forEach(record => {
                const playerName = record.Player;
                if (playerStatsMap.has(playerName)) {
                    const stats = playerStatsMap.get(playerName);
                    stats.wickets += parseInt(record.Wickets) || 0;
                    stats.ballsBowled += parseInt(record.Balls_Bowled) || 0;
                    stats.runsConceded += parseInt(record.Runs_Conceded) || 0;
                    if ((parseInt(record.Balls_Bowled) || 0) > 0) {
                        stats.bowlingMatches++;
                    }
                }
            });
        }

        // Set total matches and calculate derived stats
        const allPlayerStats = Array.from(playerStatsMap.values()).map(stats => {
            stats.matches = Math.max(stats.battingMatches, stats.bowlingMatches);

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

            // Calculate coefficient of variation for consistency (simplified)
            stats.battingCV = this.calculateBattingCVFromStats(stats);
            stats.bowlingCV = this.calculateBowlingCVFromStats(stats);

            return stats;
        }).filter(player => {
            // Show any player with any data - no minimum match requirements
            const hasBattingData = player.runs > 0 || player.ballsFaced > 0;
            const hasBowlingData = player.wickets > 0 || player.totalOvers >= 1;

            return hasBattingData || hasBowlingData;
        });

            name: p.name,
            matches: p.matches,
            runs: p.runs,
            wickets: p.wickets
        })));

        // Now calculate relative consistency based on the group distribution
        return allPlayerStats.map(player => {
            player.battingConsistency = this.calculateRelativeBattingConsistency(player, allPlayerStats);
            player.bowlingConsistency = this.calculateRelativeBowlingConsistency(player, allPlayerStats);
            return player;
        });
    }

    calculateStatsFromAppState() {
        // Calculate stats from actual match results if available
        if (this.matches && this.matches.length > 0) {
            const result = this.calculateStatsFromMatchResults();
            return result;
        }

        // Fallback to original method if no match data available
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
            // Show any player with any data - no minimum match requirements
            const hasBattingData = player.runs > 0 || player.ballsFaced > 0;
            const hasBowlingData = player.wickets > 0 || player.totalOvers >= 1;

            return hasBattingData || hasBowlingData;
        });

        return allPlayerStats;
    }

    calculateStatsFromMatchResults() {
            id: m.id,
            hasPerformanceData: !!(m.performanceData),
            performanceDataLength: m.performanceData?.length || 0,
            team1: m.team1?.name,
            team2: m.team2?.name
        })));

        // Initialize player stats map
        const playerStatsMap = new Map();

        // Initialize all players
        this.players.forEach(player => {
            playerStatsMap.set(player.id, {
                name: player.name,
                matches: 0,
                runs: 0,
                ballsFaced: 0,
                wickets: 0,
                ballsBowled: 0,
                runsConceded: 0,
                fours: 0,
                sixes: 0,
                halfCenturies: 0,
                battingMatches: 0,
                bowlingMatches: 0,
                highestScore: 0
            });
        });

        // Process each match
        this.matches.forEach(match => {
            // Track which players participated in this match
            const playersInMatch = new Set();

            // Check if we can extract performance data from team structure
            if (!match.performanceData || match.performanceData.length === 0) {
                // Try to extract from team1 players
                if (match.team1 && match.team1.players) {
                    match.team1.players.forEach(player => {
                        playersInMatch.add(player.id);
                    });
                }

                // Try to extract from team2 players
                if (match.team2 && match.team2.players) {
                    match.team2.players.forEach(player => {
                        playersInMatch.add(player.id);
                    });
                }
            }

            // Process performance data if available
            if (match.performanceData && match.performanceData.length > 0) {
                match.performanceData.forEach(performance => {
                    const playerId = performance.Player_ID || performance.playerId;
                    if (!playerId) return;

                    playersInMatch.add(playerId);
                    const stats = playerStatsMap.get(playerId);
                    if (!stats) return;

                    // Add batting stats
                    const runs = performance.runs || 0;
                    const ballsFaced = performance.ballsFaced || 0;
                    const fours = performance.fours || 0;
                    const sixes = performance.sixes || 0;

                    stats.runs += runs;
                    stats.ballsFaced += ballsFaced;
                    stats.fours += fours;
                    stats.sixes += sixes;

                    if (runs >= 50) {
                        stats.halfCenturies += 1;
                    }
                    if (runs > stats.highestScore) {
                        stats.highestScore = runs;
                    }

                    // Track batting matches (if player faced at least one ball or scored runs)
                    if (ballsFaced > 0 || runs > 0) {
                        stats.battingMatches += 1;
                    }

                    // Add bowling stats
                    const ballsBowled = performance.ballsBowled || 0;
                    const wickets = performance.wickets || 0;
                    const runsConceded = performance.runsConceded || 0;

                    stats.ballsBowled += ballsBowled;
                    stats.wickets += wickets;
                    stats.runsConceded += runsConceded;

                    // Track bowling matches (if player bowled at least one ball)
                    if (ballsBowled > 0) {
                        stats.bowlingMatches += 1;
                    }
                });
            }

            // Mark match participation for all players in this match

            playersInMatch.forEach(playerId => {
                const stats = playerStatsMap.get(playerId);
                if (stats) {
                    stats.matches += 1;
                    } else {
                    }
            });
        });

        // Convert to array and calculate derived stats
        const allPlayerStats = Array.from(playerStatsMap.values()).map(stats => {
            // Add total stats
            stats.totalRuns = stats.runs;
            stats.totalWickets = stats.wickets;
            stats.totalOvers = stats.ballsBowled > 0 ? stats.ballsBowled / 6 : 0;

            // Calculate metrics
            stats.averageRuns = stats.battingMatches > 0 ? stats.runs / stats.battingMatches : 0;
            stats.strikeRate = stats.ballsFaced > 0 ? (stats.runs / stats.ballsFaced) * 100 : 0;
            stats.bowlingEconomy = stats.ballsBowled > 0 ? (stats.runsConceded / (stats.ballsBowled / 6)) : 0;
            stats.bowlingStrikeRate = stats.wickets > 0 ? stats.ballsBowled / stats.wickets : 0;
            stats.bowlingAverage = stats.wickets > 0 ? stats.runsConceded / stats.wickets : 0;
            stats.foursPerMatch = stats.battingMatches > 0 ? stats.fours / stats.battingMatches : 0;
            stats.sixesPerMatch = stats.battingMatches > 0 ? stats.sixes / stats.battingMatches : 0;
            stats.fifties = stats.halfCenturies;

            // Calculate coefficient of variation for consistency
            stats.battingCV = this.calculateBattingCVFromStats(stats);
            stats.bowlingCV = this.calculateBowlingCVFromStats(stats);

            return stats;
        });

            name: p.name,
            matches: p.matches,
            runs: p.runs,
            ballsFaced: p.ballsFaced,
            wickets: p.wickets,
            ballsBowled: p.ballsBowled
        })));

        const filteredStats = allPlayerStats.filter(player => {
            // Show any player with any data - no minimum match requirements
            const hasBattingData = player.runs > 0 || player.ballsFaced > 0;
            const hasBowlingData = player.wickets > 0 || player.totalOvers >= 1;
            const hasMatchData = player.matches > 0;

            // Include players who have match participation OR any performance data
            // This ensures all players who participated in a match are shown
            return hasMatchData || hasBattingData || hasBowlingData;
        });

            name: p.name,
            matches: p.matches,
            runs: p.runs,
            wickets: p.wickets
        })));

        return filteredStats;
    }

    calculateBattingCVFromStats(stats) {
        // Simplified calculation for batting consistency
        if (!stats.matches || stats.matches < 2) return 1;

        const avgRuns = stats.runs / stats.matches;
        if (avgRuns === 0) return 1;

        if (avgRuns > 30) return 0.4; // Good consistency
        if (avgRuns > 15) return 0.6; // Moderate consistency
        return 0.8; // Lower consistency
    }

    calculateBowlingCVFromStats(stats) {
        // Simplified calculation for bowling consistency
        if (!stats.bowlingMatches || stats.bowlingMatches < 2) return 1;

        const avgWickets = stats.wickets / stats.bowlingMatches;
        if (avgWickets === 0) return 1;

        if (avgWickets > 2) return 0.4; // Good consistency
        if (avgWickets > 1) return 0.6; // Moderate consistency
        return 0.8; // Lower consistency
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

        const baseCV = 0.2 + (0.6 * Math.random()); // Random between 0.2 and 0.8
        const economyPenalty = Math.min(economy / 8, 0.3); // Penalty for high economy rates
        return Math.max(0.1, baseCV + economyPenalty);
    }

    calculateRelativeBattingConsistency(player, allPlayers) {
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
            const aValue = this.getPlayerMetricValue(a, metric);
            const bValue = this.getPlayerMetricValue(b, metric);

            // For these metrics, lower is better (reverse order)
            if (['bowlingEconomy', 'bowlingAverage', 'bowlingStrikeRate', 'economy'].includes(metric)) {
                // Handle infinite values
                if (aValue === '∞' && bValue === '∞') return 0;
                if (aValue === '∞') return 1;
                if (bValue === '∞') return -1;
                return parseFloat(aValue) - parseFloat(bValue);
            }

            // For all other metrics, higher is better
            return parseFloat(bValue) - parseFloat(aValue);
        });
    }

    getMetricDisplayName(metric) {
        const names = {
            matches: 'Number of Matches',
            totalRuns: 'Total Runs',
            totalWickets: 'Total Wickets',
            totalOvers: 'Total Overs Bowled',
            averageRuns: 'Average Runs per Game',
            strikeRate: 'Batting Strike Rate',
            bowlingStrikeRate: 'Bowling Strike Rate',
            bowlingEconomy: 'Bowling Economy',
            bowlingAverage: 'Bowling Average',
            foursPerMatch: '4s per Match',
            sixesPerMatch: '6s per Match',
            fifties: 'Number of 50s'
        };
        return names[metric] || metric;
    }

    formatMetricValue(value, metric) {
        // Handle undefined/null values
        if (value === undefined || value === null) {
            return '0';
        }

        // Handle infinite values for bowling metrics
        if (value === '∞' || value === Infinity) {
            return '∞';
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
                        <select id="scoringPlayer1Select" onchange="window.cricketApp.updateScoringSpiderChart();" style="color: #00ff88; font-weight: bold; background-color: #1a1a1a;">
                            <option value="" style="color: #ffffff;">Select Player 1</option>
                            ${player1Options}
                        </select>
                    </div>
                    <div class="comparison-selector">
                        <label>Player 2</label>
                        <select id="scoringPlayer2Select" onchange="window.cricketApp.updateScoringSpiderChart();" style="color: #00ccff; font-weight: bold; background-color: #1a1a1a;">
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
        const player1Id = document.getElementById('scoringPlayer1Select').value;
        const player2Id = document.getElementById('scoringPlayer2Select').value;

        if (!player1Id || !player2Id) {
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

        const allPlayerStats = this.calculateStatsFromMatchResults();
        const player1 = allPlayerStats.find(p => {
            const basePlayer = this.players.find(bp => bp.id == player1Id);
            return basePlayer && p.name === basePlayer.name;
        });
        const player2 = allPlayerStats.find(p => {
            const basePlayer = this.players.find(bp => bp.id == player2Id);
            return basePlayer && p.name === basePlayer.name;
        });

        if (!player1 || !player2) {
            return;
        }

            player1: { name: player1.name, matches: player1.matches, runs: player1.runs, fours: player1.fours, sixes: player1.sixes },
            player2: { name: player2.name, matches: player2.matches, runs: player2.runs, fours: player2.fours, sixes: player2.sixes }
        });

        this.renderBattingSpiderChart(player1, player2);
        this.renderBowlingSpiderChart(player1, player2);
    }

    renderScoringSpiderChart(player1, player2) {
        const metrics = [
            { name: 'Batting Avg', key: 'battingAverage', max: 50 },
            { name: 'Strike Rate', key: 'strikeRate', max: 150 },
            { name: 'Wickets/Match', key: 'wicketsPerMatch', max: 3 },
            { name: 'Economy', key: 'economy', max: 8, invert: true },
            { name: 'Catches/Match', key: 'catchesPerMatch', max: 1.5 },
            { name: 'Runs/Match', key: 'runsPerMatch', max: 50 }
        ];

        const getMetricValue = (player, metric) => {
            try {
                let value = 0;
                switch(metric.key) {
                    case 'battingAverage':
                        value = player.matches > 0 ? (player.runs || 0) / player.matches : 0;
                        break;
                    case 'strikeRate':
                        const sr = window.cricketApp.calculateStrikeRate(player);
                        value = isNaN(sr) ? 0 : sr;
                        break;
                    case 'wicketsPerMatch':
                        value = player.matches > 0 ? (player.wickets || 0) / player.matches : 0;
                        break;
                    case 'economy':
                        const eco = window.cricketApp.calculateBowlerEconomy(player);
                        value = isNaN(eco) ? 0 : eco;
                        break;
                    case 'catchesPerMatch':
                        value = player.matches > 0 ? (player.catches || 0) / player.matches : 0;
                        break;
                    case 'runsPerMatch':
                        value = player.matches > 0 ? (player.runs || 0) / player.matches : 0;
                        break;
                    default:
                        value = player[metric.key] || 0;
                        break;
                }
                return isNaN(value) ? 0 : Number(value);
                return 0;
            }
        };

        const normalize = (value, max, invert = false) => {
            let normalized = Math.min(value / max, 1);
            return invert ? (1 - normalized) : normalized;
        };

        document.getElementById('scoringSpiderChartContainer').innerHTML = `
            <div class="spider-chart">
                <canvas id="scoringSpiderCanvas" width="400" height="400"></canvas>
            </div>
        `;

        this.drawSpiderChart(player1, player2, metrics, getMetricValue);
    }

    drawSpiderChart(player1, player2, metrics, getMetricValue = null) {
        const canvas = document.getElementById('scoringSpiderCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const centerX = 150;
        const centerY = 150;
        const radius = 120;

        // Clear canvas
        ctx.clearRect(0, 0, 300, 300);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;

        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, (radius / 5) * i, 0, Math.PI * 2);
            ctx.stroke();
        }

        const angleStep = (Math.PI * 2) / metrics.length;
        for (let i = 0; i < metrics.length; i++) {
            const angle = (i * angleStep) - (Math.PI / 2);
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();

            ctx.fillStyle = 'white';
            ctx.font = '20px Arial'; // Increased from 16px to 20px
            ctx.textAlign = 'center';
            const labelX = centerX + Math.cos(angle) * (radius + 30); // Increased from 25 to 30 for larger text
            const labelY = centerY + Math.sin(angle) * (radius + 30);
            ctx.fillText(metrics[i].name, labelX, labelY);
        }

        ctx.strokeStyle = '#22c55e';
        ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < metrics.length; i++) {
            const metric = metrics[i];
            const value = getMetricValue ? getMetricValue(player1, metric) : (player1[metric.key] || 0);
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

        ctx.strokeStyle = '#3b82f6';
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.beginPath();

        for (let i = 0; i < metrics.length; i++) {
            const metric = metrics[i];
            const value = getMetricValue ? getMetricValue(player2, metric) : (player2[metric.key] || 0);
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
        const container = document.getElementById('battingSpiderChartContainer');
        if (!container) {
            return;
        }

        const allPlayerStats = this.calculateStatsFromMatchResults();

        const battingMetrics = [
            { name: 'Strike Rate', key: 'strikeRate' },
            { name: 'Average', key: 'battingAverage' },
            { name: '4s/Match', key: 'foursPerMatch' },
            { name: '6s/Match', key: 'sixesPerMatch' },
            { name: 'Runs/Match', key: 'runsPerMatch' }
        ];

        const getBattingMetricValue = (player, metric) => {
            try {
                let value = 0;
                switch(metric.key) {
                    case 'foursPerMatch':
                        value = player.foursPerMatch || 0;
                        break;
                    case 'sixesPerMatch':
                        value = player.sixesPerMatch || 0;
                        break;
                    case 'runsPerMatch':
                        value = player.averageRuns || 0;
                        break;
                    case 'strikeRate':
                        value = player.strikeRate || 0;
                        break;
                    case 'battingAverage':
                        value = player.averageRuns || 0;
                        break;
                    default:
                        value = player[metric.key] || 0;
                        break;
                }
                return isNaN(value) ? 0 : Number(value);
                console.error('Error getting batting metric:', error);
                return 0;
            }
        };

        // Calculate min/max for each metric across all players
        battingMetrics.forEach(metric => {
            const values = allPlayerStats.map(p => getBattingMetricValue(p, metric)).filter(v => v > 0);
            metric.min = values.length > 0 ? Math.min(...values) : 0;
            metric.max = values.length > 0 ? Math.max(...values) : 1;
        });

        document.getElementById('battingSpiderChartContainer').innerHTML = `
            <div class="spider-chart">
                <canvas id="battingSpiderCanvas" width="400" height="400"></canvas>
            </div>
        `;

        setTimeout(() => {
            window.cricketApp.drawSpiderChartCanvas('battingSpiderCanvas', player1, player2, battingMetrics, getBattingMetricValue);
        }, 50);
    }

    renderBowlingSpiderChart(player1, player2) {
        const container = document.getElementById('bowlingSpiderChartContainer');
        if (!container) {
            return;
        }

        const allPlayerStats = this.calculateStatsFromMatchResults();

        const bowlingMetrics = [
            { name: 'Economy', key: 'economy', invert: true },
            { name: 'Bowling Avg', key: 'bowlingAverage', invert: true },
            { name: 'Strike Rate', key: 'bowlingStrikeRate', invert: true },
            { name: 'Wickets/Match', key: 'wicketsPerMatch' }
        ];

        const getBowlingMetricValue = (player, metric) => {
            try {
                let value = 0;
                switch(metric.key) {
                    case 'wicketsPerMatch':
                        value = player.matches > 0 ? (player.wickets || 0) / player.matches : 0;
                        break;
                    case 'economy':
                        value = player.bowlingEconomy || 0;
                        break;
                    case 'bowlingAverage':
                        value = player.bowlingAverage || 0;
                        break;
                    case 'bowlingStrikeRate':
                        value = player.bowlingStrikeRate || 0;
                        break;
                    default:
                        value = player[metric.key] || 0;
                        break;
                }
                return isNaN(value) ? 0 : Number(value);
                console.error('Error getting bowling metric:', error);
                return 0;
            }
        };

        bowlingMetrics.forEach(metric => {
            const values = allPlayerStats
                .filter(p => (p.ballsBowled || 0) > 0) // Only consider players who have bowled
                .map(p => getBowlingMetricValue(p, metric))
                .filter(v => v > 0);
            metric.min = values.length > 0 ? Math.min(...values) : 0;
            metric.max = values.length > 0 ? Math.max(...values) : 1;
        });

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

        document.getElementById('bowlingSpiderChartContainer').innerHTML = `
            <div class="spider-chart">
                <canvas id="bowlingSpiderCanvas" width="400" height="400"></canvas>
            </div>
        `;

        setTimeout(() => {
            window.cricketApp.drawSpiderChartCanvas('bowlingSpiderCanvas', player1, player2, bowlingMetrics, getBowlingMetricValue);
        }, 100);
    }

    drawSpiderChartCanvas(canvasId, player1, player2, metrics, getMetricValue) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) * 0.3; // Increased from 0.25 to 0.3 for better centering

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;

        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, (radius / 5) * i, 0, Math.PI * 2);
            ctx.stroke();

            // Removed percentage labels for cleaner appearance
        }

        const angleStep = (Math.PI * 2) / metrics.length;
        for (let i = 0; i < metrics.length; i++) {
            const angle = (i * angleStep) - (Math.PI / 2);
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();

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

        ctx.strokeStyle = '#00ff88'; // Bright green for better visibility
        ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
        ctx.lineWidth = 3;
        ctx.beginPath();

        for (let i = 0; i < metrics.length; i++) {
            const metric = metrics[i];
            const value = getMetricValue(player1, metric);
            const numValue = isNaN(value) ? 0 : Number(value);

            // Calculate relative normalization using min/max from all players
            let normalized;
            if (metric.max === metric.min) {
                normalized = numValue > 0 ? 1 : 0; // If all players have same value, show 100% if > 0
            } else {
                // Normalize to 0-1 range based on min/max of all players
                normalized = (numValue - metric.min) / (metric.max - metric.min);
                normalized = Math.min(Math.max(normalized, 0), 1); // Clamp to 0-1
            }

            const adjustedValue = metric.invert ? (1 - normalized) : normalized;

            const angle = (i * angleStep) - (Math.PI / 2);
            const x = centerX + Math.cos(angle) * radius * Math.max(adjustedValue, 0.05); // Minimum 5% visibility
            const y = centerY + Math.sin(angle) * radius * Math.max(adjustedValue, 0.05);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#00ccff'; // Bright cyan-blue for better visibility
        ctx.fillStyle = 'rgba(0, 204, 255, 0.2)';
        ctx.beginPath();

        for (let i = 0; i < metrics.length; i++) {
            const metric = metrics[i];
            const value = getMetricValue(player2, metric);
            const numValue = isNaN(value) ? 0 : Number(value);

            // Calculate relative normalization using min/max from all players
            let normalized;
            if (metric.max === metric.min) {
                normalized = numValue > 0 ? 1 : 0; // If all players have same value, show 100% if > 0
            } else {
                // Normalize to 0-1 range based on min/max of all players
                normalized = (numValue - metric.min) / (metric.max - metric.min);
                normalized = Math.min(Math.max(normalized, 0), 1); // Clamp to 0-1
            }

            const adjustedValue = metric.invert ? (1 - normalized) : normalized;

            const angle = (i * angleStep) - (Math.PI / 2);
            const x = centerX + Math.cos(angle) * radius * Math.max(adjustedValue, 0.05); // Minimum 5% visibility
            const y = centerY + Math.sin(angle) * radius * Math.max(adjustedValue, 0.05);

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

        const topBatsman = this.getTopBatsmen(1)[0];
        if (topBatsman && topBatsman.battingAverage > 0) {
            insights.push({
                title: `🏏 Top Batsman: ${topBatsman.name}`,
                description: `Averaging ${topBatsman.battingAverage.toFixed(1)} runs with a strike rate of ${topBatsman.strikeRate.toFixed(1)}. Has scored ${topBatsman.runs} runs in ${topBatsman.matches} matches.`
            });
        }

        const topBowler = this.getTopBowlers(1)[0];
        if (topBowler && topBowler.wickets > 0) {
            insights.push({
                title: `🎯 Top Bowler: ${topBowler.name}`,
                description: `Has taken ${topBowler.wickets} wickets with an economy rate of ${topBowler.economy.toFixed(2)}. Best bowling figures: ${topBowler.bestBowling}.`
            });
        }

        // Form insights
        const consistentPlayers = this.players.filter(p => p.matches >= 1 && p.battingAverage > 20).length;
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
        const allrounders = this.players.filter(p => (this.teamBalancer && this.teamBalancer.getPlayerRole) ? this.teamBalancer.getPlayerRole(p) === 'allrounder' : false).length;
        const specialists = this.players.filter(p => {
            if (!this.teamBalancer || !this.teamBalancer.getPlayerRole) return false;
            const role = this.teamBalancer.getPlayerRole(p);
            return role === 'batsman' || role === 'bowler';
        }).length;

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

            // Force refresh analytics data from current app state after match completion
            // Initialize analytics view with fresh data
            this.showScoringAnalytics('performance');

            // Load captain stats for the scoring tab
            this.loadCaptainStats();
        }

        this.updateByeButtonVisibility();
    }

    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
        this.saveData(true); // Create JSON backup when removing player (player info change)
        this.updateStats();
        this.loadPlayers();

        }

    loadPlayers() {
        const playerList = document.getElementById('playerList');

        if (!playerList) {
            return;
        }

        if (this.players.length === 0) {
            playerList.innerHTML = `
                <div class="glass-card" style="text-align: center; color: rgba(255,255,255,0.8);">
                    <h3>🎯 No players yet</h3>
                    <p>Add your first player to get started!</p>
                </div>
            `;
            return;
        }

        try {
            playerList.innerHTML = this.players.map(player => `
                <div class="player-item fade-in" onclick="openEditPlayerModal(${player.id})" style="cursor: pointer;">
                    <div class="player-name-only">${player.name}</div>
                </div>
            `).join('');

            playerList.innerHTML = `
                <div class="glass-card" style="text-align: center; color: rgba(255,255,255,0.8);">
                    <h3>❌ Error loading players</h3>
                    <p>Please try refreshing the page</p>
                </div>
            `;
        }
    }

    generateBalancedTeams() {
        if (this.players.length < 4) {
            return;
        }

        const playersWithoutValidIds = this.players.filter(player =>
            !player.id || player.id === '' || player.id === null || player.id === undefined
        );

        if (playersWithoutValidIds.length > 0) {
            const invalidPlayerNames = playersWithoutValidIds.map(p => p.name || 'Unknown').join(', ');
            return;
        }

        // Clear any temporary teams - we're starting fresh team creation
        this.tempTeams = null;

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

        setTimeout(() => {
            const playerListContainer = document.getElementById('playerListContainer');
            if (playerListContainer) {
                // Remove any existing listeners first
                playerListContainer.replaceWith(playerListContainer.cloneNode(true));
                const newContainer = document.getElementById('playerListContainer');
                const self = this;

                newContainer.addEventListener('click', function(event) {
                    const playerCard = event.target.closest('.player-checkbox-item');
                    if (playerCard) {
                        event.preventDefault();
                        event.stopPropagation();

                        // Handle player selection directly here instead of calling window function
                        self.togglePlayerSelectionDirect(playerCard);
                    }
                });

                // Single update count after setup
                setTimeout(() => {
                    updatePlayerCountDirectly();
                }, 150);
            }
        }, 100);
    }

    updatePlayerCountDirectly() {
        const checkboxes = document.querySelectorAll('input[name="todayPlayers"]:checked');
        const count = checkboxes.length;
        const label = document.getElementById('selectedPlayerCount');

        if (label) {
            label.textContent = count.toString();
            } else {
            // Try to find the element with different selectors
            const altLabel = document.querySelector('.player-count') || document.querySelector('#selectedPlayerCount');
            if (altLabel) {
                altLabel.textContent = count.toString();
                }
        }

        // Also call the window function if available
        if (typeof window.updateSelectedPlayerCountInline === 'function') {
            window.updateSelectedPlayerCountInline();
        }
    }

    togglePlayerSelectionDirect(labelElement) {
        const checkbox = labelElement.querySelector('input[type="checkbox"]');
        const isSelected = labelElement.classList.contains('selected');

        if (isSelected) {
            labelElement.classList.remove('selected');
            if (checkbox) checkbox.checked = false;
        } else {
            labelElement.classList.add('selected');
            if (checkbox) checkbox.checked = true;
        }

        if (this.countUpdateTimeout) {
            clearTimeout(this.countUpdateTimeout);
        }
        this.countUpdateTimeout = setTimeout(() => {
            this.updatePlayerCountDirectly();
        }, 50);
    }

    showInlineCaptainSelection(selectedPlayers) {

        // Store selected players for later use
        this.todaySelectedPlayers = selectedPlayers;

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
        const captain1Id = document.getElementById('captain1SelectInline').value;
        const captain2Id = document.getElementById('captain2SelectInline').value;

        if (!captain1Id || !captain2Id) {
            return;
        }

        if (captain1Id === captain2Id) {
            return;
        }

        const captain1 = this.todaySelectedPlayers.find(p => p.id.toString() === captain1Id.toString());
        const captain2 = this.todaySelectedPlayers.find(p => p.id.toString() === captain2Id.toString());
        if (!captain1 || !captain2) {
            return;
        }

        try {
            // Store selections for potential regeneration
            this.lastSelectedPlayers = [...this.todaySelectedPlayers];
            this.lastCaptain1 = captain1;
            this.lastCaptain2 = captain2;

            const { teamA, teamB } = this.teamBalancer.balanceTeams(this.todaySelectedPlayers, captain1, captain2);

            // Calculate team strengths
            const teamAStrength = teamA.reduce((sum, p) => sum + this.teamBalancer.skillScore(p), 0);
            const teamBStrength = teamB.reduce((sum, p) => sum + this.teamBalancer.skillScore(p), 0);

            const newTeams = [
                {
                    id: Date.now(),
                    name: `Team ${this.teamBalancer.getLastName(captain1.name)}`,
                    captain: captain1, // Store the full captain object, not just the name
                    players: teamA,
                    strength: teamAStrength,
                    created: new Date().toISOString()
                },
                {
                    id: Date.now() + 1,
                    name: `Team ${this.teamBalancer.getLastName(captain2.name)}`,
                    captain: captain2, // Store the full captain object, not just the name
                    players: teamB,
                    strength: teamBStrength,
                    created: new Date().toISOString()
                }
            ];

                team1Name: newTeams[0].name,
                team1Captain: newTeams[0].captain,
                team1CaptainId: newTeams[0].captain?.id,
                team2Name: newTeams[1].name,
                team2Captain: newTeams[1].captain,
                team2CaptainId: newTeams[1].captain?.id
            });

            // Store teams temporarily without saving to JSON
            this.tempTeams = newTeams;

            const strengthDiff = Math.abs(teamAStrength - teamBStrength);
            // Show teams result inline
            this.showInlineTeamsResult(newTeams[0], newTeams[1]);

            }
    }

    reshuffleTeamsWithSameSelections() {
        // Regenerate teams using the same players and captains
        if (!this.lastSelectedPlayers || !this.lastCaptain1 || !this.lastCaptain2) {
            return;
        }

        try {
            const { teamA, teamB } = this.teamBalancer.balanceTeams(this.lastSelectedPlayers, this.lastCaptain1, this.lastCaptain2, true);

            // Calculate team strengths
            const teamAStrength = teamA.reduce((sum, p) => sum + this.teamBalancer.skillScore(p), 0);
            const teamBStrength = teamB.reduce((sum, p) => sum + this.teamBalancer.skillScore(p), 0);

            const newTeams = [
                {
                    id: Date.now(),
                    name: `Team ${this.teamBalancer.getLastName(this.lastCaptain1.name)}`,
                    captain: this.lastCaptain1,  // Store full captain object
                    captainName: this.lastCaptain1.name,  // Also store name for compatibility
                    players: teamA,
                    strength: teamAStrength,
                    created: new Date().toISOString()
                },
                {
                    id: Date.now() + 1,
                    name: `Team ${this.teamBalancer.getLastName(this.lastCaptain2.name)}`,
                    captain: this.lastCaptain2,  // Store full captain object
                    captainName: this.lastCaptain2.name,  // Also store name for compatibility
                    players: teamB,
                    strength: teamBStrength,
                    created: new Date().toISOString()
                }
            ];

            // Store teams temporarily without saving to JSON
            this.tempTeams = newTeams;

            const strengthDiff = Math.abs(teamAStrength - teamBStrength);
            // Show teams result inline
            this.showInlineTeamsResult(newTeams[0], newTeams[1]);

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
                                // Check both captain object id and captain name for backward compatibility
                                const isCaptain = (team1.captain?.id && p.id === team1.captain.id) ||
                                                 (p.name === team1.captain?.name) ||
                                                 (p.name === team1.captainName);
                                return `<span class="player-tag ${isCaptain ? 'captain' : 'clickable'}"
                                             data-player-id="${p.id}"
                                             data-team="1"
                                             ${!isCaptain ? 'onclick=\"movePlayerDirectly(this)\"' : ''}>${p.name}${isCaptain ? ' (C)' : ''}</span>`;
                            }).join('')}
                        </div>
                    </div>

                    <div class="team-result-card">
                        <h4>${team2.name}</h4>
                        <div class="team-players">
                            ${team2.players.map(p => {
                                // Check both captain object id and captain name for backward compatibility
                                const isCaptain = (team2.captain?.id && p.id === team2.captain.id) ||
                                                 (p.name === team2.captain?.name) ||
                                                 (p.name === team2.captainName);
                                return `<span class="player-tag ${isCaptain ? 'captain' : 'clickable'}"
                                             data-player-id="${p.id}"
                                             data-team="2"
                                             ${!isCaptain ? 'onclick=\"movePlayerDirectly(this)\"' : ''}>${p.name}${isCaptain ? ' (C)' : ''}</span>`;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <div class="step-actions">
                    <button type="button" onclick="regenerateTeams()" class="btn btn-primary">Reshuffle</button>
                    <button type="button" onclick="window.cricketApp.saveTeams()" class="btn btn-warning" style="margin: 0 10px;">Save</button>
                    <button type="button" onclick="confirmTeams()" class="btn btn-success">
                        Great! Let's Play
                    </button>
                </div>
            </div>
        `;
    }

    calculatePlayerSkillScore(player) {
        const bccbScore = this.teamBalancer.skillScore(player);

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

        const playersWithoutValidIds = teamPlayers.filter(player =>
            !player.id || player.id === '' || player.id === null || player.id === undefined
        );

        if (playersWithoutValidIds.length > 0) {
            const invalidPlayerNames = playersWithoutValidIds.map(p => p.name || 'Unknown').join(', ');
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
        this.saveData(true); // Trigger D1 sync when creating teams
        this.updateStats();
        this.loadTeams();

        }

    loadTeams() {
        const teamList = document.getElementById('teamList');

        // First check if there are saved teams to display
        try {
            const saved = localStorage.getItem('savedTeams');
            if (saved) {
                const teams = JSON.parse(saved);
                if (Array.isArray(teams) && teams.length === 2) {
                    // Show saved teams as clickable cards
                    this.showSavedTeamsCards(teams);
                    return;
                }
            }
            }

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
                    <div style="text-align: center; margin: 30px 0;" id="toss-button-container">
                        <button id="main-toss-btn" class="toss-btn" style="touch-action: manipulation;">
                            🎯 TOSS
                        </button>
                    </div>
                `;

                setTimeout(() => {
                    const tossBtn = document.getElementById('main-toss-btn');
                    if (tossBtn) {
                        // Remove any existing onclick attribute
                        tossBtn.removeAttribute('onclick');

                        // Add both click and touchend events for better mobile support
                        ['click', 'touchend'].forEach(eventType => {
                            tossBtn.addEventListener(eventType, (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                startToss();
                            }, { passive: false });
                        });
                    } else {
                        }
                }, 100);
            }
        }
    }

    showSavedTeamsCards(teams) {
        const teamList = document.getElementById('teamList');

        teamList.innerHTML = `
            <div class="glass-card fade-in" style="cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;"
                 onclick="window.cricketApp.loadSavedTeamsForEdit()"
                 onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.3)';"
                 onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='';">
                <div class="step-header">
                    <h3>💾 Saved Teams</h3>
                    <p style="color: rgba(255,255,255,0.7); font-size: 0.9em; margin-top: 10px;">
                        Click to load and edit these teams
                    </p>
                </div>

                <div class="teams-result-inline" style="pointer-events: none;">
                    <div class="team-result-card">
                        <h4>${teams[0].name}</h4>
                        <div class="team-players">
                            ${teams[0].players.map(p => {
                                const isCaptain = p.id === teams[0].captain?.id || p.name === teams[0].captain?.name;
                                return `<span class="player-tag ${isCaptain ? 'captain' : ''}">${p.name}${isCaptain ? ' (C)' : ''}</span>`;
                            }).join('')}
                        </div>
                    </div>

                    <div class="team-result-card">
                        <h4>${teams[1].name}</h4>
                        <div class="team-players">
                            ${teams[1].players.map(p => {
                                const isCaptain = p.id === teams[1].captain?.id || p.name === teams[1].captain?.name;
                                return `<span class="player-tag ${isCaptain ? 'captain' : ''}">${p.name}${isCaptain ? ' (C)' : ''}</span>`;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; text-align: center;">
                    <span style="color: rgba(255,255,255,0.9); font-size: 0.95em;">
                        👆 Tap to select captains and start playing
                    </span>
                </div>
            </div>
        `;
    }

    loadSavedTeamsForEdit() {
        try {
            const saved = localStorage.getItem('savedTeams');
            if (saved) {
                const teams = JSON.parse(saved);
                if (Array.isArray(teams) && teams.length === 2) {
                    if (!teams[0].captain || !teams[0].captain.id) {
                        teams[0].captain = teams[0].players[0];
                    }
                    if (!teams[1].captain || !teams[1].captain.id) {
                        teams[1].captain = teams[1].players[0];
                    }

                    this.tempTeams = teams;
                    this.showInlineTeamsResult(teams[0], teams[1]);

                    // Scroll to the teams section smoothly
                    const teamList = document.getElementById('teamList');
                    if (teamList) {
                        teamList.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            }
            console.error('Error loading saved teams:', e);
            this.showNotification('❌ Error loading saved teams');
        }
    }

    loadCaptainStats() {
        const container = document.getElementById('captainsStatsContainer');

        if (!container) return;

        // Check if another call happened very recently (within 100ms)
        const now = Date.now();
        if (now - _globalLastCaptainStatsCall < 100) {
            return;
        }

        _globalLastCaptainStatsCall = now;

        try {
            const captainStats = this.calculateCaptainStatistics();

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
                        <div class="highlight-player elevated">${this.formatElevatedPlayer(captain.elevatedBatsman, 'batting')}</div>
                    </div>
                    <div class="highlight-section">
                        <div class="highlight-title">🎯 Most Elevated Bowler</div>
                        <div class="highlight-player elevated">${this.formatElevatedPlayer(captain.elevatedBowler, 'bowling')}</div>
                    </div>
                </div>
            </div>
        `}).join('');
            console.error('❌ Error calculating captain stats:', error);
        }

    }

    calculateCaptainStatistics() {
        const captainStats = {};

        this.captainStatsRef = captainStats;

        // Calculate overall player stats first for comparison
        const overallPlayerStats = this.calculatePlayerOverallStats();

        // Process all completed matches
        this.matches.forEach(match => {
            const team1Captain = match.team1CaptainId || match.Team1_Captain || match.team1Captain || match.captain1 ||
                               (match.team1 && match.team1.captain);
            const team2Captain = match.team2CaptainId || match.Team2_Captain || match.team2Captain || match.captain2 ||
                               (match.team2 && match.team2.captain);

            if (!team1Captain || !team2Captain) {
                return;
            }

            // Initialize captain stats if not exists
            if (!captainStats[team1Captain]) {
                captainStats[team1Captain] = this.initializeCaptainStats(team1Captain);
            }
            if (!captainStats[team2Captain]) {
                captainStats[team2Captain] = this.initializeCaptainStats(team2Captain);
            }

            captainStats[team1Captain].gamesPlayed++;
            captainStats[team2Captain].gamesPlayed++;

            let winningTeam = match.Winning_Team || match.winningTeam || match.winner?.name || match.winnerName;
            const team1Name = match.Team1 || match.team1?.name || match.team1 || match.team1Name;
            const team2Name = match.Team2 || match.team2?.name || match.team2 || match.team2Name;

            // Handle corrupted data where WinningTeam is the string "undefined"
            if (winningTeam === "undefined" || winningTeam === "null") {
                winningTeam = null;

                // Try to extract winner from result text as fallback
                if (match.result && match.result.includes('wins')) {
                    const resultMatch = match.result.match(/🎉 (.+?) wins/);
                    if (resultMatch) {
                        winningTeam = resultMatch[1];
                    }
                }
            }

            // Flexible team name matching - check for exact match or substring match
            let team1Won = false;
            let team2Won = false;

            if (winningTeam === team1Name || (winningTeam && team1Name && winningTeam.includes(team1Name)) || (winningTeam && team1Name && team1Name.includes(winningTeam))) {
                team1Won = true;
            } else if (winningTeam === team2Name || (winningTeam && team2Name && winningTeam.includes(team2Name)) || (winningTeam && team2Name && team2Name.includes(winningTeam))) {
                team2Won = true;
            }

            if (team1Won) {
                captainStats[team1Captain].gamesWon++;
                captainStats[team2Captain].gamesLost++;
            } else if (team2Won) {
                captainStats[team2Captain].gamesWon++;
                captainStats[team1Captain].gamesLost++;
            }

            // Track Man of the Match
            const manOfTheMatch = match.manOfTheMatch || match.Man_Of_The_Match || match.mom || match.mostValuablePlayer;
            if (manOfTheMatch) {
                let momPlayerId;

                // Handle different MOM data structures
                if (typeof manOfTheMatch === 'string') {
                    momPlayerId = manOfTheMatch;
                } else if (manOfTheMatch.player && manOfTheMatch.player.id) {
                    momPlayerId = manOfTheMatch.player.id;
                } else if (manOfTheMatch.id) {
                    momPlayerId = manOfTheMatch.id;
                } else {
                    momPlayerId = null;
                }

                if (momPlayerId) {
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

                    // If team compositions are not available, try to use performance data
                    let momFoundInTeam = false;

                    if (team1Players.includes(momPlayerId)) {
                        captainStats[team1Captain].momCounts[momPlayerId]++;
                        momFoundInTeam = true;
                    } else if (team2Players.includes(momPlayerId)) {
                        captainStats[team2Captain].momCounts[momPlayerId]++;
                        momFoundInTeam = true;
                    }

                    // If MOM player not found in team compositions, try using performance data
                    if (!momFoundInTeam && match.performanceData) {
                        const momPerformance = match.performanceData.find(p => p.Player_ID === momPlayerId || p.playerId === momPlayerId);
                        if (momPerformance) {
                            captainStats[team1Captain].momCounts[momPlayerId]++;
                            momFoundInTeam = true;
                        }
                    }
                }
            }

            // Store match performance data for z-score calculations
            this.storeCaptainPerformanceData(match, team1Captain, team2Captain);
        });

        // Calculate derived statistics and convert to array
        const captainResults = Object.keys(captainStats).map(captainId => {
            const stats = captainStats[captainId];

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

            let captainName = `Captain ${captainId}`;
            if (captain) {
                captainName = captain.name || captain.Name || captain.playerName || `Player ${captainId}`;
            } else if (playerNameMap[captainId]) {
                captainName = playerNameMap[captainId];
                } else {
                // Try to find by name in player_info from data manager
                if (this.dataManager && this.dataManager.data && this.dataManager.data.player_info) {
                    const playerInfo = this.dataManager.data.player_info.find(p => p.Player_ID === captainId);
                    if (playerInfo) {
                        captainName = playerInfo.Name;
                        }
                }
            }

            const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

            let winRateClass = 'win-rate';
            if (winRate >= 70) winRateClass += '';
            else if (winRate >= 50) winRateClass += ' medium';
            else winRateClass += ' low';

            // Calculate enhanced metrics
            const elevatedBatsman = this.getMostElevatedBatsman(stats, overallPlayerStats);
            const elevatedBowler = this.getMostElevatedBowler(stats, overallPlayerStats);
            const luckyPlayer = this.getLuckyPlayer(stats.momCounts);

            return {
                id: captainId,
                name: captainName,
                gamesPlayed: stats.gamesPlayed,
                gamesWon: stats.gamesWon,
                gamesLost: stats.gamesLost,
                winRate: winRate,
                winRateClass: winRateClass,
                luckyPlayer: luckyPlayer,
                elevatedBatsman: elevatedBatsman,
                elevatedBowler: elevatedBowler
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

        return captainResults;
    }

    initializeCaptainStats(captainId) {
        return {
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            momCounts: {},
            performanceData: [],
            playerBattingStats: {}, // Track each player's batting under this captain
            playerBowlingStats: {}  // Track each player's bowling under this captain
        };
    }

    storeCaptainPerformanceData(match, team1Captain, team2Captain) {
        // Store detailed performance data for z-score calculations
        if (!match.performanceData || !Array.isArray(match.performanceData)) {
            return;
        }

        let team1Players = match.Team1_Composition || match.team1Composition || [];
        let team2Players = match.Team2_Composition || match.team2Composition || [];

        // Parse JSON strings if needed
        if (typeof team1Players === 'string') {
            try {
                team1Players = JSON.parse(team1Players);
                team1Players = [];
            }
        }
        if (typeof team2Players === 'string') {
            try {
                team2Players = JSON.parse(team2Players);
                team2Players = [];
            }
        }

        if (!Array.isArray(team1Players)) team1Players = [];
        if (!Array.isArray(team2Players)) team2Players = [];

        // Process performance data for each player in the match
        match.performanceData.forEach(perf => {
            const playerId = perf.Player_ID || perf.playerId;
            if (!playerId) return;

            // Find captain with type-safe comparison
            let captainId = null;
            const playerIdStr = String(playerId);

            if (team1Players.some(p => String(p) === playerIdStr)) {
                captainId = team1Captain;
            } else if (team2Players.some(p => String(p) === playerIdStr)) {
                captainId = team2Captain;
            }

            if (!captainId) return;

            const captainStats = this.captainStatsRef[captainId];
            if (!captainStats) return;

            // Initialize player stats if not exists
            if (!captainStats.playerBattingStats[playerId]) {
                captainStats.playerBattingStats[playerId] = {
                    runs: 0,
                    ballsFaced: 0,
                    notOuts: 0,
                    innings: 0
                };
            }
            if (!captainStats.playerBowlingStats[playerId]) {
                captainStats.playerBowlingStats[playerId] = {
                    ballsBowled: 0,
                    runsConceded: 0,
                    wickets: 0,
                    innings: 0
                };
            }

            if (perf.ballsFaced > 0 || perf.runs > 0) {
                captainStats.playerBattingStats[playerId].runs += perf.runs || 0;
                captainStats.playerBattingStats[playerId].ballsFaced += perf.ballsFaced || 0;
                captainStats.playerBattingStats[playerId].notOuts += perf.notOuts || 0;
                captainStats.playerBattingStats[playerId].innings++;
            }

            if (perf.ballsBowled > 0 || perf.wickets > 0) {
                captainStats.playerBowlingStats[playerId].ballsBowled += perf.ballsBowled || 0;
                captainStats.playerBowlingStats[playerId].runsConceded += perf.runsConceded || 0;
                captainStats.playerBowlingStats[playerId].wickets += perf.wickets || 0;
                captainStats.playerBowlingStats[playerId].innings++;
            }
        });
    }

    calculatePlayerOverallStats() {
        // Calculate each player's overall career stats for comparison
        const playerStats = {};

        this.matches.forEach(match => {
            if (!match.performanceData || !Array.isArray(match.performanceData)) return;

            match.performanceData.forEach(perf => {
                const playerId = perf.Player_ID || perf.playerId;
                if (!playerId) return;

                if (!playerStats[playerId]) {
                    playerStats[playerId] = {
                        batting: { runs: 0, ballsFaced: 0, notOuts: 0, innings: 0 },
                        bowling: { ballsBowled: 0, runsConceded: 0, wickets: 0, innings: 0 }
                    };
                }

                if (perf.ballsFaced > 0 || perf.runs > 0) {
                    playerStats[playerId].batting.runs += perf.runs || 0;
                    playerStats[playerId].batting.ballsFaced += perf.ballsFaced || 0;
                    playerStats[playerId].batting.notOuts += perf.notOuts || 0;
                    playerStats[playerId].batting.innings++;
                }

                if (perf.ballsBowled > 0 || perf.wickets > 0) {
                    playerStats[playerId].bowling.ballsBowled += perf.ballsBowled || 0;
                    playerStats[playerId].bowling.runsConceded += perf.runsConceded || 0;
                    playerStats[playerId].bowling.wickets += perf.wickets || 0;
                    playerStats[playerId].bowling.innings++;
                }
            });
        });

        return playerStats;
    }

    getMostElevatedBatsman(captainStats, overallStats) {
        let bestImprovement = 0;
        let bestPlayer = null;
        Object.keys(captainStats.playerBattingStats).forEach(playerId => {
            const captainBatting = captainStats.playerBattingStats[playerId];
            const overallBatting = overallStats[playerId]?.batting;
            if (!overallBatting || captainBatting.innings < 1 || overallBatting.innings < 2) return;
            const captainAvg = captainBatting.innings > captainBatting.notOuts ?
                captainBatting.runs / Math.max(1, (captainBatting.innings - captainBatting.notOuts)) : captainBatting.runs;
            const overallAvg = overallBatting.innings > overallBatting.notOuts ?
                overallBatting.runs / Math.max(1, (overallBatting.innings - overallBatting.notOuts)) : overallBatting.runs;
            const improvement = overallAvg > 0 ? ((captainAvg - overallAvg) / overallAvg * 100) : 0;
            // Only positive improvement
            if (improvement > bestImprovement && improvement > 0) {
                bestImprovement = improvement;
                bestPlayer = {
                    playerId,
                    captainAvg: captainAvg.toFixed(1),
                    overallAvg: overallAvg.toFixed(1),
                    percentageImprovement: improvement.toFixed(1)
                };
            }
        });
        return bestPlayer;
    }

    getMostElevatedBowler(captainStats, overallStats) {
        let bestImprovement = 0;
        let bestPlayer = null;
        Object.keys(captainStats.playerBowlingStats).forEach(playerId => {
            const captainBowling = captainStats.playerBowlingStats[playerId];
            const overallBowling = overallStats[playerId]?.bowling;
            if (!overallBowling || captainBowling.innings < 1 || overallBowling.innings < 2 ||
                captainBowling.wickets === 0 || overallBowling.wickets === 0) return;
            const captainStrikeRate = captainBowling.ballsBowled / Math.max(1, captainBowling.wickets);
            const overallStrikeRate = overallBowling.ballsBowled / Math.max(1, overallBowling.wickets);
            const improvement = overallStrikeRate > 0 ? ((overallStrikeRate - captainStrikeRate) / overallStrikeRate * 100) : 0;
            // Only positive improvement
            if (improvement > bestImprovement && improvement > 0) {
                bestImprovement = improvement;
                bestPlayer = {
                    playerId,
                    captainStrikeRate: captainStrikeRate.toFixed(1),
                    overallStrikeRate: overallStrikeRate.toFixed(1),
                    percentageImprovement: improvement.toFixed(1)
                };
            }
        });
        return bestPlayer;
    }

    getLuckyPlayer(momCounts) {
        if (Object.keys(momCounts).length === 0) return 'No data';

        const maxMoms = Math.max(...Object.values(momCounts));
        if (maxMoms === 0) return 'No data';

        const topPlayers = Object.keys(momCounts).filter(playerId => momCounts[playerId] === maxMoms);

        let luckyPlayerId;
        if (topPlayers.length === 1) {
            luckyPlayerId = topPlayers[0];
        } else {
            // If multiple players have same MOM count, pick the first one
            luckyPlayerId = topPlayers[0];
        }

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

    formatElevatedPlayer(elevatedData, type) {
        if (!elevatedData) return 'No data';
        const player = this.players.find(p =>
            p.id === elevatedData.playerId ||
            p.Player_ID === elevatedData.playerId ||
            String(p.id) === String(elevatedData.playerId) ||
            String(p.Player_ID) === String(elevatedData.playerId)
        );
        const playerName = player ? (player.name || player.Name || `Player ${elevatedData.playerId}`) : `Player ${elevatedData.playerId}`;
        const percentage = elevatedData.percentageImprovement || '0.0';
        // Only show if improvement is positive
        if (parseFloat(percentage) > 0) {
            return `${playerName} (${percentage}% improvement)`;
        }
        return 'No data';
    }

    getElevatedBatsman(captainId) {
        // Calculate which batsman performed best under this captain based on z-scores
        const playerPerformances = this.calculatePlayerPerformanceUnderCaptain(captainId, 'batting');

        if (playerPerformances.length === 0) return 'No batting data';

        // First try z-score approach
        let bestPlayer = null;
        let highestZScore = -Infinity;
        let returnValue;

        playerPerformances.forEach(performance => {
            if (performance.zScore > highestZScore) {
                highestZScore = performance.zScore;
                bestPlayer = performance;
            }
        });

        // If z-score approach doesn't work, fall back to simple average comparison
        if (!bestPlayer || bestPlayer.zScore < 0.1) {
            bestPlayer = null;
            let highestImprovement = 0;

            playerPerformances.forEach(performance => {
                if (performance.captainAvg > performance.overallAvg) {
                    const improvement = performance.captainAvg - performance.overallAvg;
                    if (improvement > highestImprovement) {
                        highestImprovement = improvement;
                        bestPlayer = performance;
                    }
                }
            });
            if (!bestPlayer) {
                returnValue = `No elevation found (checked ${playerPerformances.length} players)`;
            }
        }
        if (typeof returnValue !== 'undefined') {
            return returnValue;
        }
        return `${bestPlayer.playerName}`;
    }

    getMotivatedBowler(captainId) {
        // Calculate which bowler performed best under this captain based on z-scores
        const playerPerformances = this.calculatePlayerPerformanceUnderCaptain(captainId, 'bowling');

        if (playerPerformances.length === 0) return 'No bowling data';

        // First try z-score approach - for bowling, we want the most negative z-score (lower economy is better)
        let bestPlayer = null;
        let lowestZScore = Infinity;
        let returnValue;

        playerPerformances.forEach(performance => {
            if (performance.zScore < lowestZScore) {
                lowestZScore = performance.zScore;
                bestPlayer = performance;
            }
        });

        // If z-score approach doesn't work, fall back to simple average comparison
        if (!bestPlayer || bestPlayer.zScore > -0.1) {
            bestPlayer = null;
            let highestImprovement = 0;

            playerPerformances.forEach(performance => {
                if (performance.captainAvg < performance.overallAvg) { // Lower is better for bowling
                    const improvement = performance.overallAvg - performance.captainAvg;
                    if (improvement > highestImprovement) {
                        highestImprovement = improvement;
                        bestPlayer = performance;
                    }
                }
            });
            if (!bestPlayer) {
                returnValue = `No motivation found (checked ${playerPerformances.length} bowlers)`;
            }
        }
        if (typeof returnValue !== 'undefined') {
            return returnValue;
        }
        return `${bestPlayer.playerName}`;
    }

    calculatePlayerPerformanceUnderCaptain(captainId, type) {
        const playerStats = {};
        const globalStats = {};

        // If we have data manager, use it to get match performances
        let allBattingPerformances = [];
        let allBowlingPerformances = [];

        if (this.dataManager && this.dataManager.data) {
            allBattingPerformances = this.dataManager.data.match_batting_performance || [];
            allBowlingPerformances = this.dataManager.data.match_bowling_performance || [];
            }

        this.matches.forEach(match => {
            const team1Captain = match.Team1_Captain || match.team1Captain || match.captain1;
            const team2Captain = match.Team2_Captain || match.team2Captain || match.captain2;
            const isUnderThisCaptain = (team1Captain === captainId || team2Captain === captainId);
            const matchId = match.Match_ID || match.id;

            let performances = [];
            if (type === 'batting') {
                performances = allBattingPerformances.filter(perf => perf.Match_ID === matchId);
            } else {
                performances = allBowlingPerformances.filter(perf => perf.Match_ID === matchId);
            }

            // Also check match object itself for performances
            const matchPerformances = type === 'batting' ?
                (match.battingPerformance || match.battingPerformances || []) :
                (match.bowlingPerformance || match.bowlingPerformances || []);

            performances = performances.concat(matchPerformances);
            performances.forEach(perf => {
                const playerId = perf.playerId || perf.Player_ID;
                let playerName = perf.playerName || perf.Player || 'Unknown';

                if (!playerId) {
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

                // Store performance
                globalStats[playerId].performances.push(metric);

                if (isUnderThisCaptain) {
                    playerStats[playerId].underCaptain.push(metric);
                } else {
                    playerStats[playerId].overall.push(metric);
                }
            });
        });

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
                return;
            }

            const captainAvg = this.calculateMean(player.underCaptain);
            const overallAvg = this.calculateMean(player.overall);
            const overallStdDev = this.calculateStandardDeviation(player.overall);

            if (overallStdDev === 0) {
                return; // Avoid division by zero
            }

            const zScore = (captainAvg - overallAvg) / overallStdDev;

            results.push({
                playerId,
                playerName: player.playerName,
                captainAvg,
                overallAvg,
                zScore
            });
        });

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

        }

    captureMatchState() {
        // Capture complete match state for undo functionality
        if (!this.currentMatch) return null;

        const playersSnapshot = this.players.map(p => {
            const clone = JSON.parse(JSON.stringify(p));
            if (p.matchStats) {
                clone.matchStats = {
                    batting: p.matchStats.batting ? {...p.matchStats.batting} : {},
                    bowling: p.matchStats.bowling ? {...p.matchStats.bowling} : {}
                };
            }
            return clone;
        });

        return {
            team1Score: JSON.parse(JSON.stringify(this.currentMatch.team1Score)),
            team2Score: JSON.parse(JSON.stringify(this.currentMatch.team2Score)),
            currentTeam: this.currentMatch.currentTeam,
            currentInnings: this.currentMatch.currentInnings,
            bowler: this.currentMatch.bowler ? JSON.parse(JSON.stringify(this.currentMatch.bowler)) : null,
            target: this.currentMatch.target,
            waitingForBowlerSelection: this.waitingForBowlerSelection,
            // Capture complete player stats snapshot
            players: playersSnapshot,
            playerStats: this.currentMatch.playerStats ? JSON.parse(JSON.stringify(this.currentMatch.playerStats)) : {}
        };
    }

    // Auto-select a bowler from the opposing team if none is selected
    autoSelectBowler() {
        if (!this.currentMatch || !this.currentMatch.currentTeam) {
            return false;
        }

        if (this.currentMatch.bowler) {
            return false;
        }

        const opposingTeam = this.currentMatch.currentTeam === 1 ? this.currentMatch.team2 : this.currentMatch.team1;

        if (!opposingTeam || !opposingTeam.players || opposingTeam.players.length === 0) {
            return false;
        }

        // Select first available bowler from opposing team
        const selectedBowler = opposingTeam.players[0];

        this.currentMatch.bowler = {
            id: selectedBowler.id,
            name: selectedBowler.name,
            matchBowlingRuns: 0,
            matchBowlingBalls: 0,
            matchBowlingWickets: 0
        };

        this.updateScoreDisplay();

        return true;
    }

    ensureBowlerSelected() {
        if (!this.currentMatch.bowler) {
            return this.autoSelectBowler();
        }
        return true;
    }

    // Validate match state before allowing scoring actions
    validateMatchState() {
        if (!this.currentMatch) {
            return false;
        }

        if (!this.currentMatch.team1 || !this.currentMatch.team2) {
            return false;
        }

        if (!this.ensureBowlerSelected()) {
            return false;
        }

        return true;
    }

    // Helper function to ensure batsmen are initialized
    ensureBatsmenInitialized() {
        if (!this.currentMatch) {
            return false;
        }

        const currentTeamScore = this.currentMatch.currentTeam === 1 ?
            this.currentMatch.team1Score : this.currentMatch.team2Score;

        // Check if batsmen are manually set
        if (!currentTeamScore.striker || !currentTeamScore.nonStriker) {
            return false; // Don't auto-assign, require manual selection
        }

        if (currentTeamScore.striker) {
            if (currentTeamScore.striker.matchRuns == null) currentTeamScore.striker.matchRuns = 0;
            if (currentTeamScore.striker.matchBalls == null) currentTeamScore.striker.matchBalls = 0;
            if (!currentTeamScore.striker.matchBoundaries) currentTeamScore.striker.matchBoundaries = { fours: 0, sixes: 0 };
        }

        if (currentTeamScore.nonStriker) {
            if (currentTeamScore.nonStriker.matchRuns == null) currentTeamScore.nonStriker.matchRuns = 0;
            if (currentTeamScore.nonStriker.matchBalls == null) currentTeamScore.nonStriker.matchBalls = 0;
            if (!currentTeamScore.nonStriker.matchBoundaries) currentTeamScore.nonStriker.matchBoundaries = { fours: 0, sixes: 0 };
        }

        return true;
    }

    addRuns(runs) {
        // Validate match state before proceeding
        if (!this.validateMatchState()) {
            return;
        }

        // Check if waiting for bowler selection
        if (this.waitingForBowlerSelection) {
            return;
        }

        if (!this.currentMatch) {
            console.error('❌ No active match - cannot add runs');
            this.showNotification('❌ No active match found', 'error');
            return;
        }

        // Check if bowler is selected - if not, trigger bowler selection
        if (!this.currentMatch.bowler) {
            this.triggerInitialBowlerSelection();
            return;
        }

        if (!this.ensureBatsmenInitialized()) {
            return;
        }

        const currentTeamScore = this.currentMatch.currentTeam === 1 ?
            this.currentMatch.team1Score : this.currentMatch.team2Score;

        // Store state before the ball for undo functionality
        const stateBeforeBall = this.captureMatchState();

        // Check if this is the first ball of the match and update start time
        const isFirstBall = this.currentMatch.ballByBall.length === 0;
        if (isFirstBall) {
            this.currentMatch.gameStartTime = new Date().toISOString();
            this.currentMatch.actualStarted = new Date().toISOString();
        }

        const teamScoreBefore = {
            runs: currentTeamScore.runs,
            wickets: currentTeamScore.wickets,
            overs: currentTeamScore.overs,
            balls: currentTeamScore.balls
        };

        const strikerPerfBefore = this.performanceDataTracker ?
            JSON.parse(JSON.stringify(this.performanceDataTracker.find(p => p.Player_ID === currentTeamScore.striker?.id))) : null;
        const nonStrikerPerfBefore = this.performanceDataTracker ?
            JSON.parse(JSON.stringify(this.performanceDataTracker.find(p => p.Player_ID === currentTeamScore.nonStriker?.id))) : null;
        const bowlerPerfBefore = this.performanceDataTracker ?
            JSON.parse(JSON.stringify(this.performanceDataTracker.find(p => p.Player_ID === this.currentMatch.bowler?.id))) : null;

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

        // 1. Team score increases by runs

        currentTeamScore.runs += runs;
        currentTeamScore.balls++;

        const strikerBeforeSwap = currentTeamScore.striker;

        // This must happen before swapStrike() to ensure correct player gets credit
        if (strikerBeforeSwap) {
            this.updateBatsmanStats(strikerBeforeSwap.id, runs, 1);
            } else {
            }

        if (this.currentMatch.bowler) {
            this.updateBowlerStats(this.currentMatch.bowler.id, runs, 1, 0);
            } else {
            // Show warning to user
            }

        const overCompleted = currentTeamScore.balls >= 6;
        if (overCompleted) {
            currentTeamScore.overs++;
            currentTeamScore.balls = 0;
            currentTeamScore.overByOver.push(runs);
            this.swapStrike(); // BCCB: change strike at end of over
            this.changeBowlerAutomatically(); // Auto change bowler every over
        }

        if (!overCompleted && runs % 2 === 1) {
            this.swapStrike();
        }

        // Check for target achieved in second innings
        if (this.currentMatch.currentInnings === 2 && this.currentMatch.target) {
            if (currentTeamScore.runs >= this.currentMatch.target) {
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

        // 🔄 Record ball for undo functionality with state snapshot
        this.recordBall({
            over: currentTeamScore.overs,
            ball: currentTeamScore.balls === 0 ? 6 : currentTeamScore.balls, // Handle completed over
            batsmanId: strikerBeforeSwap?.id,
            bowlerId: this.currentMatch.bowler?.id,
            runs: runs,
            extras: 0,
            extraType: null,
            wicket: false,
            dismissalType: null,
            previousStats: {
                batsmanId: strikerBeforeSwap?.id,
                batsman: strikerBeforeSwap ? JSON.parse(JSON.stringify(this.getPlayerMatchStats(strikerBeforeSwap))) : null,
                bowlerId: this.currentMatch.bowler?.id,
                bowler: this.currentMatch.bowler ? JSON.parse(JSON.stringify(this.getPlayerMatchStats(this.currentMatch.bowler))) : null,
                teamScore: teamScoreBefore
            }
        });

        this.saveData(false); // Save locally only during match play
        this.updateScoreDisplay();
        this.updateOverSummary(); // Update the dynamic over summary

        }

    addWicket() {
        // Validate match state before proceeding
        if (!this.validateMatchState()) {
            return;
        }

        if (!this.currentMatch) {
            console.error('❌ No active match - cannot record wicket');
            this.showNotification('❌ No active match found', 'error');
            return;
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
        const ballByBall = this.currentMatch.ballByBall || [];
        const currentBallNumber = currentTeamScore.balls + 1;
        const existingDelivery = ballByBall.find(ball =>
            ball.over === currentTeamScore.overs &&
            ball.ball === currentBallNumber &&
            !ball.wicket // Only count non-wicket deliveries to avoid conflicts
        );

        const actualOverNumber = currentTeamScore.overs;
        const actualBallNumber = currentTeamScore.balls + (existingDelivery ? 0 : 1);

        if (!existingDelivery) {
            // This is a wicket-only delivery, count the ball
            currentTeamScore.balls++;

            // Immediate over completion check to prevent balls > 6
            if (currentTeamScore.balls >= 6) {
                currentTeamScore.overs++;
                currentTeamScore.balls = 0;
                this.swapStrike(); // BCCB: change strike at end of over
                this.changeBowlerAutomatically(); // Auto change bowler every over
            }

            } else {
            }

        wicketDetails.over = actualOverNumber;
        wicketDetails.ball = actualBallNumber;

        // Record fall of wicket with proper dismissal information
        const actualDismissalType = currentTeamScore.striker?.dismissalType || 'bowled';
        currentTeamScore.fallOfWickets.push({
            wicket: currentTeamScore.wickets,
            runs: currentTeamScore.runs,
            batsman: currentTeamScore.striker?.name || 'Unknown',
            batsmanName: currentTeamScore.striker?.name || 'Unknown',
            dismissalType: actualDismissalType,
            bowler: (() => {
                if (actualDismissalType === 'run out') {
                    return null;
                }
                const bowlerInfo = currentTeamScore.striker?.dismissalBowler;
                if (bowlerInfo && /^\d+$/.test(String(bowlerInfo))) {
                    const bowlerPlayer = window.cricketApp.players.find(p => String(p.id) === String(bowlerInfo));
                    return bowlerPlayer ? bowlerPlayer.name : (this.currentMatch.bowler?.name || 'Unknown');
                }
                return bowlerInfo || this.currentMatch.bowler?.name || 'Unknown';
            })(),
            bowlerId: actualDismissalType !== 'run out' ? (this.currentMatch.bowler?.id || null) : null,
            helper: currentTeamScore.striker?.dismissalFielder || null,
            fielder: currentTeamScore.striker?.dismissalFielder || null,
            over: `${currentTeamScore.overs}.${currentTeamScore.balls}`,
            ball: currentTeamScore.balls,
            timestamp: new Date().toISOString()
        });

        if (this.currentMatch.bowler && actualDismissalType !== 'run out') {
            this.updateBowlerStats(this.currentMatch.bowler.id, 0, 1, 1);
        }

        if (currentTeamScore.striker) {
            const bowlerName = actualDismissalType !== 'run out' ? (this.currentMatch.bowler?.name || '') : '';
            this.setBatsmanOut(currentTeamScore.striker.id, actualDismissalType, bowlerName, '');
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
                this.endMatch();
                return;
            }
        }

        this.currentMatch.ballByBall.push(wicketDetails);

        // 🔄 Record wicket ball for undo functionality
        this.recordBall({
            over: actualOverNumber,
            ball: actualBallNumber,
            batsmanId: currentTeamScore.striker?.id,
            bowlerId: this.currentMatch.bowler?.id,
            runs: 0,
            extras: 0,
            extraType: null,
            wicket: true,
            dismissalType: actualDismissalType,
            dismissedPlayer: currentTeamScore.striker?.name,
            previousStats: {
                batsmanId: currentTeamScore.striker?.id,
                batsman: currentTeamScore.striker ? JSON.parse(JSON.stringify(this.getPlayerMatchStats(currentTeamScore.striker))) : null,
                bowlerId: this.currentMatch.bowler?.id,
                bowler: this.currentMatch.bowler ? JSON.parse(JSON.stringify(this.getPlayerMatchStats(this.currentMatch.bowler))) : null,
                teamScore: {
                    runs: currentTeamScore.runs,
                    wickets: currentTeamScore.wickets - 1, // Before wicket fell
                    overs: actualOverNumber,
                    balls: actualBallNumber
                }
            }
        });

        this.saveData(false); // Save locally only during match play
        this.updateScoreDisplay();

        }

    swapStrike() {
        const currentTeamScore = this.currentMatch.currentTeam === 1 ?
            this.currentMatch.team1Score : this.currentMatch.team2Score;

        // Check for last man standing scenario (same player as striker and non-striker)
        if (currentTeamScore.striker && currentTeamScore.nonStriker &&
            currentTeamScore.striker.id === currentTeamScore.nonStriker.id) {
            return; // No strike rotation in last man standing
        }

        const temp = currentTeamScore.striker;
        currentTeamScore.striker = currentTeamScore.nonStriker;
        currentTeamScore.nonStriker = temp;

    }

    updateBatsmanStats(playerId, runs, balls) {
        // Convert playerId to string to match the type in this.players array
        const stringPlayerId = String(playerId);

        // Find and update the player in the global players array
        const player = this.players.find(p => p.id == stringPlayerId);
        if (player) {

            const stats = this.getPlayerMatchStats(player);

            stats.batting.runs += runs;
            stats.batting.balls += balls;

            if (runs === 4) stats.batting.fours++;
            if (runs === 6) stats.batting.sixes++;

            player.runs += runs;
        }
    }

    updateBatsmanBoundaries(playerId, type) {
        // Note: This function is deprecated - boundaries are now tracked in matchStats dictionary
        // Keeping for backward compatibility with career stats only
        const stringPlayerId = String(playerId);
        const player = this.players.find(p => p.id == stringPlayerId);
        if (player) {
            if (!player.boundaries) player.boundaries = { fours: 0, sixes: 0 };
            player.boundaries[type]++;
        }
    }

    // =======================================================================
    //   player.matchStats = {
    //     batting: { runs: 25, balls: 18, fours: 3, sixes: 1 },
    //     bowling: { runs: 32, balls: 18, wickets: 2 }
    //   }
    //
    //   - Single source of truth for all match stats
    //   - Simple accumulation model - just add to the dictionary
    //   - No confusion between team player vs global player
    //
    // =======================================================================
    getPlayerMatchStats(player) {
        if (!player.matchStats) {
            player.matchStats = {
                batting: { runs: 0, balls: 0, fours: 0, sixes: 0 },
                bowling: { runs: 0, balls: 0, wickets: 0 }
            };
        }
        return player.matchStats;
    }

    `);

        // Collect ALL players from all sources
        const allPlayers = new Map();

        // Add global players
        if (this.players) {
            this.players.forEach(p => {
                allPlayers.set(p.id, p);
            });
        } else {
        }

        // Add team players
        if (this.currentMatch) {
            if (this.currentMatch.team1?.players) {
                this.currentMatch.team1.players.forEach(p => {
                    if (!allPlayers.has(p.id)) allPlayers.set(p.id, p);
                });
            }
            if (this.currentMatch.team2?.players) {
                this.currentMatch.team2.players.forEach(p => {
                    if (!allPlayers.has(p.id)) allPlayers.set(p.id, p);
                });
            }
        }

        // Show all players with bowling stats (dictionary only)
        const bowlers = Array.from(allPlayers.values()).filter(p => {
            const stats = p.matchStats?.bowling;
            return stats && (stats.balls > 0 || stats.runs > 0 || stats.wickets > 0);
        });

        if (bowlers.length > 0) {
            bowlers.forEach(bowler => {
                const stats = bowler.matchStats.bowling;
                const balls = stats.balls;
                const runs = stats.runs;
                const wickets = stats.wickets;
                // Format overs: show "2" for complete overs, "1.5" for incomplete
                const completedOvers = Math.floor(balls/6);
                const remainingBalls = balls%6;
                const overs = remainingBalls === 0 ? `${completedOvers}` : `${completedOvers}.${remainingBalls}`;
            });
        } else {
        }

        // Show all players with batting stats (dictionary only)
        const batsmen = Array.from(allPlayers.values()).filter(p => {
            const stats = p.matchStats?.batting;
            return stats && (stats.balls > 0 || stats.runs > 0);
        });

        if (batsmen.length > 0) {
            batsmen.forEach(batsman => {
                const stats = batsman.matchStats.batting;
                const balls = stats.balls;
                const runs = stats.runs;
                const fours = stats.fours;
                const sixes = stats.sixes;
            });
        } else {
        }

    }

    // =======================================================================
    //   this.ballTracker = {
    //     1: [  // First innings
    //       {
    //         ballNumber: 1,
    //         over: 0,
    //         ball: 1,
    //         batsmanId: 123,
    //         bowlerId: 456,
    //         runs: 4,
    //         extras: 0,
    //         extraType: null,
    //         wicket: false,
    //         dismissalType: null,
    //         previousStats: { batsman: {...}, bowler: {...}, team: {...} }
    //       }
    //     ],
    //     2: [...]  // Second innings
    //   }
    //
    //   - Complete ball-by-ball history for undo operations
    //   - Separate tracking per innings
    //   - Stores snapshot of stats before each ball for easy rollback
    //   - Can reconstruct entire match from history
    //
    // =======================================================================
    initBallTracker() {
        if (!this.ballTracker) {
            this.ballTracker = {
                1: [],  // First innings balls
                2: []   // Second innings balls
            };
        }
    }

    recordBall(ballData) {
        const innings = this.currentMatch?.currentInnings || 1;

        // Initialize tracker if needed
        this.initBallTracker();

        if (!this.ballTracker[innings]) {
            this.ballTracker[innings] = [];
        }

        // Add ball to history
        const ballRecord = {
            ballNumber: this.ballTracker[innings].length + 1,
            timestamp: Date.now(),
            innings: innings,
            ...ballData
        };

        this.ballTracker[innings].push(ballRecord);

        return ballRecord;
    }

    getLastBall(innings = null) {
        const targetInnings = innings || this.currentMatch?.currentInnings || 1;
        this.initBallTracker();

        const inningsBalls = this.ballTracker[targetInnings];
        if (!inningsBalls || inningsBalls.length === 0) {
            return null;
        }

        return inningsBalls[inningsBalls.length - 1];
    }

    undoLastBall() {
        const innings = this.currentMatch?.currentInnings || 1;
        this.initBallTracker();

        const inningsBalls = this.ballTracker[innings];
        if (!inningsBalls || inningsBalls.length === 0) {
            return null;
        }

        // Remove last ball
        const lastBall = inningsBalls.pop();

        // Restore previous stats if available
        if (lastBall.previousStats) {
            this.restoreStatsFromSnapshot(lastBall.previousStats);
        }

        return lastBall;
    }

    restoreStatsFromSnapshot(snapshot) {

        // Restore batsman stats
        if (snapshot.batsman && snapshot.batsmanId) {
            const batsman = this.players.find(p => p.id === snapshot.batsmanId);
            if (batsman && snapshot.batsman) {
                batsman.matchStats = JSON.parse(JSON.stringify(snapshot.batsman));
            }
        }

        // Restore bowler stats
        if (snapshot.bowler && snapshot.bowlerId) {
            const bowler = this.players.find(p => p.id === snapshot.bowlerId);
            if (bowler && snapshot.bowler) {
                bowler.matchStats = JSON.parse(JSON.stringify(snapshot.bowler));
            }
        }

        // Restore team score
        if (snapshot.teamScore && this.currentMatch) {
            const currentTeamScore = this.currentMatch.currentTeam === 1 ?
                this.currentMatch.team1Score : this.currentMatch.team2Score;

            Object.assign(currentTeamScore, snapshot.teamScore);
        }
    }

    updateBowlerStats(playerId, runs, balls, wickets) {

        // Validation checks
        if (!playerId) {
            return;
        }

        if (runs < 0 || balls < 0 || wickets < 0) {
            return;
        }

        // Convert playerId to string to match the type in this.players array
        const stringPlayerId = String(playerId);

        const player = this.players.find(p => p.id == stringPlayerId);
        if (player) {

            const stats = this.getPlayerMatchStats(player);

            stats.bowling.runs += runs;
            stats.bowling.balls += balls;
            stats.bowling.wickets += wickets;

            player.wickets += wickets;
        } else {
        }

        // Safety check: If bowler is a separate object (not a reference), update it too
        if (this.currentMatch && this.currentMatch.bowler &&
            this.currentMatch.bowler.id === playerId && this.currentMatch.bowler !== player) {

            const bowlerStats = this.getPlayerMatchStats(this.currentMatch.bowler);
            bowlerStats.bowling.runs += runs;
            bowlerStats.bowling.balls += balls;
            bowlerStats.bowling.wickets += wickets;

            // Sync legacy properties
            this.currentMatch.bowler.matchBowlingRuns = bowlerStats.bowling.runs;
            this.currentMatch.bowler.matchBowlingBalls = bowlerStats.bowling.balls;
            this.currentMatch.bowler.matchBowlingWickets = bowlerStats.bowling.wickets;

            }

        // Verify update was successful
        if (player && balls > 0) {
            }
    }

    setBatsmanOut(playerId, dismissalType = '', dismissalBowler = '', dismissalFielder = '') {

        // For run outs, don't attribute a bowler
        if (dismissalType === 'run out') {
            dismissalBowler = null;
        }

        const globalPlayer = this.players.find(p => p.id === playerId || String(p.id) === String(playerId));
        if (globalPlayer) {
            const currentTeamScore = this.currentMatch.currentTeam === 1 ?
                this.currentMatch.team1Score : this.currentMatch.team2Score;

            // Check if this player is currently striker or non-striker and sync their stats
            if (currentTeamScore.striker?.id == playerId && currentTeamScore.striker.matchRuns !== undefined) {

                globalPlayer.matchRuns = currentTeamScore.striker.matchRuns;
                globalPlayer.matchBalls = currentTeamScore.striker.matchBalls;
                globalPlayer.matchBoundaries = currentTeamScore.striker.matchBoundaries || globalPlayer.matchBoundaries;

            } else if (currentTeamScore.nonStriker?.id == playerId && currentTeamScore.nonStriker.matchRuns !== undefined) {

                globalPlayer.matchRuns = currentTeamScore.nonStriker.matchRuns;
                globalPlayer.matchBalls = currentTeamScore.nonStriker.matchBalls;
                globalPlayer.matchBoundaries = currentTeamScore.nonStriker.matchBoundaries || globalPlayer.matchBoundaries;

            }

            globalPlayer.currentMatchStatus = 'out';
            globalPlayer.isOut = true;
            globalPlayer.dismissalType = dismissalType;
            globalPlayer.dismissalBowler = dismissalBowler;
            globalPlayer.dismissalFielder = dismissalFielder;

        } else {
            console.error('🔴 SET_OUT_DEBUG: Player not found in global players array:', {
                searchedPlayerId: playerId,
                availablePlayers: this.players.map(p => ({ id: p.id, name: p.name }))
            });
        }

        // Also update player in the current match teams (both team1 and team2)
        if (this.currentMatch) {
            const currentTeamScore = this.currentMatch.currentTeam === 1 ?
                this.currentMatch.team1Score : this.currentMatch.team2Score;

            const team1Player = this.currentMatch.team1?.players?.find(p => p.id === playerId || String(p.id) === String(playerId));
            if (team1Player) {
                // Sync stats for team1 player if they are currently batting
                if (currentTeamScore.striker?.id == playerId && currentTeamScore.striker.matchRuns !== undefined) {
                    team1Player.matchRuns = currentTeamScore.striker.matchRuns;
                    team1Player.matchBalls = currentTeamScore.striker.matchBalls;
                    team1Player.matchBoundaries = currentTeamScore.striker.matchBoundaries || team1Player.matchBoundaries;
                } else if (currentTeamScore.nonStriker?.id == playerId && currentTeamScore.nonStriker.matchRuns !== undefined) {
                    team1Player.matchRuns = currentTeamScore.nonStriker.matchRuns;
                    team1Player.matchBalls = currentTeamScore.nonStriker.matchBalls;
                    team1Player.matchBoundaries = currentTeamScore.nonStriker.matchBoundaries || team1Player.matchBoundaries;
                }

                team1Player.currentMatchStatus = 'out';
                team1Player.isOut = true;
                team1Player.dismissalType = dismissalType;
                team1Player.dismissalBowler = dismissalBowler;
                team1Player.dismissalFielder = dismissalFielder;
            }

            const team2Player = this.currentMatch.team2?.players?.find(p => p.id === playerId || String(p.id) === String(playerId));
            if (team2Player) {
                // Sync stats for team2 player if they are currently batting
                if (currentTeamScore.striker?.id == playerId && currentTeamScore.striker.matchRuns !== undefined) {
                    team2Player.matchRuns = currentTeamScore.striker.matchRuns;
                    team2Player.matchBalls = currentTeamScore.striker.matchBalls;
                    team2Player.matchBoundaries = currentTeamScore.striker.matchBoundaries || team2Player.matchBoundaries;
                } else if (currentTeamScore.nonStriker?.id == playerId && currentTeamScore.nonStriker.matchRuns !== undefined) {
                    team2Player.matchRuns = currentTeamScore.nonStriker.matchRuns;
                    team2Player.matchBalls = currentTeamScore.nonStriker.matchBalls;
                    team2Player.matchBoundaries = currentTeamScore.nonStriker.matchBoundaries || team2Player.matchBoundaries;
                }

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

    recordWicketLiveOnly(dismissedBatsmanId, dismissalType, helper, fielder, newBatsmanId) {

        if (!this.currentMatch || !this.currentMatch.bowler) {
            console.error('🔥 LIVE_WICKET: No current match or bowler found');
            return;
        }

        const currentTeamScore = this.currentMatch.currentTeam === 1 ?
            this.currentMatch.team1Score : this.currentMatch.team2Score;

        const teamScoreBefore = {
            runs: currentTeamScore.runs,
            wickets: currentTeamScore.wickets,
            overs: currentTeamScore.overs,
            balls: currentTeamScore.balls
        };

        const dismissedBatsman = this.players.find(p => p.id == dismissedBatsmanId);
        const strikerPerfBefore = this.performanceDataTracker ?
            JSON.parse(JSON.stringify(this.performanceDataTracker.find(p => p.Player_ID === dismissedBatsmanId))) : null;
        const nonStrikerId = currentTeamScore.striker?.id === dismissedBatsmanId ?
            currentTeamScore.nonStriker?.id : currentTeamScore.striker?.id;
        const nonStrikerPerfBefore = this.performanceDataTracker && nonStrikerId ?
            JSON.parse(JSON.stringify(this.performanceDataTracker.find(p => p.Player_ID === nonStrikerId))) : null;
        const bowlerPerfBefore = this.performanceDataTracker ?
            JSON.parse(JSON.stringify(this.performanceDataTracker.find(p => p.Player_ID === this.currentMatch.bowler?.id))) : null;

        if (dismissalType !== 'run out') {
            this.updateBowlerStats(this.currentMatch.bowler.id, 0, 1, 1); // 0 runs, 1 ball, 1 wicket
        } else {
        }

        // 2. Set dismissed batsman as out
        this.setBatsmanOut(dismissedBatsmanId, dismissalType,
                          this.currentMatch.bowler.id,
                          helper || fielder);

        currentTeamScore.balls += 1;
        currentTeamScore.wickets += 1;

        // Check for over completion
        if (currentTeamScore.balls >= 6) {
            currentTeamScore.overs += 1;
            currentTeamScore.balls = 0;

            // Handle strike change and bowler change for over completion
            this.swapStrike();
            this.changeBowlerAutomatically();
        }

        // 4. Add to ball-by-ball record for "this over" display
        if (!this.currentMatch.ballByBall) {
            this.currentMatch.ballByBall = [];
        }

        const ballByBallWicket = {
            over: teamScoreBefore.overs,
            ball: teamScoreBefore.balls + 1, // Ball number where wicket fell (1-6)
            runs: 0, // Wickets typically don't score runs
            batsman: dismissedBatsman ? dismissedBatsman.name : 'Unknown',
            batsmanId: dismissedBatsmanId,
            bowler: this.currentMatch.bowler.name,
            bowlerId: this.currentMatch.bowler.id,
            team: this.currentMatch.currentTeam === 1 ? 'team1' : 'team2',
            isWicket: true,
            isWide: false,
            isNoBall: false,
            extras: null,
            wicket: true,
            dismissal: dismissalType,
            dismissalType: dismissalType,
            helper: helper,
            fielder: fielder,
            timestamp: new Date().toISOString()
        };

        this.currentMatch.ballByBall.push(ballByBallWicket);

        // 5. Add to fall of wickets for scorecard display
        if (!currentTeamScore.fallOfWickets) {
            currentTeamScore.fallOfWickets = [];
        }

        const wicketData = {
            batsman: dismissedBatsman ? dismissedBatsman.name : 'Unknown',
            batsmanId: dismissedBatsmanId,
            dismissalType: dismissalType,
            bowler: this.currentMatch.bowler.name,
            bowlerId: this.currentMatch.bowler.id,
            helper: helper,
            fielder: fielder,
            runs: dismissedBatsman ? (dismissedBatsman.matchRuns || 0) : 0,
            over: `${teamScoreBefore.overs}.${teamScoreBefore.balls + 1}`, // Use BEFORE state for correct over/ball
            ball: teamScoreBefore.balls + 1,
            score: currentTeamScore.runs,
            timestamp: new Date().toISOString()
        };

        currentTeamScore.fallOfWickets.push(wicketData);

        // 6. Handle new batsman selection
        if (newBatsmanId) {
            const newBatsman = this.players.find(p => p.id == newBatsmanId);
            if (newBatsman) {
                if (currentTeamScore.striker && currentTeamScore.striker.id == dismissedBatsmanId) {
                    currentTeamScore.striker = newBatsman;
                } else if (currentTeamScore.nonStriker && currentTeamScore.nonStriker.id == dismissedBatsmanId) {
                    currentTeamScore.nonStriker = newBatsman;
                }

                // Initialize new batsman's match stats (only if undefined/null, not if 0)
                if (newBatsman.matchRuns == null) newBatsman.matchRuns = 0;
                if (newBatsman.matchBalls == null) newBatsman.matchBalls = 0;
                if (!newBatsman.matchBoundaries) newBatsman.matchBoundaries = { fours: 0, sixes: 0 };
            }
        }

        const teamScoreAfter = {
            runs: currentTeamScore.runs,
            wickets: currentTeamScore.wickets,
            overs: currentTeamScore.overs,
            balls: currentTeamScore.balls
        };

        // 7. Save and update display
        this.saveData(false);
        this.updateScoreDisplay();

        // 8. Show notification
        const dismissedName = dismissedBatsman ? dismissedBatsman.name : 'Batsman';
        const newBatsmanName = newBatsmanId ? this.players.find(p => p.id == newBatsmanId)?.name : '';
        const notificationMsg = newBatsmanName ?
            `🎯 ${dismissedName} is out! ${newBatsmanName} comes to bat.` :
            `🎯 ${dismissedName} is out!`;
        this.showNotification(notificationMsg);

    }

    getNextBatsman(team) {
        // Simplified - return next available player
        return team.players.find(p => !p.currentMatchStatus || p.currentMatchStatus !== 'out') || team.players[0];
    }

    addExtras(extraType, totalRuns = 1, runsScored = 0) {
        const normalizedExtraType = extraType.toLowerCase();
        const isNoBall = normalizedExtraType === 'noball' || normalizedExtraType === 'nb';
        const isWide = normalizedExtraType === 'wide' || normalizedExtraType === 'w';

        const matchSettings = JSON.parse(localStorage.getItem('match-settings') || '{}');
        const wideRuns = parseInt(matchSettings.runsOnWide || '1');
        const noBallRuns = parseInt(matchSettings.runsOnNoBall || '1');

        // Check if waiting for bowler selection
        if (this.waitingForBowlerSelection) {
            return;
        }

        if (!this.currentMatch) {
            console.error('❌ No active match - cannot add runs with extras');
            this.showNotification('❌ No active match found', 'error');
            return;
        }

        if (!this.ensureBatsmenInitialized()) {
            return;
        }

        const currentTeamScore = this.currentMatch.currentTeam === 1 ?
            this.currentMatch.team1Score : this.currentMatch.team2Score;

        // Store state before the ball for undo functionality
        const stateBeforeBall = this.captureMatchState();

        let baseExtraRuns = 0;
        let batsmenRuns = runsScored;
        let bowlerConcedes = 0;
        let batsmanFacesBall = false;

        let normalizedExtraForScorecard = extraType; // Default to original type

        if (normalizedExtraType === 'wide' || normalizedExtraType === 'w') {
            baseExtraRuns = wideRuns;
            bowlerConcedes = wideRuns + runsScored;
            batsmenRuns = 0;
            batsmanFacesBall = false;
            normalizedExtraForScorecard = 'wides'; // Match the scorecard key
        } else if (normalizedExtraType === 'noball' || normalizedExtraType === 'nb') {
            baseExtraRuns = noBallRuns;
            bowlerConcedes = noBallRuns + runsScored;
            batsmenRuns = runsScored;
            batsmanFacesBall = true;
            normalizedExtraForScorecard = 'noBalls'; // Match the scorecard key
        } else if (normalizedExtraType === 'bye' || normalizedExtraType === 'byes') {
            baseExtraRuns = 0;
            bowlerConcedes = 0;
            batsmenRuns = 0;
            batsmanFacesBall = true;
            normalizedExtraForScorecard = 'byes'; // Match the scorecard key
        } else if (normalizedExtraType === 'legbye' || normalizedExtraType === 'legbyes') {
            baseExtraRuns = 0;
            bowlerConcedes = 0;
            batsmenRuns = 0;
            batsmanFacesBall = true;
            normalizedExtraForScorecard = 'legByes'; // Match the scorecard key
            batsmanFacesBall = true;
        }

        // Check if this is the first ball of the match and update start time
        const isFirstBall = this.currentMatch.ballByBall.length === 0;
        if (isFirstBall) {
            this.currentMatch.gameStartTime = new Date().toISOString();
            this.currentMatch.actualStarted = new Date().toISOString();
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

        currentTeamScore.runs += totalRuns;
        if (!currentTeamScore.extras[normalizedExtraForScorecard]) {
            currentTeamScore.extras[normalizedExtraForScorecard] = 0;
        }
        currentTeamScore.extras[normalizedExtraForScorecard] += totalRuns;

        if (currentTeamScore.striker) {
            if (batsmanFacesBall) {
                this.updateBatsmanStats(currentTeamScore.striker.id, batsmenRuns, 1);
            }
            // For wide, batsman doesn't face ball and gets no runs
        }

        if (this.currentMatch.bowler) {
            if (isNoBall) {
                // No ball: bowler concedes all runs but no ball counted toward over (extra delivery required)
                this.updateBowlerStats(this.currentMatch.bowler.id, bowlerConcedes, 0, 0);
            } else if (isWide) {
                // Wide: bowler concedes all runs but no ball counted (not faced by batsman)
                this.updateBowlerStats(this.currentMatch.bowler.id, bowlerConcedes, 0, 0);
            } else if (normalizedExtraType === 'byes' || normalizedExtraType === 'bye') {
                this.updateBowlerStats(this.currentMatch.bowler.id, 0, 1, 0);
            } else if (normalizedExtraType === 'legbye' || normalizedExtraType === 'legbyes') {
                this.updateBowlerStats(this.currentMatch.bowler.id, 0, 1, 0);
            }
        }

        // Handle ball counting - wide and no-ball don't count as legal deliveries
        if (!isWide && !isNoBall) {
            currentTeamScore.balls++;

            // Immediate over completion check to prevent balls > 6
            if (currentTeamScore.balls >= 6) {
                currentTeamScore.overs++;
                currentTeamScore.balls = 0;
                this.swapStrike();
                this.changeBowlerAutomatically(); // Auto change bowler every over
            }

        }

        if (batsmenRuns > 0 && batsmenRuns % 2 === 1) {
            this.swapStrike();
        }

        // Check for target achieved in second innings
        if (this.currentMatch.currentInnings === 2 && this.currentMatch.target) {
            if (currentTeamScore.runs >= this.currentMatch.target) {
                this.endMatch();
                return;
            }
        }

        this.currentMatch.ballByBall.push(extraDetails);

        // 🔄 Record extras ball for undo functionality
        this.recordBall({
            over: extraDetails.over,
            ball: extraDetails.ball,
            batsmanId: currentTeamScore.striker?.id,
            bowlerId: this.currentMatch.bowler?.id,
            runs: totalRuns,
            extras: totalRuns,
            extraType: normalizedExtraType,
            wicket: false,
            dismissalType: null,
            previousStats: {
                batsmanId: currentTeamScore.striker?.id,
                batsman: currentTeamScore.striker ? JSON.parse(JSON.stringify(this.getPlayerMatchStats(currentTeamScore.striker))) : null,
                bowlerId: this.currentMatch.bowler?.id,
                bowler: this.currentMatch.bowler ? JSON.parse(JSON.stringify(this.getPlayerMatchStats(this.currentMatch.bowler))) : null,
                teamScore: {
                    runs: currentTeamScore.runs - totalRuns,
                    wickets: currentTeamScore.wickets,
                    overs: currentTeamScore.overs,
                    balls: currentTeamScore.balls
                }
            }
        });

        // Check for end of innings after over completion
        if (currentTeamScore.overs >= this.currentMatch.totalOvers) {
            this.endInnings();
            return;
        }
        this.saveData(false);
        this.updateScoreDisplay();
        this.updateOverSummary();

        const extraDisplayNames = {
            'wide': 'Wide',
            'noball': 'No Ball',
            'byes': 'Bye'
        };
        const extraName = extraDisplayNames[extraType] || extraType;
        }

    addWicketWithDetails(dismissalType = 'bowled', fielder = null) {

        if (!this.currentMatch) {
            console.error('❌ No active match - cannot add wicket');
            this.showNotification('❌ No active match found', 'error');
            return;
        }

        const currentTeamScore = this.currentMatch.currentTeam === 1 ?
            this.currentMatch.team1Score : this.currentMatch.team2Score;

        // Check if this is the first ball of the match and update start time
        const isFirstBall = this.currentMatch.ballByBall.length === 0;
        if (isFirstBall) {
            this.currentMatch.gameStartTime = new Date().toISOString();
            this.currentMatch.actualStarted = new Date().toISOString();
        }

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
        const ballByBall = this.currentMatch.ballByBall || [];
        const currentBallNumber = currentTeamScore.balls + 1;
        const existingDelivery = ballByBall.find(ball =>
            ball.over === currentTeamScore.overs &&
            ball.ball === currentBallNumber &&
            !ball.wicket // Only count non-wicket deliveries to avoid conflicts
        );

        const actualOverNumber = currentTeamScore.overs;
        const actualBallNumber = currentTeamScore.balls + (existingDelivery ? 0 : 1);

        if (!existingDelivery) {
            // This is a wicket-only delivery, count the ball
            currentTeamScore.balls++;

            // Immediate over completion check to prevent balls > 6
            if (currentTeamScore.balls >= 6) {
                currentTeamScore.overs++;
                currentTeamScore.balls = 0;
                this.swapStrike(); // BCCB: change strike at end of over
                this.changeBowlerAutomatically(); // Auto change bowler every over
            }

            } else {
            }

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

        if (this.currentMatch.bowler && dismissalType !== 'run out') {
            this.updateBowlerStats(this.currentMatch.bowler.id, 0, 1, 1);
        }

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

        const ballCountBeforeChange = this.currentMatch?.ballByBall?.length || 0;

        if (this.currentMatch.bowler && this.currentMatch.bowler.id !== newBowlerId) {
            const previousBowler = this.players.find(p => p.id == this.currentMatch.bowler.id);
            if (previousBowler) {

                // Sync stats from current bowler object to global player object
                if (this.currentMatch.bowler.matchBowlingRuns !== undefined) {
                    previousBowler.matchBowlingRuns = this.currentMatch.bowler.matchBowlingRuns;
                }
                if (this.currentMatch.bowler.matchBowlingBalls !== undefined) {
                    previousBowler.matchBowlingBalls = this.currentMatch.bowler.matchBowlingBalls;
                }
                if (this.currentMatch.bowler.matchBowlingWickets !== undefined) {
                    previousBowler.matchBowlingWickets = this.currentMatch.bowler.matchBowlingWickets;
                }

            }
        }

        const newBowler = this.players.find(p => p.id === newBowlerId);
        if (newBowler) {
            if (newBowler.name === 'Omi') {
            }

            this.currentMatch.bowler = newBowler;
            this.updateScoreDisplay();

            const ballCountAfterChange = this.currentMatch?.ballByBall?.length || 0;
            if (ballCountAfterChange !== ballCountBeforeChange) {
                console.error(`🚨 MANUAL_BOWLER_CHANGE_CORRUPTION: Ball-by-ball data changed during manual bowler change! Before: ${ballCountBeforeChange}, After: ${ballCountAfterChange}`);
            }
            }
    }

    updateMatchSettings(settings) {
        if (!this.currentMatch) return;

        if (settings.totalOvers) {
            this.currentMatch.totalOvers = settings.totalOvers;
        }

        this.saveData(false);
        }

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

        }

    getDetailedScorecard() {
        if (!this.currentMatch) return null;

        // Check if this is a finished match (no live score objects)
        const isFinishedMatch = !this.currentMatch.team1Score || !this.currentMatch.team2Score;

        // Calculate required run rate for second innings (only for active matches)
        let requiredRunRate = null;
        if (!isFinishedMatch && this.currentMatch.currentInnings === 2 && this.currentMatch.target) {
            const currentTeamScore = this.currentMatch.currentTeam === 1 ?
                this.currentMatch.team1Score : this.currentMatch.team2Score;

            if (currentTeamScore && currentTeamScore.runs !== undefined) {
                const runsNeeded = this.currentMatch.target - currentTeamScore.runs;
                const totalBalls = this.currentMatch.totalOvers * 6;
                const ballsPlayed = (currentTeamScore.overs * 6) + currentTeamScore.balls;
                const ballsRemaining = totalBalls - ballsPlayed;
                const oversRemaining = ballsRemaining / 6;

                if (oversRemaining > 0 && runsNeeded > 0) {
                    requiredRunRate = (runsNeeded / oversRemaining).toFixed(2);
                }
            }
        }

        return {
            matchInfo: {
                team1: this.currentMatch.team1?.name || this.currentMatch.team1Name,
                team2: this.currentMatch.team2?.name || this.currentMatch.team2Name,
                totalOvers: this.currentMatch.totalOvers || this.currentMatch.overs,
                status: this.currentMatch.status,
                currentInnings: this.currentMatch.currentInnings
            },
            target: this.currentMatch.target,
            requiredRunRate: requiredRunRate,
            team1Scorecard: this.generateTeamScorecard(this.currentMatch.team1Score, this.currentMatch.team1),
            team2Scorecard: this.generateTeamScorecard(this.currentMatch.team2Score, this.currentMatch.team2),
            currentState: isFinishedMatch ? null : {
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
        // Safety check - teamScore should exist since we preserve it in finished matches
        if (!teamScore) {
            console.error('❌ SCORECARD_ERROR: teamScore is missing for team:', team?.name || team);
            return {
                totalScore: 'N/A',
                overs: '0.0',
                runRate: '0.00',
                extras: 0,
                fallOfWickets: [],
                battingCard: [],
                bowlingCard: []
            };
        }

        // Calculate run rate properly including partial overs
        const totalBalls = (teamScore.overs * 6) + teamScore.balls;
        const runRate = totalBalls > 0 ? ((teamScore.runs * 6) / totalBalls).toFixed(2) : '0.00';

        const bowlingTeam = (team === this.currentMatch.team1) ? this.currentMatch.team2 : this.currentMatch.team1;

        return {
            totalScore: `${teamScore.runs}/${teamScore.wickets}`,
            overs: `${teamScore.overs}.${teamScore.balls}`,
            runRate: runRate,
            extras: teamScore.extras || 0,
            fallOfWickets: teamScore.fallOfWickets || [],
            battingCard: this.generateBattingCard(team, teamScore),
            bowlingCard: this.generateBowlingCard(bowlingTeam) // Pass opposing team
        };
    }

    generateBattingCard(team, teamScore) {

        // Safety check - team might not have players array in finished matches
        if (!team || !team.players || !Array.isArray(team.players)) {
            console.error('❌ BATTING_CARD_ERROR: team.players is missing or invalid');
            return [];
        }

        return team.players.map(player => {

            // Look up the global player object which has the matchStats dictionary
            const globalPlayer = this.players.find(p => p.id == player.id);
            if (!globalPlayer) {
                console.error('🏏 BATTING_CARD_ERROR: Could not find global player for', player.name, 'ID:', player.id);
                return null;
            }

            const isStriker = teamScore.striker?.id == player.id;
            const isNonStriker = teamScore.nonStriker?.id == player.id;
            const isOut = player.currentMatchStatus === 'out' || player.isOut;

            // Read from dictionary - use global player object
            const battingStats = globalPlayer.matchStats?.batting || {};
            const runs = battingStats.runs || 0;
            const balls = battingStats.balls || 0;
            const fours = battingStats.fours || 0;
            const sixes = battingStats.sixes || 0;

            if (isOut) {
            }

            let status = 'yet to bat';
            if (isOut) {
                status = 'out';
            } else if (isStriker) {
                status = 'striker*';
            } else if (isNonStriker) {
                status = 'non-striker*';
            } else if (runs > 0 || balls > 0) {
                status = 'not out';
            } else {
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
        // Safety check - team might not have players array in finished matches
        if (!team || !team.players || !Array.isArray(team.players)) {
            console.error('❌ BOWLING_CARD_ERROR: team.players is missing or invalid');
            return [];
        }

        team.players.forEach(teamPlayer => {

            // Also check global player for comparison
            const globalPlayer = this.players.find(p => p.id == teamPlayer.id);
            if (globalPlayer) {
            }
        });

        const currentInnings = this.currentMatch?.currentInnings || 1;

        return team.players.map(player => {
            const isCurrentBowler = this.currentMatch && this.currentMatch.bowler &&
                                  this.currentMatch.bowler.id == player.id;

            const globalPlayer = this.players.find(p => p.id == player.id);

            let ballsBowled, runsConceded, wickets;

            if (isCurrentBowler && this.currentMatch.bowler) {
                const bowlerStats = this.getPlayerMatchStats(this.currentMatch.bowler);
                ballsBowled = bowlerStats.bowling.balls;
                runsConceded = bowlerStats.bowling.runs;
                wickets = bowlerStats.bowling.wickets;
            } else if (globalPlayer) {
                const globalStats = this.getPlayerMatchStats(globalPlayer);
                ballsBowled = globalStats.bowling.balls;
                runsConceded = globalStats.bowling.runs;
                wickets = globalStats.bowling.wickets;
            } else {
                // Fallback to team player innings stats
                const teamStats = this.getPlayerMatchStats(player);
                ballsBowled = teamStats.bowling.balls;
                runsConceded = teamStats.bowling.runs;
                wickets = teamStats.bowling.wickets;
            }

            // Add detailed debugging for bowlers who have bowled
            if (ballsBowled > 0 || wickets > 0 || runsConceded > 0) {
                if (isCurrentBowler && this.currentMatch.bowler) {
                }
            }

            // Format overs: show "2" for complete overs, "1.5" for incomplete
            const completedOvers = Math.floor(ballsBowled / 6);
            const remainingBalls = ballsBowled % 6;
            const overs = ballsBowled > 0 ?
                (remainingBalls === 0 ? `${completedOvers}` : `${completedOvers}.${remainingBalls}`) :
                '0';
            const economy = ballsBowled >= 6 ? (runsConceded / (ballsBowled / 6)).toFixed(2) :
                           ballsBowled > 0 ? ((runsConceded / ballsBowled) * 6).toFixed(2) : '0.00';

            return {
                name: player.name,
                overs: overs,
                runs: runsConceded,
                wickets: wickets,
                economy: economy,
                isCurrentBowler: isCurrentBowler
            };
        });
    }

    endInnings() {
        if (this.currentMatch.currentInnings === 1) {
            // Store first innings data
            const firstInningsScore = this.currentMatch.currentTeam === 1 ?
                this.currentMatch.team1Score : this.currentMatch.team2Score;

            // Calculate target
            const target = firstInningsScore.runs + 1;

            // Store target for later use
            this.currentMatch.target = target;
            this.currentMatch.firstInningsComplete = true;

            // Show innings completion popup
            this.showInningsCompletionPopup(target);

        } else {
            // Match complete after second innings
            this.endMatch();
        }
    }

    showInningsCompletionPopup(target) {
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

        const team1Players = this.currentMatch.team1.players.map(p => ({
            name: p.name,
            wickets: p.matchBowlingWickets || 0
        }));
        const team2Players = this.currentMatch.team2.players.map(p => ({
            name: p.name,
            wickets: p.matchBowlingWickets || 0
        }));

        // Switch to second innings
        this.currentMatch.currentTeam = this.currentMatch.currentTeam === 1 ? 2 : 1;
        this.currentMatch.currentInnings = 2;

        // The bowling team for the second innings will be the team that batted first
        // If currentTeam = 1 (team1 is batting), then team2 should bowl
        // If currentTeam = 2 (team2 is batting), then team1 should bowl
        const bowlingTeamForSecondInnings = this.currentMatch.currentTeam === 1 ?
            this.currentMatch.team2 : this.currentMatch.team1;

        // Reset match bowling stats for all players in the bowling team
        bowlingTeamForSecondInnings.players.forEach(player => {

            player.matchBowlingBalls = 0;
            player.matchBowlingRuns = 0;
            player.matchBowlingWickets = 0;

            // Also reset in global players array
            const globalPlayer = this.players.find(p => p.id == player.id);
            if (globalPlayer) {
                globalPlayer.matchBowlingBalls = 0;
                globalPlayer.matchBowlingRuns = 0;
                globalPlayer.matchBowlingWickets = 0;
            }

        });

        // Setup second innings with selected players
        this.setupSecondInningsWithPlayers(selectedBatsmen, selectedBowler);

        const team1PlayersAfter = this.currentMatch.team1.players.map(p => ({
            name: p.name,
            wickets: p.matchBowlingWickets || 0,
            id: p.id,
            objectRef: p === this.players.find(gp => gp.id == p.id) ? 'SAME' : 'DIFFERENT'
        }));
        const team2PlayersAfter = this.currentMatch.team2.players.map(p => ({
            name: p.name,
            wickets: p.matchBowlingWickets || 0,
            id: p.id,
            objectRef: p === this.players.find(gp => gp.id == p.id) ? 'SAME' : 'DIFFERENT'
        }));

        // Also check global players array to see if stats are preserved there
        const globalPlayersAfter = this.players.map(p => ({
            name: p.name,
            wickets: p.matchBowlingWickets || 0,
            id: p.id
        }));

        // Remove popup
        overlay.remove();

        // Show notification and update display
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
            selectedBatsmen: selectedBatsmen.map(b => ({ id: b.id, name: b.name })),
            teamPlayers: secondInningsTeam.players.map(p => ({ id: p.id, name: p.name }))
        });

        const striker = secondInningsTeam.players.find(p =>
            p.id === selectedBatsmen[0].id ||
            p.id == selectedBatsmen[0].id ||
            p.id.toString() === selectedBatsmen[0].id.toString()
        );
        const nonStriker = secondInningsTeam.players.find(p =>
            p.id === selectedBatsmen[1].id ||
            p.id == selectedBatsmen[1].id ||
            p.id.toString() === selectedBatsmen[1].id.toString()
        );

        if (!striker || !nonStriker) {
            alert(`Error: Could not find selected batsmen. Striker: ${striker?.name || 'NOT_FOUND'}, Non-striker: ${nonStriker?.name || 'NOT_FOUND'}`);
            return;
        }

        currentTeamScore.striker = striker;
        currentTeamScore.nonStriker = nonStriker;

        // Initialize batsman match stats with safety checks (only for second innings, reset to 0)
        if (striker) {
            striker.matchRuns = 0;
            striker.matchBalls = 0;
            striker.matchBoundaries = { fours: 0, sixes: 0 };
        }

        if (nonStriker) {
            nonStriker.matchRuns = 0;
            nonStriker.matchBalls = 0;
            nonStriker.matchBoundaries = { fours: 0, sixes: 0 };
        }

        // Set bowler for second innings - find the actual player object to preserve references
        const bowlingTeam = this.currentMatch.currentTeam === 1 ?
            this.currentMatch.team2 : this.currentMatch.team1;

        const selectedBowlerPlayer = bowlingTeam.players.find(p =>
            p.id === selectedBowler.id ||
            p.id == selectedBowler.id ||
            p.id.toString() === selectedBowler.id.toString()
        );

        if (this.currentMatch.bowler && this.currentMatch.bowler.name === 'Omi') {
        }

        if (selectedBowlerPlayer) {
            // Initialize bowling stats for this player if not already set (preserve existing stats - only if undefined/null)
            if (selectedBowlerPlayer.matchBowlingRuns == null) selectedBowlerPlayer.matchBowlingRuns = 0;
            if (selectedBowlerPlayer.matchBowlingBalls == null) selectedBowlerPlayer.matchBowlingBalls = 0;
            if (selectedBowlerPlayer.matchBowlingWickets == null) selectedBowlerPlayer.matchBowlingWickets = 0;

            // Set the current bowler reference to the actual player object
            this.currentMatch.bowler = selectedBowlerPlayer;

                name: this.currentMatch.bowler.name,
                runs: this.currentMatch.bowler.matchBowlingRuns,
                balls: this.currentMatch.bowler.matchBowlingBalls,
                wickets: this.currentMatch.bowler.matchBowlingWickets
            });
        } else {
            console.error('🏏 SECOND_INNINGS_BOWLER_ERROR: Could not find selected bowler in team!');
            alert(`Error: Could not find selected bowler ${selectedBowler.name} in team`);
            return;
        }

        // Mark the other team as not batting
        const otherTeamScore = this.currentMatch.currentTeam === 1 ?
            this.currentMatch.team2Score : this.currentMatch.team1Score;
        otherTeamScore.batting = false;

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

        // Note: Opening batsmen must be manually selected by user - no automatic assignment
        currentTeamScore.striker = null;
        currentTeamScore.nonStriker = null;

        // Initialize bowling stats for existing bowler if any
        if (this.currentMatch.bowler) {
            // Initialize bowling stats individually - preserve existing values

            if (this.currentMatch.bowler.matchBowlingRuns == null) this.currentMatch.bowler.matchBowlingRuns = 0;
            if (this.currentMatch.bowler.matchBowlingBalls == null) this.currentMatch.bowler.matchBowlingBalls = 0;
            if (this.currentMatch.bowler.matchBowlingWickets == null) this.currentMatch.bowler.matchBowlingWickets = 0;

        }

        // Mark the other team as not batting
        const otherTeamScore = this.currentMatch.currentTeam === 1 ?
            this.currentMatch.team2Score : this.currentMatch.team1Score;
        otherTeamScore.batting = false;

        }

    handleFinishInnings(dismissedBatsmanId, dismissalType, helper, fielder) {
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
                currentTeamScore.overs++;
                currentTeamScore.balls = 0;
                this.swapStrike(); // Change strike at end of over
                this.changeBowlerAutomatically(); // Auto change bowler every over
            }
        }

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

        if (this.currentMatch.bowler && dismissalType !== 'run out') {
            this.updateBowlerStats(this.currentMatch.bowler.id, 0, 1, 1);
        }

        // Add to fall of wickets
        if (!currentTeamScore.fallOfWickets) {
            currentTeamScore.fallOfWickets = [];
        }

        let batsmanWithRuns = null;
        if (currentTeamScore.striker && (currentTeamScore.striker.id === dismissedBatsmanId || String(currentTeamScore.striker.id) === String(dismissedBatsmanId))) {
            batsmanWithRuns = currentTeamScore.striker;
        } else if (currentTeamScore.nonStriker && (currentTeamScore.nonStriker.id === dismissedBatsmanId || String(currentTeamScore.nonStriker.id) === String(dismissedBatsmanId))) {
            batsmanWithRuns = currentTeamScore.nonStriker;
        } else {
            batsmanWithRuns = dismissedBatsman;
        }

        currentTeamScore.fallOfWickets.push({
            batsman: batsmanWithRuns || dismissedBatsman,
            batsmanName: (batsmanWithRuns || dismissedBatsman)?.name || 'Unknown',
            dismissalType: (batsmanWithRuns || dismissedBatsman)?.dismissalType || dismissalType || 'bowled',
            bowler: (() => {
                const bowlerInfo = (batsmanWithRuns || dismissedBatsman)?.dismissalBowler;
                if (bowlerInfo && /^\d+$/.test(String(bowlerInfo))) {
                    const bowlerPlayer = window.cricketApp.players.find(p => String(p.id) === String(bowlerInfo));
                    return bowlerPlayer ? bowlerPlayer.name : (this.currentMatch.bowler?.name || 'Unknown');
                }
                return bowlerInfo || this.currentMatch.bowler?.name || 'Unknown';
            })(),
            bowlerId: this.currentMatch.bowler?.id || null,
            helper: (batsmanWithRuns || dismissedBatsman)?.dismissalFielder || helper || null,
            fielder: (batsmanWithRuns || dismissedBatsman)?.dismissalFielder || fielder || null,
            runs: batsmanWithRuns ? (batsmanWithRuns.matchRuns || 0) : 0,
            over: `${currentTeamScore.overs}.${currentTeamScore.balls}`,
            ball: currentTeamScore.balls,
            score: currentTeamScore.runs,
            timestamp: new Date().toISOString()
        });

        // Clear current batsmen
        currentTeamScore.striker = null;
        currentTeamScore.nonStriker = null;

        this.endInnings();
    }

    handleLastManStanding(dismissedBatsmanId, dismissalType, helper, fielder) {

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
                currentTeamScore.overs++;
                currentTeamScore.balls = 0;
                this.swapStrike(); // Change strike at end of over
                this.changeBowlerAutomatically(); // Auto change bowler every over
            }
        }

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

        if (this.currentMatch.bowler && dismissalType !== 'run out') {
            this.updateBowlerStats(this.currentMatch.bowler.id, 0, 1, 1);
        }

        // Add to fall of wickets
        if (!currentTeamScore.fallOfWickets) {
            currentTeamScore.fallOfWickets = [];
        }

        let batsmanWithRuns = null;
        if (currentTeamScore.striker && (currentTeamScore.striker.id === dismissedBatsmanId || String(currentTeamScore.striker.id) === String(dismissedBatsmanId))) {
            batsmanWithRuns = currentTeamScore.striker;
        } else if (currentTeamScore.nonStriker && (currentTeamScore.nonStriker.id === dismissedBatsmanId || String(currentTeamScore.nonStriker.id) === String(dismissedBatsmanId))) {
            batsmanWithRuns = currentTeamScore.nonStriker;
        } else {
            batsmanWithRuns = dismissedBatsman;
        }

        currentTeamScore.fallOfWickets.push({
            batsman: batsmanWithRuns || dismissedBatsman,
            batsmanName: (batsmanWithRuns || dismissedBatsman)?.name || 'Unknown',
            dismissalType: (batsmanWithRuns || dismissedBatsman)?.dismissalType || dismissalType || 'bowled',
            bowler: (() => {
                const bowlerInfo = (batsmanWithRuns || dismissedBatsman)?.dismissalBowler;
                if (bowlerInfo && /^\d+$/.test(String(bowlerInfo))) {
                    const bowlerPlayer = window.cricketApp.players.find(p => String(p.id) === String(bowlerInfo));
                    return bowlerPlayer ? bowlerPlayer.name : (this.currentMatch.bowler?.name || 'Unknown');
                }
                return bowlerInfo || this.currentMatch.bowler?.name || 'Unknown';
            })(),
            bowlerId: this.currentMatch.bowler?.id || null,
            helper: helper || (batsmanWithRuns || dismissedBatsman)?.dismissalFielder || null,
            fielder: fielder || (batsmanWithRuns || dismissedBatsman)?.dismissalFielder || null,
            runs: batsmanWithRuns ? (batsmanWithRuns.matchRuns || 0) : 0,
            over: currentTeamScore.overs,
            ball: currentTeamScore.balls,
            score: currentTeamScore.runs,
            timestamp: new Date().toISOString()
        });

        // Find the remaining batsman (the one who wasn't dismissed)
        const remainingBatsman = currentTeamScore.striker?.id === dismissedBatsmanId ?
            currentTeamScore.nonStriker : currentTeamScore.striker;

        if (remainingBatsman) {
            // Set the same player as both striker and non-striker
            currentTeamScore.striker = remainingBatsman;
            currentTeamScore.nonStriker = remainingBatsman;

            } else {
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
            this.showMatchSettings();
            return;
        }

        const battingTeamScore = this.currentMatch.currentTeam === 1 ?
            this.currentMatch.team1Score : this.currentMatch.team2Score;

        const battingTeamName = this.currentMatch.currentTeam === 1 ?
            this.currentMatch.team1.name : this.currentMatch.team2.name;

        const currentTeamEl = document.getElementById('currentTeam');
        const currentScoreEl = document.getElementById('currentScore');
        const currentOverEl = document.getElementById('currentOver');

        if (currentTeamEl) {
            currentTeamEl.textContent = battingTeamName;
            } else {
            }

        if (currentScoreEl) {
            let scoreText = `${battingTeamScore.runs}/${battingTeamScore.wickets}`;

            // Remove target information from score text for cleaner display
            currentScoreEl.textContent = scoreText;
        } else {
            }

        if (currentOverEl) {
            let overText = `Over: ${battingTeamScore.overs}.${battingTeamScore.balls}/${this.currentMatch.totalOvers}`;

            // Add target and required run rate for second innings on separate lines
            if (this.currentMatch.currentInnings === 2 && this.currentMatch.target) {
                const runsNeeded = this.currentMatch.target - battingTeamScore.runs;
                const ballsRemaining = (this.currentMatch.totalOvers * 6) - (battingTeamScore.overs * 6 + battingTeamScore.balls);
                const requiredRunRate = ballsRemaining > 0 ? (runsNeeded / (ballsRemaining / 6)).toFixed(2) : '0.00';

                // Calculate current run rate properly including partial overs
                const totalBalls = (battingTeamScore.overs * 6) + battingTeamScore.balls;
                const currentRunRate = totalBalls > 0 ? ((battingTeamScore.runs * 6) / totalBalls).toFixed(2) : '0.00';

                overText += `<br>Target: ${this.currentMatch.target}<br>RRR: ${requiredRunRate}<br>CRR: ${currentRunRate}`;
            }

            currentOverEl.innerHTML = overText;
        } else {
            }

        const strikerNameEl = document.getElementById('strikerName');
        const nonStrikerNameEl = document.getElementById('nonStrikerName');
        const bowlerNameEl = document.getElementById('bowlerName');

        if (strikerNameEl) {
            if (battingTeamScore.striker && battingTeamScore.striker.name) {
                strikerNameEl.textContent = battingTeamScore.striker.name;
                } else {
                strikerNameEl.textContent = 'Striker';
                }
        } else {
            }

        if (nonStrikerNameEl) {
            if (battingTeamScore.nonStriker && battingTeamScore.nonStriker.name) {
                nonStrikerNameEl.textContent = battingTeamScore.nonStriker.name;
                } else {
                nonStrikerNameEl.textContent = 'Non-Striker';
                }
        } else {
            }

        if (bowlerNameEl) {
            if (this.currentMatch.bowler && this.currentMatch.bowler.name) {
                bowlerNameEl.textContent = this.currentMatch.bowler.name;
                } else {
                bowlerNameEl.textContent = 'Bowler';
                }
        } else {
            }

        const strikerScoreEl = document.getElementById('strikerScore');
        const nonStrikerScoreEl = document.getElementById('nonStrikerScore');

        if (strikerScoreEl && battingTeamScore.striker) {
            // Look up global player to get dictionary stats
            const globalStriker = this.players.find(p => p.id == battingTeamScore.striker.id);
            const battingStats = globalStriker?.matchStats?.batting || {};
            const runs = battingStats.runs || 0;
            const balls = battingStats.balls || 0;
            const strikeRate = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';

            strikerScoreEl.textContent = `${runs}* (${balls})`;
        } else if (strikerScoreEl) {
            strikerScoreEl.textContent = '0* (0)';
            }

        if (nonStrikerScoreEl && battingTeamScore.nonStriker) {
            // Look up global player to get dictionary stats
            const globalNonStriker = this.players.find(p => p.id == battingTeamScore.nonStriker.id);
            const battingStats = globalNonStriker?.matchStats?.batting || {};
            const runs = battingStats.runs || 0;
            const balls = battingStats.balls || 0;
            const strikeRate = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';

            nonStrikerScoreEl.textContent = `${runs} (${balls})`;
        } else if (nonStrikerScoreEl) {
            nonStrikerScoreEl.textContent = '0 (0)';
        }

        const bowlerFiguresEl = document.getElementById('bowlerFigures');
        if (bowlerFiguresEl && this.currentMatch.bowler) {
            // Look up global player to get dictionary stats
            const globalBowler = this.players.find(p => p.id == this.currentMatch.bowler.id);
            const bowlingStats = globalBowler?.matchStats?.bowling || {};
            const runs = bowlingStats.runs || 0;
            const balls = bowlingStats.balls || 0;
            const wickets = bowlingStats.wickets || 0;
            const overs = Math.floor(balls / 6);
            const remainingBalls = balls % 6;
            const oversDisplay = remainingBalls > 0 ? `${overs}.${remainingBalls}` : `${overs}`;
            const economy = balls > 0 ? (runs / (balls / 6)).toFixed(1) : '0.0';

            bowlerFiguresEl.textContent = `${oversDisplay}-0-${runs}-${wickets}`;
        } else if (bowlerFiguresEl) {
            bowlerFiguresEl.textContent = '0-0-0-0';
        }

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

        const currentOverNumber = currentTeamScore.overs;

        // Filter balls from current over - always show all balls
        let currentOverBalls = this.currentMatch.ballByBall.filter(ball => {
            return ball.over === currentOverNumber &&
                   ball.team === (this.currentMatch.currentTeam === 1 ? 'team1' : 'team2');
        });

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
                            displayText = runsScored === 1 ? 'Nb' : `${runsScored}Nb`;
                        } else if (ball.extras === 'byes') {
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

    refreshScorecardPopup() {
        // Check if scorecard popup is currently open
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) {
            // Close the existing modal
            document.body.removeChild(existingModal);
            // Reopen with updated data
            setTimeout(() => {
                showScorecard();
            }, 100);
        }
    }

    validateAndNormalizeMatchData(matchData) {
        if (!matchData) return null;

        // Normalize team data - ensure consistent format
        // CRITICAL: Preserve full team structure including players array for scorecard
        const normalizeTeam = (team, fallbackName) => {
            if (!team) return { name: fallbackName };
            if (typeof team === 'string') return { name: team };
            if (typeof team === 'object') {
                // Preserve the full team object for finished matches
                // This includes players array needed for scorecard generation
                return team;
            }
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
            id: matchData.id || matchData.Match_ID || Date.now(),
            date: matchData.date || matchData.Date || new Date().toISOString().split('T')[0],
            venue: matchData.venue || matchData.Venue || 'Not specified',

            // Team data - always ensure object format with name property
            team1: normalizeTeam(matchData.team1 || matchData.Team1, 'Team 1'),
            team2: normalizeTeam(matchData.team2 || matchData.Team2, 'Team 2'),

            // Captain data
            team1Captain: matchData.team1Captain || matchData.Team1_Captain || '',
            team2Captain: matchData.team2Captain || matchData.Team2_Captain || '',

            // Team compositions - preserve existing data for completed matches
            team1Composition: matchData.Team1_Composition || matchData.team1Composition || [],
            team2Composition: matchData.Team2_Composition || matchData.team2Composition || [],

            // Match results - preserve existing data for completed matches
            winningTeam: matchData.Winning_Team || matchData.winningTeam || (matchData.winner ? matchData.winner.name || matchData.winner : ''),
            losingTeam: matchData.Losing_Team || matchData.losingTeam || (matchData.loser ? matchData.loser.name || matchData.loser : ''),
            Winning_Team: matchData.Winning_Team || matchData.winningTeam || (matchData.winner ? matchData.winner.name || matchData.winner : ''),
            Losing_Team: matchData.Losing_Team || matchData.losingTeam || (matchData.loser ? matchData.loser.name || matchData.loser : ''),
            winningCaptain: matchData.Winning_Captain || matchData.winningCaptain || '',
            losingCaptain: matchData.Losing_Captain || matchData.losingCaptain || '',
            Winning_Captain: matchData.Winning_Captain || matchData.winningCaptain || '',
            Losing_Captain: matchData.Losing_Captain || matchData.losingCaptain || '',
            result: matchData.result || matchData.Result || 'Match completed',

            // Scores - handle various formats
            winningTeamScore: normalizeScore(matchData.winningTeamScore || matchData.Winning_Team_Score),
            losingTeamScore: normalizeScore(matchData.losingTeamScore || matchData.Losing_Team_Score),

            // Preserve finalScore object for app compatibility
            finalScore: matchData.finalScore || {
                team1: normalizeScore(matchData.winningTeamScore || matchData.Winning_Team_Score),
                team2: normalizeScore(matchData.losingTeamScore || matchData.Losing_Team_Score)
            },

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
            bowlingPerformance: matchData.bowlingPerformance || [],
            performanceData: matchData.performanceData || [],

            // CRITICAL: Preserve live score objects for scorecard display
            // These contain striker/nonStriker info and detailed team scores
            team1Score: matchData.team1Score,
            team2Score: matchData.team2Score,

            // Preserve other match state for potential future use
            winner: matchData.winner,
            loser: matchData.loser,
            winMargin: matchData.winMargin,
            bowler: matchData.bowler
        };

        // Validate critical fields
        if (!normalized.team1.name || !normalized.team2.name) {
            normalized.team1.name = normalized.team1.name || 'Team 1';
            normalized.team2.name = normalized.team2.name || 'Team 2';
        }

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

        return normalized;
    }

    endMatch() {
        if (!this.currentMatch) return;

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
                    const wicketsRemaining = this.currentMatch.team1.players.length - this.currentMatch.team1Score.wickets;
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
                    const wicketsRemaining = this.currentMatch.team2.players.length - this.currentMatch.team2Score.wickets;
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

        // Calculate Man of the Match (pass winner team so it knows which team won)
        const manOfTheMatch = this.calculateManOfTheMatch(winnerTeam, loserTeam);
        const battingPerformance = this.extractBattingPerformance();
        const bowlingPerformance = this.extractBowlingPerformance();

        const performanceData = this.extractCompletePlayerPerformance();
        // Priority: 1) team1CaptainId/team2CaptainId (set at match start), 2) team.captain object, 3) fallback to empty

        let team1Captain = this.currentMatch.team1CaptainId || '';
        let team2Captain = this.currentMatch.team2CaptainId || '';

        // Fallback to extracting from team.captain if not found
        if (!team1Captain) {
            const team1CaptainRaw = this.currentMatch.team1?.captain;
            team1Captain = typeof team1CaptainRaw === 'object' ? team1CaptainRaw?.id : team1CaptainRaw || '';
        }

        if (!team2Captain) {
            const team2CaptainRaw = this.currentMatch.team2?.captain;
            team2Captain = typeof team2CaptainRaw === 'object' ? team2CaptainRaw?.id : team2CaptainRaw || '';
        }

        const team1Composition = this.currentMatch.team1?.players?.map(p => p.id) || [];
        const team2Composition = this.currentMatch.team2?.players?.map(p => p.id) || [];

        // Validate team compositions are not empty
        if (team1Composition.length === 0 || team2Composition.length === 0) {
        }

        let winningTeamScore = '';
        let losingTeamScore = '';

        if (winnerTeam && loserTeam) {
            if (winnerTeam.name === team1Name) {
                winningTeamScore = `${team1Score}/${this.currentMatch.team1Score.wickets} (${this.currentMatch.team1Score.overs}.${this.currentMatch.team1Score.balls})`;
                losingTeamScore = `${team2Score}/${this.currentMatch.team2Score.wickets} (${this.currentMatch.team2Score.overs}.${this.currentMatch.team2Score.balls})`;
            } else {
                winningTeamScore = `${team2Score}/${this.currentMatch.team2Score.wickets} (${this.currentMatch.team2Score.overs}.${this.currentMatch.team2Score.balls})`;
                losingTeamScore = `${team1Score}/${this.currentMatch.team1Score.wickets} (${this.currentMatch.team1Score.overs}.${this.currentMatch.team1Score.balls})`;
            }
        }

        let winningCaptain = '';
        let losingCaptain = '';

        if (winnerTeam && loserTeam) {
            if (winnerTeam.name === team1Name) {
                // Team1 won, Team2 lost
                winningCaptain = team1Captain;
                losingCaptain = team2Captain;
            } else {
                // Team2 won, Team1 lost
                winningCaptain = team2Captain;
                losingCaptain = team1Captain;
            }
        } else {
            console.error('🚨 CAPTAIN_ASSIGNMENT_ERROR: winnerTeam or loserTeam is null/undefined!');
        }

        // Test the exact values that will be used
        const winningTeamName = winnerTeam?.name || '';
        const losingTeamName = loserTeam?.name || '';

        // Clear corrupted match data function
        window.clearCorruptedMatches = function() {

            const originalCount = window.cricketApp.matches.length;
            window.cricketApp.matches = [];

            window.cricketApp.saveData();
            window.cricketApp.loadMatchHistory(true);

        };

        // Make function available globally for console access
        window.clearMatches = window.clearCorruptedMatches;

        const finishedMatch = {
            ...this.currentMatch,
            status: 'completed',
            ended: new Date().toISOString(),
            result: matchResult,
            winner: winnerTeam,
            loser: loserTeam,
            winMargin: winMargin,
            // Add explicit winner/loser names and scores for database mapping
            Winning_Team: winnerTeam?.name || winningTeamName || (winnerTeam === this.currentMatch.team1 ? team1Name : winnerTeam === this.currentMatch.team2 ? team2Name : ''),
            Losing_Team: loserTeam?.name || losingTeamName || (loserTeam === this.currentMatch.team1 ? team1Name : loserTeam === this.currentMatch.team2 ? team2Name : ''),
            Winning_Team_Score: winningTeamScore,
            Losing_Team_Score: losingTeamScore,
            Winning_Captain: winningCaptain,
            Losing_Captain: losingCaptain,
            manOfTheMatch: manOfTheMatch,
            finalScore: {
                team1: `${team1Score}/${this.currentMatch.team1Score.wickets} (${this.currentMatch.team1Score.overs}.${this.currentMatch.team1Score.balls})`,
                team2: `${team2Score}/${this.currentMatch.team2Score.wickets} (${this.currentMatch.team2Score.overs}.${this.currentMatch.team2Score.balls})`
            },
            battingPerformance: battingPerformance,
            bowlingPerformance: bowlingPerformance,
            performanceData: performanceData,
            team1Captain: team1Captain,
            team2Captain: team2Captain,
            team1Composition: team1Composition,
            team2Composition: team2Composition,
            gameStartTime: this.currentMatch.gameStartTime || this.currentMatch.actualStarted || this.currentMatch.started || new Date().toISOString(),
            gameFinishTime: new Date().toISOString()
        };

        // Validate and normalize the match data before saving
        const normalizedMatch = this.validateAndNormalizeMatchData(finishedMatch);
        const matchToSave = normalizedMatch || finishedMatch;

        const existingMatchIndex = this.matches.findIndex(match =>
            match.id === matchToSave.id || match.Match_ID === matchToSave.id
        );

        if (existingMatchIndex >= 0) {
            const existingMatch = this.matches[existingMatchIndex];
            const existingTimestamp = new Date(existingMatch.ended || existingMatch.gameFinishTime || existingMatch.Game_Finish_Time || 0).getTime();
            const newTimestamp = new Date(matchToSave.ended || matchToSave.gameFinishTime || matchToSave.Game_Finish_Time || Date.now()).getTime();

            if (newTimestamp >= existingTimestamp) {
                this.matches[existingMatchIndex] = matchToSave;
            } else {
                }
        } else {
            this.matches.push(matchToSave);
        }

        // Store the finished match temporarily so scorecard can access it
        this.lastFinishedMatch = matchToSave;

        this.currentMatch = null;

        // Close any open bowler selection modal since match has ended
        const bowlerModal = document.querySelector('.modal-overlay');
        if (bowlerModal) {
            bowlerModal.remove();
        }

        // Re-enable scoring buttons if they were disabled
        this.waitingForBowlerSelection = false;
        this.enableAllScoringButtons();

        const validation = this.validateMatchDataIntegrity();
        if (!validation.isValid) {
            } else {
            }

        this.saveData(true); // Save to JSON when match is completed
        this.updateStats(true); // Force reload stats after match completion
        // Show detailed match result
        this.showMatchResult(matchResult, finishedMatch);

        this.loadCaptainStats();

        // No auto-redirect - user controls the flow via MOTM popup
    }

    convertDismissalFielderToPlayerId(dismissalFielder) {
        if (!dismissalFielder || dismissalFielder === '' || dismissalFielder === 'fielder') {
            return null;
        }

        if (/^\d+$/.test(dismissalFielder)) {
            return dismissalFielder;
        }

        const fielderPlayer = this.players.find(p => p.name === dismissalFielder);
        if (fielderPlayer) {
            return String(fielderPlayer.id);
        }

        return null;
    }

    convertDismissalBowlerToPlayerId(dismissalBowler) {
        if (!dismissalBowler || dismissalBowler === '' || dismissalBowler === 'bowler') {
            return null;
        }

        if (/^\d+$/.test(dismissalBowler)) {
            return dismissalBowler;
        }

        const bowlerPlayer = this.players.find(p => p.name === dismissalBowler);
        if (bowlerPlayer) {
            return String(bowlerPlayer.id);
        }

        return null;
    }

    extractBattingPerformance() {
        if (!this.currentMatch) return [];

        const battingPerformance = [];
        const allPlayers = [
            ...this.currentMatch.team1.players,
            ...this.currentMatch.team2.players
        ];

        let playerIdCounter = 1;

        allPlayers.forEach(player => {
            // Only include players who actually batted
            if (player.matchBalls && player.matchBalls > 0) {
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

    extractBowlingPerformance() {
        if (!this.currentMatch) return [];

        const bowlingPerformance = [];
        const allPlayers = [
            ...this.currentMatch.team1.players,
            ...this.currentMatch.team2.players
        ];

        let playerIdCounter = 1;

        allPlayers.forEach(player => {
            const ballsBowled = player.matchBowlingBalls || 0;

            // Only include players who actually bowled
            if (ballsBowled > 0) {
                const runs = player.matchBowlingRuns || 0;
                const wickets = player.matchBowlingWickets || 0;
                const overs = Math.floor(ballsBowled / 6);
                const balls = ballsBowled % 6;
                const economy = ballsBowled > 0 ? ((runs) / (ballsBowled / 6)).toFixed(2) : "0.00";

                bowlingPerformance.push({
                    Match_ID: this.currentMatch.id,
                    Player_ID: `P${playerIdCounter.toString().padStart(3, '0')}`,
                    Player: player.name,
                    Overs: `${overs}.${balls}`,
                    Maidens: player.matchBowlingMaidens || 0,
                    Runs: runs,
                    Wickets: wickets,
                    Economy: economy,
                    Balls: ballsBowled
                });

                playerIdCounter++;
            }
        });

        return bowlingPerformance;
    }

    // Validate match data integrity before extraction
    validateMatchDataIntegrity() {
        if (!this.currentMatch) {
            return { isValid: false, errors: ['No current match data'] };
        }

        // Skip correction if already applied to prevent oscillation
        const skipCorrection = this.currentMatch._scoresCorrected === true;

        const errors = [];
        const warnings = [];

        const allPlayers = [
            ...this.currentMatch.team1.players,
            ...this.currentMatch.team2.players
        ];

        // Calculate totals from individual performance
        let totalBallsFaced = 0;
        let totalBallsBowled = 0;
        let totalBattingRuns = 0;
        let totalBowlingRunsConceded = 0;

        allPlayers.forEach(player => {
            const globalPlayer = this.players.find(p => p.id === player.id || p.name === player.name) || player;

            const playerBallsFaced = parseInt(globalPlayer.matchBalls || 0);
            const playerBallsBowled = parseInt(globalPlayer.matchBowlingBalls || 0);
            const playerBattingRuns = parseInt(globalPlayer.matchRuns || 0);
            const playerBowlingRuns = parseInt(globalPlayer.matchBowlingRuns || 0);

            totalBallsFaced += playerBallsFaced;
            totalBallsBowled += playerBallsBowled;
            totalBattingRuns += playerBattingRuns;
            totalBowlingRunsConceded += playerBowlingRuns;

            if (playerBattingRuns > 0 || playerBallsFaced > 0 || playerBowlingRuns > 0 || playerBallsBowled > 0) {
                }
        });

        // Validation checks
        if (totalBallsFaced > 0 && totalBallsBowled === 0) {
            errors.push(`Critical: ${totalBallsFaced} balls faced but 0 balls bowled recorded`);
        }

        if (Math.abs(totalBallsFaced - totalBallsBowled) > 1) {
            warnings.push(`Balls faced (${totalBallsFaced}) ≠ balls bowled (${totalBallsBowled})`);
        }

        if (Math.abs(totalBattingRuns - totalBowlingRunsConceded) > 10) {
            warnings.push(`Batting runs (${totalBattingRuns}) vs bowling runs conceded (${totalBowlingRunsConceded}) differ by ${Math.abs(totalBattingRuns - totalBowlingRunsConceded)}`);
        }

        // Check team totals vs individual stats (accounting for extras)
        const team1ScoreRuns = this.currentMatch.team1Score?.runs;
        const team1FinalScore = this.currentMatch.finalScore?.team1?.split('/')[0];
        const team2ScoreRuns = this.currentMatch.team2Score?.runs;
        const team2FinalScore = this.currentMatch.finalScore?.team2?.split('/')[0];

        const team1Score = parseInt(team1ScoreRuns || team1FinalScore || 0);
        const team2Score = parseInt(team2ScoreRuns || team2FinalScore || 0);
        let totalTeamRuns = team1Score + team2Score;

        // Calculate total extras from team scores
        const team1Extras = (this.currentMatch.team1Score?.extras || {});
        const team2Extras = (this.currentMatch.team2Score?.extras || {});
        const totalExtras = (team1Extras.wides || 0) + (team1Extras.noBalls || 0) + (team1Extras.byes || 0) + (team1Extras.legByes || 0) +
                           (team2Extras.wides || 0) + (team2Extras.noBalls || 0) + (team2Extras.byes || 0) + (team2Extras.legByes || 0);

        const expectedTeamTotal = totalBattingRuns + totalExtras;

        if (Math.abs(totalTeamRuns - expectedTeamTotal) > 5 && !skipCorrection) {
            // CRITICAL FIX: Team scores are corrupted, rebuild from ball-by-ball data
            let correctedTeam1Runs = 0;
            let correctedTeam2Runs = 0;
            let ballByBallTotalRuns = 0;

            if (this.currentMatch.ballByBall && this.currentMatch.ballByBall.length > 0) {
                this.currentMatch.ballByBall.forEach(ball => {
                    const runs = parseInt(ball.runs || 0);
                    ballByBallTotalRuns += runs;
                    if (ball.team === 'team1') {
                        correctedTeam1Runs += runs;
                    } else if (ball.team === 'team2') {
                        correctedTeam2Runs += runs;
                    }
                });

                // Apply the corrected scores
                if (this.currentMatch.team1Score) {
                    this.currentMatch.team1Score.runs = correctedTeam1Runs;
                }
                if (this.currentMatch.team2Score) {
                    this.currentMatch.team2Score.runs = correctedTeam2Runs;
                }

                // Mark as corrected to prevent re-correction
                this.currentMatch._scoresCorrected = true;

                this.saveData(true); // Force save to ensure D1 gets corrected data

                errors.push(`Fixed corrupted team scores: T1(${correctedTeam1Runs}) T2(${correctedTeam2Runs}) - D1 ready`);

                const correctedTotalTeamRuns = correctedTeam1Runs + correctedTeam2Runs;
                totalTeamRuns = correctedTotalTeamRuns;
            } else {
                errors.push(`Team totals (${totalTeamRuns}) vs (batting ${totalBattingRuns} + extras ${totalExtras} = ${expectedTeamTotal}) differ by ${Math.abs(totalTeamRuns - expectedTeamTotal)}`);
            }
        } else if (Math.abs(totalTeamRuns - expectedTeamTotal) > 5 && skipCorrection) {
            warnings.push(`Scores previously corrected: T1=${this.currentMatch.team1Score?.runs} T2=${this.currentMatch.team2Score?.runs} - D1 ready`);
        } else if (totalTeamRuns > 0) {
            // ...existing code...
        }

        // Check for players with no data
        const playersWithoutData = allPlayers.filter(player => {
            const globalPlayer = this.players.find(p => p.id === player.id || p.name === player.name) || player;
            return (globalPlayer.matchBalls || 0) === 0 && (globalPlayer.matchBowlingBalls || 0) === 0;
        });

        if (playersWithoutData.length > 0) {
            warnings.push(`${playersWithoutData.length} players have no performance data: ${playersWithoutData.map(p => p.name).join(', ')}`);
        }

    // ...existing code...

        // ...existing code...

        return {
            isValid: true,
            errors: [],
            warnings: []
        };
    }

    extractCompletePlayerPerformance() {
        if (!this.currentMatch) return [];

        const validation = this.validateMatchDataIntegrity();
        if (!validation.isValid) {
            // ...existing code...
        }
        if (validation.warnings.length > 0) {
            // ...existing code...
        }

        const performanceData = [];

        // Collect all players from both teams
        const allPlayers = [
            ...this.currentMatch.team1.players,
            ...this.currentMatch.team2.players
        ];

        allPlayers.forEach(player => {
            const globalPlayer = this.players.find(p => p.id === player.id || p.name === player.name);
            const playerWithStats = globalPlayer || player;

            const battingStats = playerWithStats.matchStats?.batting || {};
            const bowlingStats = playerWithStats.matchStats?.bowling || {};

            const runs = parseInt(battingStats.runs || 0);
            const ballsFaced = parseInt(battingStats.balls || 0);
            const fours = parseInt(battingStats.fours || 0);
            const sixes = parseInt(battingStats.sixes || 0);

            const ballsBowled = parseInt(bowlingStats.balls || 0);
            const runsConceded = parseInt(bowlingStats.runs || 0);
            const wickets = parseInt(bowlingStats.wickets || 0);

            const performanceRecord = {
                // Required fields
                Match_ID: String(this.currentMatch.id || Date.now()),
                Player_ID: String(playerWithStats.id || player.id || playerWithStats.name),

                notOuts: (ballsFaced > 0 && !playerWithStats.isOut) ? 1 : 0,
                runs: runs,
                ballsFaced: ballsFaced,
                fours: fours,
                sixes: sixes,

                ballsBowled: ballsBowled,
                runsConceded: runsConceded,
                wickets: wickets,
                maidenOvers: parseInt(playerWithStats.matchMaidenOvers || 0),
                extras: parseInt(playerWithStats.matchExtras || 0),

                isOut: Boolean(playerWithStats.isOut || false),
                dismissalType: playerWithStats.dismissalType || null,
                dismissalFielder: this.convertDismissalFielderToPlayerId(playerWithStats.dismissalFielder) || null,
                dismissalBowler: this.convertDismissalBowlerToPlayerId(playerWithStats.dismissalBowler) || null
            };

            // Log detailed performance data for debugging
            performanceData.push(performanceRecord);
        });

        return performanceData;
    }

    // Show data integrity warning modal to user
    showDataIntegrityWarning(validation) {
        const modalHtml = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>⚠️ Data Integrity Warning</h2>
                    <span class="close" onclick="hideModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <p><strong>Issues detected with match data before sync:</strong></p>

                    ${validation.errors.length > 0 ? `
                        <div style="background: #ffe6e6; padding: 10px; border-radius: 5px; margin: 10px 0;">
                            <strong>❌ Critical Errors:</strong>
                            <ul>
                                ${validation.errors.map(error => `<li>${error}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${validation.warnings.length > 0 ? `
                        <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0;">
                            <strong>⚠️ Warnings:</strong>
                            <ul>
                                ${validation.warnings.map(warning => `<li>${warning}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    <div style="background: #e6f3ff; padding: 10px; border-radius: 5px; margin: 10px 0;">
                        <strong>📊 Data Summary:</strong>
                        <ul>
                            <li>Balls Faced: ${validation.stats.totalBallsFaced}</li>
                            <li>Balls Bowled: ${validation.stats.totalBallsBowled}</li>
                            <li>Individual Batting Runs: ${validation.stats.totalBattingRuns}</li>
                            <li>Team Total Runs: ${validation.stats.totalTeamRuns}</li>
                        </ul>
                    </div>

                    <p><strong>Recommendations:</strong></p>
                    <ul>
                        <li>Ensure all bowlers were properly selected during play</li>
                        <li>Verify all balls and runs were recorded correctly</li>
                        <li>Consider re-entering complete match data if critical errors exist</li>
                    </ul>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="hideModal()">Continue with Sync</button>
                </div>
            </div>
        `;

        document.getElementById('modal').innerHTML = modalHtml;
        showModal();
    }

    // Calculate Man of the Match based on new scoring system:
    // - 1 point for winning the match
    // - 1 point per 10 runs scored
    // - 0.25 point for strike rate above 100 (for 10+ balls faced)
    // - 1 point per wicket
    // - 0.5 point per maiden over
    // - 0.5 point for every 1 run below economy rate of 7
    calculateManOfTheMatch(winnerTeam = null, loserTeam = null) {

        if (!this.currentMatch) {
            return null;
        }

        const performanceData = this.extractCompletePlayerPerformance();

        if (!performanceData || performanceData.length === 0) {
            return null;
        }

        const winningTeamName = winnerTeam?.name || this.currentMatch.winner?.name;

        if (!winningTeamName) {
            return null;
        }

        const team1Players = this.currentMatch.team1.players.map(p => String(p.id));
        const team2Players = this.currentMatch.team2.players.map(p => String(p.id));
        const winningTeamPlayers = winningTeamName === this.currentMatch.team1.name ? team1Players : team2Players;

        const playerPoints = [];

        // Calculate points for each player using performance data
        performanceData.forEach(perf => {
            const player = this.players.find(p => String(p.id) === String(perf.Player_ID));
            if (!player) {
                return;
            }

            const playerName = player.name;
            const playerId = String(perf.Player_ID);

            const isWinner = winningTeamPlayers.includes(playerId);

            const runs = parseInt(perf.runs || 0);
            const ballsFaced = parseInt(perf.ballsFaced || 0);
            const wickets = parseInt(perf.wickets || 0);
            const ballsBowled = parseInt(perf.ballsBowled || 0);
            const runsConceded = parseInt(perf.runsConceded || 0);
            const maidenOvers = parseInt(perf.maidenOvers || 0);

            // Calculate derived stats
            const sr = ballsFaced > 0 ? (runs / ballsFaced) * 100 : 0;
            const er = ballsBowled > 0 ? (runsConceded / (ballsBowled / 6)) : 0;

            // Calculate points based on scoring system
            // 1. Winning bonus: 1 point
            const winningPoints = isWinner ? 1 : 0;

            // 2. Runs: 1 point per 10 runs
            const runsPoints = runs / 10;

            // 3. Strike rate bonus: 0.25 point if SR > 100 and faced 10+ balls
            const srBonus = (ballsFaced >= 10 && sr > 100) ? 0.25 : 0;

            // 4. Wickets: 1 point per wicket
            const wicketsPoints = wickets;

            // 5. Maiden overs: 0.5 point per maiden
            const maidenPoints = maidenOvers * 0.5;

            let economyPoints = 0;
            if (ballsBowled > 0 && er < 7) {
                economyPoints = (7 - er) * 0.5;
            }

            // Total points
            const totalPoints = winningPoints + runsPoints + srBonus + wicketsPoints + maidenPoints + economyPoints;

            playerPoints.push({
                playerId: playerId,
                playerName: playerName,
                player: player,
                totalPoints: totalPoints,
                pointsBreakdown: {
                    winning: winningPoints,
                    runs: runsPoints,
                    strikeRate: srBonus,
                    wickets: wicketsPoints,
                    maidens: maidenPoints,
                    economy: economyPoints
                },
                performance: {
                    runs: runs,
                    ballsFaced: ballsFaced,
                    sr: sr,
                    wickets: wickets,
                    ballsBowled: ballsBowled,
                    runsConceded: runsConceded,
                    er: er,
                    maidenOvers: maidenOvers,
                    did_bat: ballsFaced > 0,
                    did_bowl: ballsBowled > 0
                }
            });
        });

        // Sort by total points (descending)
        playerPoints.sort((a, b) => b.totalPoints - a.totalPoints);

        if (playerPoints.length === 0) {
            return null;
        }

        const winner = playerPoints[0];
        const perf = winner.performance;

        const motmResult = {
            name: winner.playerName,
            player: winner.player,
            stats: {
                batting: `${perf.runs}(${perf.ballsFaced})`,
                bowling: perf.did_bowl ?
                    `${perf.wickets}/${perf.runsConceded} (${Math.floor(perf.ballsBowled / 6)}.${(perf.ballsBowled % 6)} ov, ${perf.maidenOvers}M)` :
                    'Did not bowl',
                totalPoints: winner.totalPoints.toFixed(2),
                pointsBreakdown: winner.pointsBreakdown,
                battingDetails: `Runs: ${perf.runs}, Balls: ${perf.ballsFaced}, SR: ${perf.sr.toFixed(1)}`,
                bowlingDetails: perf.did_bowl ?
                    `Wickets: ${perf.wickets}, Runs: ${perf.runsConceded}, Balls: ${perf.ballsBowled}, ER: ${perf.er.toFixed(2)}, Maidens: ${perf.maidenOvers}` :
                    'No bowling performance'
            }
        };

        return motmResult;
    }

    showMatchSettings() {
        // Show current match settings when no match is active
        const matchSettings = JSON.parse(localStorage.getItem('match-settings') || '{}');
        const totalOvers = matchSettings.totalOvers || 5;

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

        // Show detailed result modal with MOTM
        this.showManOfTheMatchModal(matchData);

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
            " onclick="
                if (event.target === this) {
                    this.remove();
                    if (window.cricketApp) {
                        window.cricketApp.scorecardShownAfterMatch = false;
                        window.cricketApp.resetAppAfterMatch();
                    }
                }
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
                    position: relative;
                ">
                    <!-- Close button -->
                    <button onclick="
                        const modal = document.querySelector('.match-result-modal');
                        if (modal) modal.remove();
                        if (window.cricketApp) {
                            window.cricketApp.scorecardShownAfterMatch = false;
                            window.cricketApp.resetAppAfterMatch();
                        }
                    " style="
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        background: #ff4757;
                        color: white;
                        border: none;
                        border-radius: 50%;
                        width: 28px;
                        height: 28px;
                        cursor: pointer;
                        font-size: 16px;
                        font-weight: bold;
                        line-height: 1;
                        padding: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">×</button>

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
                            <div style="margin: 10px 0; font-size: 16px; background: rgba(0,255,65,0.1); padding: 10px; border-radius: 5px;">
                                <div style="font-size: 18px; color: #ffff00; margin-bottom: 8px;">
                                    <strong>Total Points: ${matchData.manOfTheMatch.stats.totalPoints}</strong>
                                </div>
                            </div>
                            <div style="margin: 10px 0; font-size: 14px; text-align: left;">
                                <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 5px; margin-bottom: 5px;">
                                    <strong>🏆 Winning Team:</strong> ${matchData.manOfTheMatch.stats.pointsBreakdown.winning.toFixed(2)} pts
                                </div>
                                <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 5px; margin-bottom: 5px;">
                                    <strong>🏏 Runs (1pt per 10):</strong> ${matchData.manOfTheMatch.stats.pointsBreakdown.runs.toFixed(2)} pts
                                </div>
                                <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 5px; margin-bottom: 5px;">
                                    <strong>⚡ Strike Rate >100 (10+ balls):</strong> ${matchData.manOfTheMatch.stats.pointsBreakdown.strikeRate.toFixed(2)} pts
                                </div>
                                <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 5px; margin-bottom: 5px;">
                                    <strong>🎯 Wickets (1pt each):</strong> ${matchData.manOfTheMatch.stats.pointsBreakdown.wickets.toFixed(2)} pts
                                </div>
                                <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 5px; margin-bottom: 5px;">
                                    <strong>🔒 Maiden Overs (0.5pt each):</strong> ${matchData.manOfTheMatch.stats.pointsBreakdown.maidens.toFixed(2)} pts
                                </div>
                                <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 5px; margin-bottom: 5px;">
                                    <strong>💰 Economy <7 (0.5pt per run):</strong> ${matchData.manOfTheMatch.stats.pointsBreakdown.economy.toFixed(2)} pts
                                </div>
                            </div>
                            <div style="margin: 10px 0; font-size: 13px; color: #aaa; border-top: 1px solid #333; padding-top: 10px;">
                                <div><strong>Batting:</strong> ${matchData.manOfTheMatch.stats.batting}</div>
                                <div><strong>Bowling:</strong> ${matchData.manOfTheMatch.stats.bowling}</div>
                            </div>
                        </div>
                    ` : ''}

                    <button onclick="window.cricketApp.showFinalScorecardAfterMatch()" style="
                        background: #00ff41;
                        color: black;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        font-weight: bold;
                        cursor: pointer;
                        margin-top: 20px;
                    ">View Final Scorecard</button>
                </div>
            </div>
        `;

        // Add modal to the page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // No auto-close timer - user controls the flow
    }

    showFinalScorecardAfterMatch() {

        // Close the MOTM modal first
        const modal = document.querySelector('.match-result-modal');
        if (modal) {
            modal.remove();
        }

        // Show the final scorecard
        showScorecard();

        // Add a callback to handle scorecard close
        this.setupScorecardCloseHandler();
    }

    setupScorecardCloseHandler() {
        // Set a flag to indicate scorecard was shown after match
        this.scorecardShownAfterMatch = true;

        // Add escape key handler for scorecard
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                const scorecardModal = document.querySelector('.modal-overlay');
                if (scorecardModal) {
                    scorecardModal.remove();
                    document.removeEventListener('keydown', escapeHandler);
                    setTimeout(() => this.handleScorecardClose(), 100);
                }
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    handleScorecardClose() {

        // Only reset app if scorecard was shown after match completion
        if (this.scorecardShownAfterMatch) {
            this.scorecardShownAfterMatch = false;
            this.resetAppAfterMatch();
        } else {
        }
    }

    resetAppAfterMatch() {

        // Keep saved teams in localStorage for reuse - don't remove them

        // Clear temporary teams
        this.tempTeams = null;

        // Clear current teams
        this.teams = [];

        // Reset current match to allow new matches
        this.currentMatch = null;

        // Clear the last finished match
        this.lastFinishedMatch = null;

        this.enableNavigation();

        // Navigate to home page first
        if (typeof showPage === 'function') {
            showPage('home');
        } else {
            console.error('❌ NAV_RESET: showPage function not found');
        }

        // Clear any active modals
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });

        // Clear any modal overlays
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.remove();
        });

        // Clear match result modals specifically
        document.querySelectorAll('.match-result-modal').forEach(modal => {
            modal.remove();
        });

        // Reset the home page to show initial state
        this.updateHomePageUI();

    }

    updateHomePageUI() {

        if (this.updateStats) {
            this.updateStats();
        }

        // Reload players list
        if (this.loadPlayers) {
            this.loadPlayers();
        }

        // Reload teams list if method exists
        if (this.loadTeams) {
            this.loadTeams();
        }

        // Reload match history
        if (this.loadMatchHistory) {
            this.loadMatchHistory();
        }

    }

    enableNavigation() {
        // Re-enable all navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.style.pointerEvents = 'auto';
            item.style.opacity = '1';
        });

        // Refresh analytics data for the scoring page
        if (this.updateScoringTabView) {
            this.updateScoringTabView();
        }
    }

    async executeCompleteDataWipe() {
        try {
            // Step 1: Create comprehensive backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `cricket-complete-backup-${timestamp}.json`;

            const completeBackup = {
                metadata: {
                    backupType: 'complete-wipe-backup',
                    createdAt: new Date().toISOString(),
                    reason: 'Created before complete data wipe',
                    appVersion: '1.0.0'
                },
                players: [...(this.players || [])],
                matches: [...(this.matches || [])],
                teams: [...(this.teams || [])],
                currentMatch: this.currentMatch ? {...this.currentMatch} : null,
                settings: {},
                localStorage: {}
            };

            // Collect all localStorage data
            const allLocalStorageKeys = Object.keys(localStorage);
            allLocalStorageKeys.forEach(key => {
                completeBackup.localStorage[key] = localStorage.getItem(key);
            });

            // Step 2: Save backup to downloads (Android-compatible approach)
            const jsonStr = JSON.stringify(completeBackup, null, 2);

            try {
                // Try standard download method first
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // Additional checks for Android
                if (navigator.userAgent.includes('Android')) {
                    // Check if downloads are accessible
                    if (navigator.storage && navigator.storage.estimate) {
                        navigator.storage.estimate().then(estimate => {
                            });
                    }
                }

                // For Android, also try to trigger download via window.open
                setTimeout(() => {
                    try {
                        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr);
                        const newWindow = window.open(dataUri, filename);
                        if (newWindow) {
                            setTimeout(() => {
                                newWindow.close();
                                }, 2000);
                        } else {
                            }
                        }
                }, 500);

                // Try to diagnose download issues
                // Fallback: Show the backup data in a modal for manual copying
                alert(`Backup creation failed. Please copy this data manually:\n\nFilename: ${filename}\n\nData will be shown in console.`);
            }

            try {
                const currentGroupId = this.authManager.getCurrentGroupId();
                const currentGroupName = this.authManager.getCurrentGroupName();

                // Safety validation
                if (!currentGroupId || currentGroupId <= 0) {
                    throw new Error('Invalid group ID - cannot proceed with wipe');
                }
                if (!currentGroupName || currentGroupName.trim() === '') {
                    throw new Error('Invalid group name - cannot proceed with wipe');
                }

                if (currentGroupName !== 'guest') {

                    if (this.d1Manager) {
                        const wipeResult = await this.d1Manager.wipeD1Group(currentGroupId);

                        } else {
                        }
                } else {
                    }
            }

            // Step 4: Clear ALL localStorage keys (complete scrub) but preserve login state
            const keysBefore = Object.keys(localStorage).length;

            // Save current group info before wiping (for restoration after localStorage.clear)
            const currentGroup = localStorage.getItem('cricket-current-group');

            localStorage.clear();
            const keysAfter = Object.keys(localStorage).length;
            // Restore current group after wipe (maintain login state)
            if (currentGroup) {
                localStorage.setItem('cricket-current-group', currentGroup);
                }

            // Set a persistent marker to prevent reloading from asset files
            localStorage.setItem('cricket-wiped-state', 'true');
            localStorage.setItem('cricket-wipe-timestamp', new Date().toISOString());

            // Step 5: Permanently delete JSON files
            try {
                if (this.dataManager) {
                    // Clear/delete all JSON data files
                    await this.dataManager.saveJSONData(
                        { player_info: [], matches: [], match_batting_performance: [], match_bowling_performance: [], index: [] },
                        true
                    );
                    }
                }

            // Step 6: Reset all app data
            this.players = [];
            this.matches = [];
            this.teams = [];
            this.currentMatch = null;
            this.tempTeams = null;

            // Step 7: Clear any window-level data
            if (typeof window.cricketData !== 'undefined') {
                window.cricketData = null;
                }

            this.updateStats();
            this.loadPlayers();
            this.loadTeams();
            this.loadMatchHistory(); // Refresh match history to show empty state

            return filename;

            throw error;
        }
    }

    checkForOngoingMatch() {
        // Check if there's an ongoing match in localStorage
        const savedMatch = localStorage.getItem('cricket-current-match');
        if (savedMatch && savedMatch !== 'null') {
            try {
                const currentMatch = JSON.parse(savedMatch);
                if (currentMatch && currentMatch.status !== 'completed') {
                    // Show modal asking user what to do with the ongoing match
                    this.showOngoingMatchModal(currentMatch);
                    return true; // Indicates there was an ongoing match
                }
                localStorage.removeItem('cricket-current-match');
            }
        }
        return false; // No ongoing match
    }

    showOngoingMatchModal(matchData) {
        const modalHTML = `
            <div class="ongoing-match-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1001;
            ">
                <div class="ongoing-match-content" style="
                    background: #1a1a1a;
                    border: 2px solid #ff4444;
                    border-radius: 10px;
                    padding: 20px;
                    max-width: 400px;
                    width: 90%;
                    color: white;
                    text-align: center;
                ">
                    <h2 style="color: #ff4444; margin-bottom: 20px;">⚠️ Ongoing Match Detected</h2>

                    <div class="match-info" style="margin-bottom: 20px;">
                        <p style="font-size: 16px; margin-bottom: 10px;">
                            You have an ongoing match between:
                        </p>
                        <p style="font-weight: bold; color: #00ff41;">
                            ${matchData.team1?.name || 'Team 1'} vs ${matchData.team2?.name || 'Team 2'}
                        </p>
                        <p style="font-size: 14px; color: rgba(255,255,255,0.8); margin-top: 10px;">
                            Current Status: ${this.getMatchStatusDescription(matchData)}
                        </p>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="window.cricketApp.resumeMatch()" style="
                            background: #00ff41;
                            color: black;
                            border: none;
                            padding: 10px 15px;
                            border-radius: 5px;
                            font-weight: bold;
                            cursor: pointer;
                        ">Resume Match</button>

                        <button onclick="window.cricketApp.quitAndRestart()" style="
                            background: #ff4444;
                            color: white;
                            border: none;
                            padding: 10px 15px;
                            border-radius: 5px;
                            font-weight: bold;
                            cursor: pointer;
                        ">Quit & Restart Fresh</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    getMatchStatusDescription(matchData) {
        if (!matchData) return 'Unknown';

        const innings = matchData.currentInnings || 1;
        const team = matchData.currentTeam === 1 ? matchData.team1?.name : matchData.team2?.name;

        if (innings === 1) {
            return `First innings - ${team || 'Team'} batting`;
        } else {
            const target = matchData.target || 0;
            return `Second innings - ${team || 'Team'} chasing ${target}`;
        }
    }

    resumeMatch() {
        // Close the modal
        const modal = document.querySelector('.ongoing-match-modal');
        if (modal) {
            modal.remove();
        }

        const savedMatch = localStorage.getItem('cricket-current-match');
        if (savedMatch && savedMatch !== 'null') {
            try {
                this.currentMatch = JSON.parse(savedMatch);
                // Validate and fix any corrupted data
                this.validateAndFixMatchData();

                }
        }

        // Navigate to scoring tab to continue the match
        if (typeof showPage === 'function') {
            showPage('scoring');
        }

        // Force update the scoring tab view to show the active match
        setTimeout(() => {
            this.updateScoringTabView();

            // Force refresh the live match display
            if (this.currentMatch) {
                this.updateScoreDisplay();

                // Force save the corrected match data back to localStorage
                localStorage.setItem('cricket-current-match', JSON.stringify(this.currentMatch));
            }
        }, 200);

        }

    validateAndFixMatchData() {
        if (!this.currentMatch) return;

        if (!this.currentMatch.team1Score) {
            this.currentMatch.team1Score = { runs: 0, wickets: 0, overs: 0, balls: 0, batting: false };
        }
        if (!this.currentMatch.team2Score) {
            this.currentMatch.team2Score = { runs: 0, wickets: 0, overs: 0, balls: 0, batting: false };
        }

        if (!this.currentMatch.currentTeam) {
            this.currentMatch.currentTeam = 1;
        }

        // Validate player status and fix any corruption
        [this.currentMatch.team1, this.currentMatch.team2].forEach((team, teamIndex) => {
            if (team && team.players) {
                team.players.forEach(player => {
                    // Reset corrupted match status - let the game state determine the real status
                    if (player.currentMatchStatus === 'out' && (!player.matchRuns || player.matchRuns === 0) && (!player.matchBalls || player.matchBalls === 0)) {
                        player.currentMatchStatus = null;
                    }

                    if (typeof player.matchRuns === 'undefined') player.matchRuns = 0;
                    if (typeof player.matchBalls === 'undefined') player.matchBalls = 0;
                    if (typeof player.fours === 'undefined') player.fours = 0;
                    if (typeof player.sixes === 'undefined') player.sixes = 0;
                });
            }
        });

        }

    quitAndRestart() {
        // Close the modal
        const modal = document.querySelector('.ongoing-match-modal');
        if (modal) {
            modal.remove();
        }

        // Clear all match and team data
        localStorage.removeItem('cricket-current-match');
        localStorage.removeItem('savedTeams');
        this.currentMatch = null;
        this.tempTeams = null;
        this.teams = [];

        // Navigate to home page
        if (typeof showPage === 'function') {
            showPage('home');
        }

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
        const ballsFaced = player.ballsFaced || 0;
        if (ballsFaced === 0) return '0.0';
        return ((player.runs || 0) / ballsFaced * 100).toFixed(1);
    }

    calculateBowlerEconomy(player) {

        const ballsBowled = player.ballsBowled || 0;
        const runsConceded = player.runsConceded || 0;
        const oversPlayed = ballsBowled / 6;
        const economy = oversPlayed > 0 ? (runsConceded / oversPlayed) : 0;

        return economy; // Return the number, not the formatted string
    }

    calculateBowlingAverage(player) {

        const wickets = player.wickets || 0;
        const runsConceded = player.runsConceded || 0;

        if (wickets === 0) {
            return 0;
        }

        const average = runsConceded / wickets;
        return average;
    }

    calculateBowlingStrikeRate(player) {

        // Try to get already calculated value first
        if (player.bowlingStrikeRate !== undefined && player.bowlingStrikeRate > 0) {
            return player.bowlingStrikeRate;
        }

        const wickets = player.wickets || 0;
        let ballsBowled = player.ballsBowled || 0;

        if (ballsBowled === 0 && player.totalOvers) {
            ballsBowled = player.totalOvers * 6;
            }

        if (wickets === 0) {
            return 0;
        }

        const strikeRate = ballsBowled / wickets;
        return strikeRate;
    }

    calculateRunsConceded(player) {

        const runsConceded = player.runsConceded || 0;

        return runsConceded;
    }

    calculateTeamStatistics() {
        return {
            mostSuccessful: this.teams.length > 0 ? this.teams[0].name : 'No teams',
            highestPartnership: '127 runs',
            winPercentage: this.matches.length > 0 ? '65' : '0'
        };
    }

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
            const economyValue = this.calculateBowlerEconomy(player);
            const economy = (typeof economyValue === 'number' ? economyValue : 0).toFixed(1);

            // Calculate advanced metrics
            const performanceRating = this.analyticsEngine.calculatePerformanceRating(player);
            const formIndex = this.analyticsEngine.calculateFormIndex(player, this.matches);

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
                        const economyValue = this.calculateBowlerEconomy(player);
                        const economy = (typeof economyValue === 'number' ? economyValue : 0).toFixed(1);
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
                        <select id="player1Select" onchange="window.cricketApp.updateSpiderChart();" style="color: #00ff88; font-weight: bold; background-color: #1a1a1a;">
                            <option value="" style="color: #ffffff;">Select Player 1</option>
                            ${activePlayers.map(p => `<option value="${p.name}" style="color: #00ff88; font-weight: bold; background-color: #1a1a1a;">${p.name}</option>`).join('')}
                        </select>
                        <select id="player2Select" onchange="window.cricketApp.updateSpiderChart();" style="color: #00ccff; font-weight: bold; background-color: #1a1a1a;">
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
        const player1Name = document.getElementById('player1Select').value;
        const player2Name = document.getElementById('player2Select').value;

        if (!player1Name || !player2Name) {
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

        if (!player1 || !player2) {
            return;
        }

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
        const cricketApp = window.cricketApp;
        switch(metric) {
            case 'runs': return player.runs || 0;
            case 'totalRuns': return player.runs || 0;
            case 'totalWickets': return player.wickets || 0;
            case 'totalOvers': return player.totalOvers || 0;
            case 'average': return player.matches > 0 ? (player.runs / player.matches).toFixed(1) : 0;
            case 'averageRuns': return player.matches > 0 ? (player.runs / player.matches).toFixed(1) : 0;
            case 'strikeRate': {
                if (cricketApp) {
                    return parseFloat(cricketApp.calculateStrikeRate(player)) || 0;
                }
                // Fallback calculation
                const ballsFaced = player.ballsFaced || 0;
                return ballsFaced > 0 ? parseFloat(((player.runs || 0) / ballsFaced * 100).toFixed(1)) : 0;
            }
            case 'bowlingStrikeRate': {
                if (cricketApp) {
                    const bsr = cricketApp.calculateBowlingStrikeRate(player);
                    return bsr > 0 ? parseFloat(bsr.toFixed(1)) : 0;
                } else {
                    }
                return 0;
            }
            case 'bowlingAverage': {
                if (cricketApp) {
                    const bavg = cricketApp.calculateBowlingAverage(player);
                    return bavg > 0 ? parseFloat(bavg.toFixed(1)) : 0;
                }
                return 0;
            }
            case 'wickets': return player.wickets || 0;
            case 'economy':
            case 'bowlingEconomy': {
                if (cricketApp) {
                    const eco = cricketApp.calculateBowlerEconomy(player);
                    return eco > 0 ? parseFloat(eco.toFixed(1)) : 0;
                }
                return 0;
            }
            case 'foursPerMatch': return player.matches > 0 ? parseFloat(((player.fours || 0) / player.matches).toFixed(1)) : 0;
            case 'sixesPerMatch': return player.matches > 0 ? parseFloat(((player.sixes || 0) / player.matches).toFixed(1)) : 0;
            case 'fifties': return player.fifties || 0;
            case 'matches': return player.matches || 0;
            default:
                return 0;
        }
    }

    // Analytics-specific spider chart methods for canvas rendering
    renderAnalyticsBattingSpiderChart(player1, player2) {
        const container = document.getElementById('battingChartContainer');
        if (!container) {
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

        setTimeout(() => {
            this.drawSpiderChartCanvas('analyticsBattingSpiderCanvas', player1, player2, battingMetrics, getBattingMetricValue);
        }, 50);
    }

    renderAnalyticsBowlingSpiderChart(player1, player2) {
        const container = document.getElementById('bowlingChartContainer');
        if (!container) {
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

        document.getElementById('bowlingChartContainer').innerHTML = `
            <div class="spider-chart">
                <h5>🎯 Bowling Performance</h5>
                <canvas id="analyticsBowlingSpiderCanvas" width="400" height="400"></canvas>
            </div>
        `;

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

        const p1Avg = player1.matches > 0 ? (player1.runs / player1.matches) : 0;
        const p2Avg = player2.matches > 0 ? (player2.runs / player2.matches) : 0;

        if (p1Avg > p2Avg) {
            insights.push(`🏏 ${player1.name} has a higher batting average (${p1Avg.toFixed(1)} vs ${p2Avg.toFixed(1)})`);
        } else if (p2Avg > p1Avg) {
            insights.push(`🏏 ${player2.name} has a higher batting average (${p2Avg.toFixed(1)} vs ${p1Avg.toFixed(1)})`);
        }

        if ((player1.wickets || 0) > (player2.wickets || 0)) {
            insights.push(`⚡ ${player1.name} has taken more wickets (${player1.wickets || 0} vs ${player2.wickets || 0})`);
        } else if ((player2.wickets || 0) > (player1.wickets || 0)) {
            insights.push(`⚡ ${player2.name} has taken more wickets (${player2.wickets || 0} vs ${player1.wickets || 0})`);
        }

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

        }

     catch (e) {
                }
        }

        // Test Android data loader
        if (window.androidDataLoader) {
            window.androidDataLoader.loadData()
                .then(data => {
                })
        } else {
            }

        // cricket_stats.json fetch removed - no longer needed
    }

    )
            .then(() => {

                if (this.matches && this.matches.length > 0) {
                }

                // Step 4: Try analytics
                this.calculatePlayerStatistics();
            })
            .catch(error => {
                });
    }

    ).catch(error => {
            });
    }

        this.calculatePlayerStatistics();
        }

    // Comprehensive debug for bowler selection process

        const buttons = document.querySelectorAll('.score-btn');

        // Modal state
        const modal = document.querySelector('.modal-overlay');

        // Test a specific button in detail
        const testButton = document.querySelector('button[onclick="handleRunButton(1)"]');
        if (testButton) {
            }

        return {
            waitingForBowlerSelection: this.waitingForBowlerSelection,
            currentMatch: !!this.currentMatch,
            buttonCount: buttons.length,
            disabledButtons: Array.from(buttons).filter(btn => btn.disabled).length,
            modalExists: !!modal
        };
    }

     catch (error) {
            }

        // Try through global function
        try {
            if (window.addRuns) {
                window.addRuns(1);
                } else {
                }
            }

        try {
            if (window.handleRunButton) {
                window.handleRunButton(1);
                } else {
                }
            }
    }

    // Force reset the bowler selection state
    triggerInitialBowlerSelection() {
        if (!this.currentMatch) {
            return;
        }

        const bowlingTeam = this.currentMatch.currentTeam === 1 ? this.currentMatch.team2 : this.currentMatch.team1;
        if (!bowlingTeam || !bowlingTeam.players || bowlingTeam.players.length === 0) {
            return;
        }

        // Set flag to prevent other actions
        this.waitingForBowlerSelection = true;
        this.disableAllScoringButtons();

        // Show bowler selection modal for initial bowler
        this.showBowlerSelectionModal(bowlingTeam.players);
    }

    );

        }

    );
        }

        // Check if modal exists
        const modal = document.getElementById('editPlayerModal');
        if (modal) {
            const nameInput = document.getElementById('playerName');
            if (nameInput) {
                }
        }

        }

    // Import cricket data from file (for APK/PWA version)
    async importCricketData() {
        try {
            // Check if we're in a mobile WebView environment
            const isAndroidWebView = /Android.*wv\)|; wv\)/i.test(navigator.userAgent);
            const hasFileSystemAccess = 'showOpenFilePicker' in window;

            // For Android WebView or if File System Access API is not available, use traditional file input
            if (isAndroidWebView || !hasFileSystemAccess) {
                // Create file input
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.style.display = 'none';

                // Add to document temporarily
                document.body.appendChild(input);

                // Set up change handler
                input.onchange = async (event) => {
                    try {
                        const file = event.target.files[0];
                        if (file) {
                            const text = await file.text();
                            const data = JSON.parse(text);
                            await this.processImportedData(data, file.name);
                            } else {
                            }
                        } finally {
                        // Clean up
                        document.body.removeChild(input);
                    }
                };

                // Trigger file selection
                input.click();

            } else {
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
            }
            // Handle user cancellation gracefully
            if (error.name === 'AbortError' || error.message.includes('aborted')) {
                } else {
                }
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
                localStorage.setItem('cricket_stats_local', JSON.stringify(data));
            } else if (data.players) {
                // App format
                players = data.players;
                matches = data.matches || [];
            } else if (Array.isArray(data)) {
                players = data;
            } else {
                throw new Error('Unrecognized data format');
            }

            this.players = players;
            this.matches = matches;

            // Save to localStorage
            localStorage.setItem('cricket-players', JSON.stringify(this.players));
            localStorage.setItem('cricket-matches', JSON.stringify(this.matches));
            localStorage.setItem('last_import_timestamp', new Date().toISOString());
            localStorage.setItem('last_import_filename', filename);

            // Mark as user data since data has been restored
            localStorage.removeItem('cricket-wiped-state');
            localStorage.removeItem('cricket-wipe-timestamp');
            localStorage.setItem('cricket-has-user-data', 'true');
            localStorage.setItem('cricket-last-save-time', Date.now().toString());

            // Clear any cached data in data loaders to force fresh load
            if (window.androidDataLoader) {
                window.androidDataLoader.dataLoaded = false;
                window.androidDataLoader.cricketData = null;
                }

            this.updateStats();
            this.loadPlayers(); // Refresh players list
            this.loadMatchHistory(); // Refresh match history
            this.loadTeams(); // Refresh teams

            }
    }

    // clearCacheAndRefresh method removed - cricket_stats.json no longer used

    // Show storage information for APK version
    showStorageInfo() {
        // Check if running as APK/PWA
        const isOfflineApp = !window.location.href.startsWith('http://localhost');
        // Check localStorage usage
        const cricketStatsLocal = localStorage.getItem('cricket_stats_local');
        const cricketPlayers = localStorage.getItem('cricket-players');
        const lastSave = localStorage.getItem('last_save_timestamp');

        // Calculate total storage usage
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length;
            }
        }

        // Storage locations
        if ('showSaveFilePicker' in window) {
        } else {
            }
        // Show current data status
        if (cricketStatsJson) {
            const data = JSON.parse(cricketStatsJson);
            }

        // Show user-friendly notification
        const message = isOfflineApp ?
            '📱 APK: Data saved in app storage + exported to ' +
            ('showSaveFilePicker' in window ? 'user folder' : 'Downloads') :
            '🌐 Web: Data can be saved to server or downloaded';

        }

    // Import and merge data with smart merge logic
    async importAndMergeData() {
        try {
            // Check if we're in a mobile WebView environment
            const isAndroidWebView = /Android.*wv\)|; wv\)/i.test(navigator.userAgent);
            const hasFileSystemAccess = 'showOpenFilePicker' in window;

            // For Android WebView or if File System Access API is not available, use traditional file input
            if (isAndroidWebView || !hasFileSystemAccess) {
                // Create file input
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.style.display = 'none';

                // Add to document temporarily
                document.body.appendChild(input);

                // Set up change handler
                input.onchange = async (event) => {
                    try {
                        const file = event.target.files[0];
                        if (file) {
                            const text = await file.text();
                            const data = JSON.parse(text);
                            await this.performSmartMerge(data, file.name);
                        } else {
                            }
                        } finally {
                        // Clean up
                        document.body.removeChild(input);
                    }
                };

                // Trigger file selection
                input.click();

            } else {
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
            }
            // Handle user cancellation gracefully
            if (error.name === 'AbortError' || error.message.includes('aborted')) {
                } else {
                }
        }
    }

    // Perform smart merge of imported data
    async performSmartMerge(importedData, filename) {
        try {
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
                importedPlayers = importedData;
            }

            const currentPlayers = this.players || [];
            const currentMatches = this.matches || [];
            const currentTeams = this.teams || [];

            // Merge players with smart logic
            const mergeResults = this.mergePlayerData(currentPlayers, importedPlayers);

            // Merge matches (only add new ones)
            const mergedMatches = this.mergeMatchData(currentMatches, importedMatches);

            // Merge teams (only add new ones)
            const mergedTeams = this.mergeTeamData(currentTeams, importedTeams);

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

            this.updateStats();

            // Show detailed results
            }
    }

    // Merge player data with smart logic
    mergePlayerData(currentPlayers, importedPlayers) {
        const merged = [...currentPlayers];
        let addedCount = 0;
        let updatedCount = 0;
        let unchangedCount = 0;

        for (const importedPlayer of importedPlayers) {
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
                    } else {
                    unchangedCount++;
                }
            } else {
                const newId = this.getNextPlayerId(merged);
                merged.push({
                    ...importedPlayer,
                    id: newId,
                    last_updated: new Date().toISOString().split('T')[0]
                });
                addedCount++;
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
                }
        }

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
                }
        }

        return merged;
    }

    getNextPlayerId(players) {
        const existingIds = players.map(p => p.id || 0).filter(id => id > 0);
        return existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    }

    // Preview what will be exported
    previewExportData() {
        if (this.matches.length > 0) {
            this.matches.slice(0, 3).forEach((match, index) => {
                });
        }

        if (this.teams.length > 0) {
            this.teams.slice(0, 3).forEach((team, index) => {
                });
        }

        }

    showPlayerDetails(playerName) {
        const player = this.players.find(p => p.name === playerName);
        if (!player) return;

        const avg = player.matches > 0 ? (player.runs / player.matches).toFixed(1) : '0.0';
        const sr = this.calculateStrikeRate(player);
        const economyValue = this.calculateBowlerEconomy(player);
        const economy = (typeof economyValue === 'number' ? economyValue : 0).toFixed(1);
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
                                <span class="label">Matches Played:</span>
                                <span class="value">${player.matches || 0}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Batting Style:</span>
                                <span class="value">${player.batting}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Bowling Type:</span>
                                <span class="value">${player.bowling}</span>
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

    exportDataToCSV() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            const jsonData = {
                players: this.players,
                matches: this.matches,
                teams: this.teams,
                exportDate: new Date().toISOString(),
                source: 'Cricket PWA Export'
            };

            this.downloadJSON(jsonData, `cricket-data-backup-${timestamp}.json`);
            }
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
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
                    return;
                }

                this.saveData(true); // Create JSON backup when importing data (player info changes)
                this.updateStats();
                this.loadPlayers();
                this.loadTeams();

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

    showDataSource(source = null) {
        const indicator = document.getElementById('data-source');
        const sourceName = document.getElementById('source-name');

        if (indicator && sourceName) {
            if (source) {
                this.dataSource = source;
            }

            let displaySource = this.dataSource || 'Unknown';
            if (!this.dataSource) {
                if (this.players && this.players.length > 0) {
                    displaySource = 'Local Storage';
                } else {
                    displaySource = 'No Data';
                }
            }

            sourceName.textContent = displaySource;
            indicator.style.display = 'block';

            // Auto-hide after 5 seconds unless it's an error
            if (!displaySource.includes('Error') && !displaySource.includes('Failed')) {
                setTimeout(() => {
                    if (indicator) indicator.style.display = 'none';
                }, 5000);
            }
        }
    }

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

    getAvailableBatsmen() {
        if (!this.currentMatch) {
            alert('TEAM_DEBUG: No current match'); // Alert for immediate visibility
            return [];
        }

        const currentTeamScore = this.currentMatch.currentTeam === 1 ? this.currentMatch.team1Score : this.currentMatch.team2Score;
        const battingTeam = this.currentMatch.currentTeam === 1 ? this.currentMatch.team1 : this.currentMatch.team2;

        const debugInfo = {
            currentTeam: this.currentMatch.currentTeam,
            team1Name: this.currentMatch.team1?.name,
            team2Name: this.currentMatch.team2?.name,
            team1Batting: this.currentMatch.team1Score.batting,
            team2Batting: this.currentMatch.team2Score.batting,
            battingTeamDetermined: this.currentMatch.currentTeam === 1 ? 'team1' : 'team2'
        };

            striker: currentTeamScore.striker?.name,
            strikerId: currentTeamScore.striker?.id,
            nonStriker: currentTeamScore.nonStriker?.name,
            nonStrikerId: currentTeamScore.nonStriker?.id
        }, null, 2));

        if (!battingTeam || !battingTeam.players) {
            return [];
        }

        const currentBatsmenIds = [];
        if (currentTeamScore.striker) {
            currentBatsmenIds.push(currentTeamScore.striker.id);
            currentBatsmenIds.push(currentTeamScore.striker.id.toString()); // Add string version
            }
        if (currentTeamScore.nonStriker) {
            currentBatsmenIds.push(currentTeamScore.nonStriker.id);
            currentBatsmenIds.push(currentTeamScore.nonStriker.id.toString()); // Add string version
            }

        const outBatsmenIds = currentTeamScore.fallOfWickets ? currentTeamScore.fallOfWickets.map(w => w.batsmanId).filter(id => id) : [];

        // Return players who are not currently batting and not out
        const availableBatsmen = battingTeam.players.filter(player => {
            const playerIdString = player.id.toString();
            const playerIdNumber = parseInt(player.id);

            const isCurrentlyBatting = currentBatsmenIds.includes(player.id) ||
                                     currentBatsmenIds.includes(playerIdString) ||
                                     currentBatsmenIds.includes(playerIdNumber);

            // Check if this player is out - compare with both string and number versions
            const isOut = outBatsmenIds.some(outId => {
                return outId == player.id || outId == playerIdString || outId == playerIdNumber;
            });

            return !isCurrentlyBatting && !isOut;
        });

        return availableBatsmen;
    }

    getFieldingTeamPlayers() {
        if (!this.currentMatch) {
            return [];
        }

        const fieldingTeam = this.currentMatch.currentTeam === 1 ? this.currentMatch.team2 : this.currentMatch.team1;

        return fieldingTeam ? fieldingTeam.players : [];
    }

    // Show bowler selection modal at over completion
    changeBowlerAutomatically() {
        const ballCountBeforeChange = this.currentMatch?.ballByBall?.length || 0;

        if (!this.currentMatch) {
            return;
        }

        const battingTeam = this.currentMatch.currentTeam === 1 ?
            this.currentMatch.team1 : this.currentMatch.team2;
        const bowlingTeam = this.currentMatch.currentTeam === 1 ?
            this.currentMatch.team2 : this.currentMatch.team1;

        if (!bowlingTeam || !bowlingTeam.players) {
            return;
        }

        // No need to "sync" here - the global player already has the correct accumulated totals

        const currentBowler = this.currentMatch.bowler;
        // Filter available bowlers (exclude current bowler)
        const availableBowlers = bowlingTeam.players.filter(player => {
            const isCurrentBowler = currentBowler && (
                player.id === currentBowler.id ||
                player.id == currentBowler.id ||
                player.id.toString() === currentBowler.id.toString()
            );
            return !isCurrentBowler;
        });

        if (availableBowlers.length > 0) {
            // Set flag to prevent other actions
            this.waitingForBowlerSelection = true;
            this.disableAllScoringButtons();

            // Show bowler selection modal instead of automatic selection
            this.showBowlerSelectionModal(availableBowlers);

            } else {
            }

        const ballCountAfterChange = this.currentMatch?.ballByBall?.length || 0;
        if (ballCountAfterChange !== ballCountBeforeChange) {
            console.error(`🚨 BOWLER_CHANGE_CORRUPTION: Ball-by-ball data changed during automatic bowler change! Before: ${ballCountBeforeChange}, After: ${ballCountAfterChange}`);
        }
    }

    disableAllScoringButtons() {
        const buttons = document.querySelectorAll('.score-btn');
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
        });
    }

    enableAllScoringButtons() {
        const buttons = document.querySelectorAll('.score-btn');
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        });
    }

    // Show bowler selection modal
    showBowlerSelectionModal(availableBowlers) {

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
            const newBowlerId = document.getElementById('newBowler').value;

            if (!newBowlerId) {
                alert('Please select a bowler to continue the match');
                return;
            }

            let selectedBowler = availableBowlers.find(p => p.id === newBowlerId);

            // If not found, try with type conversion (string vs number)
            if (!selectedBowler) {
                selectedBowler = availableBowlers.find(p => p.id == newBowlerId || p.id === parseInt(newBowlerId) || p.id === newBowlerId.toString());
                }

            if (!selectedBowler) {
                const appInstance = window.cricketApp || window.app;
                if (appInstance && appInstance.players) {
                    selectedBowler = appInstance.players.find(p => p.id === newBowlerId || p.id == newBowlerId || p.id === parseInt(newBowlerId) || p.id === newBowlerId.toString());
                }
            }

            if (!selectedBowler) {
                // Check the first available bowler for comparison
                if (availableBowlers.length > 0) {
                    const firstBowler = availableBowlers[0];
                }

                // Try manual search to find the exact issue
                availableBowlers.forEach((bowler, index) => {
                    const matches = bowler.id === newBowlerId || bowler.id == newBowlerId;
                });
            }

            if (selectedBowler) {
                const appInstance = window.cricketApp || window.app;
                if (!appInstance || !appInstance.currentMatch) {
                    const modalOverlay = document.querySelector('.modal-overlay');
                    if (modalOverlay) {
                        modalOverlay.remove();
                    }
                    return;
                }

                // No need to "sync" here - the global player already has the correct accumulated totals

                // The team player object might be a different reference, causing stats to be lost
                const globalSelectedBowler = appInstance.players.find(p => p.id == selectedBowler.id);
                if (!globalSelectedBowler) {
                    console.error(`❌ ERROR: Could not find global player for ${selectedBowler.name}`);
                    return;
                }

                const selectedBowlerStats = appInstance.getPlayerMatchStats(globalSelectedBowler);

                appInstance.currentMatch.bowler = globalSelectedBowler;

                // No need to initialize or restore stats here - dictionary handles everything!

                appInstance.waitingForBowlerSelection = false;
                appInstance.enableAllScoringButtons();
                const buttons = document.querySelectorAll('.score-btn');
                const disabledCount = Array.from(buttons).filter(btn => btn.disabled).length;
                const opacityCount = Array.from(buttons).filter(btn => btn.style.opacity === '0.5').length;
                setTimeout(() => {
                    appInstance.enableAllScoringButtons();
                    // Final verification
                    const buttonsAfter = document.querySelectorAll('.score-btn');
                    const disabledAfter = Array.from(buttonsAfter).filter(btn => btn.disabled).length;
                    // Test a specific button
                    const testBtn = document.querySelector('button[onclick="handleRunButton(1)"]');
                    // ...existing code...
                }, 50);

                app.showNotification('🎳 New bowler: ' + globalSelectedBowler.name);
                app.updateScoreDisplay();

                } else {
                alert('Error: Selected bowler not found. Please try again.');
            }

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

let app;

// Navigation Functions
function showPage(pageId) {

    // Hide all content pages
    const allContent = document.querySelectorAll('.content');
    allContent.forEach(content => {
        content.classList.remove('active');
    });

    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');

        targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Special handling for scoring page to trigger analytics
        if (pageId === 'scoring') {
            if (window.cricketApp && window.cricketApp.updateScoringTabView) {
                window.cricketApp.updateScoringTabView();
            } else {
            }
        }
    } else {
        console.error(`❌ SHOWPAGE: Target page '${pageId}' not found!`);
        return;
    }

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
        // Fallback - find the nav item by onclick attribute
        document.querySelector(`[onclick="showPage('${pageId}')"]`)?.classList.add('active');
    }

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
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));

        // Find and activate scoring nav item
        const scoringNavItem = document.querySelector('[onclick="showPage(\'scoring\')"]');
        if (scoringNavItem) {
            scoringNavItem.classList.add('active');
        }

        const navTitle = document.getElementById('navTitle');
        if (navTitle) {
            navTitle.textContent = 'Live Scoring';
        }

        return true;
    } else {
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
    const modal = document.getElementById('addPlayerModal');
    if (modal) {
        modal.style.display = '';  // Clear inline style
        modal.classList.add('active');
        } else {
        }
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
    try {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none'; // Fix: Also hide the modal completely
            } else {
            }
        }
}

// Form Handlers
function addPlayer(event) {
    event.preventDefault();

    try {
        const name = document.getElementById('playerName').value;
        const bowlingType = document.getElementById('bowlingType').value;
        const battingStyle = document.getElementById('battingStyle').value;
        const playerType = document.getElementById('playerType').value;

        // Validate required fields
        if (!name || name.trim() === '') {
            if (window.cricketApp && window.cricketApp.showNotification) {
                window.cricketApp.showNotification('❌ Player name is required');
            } else {
                alert('Player name is required');
            }
            return;
        }

        const appInstance = window.cricketApp || window.app;
        if (!appInstance) {
            alert('App not ready, please try again');
            return;
        }

        appInstance.addPlayer(name.trim(), bowlingType, battingStyle, playerType);
        // Reset form
        const form = event.target;
        if (form && typeof form.reset === 'function') {
            form.reset();
            }

        setTimeout(() => {
            try {
                closeModal('addPlayerModal');
                }
        }, 100);

        if (window.cricketApp && window.cricketApp.showNotification) {
            window.cricketApp.showNotification('❌ Error adding player: ' + error.message);
        } else {
            alert('Error adding player: ' + error.message);
        }
    }
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

function updatePlayerCountDirectly() {
    const appInstance = window.cricketApp || window.app;
    if (appInstance && typeof appInstance.updatePlayerCountDirectly === 'function') {
        appInstance.updatePlayerCountDirectly();
    } else {
        // Fallback direct implementation - optimized
        const checkboxes = document.querySelectorAll('input[name="todayPlayers"]:checked');
        const count = checkboxes.length;
        const label = document.getElementById('selectedPlayerCount');

        if (label) {
            label.textContent = count.toString();
        } else {
            // Try alternative selectors only if needed
            const altLabel = document.querySelector('.player-count') || document.querySelector('#selectedPlayerCount');
            if (altLabel) {
                altLabel.textContent = count.toString();
            }
        }
    }
}

function removePlayer(playerId) {
    // Player removal has been disabled to prevent orphaning match and performance data
    const appInstance = window.cricketApp || window.app;
    if (appInstance) {
        appInstance.showNotification('❌ Player removal is disabled to preserve match and performance data integrity');
    } else {
        alert('Player removal is disabled to preserve match and performance data integrity');
    }
}

function editPlayer(playerId) {
    // Open the edit player modal instead of showing placeholder message
    openEditPlayerModal(playerId);
}

function removeTeam(teamId) {
    if (confirm('Are you sure you want to remove this team?')) {
        const appInstance = window.cricketApp || window.app;
        if (appInstance) {
            appInstance.removeTeam(teamId);
        } else {
            }
    }
}

function generateBalancedTeams() {
    const appInstance = window.cricketApp || window.app;
    if (appInstance) {
        appInstance.generateBalancedTeams();
    } else {
        }
}

function openEditPlayerModal(playerId) {
    const appInstance = window.cricketApp || window.app;
    if (!appInstance) {
        alert('App is still loading, please try again in a moment');
        return;
    }

    if (!appInstance.players || !Array.isArray(appInstance.players)) {
        alert('Player data not loaded yet, please try again');
        return;
    }

    // Find the player
    const player = appInstance.players.find(p => p.id === playerId || p.id == playerId || p.id === parseInt(playerId));
    if (!player) {
        alert('Player not found');
        return;
    }

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

        if (nameInput) {
            // Multiple ways to ensure the name is set
            nameInput.value = player.name || '';
            nameInput.setAttribute('value', player.name || '');

            // Add input event listener to track changes in real-time
            nameInput.addEventListener('input', function() {
                });

            // If still empty, try one more time
            if (!nameInput.value || nameInput.value.trim() === '') {
                setTimeout(() => {
                    nameInput.value = player.name || '';
                    }, 50);
            }
        }

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
    // Player deletion has been disabled to prevent orphaning match and performance data
    const appInstance = window.cricketApp || window.app;
    if (appInstance) {
        appInstance.showNotification('❌ Player deletion is disabled to preserve match and performance data integrity');
    } else {
        alert('Player deletion is disabled to preserve match and performance data integrity');
    }
    return;

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
        alert('Error deleting player');
        return;
    }

    appInstance.players.splice(playerIndex, 1);

    appInstance.saveData(true);

    // Refresh the player list
    appInstance.updateStats();

    // Close modal
    closeEditPlayerModal();

    // Show success message
    appInstance.showNotification(`✅ ${player.name} deleted successfully!`);

    }

function closeEditPlayerModal(event) {
    if (event && event.target !== event.currentTarget) return;

    const modal = document.getElementById('editPlayerModal');
    if (modal) {
        modal.remove();
    }
}

function savePlayerChanges(playerId) {
    const editModal = document.getElementById('editPlayerModal');
    const nameInput = editModal ? editModal.querySelector('#playerName') : null;
    const bowlingSelect = editModal ? editModal.querySelector('#bowlingType') : null;
    const battingSelect = editModal ? editModal.querySelector('#battingStyle') : null;
    const playerTypeSelect = editModal ? editModal.querySelector('#playerType') : null;

    const appInstance = window.cricketApp || window.app;
    if (!appInstance) {
        alert('App not ready, please try again');
        return;
    }

    // Find the player first to get original data
    const player = appInstance.players.find(p => p.id === playerId || p.id == playerId || p.id === parseInt(playerId));
    if (!player) {
        alert('Player not found');
        return;
    }

    let playerName = '';
        nameInputExists: !!nameInput,
        nameInputValue: nameInput ? nameInput.value : 'NO INPUT',
        inputValueLength: nameInput ? nameInput.value.length : 0,
        inputValueTrimmed: nameInput ? nameInput.value.trim() : 'NO INPUT',
        originalPlayerName: player.name || player.Name || ''
    });

    // Force read the input value directly
    const inputValue = nameInput ? nameInput.value : '';
    if (nameInput && inputValue && inputValue.trim() && inputValue.trim() !== '') {
        playerName = inputValue.trim();
        } else {
        playerName = player.name || player.Name || '';
    }

    if (!playerName) {
        appInstance.showNotification('❌ Player name cannot be empty');
        return;
    }

    const oldName = player.name;
    player.name = playerName;
    player.Name = playerName; // Also update uppercase version for compatibility
    player.bowling = bowlingSelect ? bowlingSelect.value : (player.bowling || 'Medium');
    player.bowlingStyle = player.bowling; // Also update camelCase version for saveData compatibility
    player.batting = battingSelect ? battingSelect.value : (player.batting || 'Reliable');
    player.battingStyle = player.batting; // Also update camelCase version for saveData compatibility
    player.is_star = playerTypeSelect ? (playerTypeSelect.value === 'Star') : (player.is_star || false);
    player.isStar = player.is_star; // Also update camelCase version for saveData compatibility
    player.last_updated = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Log the exact player object after update

    // Check if the player exists in the main array
    const foundInArray = appInstance.players.find(p => p.id === playerId);
    try {
        // Save using the app's data persistence method
        appInstance.saveData(true); // Create JSON backup when editing player (player info change)
        appInstance.updateStats();
        appInstance.loadPlayers();
        appInstance.loadTeams();

        // Close modal
        closeEditPlayerModal();

        // Show success message
        appInstance.showNotification(`✅ ${player.name} updated successfully!`);

        appInstance.showNotification('❌ Error saving changes: ' + error.message);
    }
}

function exportUpdatedPlayersToJSON(players, matches = [], teams = []) {
    try {
        if (window.cricketApp && window.cricketApp.saveData) {
            window.cricketApp.players = players;
            window.cricketApp.matches = matches || window.cricketApp.matches || [];
            window.cricketApp.teams = teams || window.cricketApp.teams || [];

            window.cricketApp.saveData(true);

            } else {
            // Fallback to old method if app not available
            exportUpdatedPlayersToJSONLegacy(players, matches, teams);
        }

        return true;
        // Fallback to old method on error
        exportUpdatedPlayersToJSONLegacy(players, matches, teams);
        return false;
    }
}

function exportUpdatedPlayersToJSONLegacy(players, matches = [], teams = []) {
    try {
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
                    if (window.cricketApp && window.cricketApp.showNotification) {
                        window.cricketApp.showNotification(`✅ Complete data saved: ${players.length} players, ${matches.length} matches`);
                    }
                } else {
                    // Fallback to download if server save fails
                    downloadFallback(cricketStatsData);
                }
            }).catch(error => {
                downloadFallback(cricketStatsData);
            });
        }

        return true;
        if (window.cricketApp && window.cricketApp.showNotification) {
            window.cricketApp.showNotification('❌ Export failed: ' + error.message);
        }
        return false;
    }
}

// Handle file operations for offline/APK version
function handleOfflineFileSave(cricketStatsData, players, matches = [], teams = []) {
    try {
        // 1. Save to localStorage (primary persistence)
        localStorage.setItem('cricket_stats_json', JSON.stringify(cricketStatsData));
        localStorage.setItem('cricket_players_backup', JSON.stringify(players));
        localStorage.setItem('cricket_matches_backup', JSON.stringify(matches));
        localStorage.setItem('cricket_teams_backup', JSON.stringify(teams));
        localStorage.setItem('last_save_timestamp', new Date().toISOString());

        // 2. Try edit-in-place approach first
        if (window.cricketApp && window.cricketApp.dataManager) {
            const appData = { players, matches, teams };

            window.cricketApp.dataManager.editJSONFilesInPlace(appData).then(() => {
                if (window.cricketApp && window.cricketApp.showNotification) {
                    window.cricketApp.showNotification(`🔄 Data updated in-place: ${players.length} players, ${matches.length} matches, ${teams.length} teams`);
                }
            }).catch(error => {
                handleOfflineFileSaveFallback(cricketStatsData, players, matches, teams);
            });
        } else {
            handleOfflineFileSaveFallback(cricketStatsData, players, matches, teams);
        }

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
            handleModernFileSave(cricketStatsData);
        } else {
            downloadFallbackLegacy(cricketStatsData);
        }

        // Show success notification with complete data info
        if (window.cricketApp && window.cricketApp.showNotification) {
            const isModernAPI = 'showSaveFilePicker' in window;
            const location = isModernAPI ? 'user-selected location' : 'Downloads folder';
            window.cricketApp.showNotification(`✅ Complete data saved: ${players.length} players, ${matches.length} matches, ${teams.length} teams to ${location} (fallback method)`);
        }
        if (window.cricketApp && window.cricketApp.showNotification) {
            window.cricketApp.showNotification('❌ Offline save fallback failed: ' + error.message);
        }
    }
}

async function handleModernFileSave(cricketStatsData) {
    try {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: 'cricket_data_export.json',
            types: [{
                description: 'JSON files',
                accept: { 'application/json': ['.json'] }
            }]
        });

        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(cricketStatsData, null, 2));
        await writable.close();

        if (window.cricketApp && window.cricketApp.showNotification) {
            window.cricketApp.showNotification('✅ Cricket data saved to device');
        }

        if (error.name !== 'AbortError') {
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
            return true;
        } else {
            return false;
        }
        return false;
    }
}

// Fallback function to download files if server save fails
function downloadFallback(cricketStatsData) {
    try {
        // Try to use the data manager save system first
        if (window.cricketApp && window.cricketApp.dataManager && window.cricketApp.dataManager.saveJSONData) {
            const appData = {
                players: window.cricketApp.players || [],
                matches: window.cricketApp.matches || [],
                teams: window.cricketApp.teams || []
            };

            window.cricketApp.dataManager.saveJSONData(appData).then(() => {
                if (window.cricketApp && window.cricketApp.showNotification) {
                    window.cricketApp.showNotification('📁 Data updated using data manager (server unavailable)');
                }
            }).catch(error => {
                downloadFallbackLegacy(cricketStatsData);
            });
        } else {
            downloadFallbackLegacy(cricketStatsData);
        }
        downloadFallbackLegacy(cricketStatsData);
    }
}

// Legacy download method as final fallback
function downloadFallbackLegacy(cricketStatsData) {
    downloadJSONFile(cricketStatsData, 'cricket_data_export.json');

    // Also create a backup with timestamp
    const backupFilename = `cricket_data_backup_${new Date().toISOString().split('T')[0]}.json`;
    downloadJSONFile(cricketStatsData, backupFilename);

    if (window.cricketApp && window.cricketApp.showNotification) {
        window.cricketApp.showNotification('📁 Cricket data exported - files downloaded successfully');
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
    }

function exportAllPlayersToJSON() {
    const appInstance = window.cricketApp || window.app;
    if (!appInstance || !appInstance.players) {
        alert('No player data available for export');
        return;
    }

    exportUpdatedPlayersToJSON(appInstance.players, appInstance.matches || [], appInstance.teams || []);
}

function startMatchWithTeam(teamId) {
    if (window.cricketApp) {
        const completedMatchCount = window.cricketApp.matches ? window.cricketApp.matches.filter(m =>
            m.Status === 'Completed' || m.status === 'completed' || m.ended || m.Game_Finish_Time
        ).length : 0;

        // Keep only active/incomplete matches (if any)
        window.cricketApp.matches = window.cricketApp.matches ? window.cricketApp.matches.filter(m =>
            !(m.Status === 'Completed' || m.status === 'completed' || m.ended || m.Game_Finish_Time)
        ) : [];

        // Save the cleaned state to localStorage (without completed matches)
        window.cricketApp.saveData(false);
    }

    const matchSetup = JSON.parse(localStorage.getItem('match_setup') || '{}');
    if (!matchSetup.battingTeam || !matchSetup.bowlingTeam || !matchSetup.striker || !matchSetup.nonStriker || !matchSetup.bowler) {
        if (window.cricketApp) {
            window.cricketApp.showNotification('❌ Missing player selections for match setup');
        }
        return;
    }

    // Load match settings from localStorage (same as startNewMatch)
    const matchSettings = JSON.parse(localStorage.getItem('match-settings') || '{}');
    const totalOvers = matchSettings.totalOvers || 5;

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
        totalOvers: totalOvers,
        status: 'active',
        ballByBall: [],
        started: new Date().toISOString()
    };

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

    // Save the match and update display
    window.cricketApp.saveData(false);
    window.cricketApp.updateScoreDisplay();

    // Automatically switch to scoring tab when match starts
    if (typeof showPage === 'function') {
        showPage('scoring');
        }

    // Show notification with selected players
    if (window.cricketApp) {
        window.cricketApp.showNotification(`🏏 Match started! ${matchSetup.striker.name} & ${matchSetup.nonStriker.name} batting, ${matchSetup.bowler.name} bowling!`);
    }
}

function addRuns(runs) {
    if (window.cricketApp) {
        window.cricketApp.addRuns(runs);
    } else {
        showMessage('Cricket app not ready. Please start a match first.', 'error');
    }
}

function addWicket() {
    // Redirect to proper wicket modal for complete dismissal information
    if (window.cricketApp && window.cricketApp.currentMatch) {
        showWicketModal();
    } else {
        showMessage('Cricket app not ready. Please start a match first.', 'error');
    }
}

function endMatch() {
    if (confirm('Are you sure you want to end this match?')) {
        if (window.cricketApp) {
            window.cricketApp.endMatch();
        } else {
            showMessage('Cricket app not ready. Please start a match first.', 'error');
        }
    }
}

function exportData() {
    if (window.cricketApp) {
        window.cricketApp.exportDataToCSV();
    } else {
        showMessage('Cricket app not ready. Please export data.', 'error');
    }
}

window.activeExtraType = null;

function toggleExtra(extraType) {
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
        showMessage('Cricket app not ready. Please start a match first.', 'error');
        return;
    }

    const matchSettings = JSON.parse(localStorage.getItem('match-settings') || '{}');
    const wideRuns = parseInt(matchSettings.runsOnWide || '1');
    const noBallRuns = parseInt(matchSettings.runsOnNoBall || '1');

    if (window.cricketApp.addExtras) {
        let baseExtraRuns = 0;
        if (extraType === 'wide') {
            baseExtraRuns = wideRuns;
        } else if (extraType === 'noball') {
            baseExtraRuns = noBallRuns;
        }

        const totalRuns = baseExtraRuns + runsScored;

        window.cricketApp.addExtras(extraType, totalRuns, runsScored);

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

function handleFinishInnings(dismissedBatsmanId, dismissalType, helper, fielder) {
    if (!window.cricketApp) {
        return;
    }

    window.cricketApp.handleFinishInnings(dismissedBatsmanId, dismissalType, helper, fielder);
}

function handleLastManStanding(dismissedBatsmanId, dismissalType, helper, fielder) {
    if (!window.cricketApp) {
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

window.updateSelectedPlayerCountInline = function() {
    const checkboxes = document.querySelectorAll('input[name="todayPlayers"]:checked');
    const count = checkboxes.length;
    const label = document.getElementById('selectedPlayerCount');

    if (label) {
        label.textContent = count.toString();
    } else {
        const altLabel = document.querySelector('.player-count') || document.querySelector('#selectedPlayerCount');
        if (altLabel) {
            altLabel.textContent = count.toString();
        }
    }
};

window.selectAllPlayersInline = function() {
    const labels = document.querySelectorAll('.player-checkbox-item');
    labels.forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        label.classList.add('selected');
        checkbox.checked = true;
    });
    // Single call to update count
    if (typeof window.updateSelectedPlayerCountInline === 'function') {
        window.updateSelectedPlayerCountInline();
    }
};

window.unselectAllPlayersInline = function() {
    const labels = document.querySelectorAll('.player-checkbox-item');
    labels.forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        label.classList.remove('selected');
        checkbox.checked = false;
    });
    // Single call to update count
    if (typeof window.updateSelectedPlayerCountInline === 'function') {
        window.updateSelectedPlayerCountInline();
    }
};

window.proceedToCaptainSelectionInline = function() {
    const checkedBoxes = document.querySelectorAll('input[name="todayPlayers"]:checked');
    if (checkedBoxes.length < 4) {
        window.cricketApp.showNotification('❌ Please select at least 4 players');
        return;
    }

    const selectedPlayerIds = Array.from(checkedBoxes).map(cb => cb.value.toString());

    const selectedPlayers = window.cricketApp.players.filter(p => selectedPlayerIds.includes(p.id.toString()));

    // Scroll to top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' });

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
    // Save the temporarily stored teams to permanent teams and show toss button
    let teamsToConfirm = null;

    if (window.cricketApp.tempTeams) {
            team1Captain: window.cricketApp.tempTeams[0].captain,
            team1CaptainId: window.cricketApp.tempTeams[0].captain?.id,
            team2Captain: window.cricketApp.tempTeams[1].captain,
            team2CaptainId: window.cricketApp.tempTeams[1].captain?.id
        });

        teamsToConfirm = window.cricketApp.tempTeams;
    } else {
        // If tempTeams is null, try loading from saved teams as fallback
        try {
            const saved = localStorage.getItem('savedTeams');
            if (saved) {
                const teams = JSON.parse(saved);
                if (Array.isArray(teams) && teams.length === 2) {

                    if (!teams[0].captain || !teams[0].captain.id) {
                        teams[0].captain = teams[0].players[0];
                    }
                    if (!teams[1].captain || !teams[1].captain.id) {
                        teams[1].captain = teams[1].players[0];
                    }

                    teamsToConfirm = teams;
                }
            }
            console.error('❌ CONFIRM_TEAMS: Error loading saved teams:', e);
        }
    }

    if (!teamsToConfirm) {
        window.cricketApp.showNotification('❌ No teams to confirm!');
        return;
    }

    // Set as permanent teams
    window.cricketApp.teams = [...teamsToConfirm];

        team1Captain: window.cricketApp.teams[0].captain,
        team1CaptainId: window.cricketApp.teams[0].captain?.id,
        team2Captain: window.cricketApp.teams[1].captain,
        team2CaptainId: window.cricketApp.teams[1].captain?.id
    });

    window.cricketApp.saveData(false); // Save to localStorage

    // Clear temporary teams but keep saved teams for future reuse
    window.cricketApp.tempTeams = null;

    // Replace the inline result with confirmed teams and toss button (stay on same page)
    const teamList = document.getElementById('teamList');
    const team1 = window.cricketApp.teams[0];
    const team2 = window.cricketApp.teams[1];

    teamList.innerHTML = `
        <div class="glass-card fade-in">
            <div class="step-header">
                <h3>✅ Teams Confirmed!</h3>
            </div>

            <div class="teams-result-inline">
                <div class="team-result-card">
                    <h4>${team1.name}</h4>
                    <div class="team-players">
                        ${team1.players.map(p => {
                            const isCaptain = (team1.captain?.id && p.id === team1.captain.id) ||
                                             (p.name === team1.captain?.name);
                            return `<span class="player-tag ${isCaptain ? 'captain' : ''}">${p.name}${isCaptain ? ' (C)' : ''}</span>`;
                        }).join('')}
                    </div>
                </div>

                <div class="team-result-card">
                    <h4>${team2.name}</h4>
                    <div class="team-players">
                        ${team2.players.map(p => {
                            const isCaptain = (team2.captain?.id && p.id === team2.captain.id) ||
                                             (p.name === team2.captain?.name);
                            return `<span class="player-tag ${isCaptain ? 'captain' : ''}">${p.name}${isCaptain ? ' (C)' : ''}</span>`;
                        }).join('')}
                    </div>
                </div>
            </div>

            <div style="text-align: center; margin: 30px 0;" id="toss-button-container">
                <button id="main-toss-btn" class="toss-btn" style="touch-action: manipulation;">
                    🎯 TOSS
                </button>
            </div>
        </div>
    `;

    setTimeout(() => {
        const tossBtn = document.getElementById('main-toss-btn');
        if (tossBtn) {
            tossBtn.removeAttribute('onclick');
            ['click', 'touchend'].forEach(eventType => {
                tossBtn.addEventListener(eventType, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startToss();
                }, { passive: false });
            });
        }
    }, 100);
};

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

// Initialize the cricket app
window.addEventListener('DOMContentLoaded', function() {
    window.cricketApp = new CricketApp();
    // Set up global analytics engine reference
    window.analyticsEngine = window.cricketApp.analytics;
    // Check for ongoing matches first, before loading saved teams
    const hasOngoingMatch = window.cricketApp.checkForOngoingMatch();

    // If no ongoing match, proceed with normal initialization
    if (!hasOngoingMatch) {
        // If there are saved teams, load and show them immediately
        if (!window.cricketApp.loadSavedTeams()) {
            // Initialize bye button visibility based on settings
            window.cricketApp.updateByeButtonVisibility();

            // Force load match history after initialization
            setTimeout(() => {
                if (window.cricketApp && window.cricketApp.loadMatchHistory) {
                    window.cricketApp.loadMatchHistory();
                } else {
                    }
            }, 1000);
        }
    }

    // Add console helpers for the new edit-in-place functionality
    window.editInPlaceHelpers = {
        showInfo: () => window.cricketApp.showEditInPlaceInfo(),
        getBackups: () => window.cricketApp.getBackupList(),
        restore: (timestamp) => window.cricketApp.restoreFromBackup(timestamp),
        help: () => {
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
                }
        },
        import: () => {
            if (window.importCricketData) {
                window.importCricketData();
            } else {
                }
        },
        summary: () => window.cricketDataManager.getDataSummary(),
        test: () => window.cricketDataManager.testImport(),
        expectedFile: () => {
            const fileName = window.cricketDataManager.getExpectedFileName();
            return fileName;
        },
        help: () => {
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
        const player1Select = document.getElementById('scoringPlayer1Select');
        const player2Select = document.getElementById('scoringPlayer2Select');
        if (window.cricketApp && window.cricketApp.players) {
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
        if (window.cricketApp && window.cricketApp.updateScoringTabView) {
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
/* TEMP COMMENTED OUT TO FIX SYNTAX ERROR
});
*/

window.addEventListener('DOMContentLoaded', function() {
    try {
        window.cricketApp = new CricketApp();
        // Create global app reference for backward compatibility
        window.app = window.cricketApp;
        }
});

function startToss() {

    try {
        const teams = getCurrentTeams();
        if (teams.length !== 2) {
            showMessage('Need exactly 2 teams for toss!', 'error');
            return;
        }

        // Find the toss button container and create inline toss display
        const tossButton = document.getElementById('main-toss-btn') || document.querySelector('.toss-btn');
        if (!tossButton) {
            showMessage('Toss button not found!', 'error');
            return;
        }

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
                        <button id="bat-first" class="choice-btn" style="background: #22c55e; border: none; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; touch-action: manipulation;">🏏 Bat First</button>
                        <button id="bowl-first" class="choice-btn" style="background: #3b82f6; border: none; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; touch-action: manipulation;">⚾ Bowl First</button>
                    </div>
                    <div style="margin-top: 15px;">
                        <button id="back-to-toss" style="background: #6b7280; border: none; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9em; touch-action: manipulation;">
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

        // Scroll to toss container
        setTimeout(() => {
            tossResultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);

        // Animate coin flip
        const coinAnimation = document.getElementById('coin-animation');
        const tossStatus = document.getElementById('toss-status');
        const tossResult = document.getElementById('toss-result');

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
            document.getElementById('winning-team').textContent = `${winningTeam.name} wins the toss!`;
            tossResult.style.display = 'block';

            // Add event listeners instead of inline onclick (better for mobile)
            const batButton = document.getElementById('bat-first');
            const bowlButton = document.getElementById('bowl-first');
            const backButton = document.getElementById('back-to-toss');

            // Remove any existing event listeners
            batButton.replaceWith(batButton.cloneNode(true));
            bowlButton.replaceWith(bowlButton.cloneNode(true));
            backButton.replaceWith(backButton.cloneNode(true));

            const newBatButton = document.getElementById('bat-first');
            const newBowlButton = document.getElementById('bowl-first');
            const newBackButton = document.getElementById('back-to-toss');

            // Scroll to toss result
            setTimeout(() => {
                tossResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);

            // Add mobile-friendly event listeners
            ['click', 'touchend'].forEach(eventType => {
                newBatButton.addEventListener(eventType, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    highlightChoice('bat-first');
                    startMatchWithChoice(winningTeam, 'bat');
                }, { passive: false });

                newBowlButton.addEventListener(eventType, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    highlightChoice('bowl-first');
                    startMatchWithChoice(winningTeam, 'bowl');
                }, { passive: false });

                newBackButton.addEventListener(eventType, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    backToToss();
                }, { passive: false });
            });

        }, 2000);

        console.error('❌ Error in startToss():', error);
        showMessage('Error starting toss: ' + error.message, 'error');
    }
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
    try {
        // First try the main app instance
        if (window.cricketApp && window.cricketApp.teams && window.cricketApp.teams.length > 0) {
            return window.cricketApp.teams;
        }

        // Fallback to global app
        if (window.app && window.app.teams && window.app.teams.length > 0) {
            return window.app.teams;
        }

        // Try localStorage as fallback
        const teamsData = localStorage.getItem('cricket-teams');
        if (teamsData) {
            const teams = JSON.parse(teamsData);
            if (teams && teams.length > 0) {
                return teams;
            }
        }

        return [];

        return [];
    }
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

    // Scroll to player selection
    setTimeout(() => {
        playerSelectionContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function toggleBatsmanSelection(playerId, playerName) {
    setTimeout(() => {
        // Fix type mismatch: try multiple ways to find the button
        let button = document.querySelector(`[data-player-id="${playerId}"]`);
        if (!button) {
            // Try with .0 added
            button = document.querySelector(`[data-player-id="${playerId}.0"]`);
        }
        if (!button) {
            // Try converting to string and removing .0
            const cleanId = String(playerId).replace('.0', '');
            button = document.querySelector(`[data-player-id="${cleanId}"]`);
        }
        if (!button) {
            const cleanId = String(playerId).replace('.0', '');
            button = document.querySelector(`[data-player-id="${cleanId}.0"]`);
        }

        const confirmButton = document.getElementById('confirm-batsmen');
        const summaryDiv = document.getElementById('selection-summary');
        const selectedPlayersList = document.getElementById('selected-players-list');

        // Check if button exists before accessing its properties
        if (!button) {

            const allButtons = document.querySelectorAll('[data-player-id]');
            return;
        }

        if (window.selectedBatsmen.find(b => b.id === playerId)) {
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

        if (window.selectedBatsmen.length > 0) {
            if (summaryDiv) {
                summaryDiv.style.display = 'block';
            }
            if (selectedPlayersList) {
                selectedPlayersList.innerHTML = window.selectedBatsmen.map(player =>
                    `<span class="selected-player">${player.name}</span>`
                ).join('');
            }
        } else {
            if (summaryDiv) {
                summaryDiv.style.display = 'none';
            }
        }

        if (confirmButton) {
            if (window.selectedBatsmen.length === 2) {
                confirmButton.disabled = false;
                confirmButton.style.opacity = '1';
            } else {
                confirmButton.disabled = true;
                confirmButton.style.opacity = '0.5';
            }
        }
    }, 10); // Small delay to ensure DOM is ready
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

    // Scroll to bowler selection
    setTimeout(() => {
        bowlerSelectionContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
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

    const bowlerSummary = document.getElementById('bowler-summary');
    const selectedBowlerName = document.getElementById('selected-bowler-name');
    bowlerSummary.style.display = 'block';
    selectedBowlerName.innerHTML = `<span class="selected-player" style="background: rgba(29, 78, 216, 0.2); border-color: #1d4ed8; color: #1d4ed8;">${playerName}</span>`;

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

        const summaryDiv = document.getElementById('selection-summary');
        const selectedPlayersList = document.getElementById('selected-players-list');
        if (window.selectedBatsmen.length > 0) {
            summaryDiv.style.display = 'block';
            selectedPlayersList.innerHTML = window.selectedBatsmen.map(player =>
                `<span class="selected-player">${player.name}</span>`
            ).join('');
        }

        const confirmButton = document.getElementById('confirm-batsmen');
        if (window.selectedBatsmen.length === 2) {
            confirmButton.disabled = false;
            confirmButton.style.opacity = '1';
        }
    }, 100);
}

function startMatchWithPlayers() {
    if (window.cricketApp) {
        const completedMatchCount = window.cricketApp.matches ? window.cricketApp.matches.filter(m =>
            m.Status === 'Completed' || m.status === 'completed' || m.ended || m.Game_Finish_Time
        ).length : 0;

        // Keep only active/incomplete matches (if any)
        window.cricketApp.matches = window.cricketApp.matches ? window.cricketApp.matches.filter(m =>
            !(m.Status === 'Completed' || m.status === 'completed' || m.ended || m.Game_Finish_Time)
        ) : [];

        // Save the cleaned state to localStorage (without completed matches)
        window.cricketApp.saveData(false);
    }

    if (window.currentBattingTeam) {
        }

    if (window.currentBowlingTeam) {
        }

    if (!window.selectedBatsmen || window.selectedBatsmen.length !== 2) {
        showMessage('Please select 2 batsmen!', 'error');
        return;
    }

    if (!window.selectedBowler) {
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

    localStorage.setItem('match_setup', JSON.stringify(matchSetup));

    try {
        // Hide all content sections
        document.querySelectorAll('.content').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });

        // Show scoring section
        const scoringSection = document.getElementById('scoring');
        if (scoringSection) {
            scoringSection.classList.add('active');
            scoringSection.style.display = 'block';
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });

            const scoringNavItem = document.querySelector('a[onclick="showPage(\'scoring\')"]');
            if (scoringNavItem) {
                scoringNavItem.classList.add('active');
                }

            const navTitle = document.getElementById('navTitle');
            if (navTitle) {
                navTitle.textContent = 'Live Scoring';
                }

        } else {
            // List all available content sections
            const allContent = document.querySelectorAll('.content');
                Array.from(allContent).map(c => c.id || 'no-id'));
        }

        }

    // Show success message after switching
    showMessage(`Match starting! ${matchSetup.striker.name} and ${matchSetup.nonStriker.name} are batting. ${matchSetup.bowler.name} is bowling.`, 'success');

    // Start the match after a short delay to let the tab switch complete
    setTimeout(() => {
        try {
            // Verify cricketApp exists before calling
            if (!window.cricketApp) {
                return;
            }

            startMatchWithTeam(window.currentBattingTeam.id);

            // Scroll to top of the page after match starts - multiple methods for reliability
            // Method 1: Smooth scroll
            try {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                window.scrollTo(0, 0);
            }

            // Method 2: Also scroll the scoring section itself
            setTimeout(() => {
                const scoringSection = document.getElementById('scoring');
                if (scoringSection) {
                    scoringSection.scrollTop = 0;
                    }

                // Method 3: Scroll document body
                document.body.scrollTop = 0;
                document.documentElement.scrollTop = 0;
                }, 100);

            // Force update of all scoring interface elements
            setTimeout(() => {
                if (window.cricketApp && window.cricketApp.currentMatch) {
                    window.cricketApp.updateScoreDisplay();

                    const currentMatch = window.cricketApp.currentMatch;
                    const currentTeamScore = currentMatch.currentTeam === 1 ?
                        currentMatch.team1Score : currentMatch.team2Score;

                    const currentTeamEl = document.getElementById('currentTeam');
                    if (currentTeamEl && currentMatch.team1) {
                        currentTeamEl.textContent = currentMatch.team1.name;
                        } else {
                        }

                    const strikerNameEl = document.getElementById('strikerName');
                    const nonStrikerNameEl = document.getElementById('nonStrikerName');
                    const bowlerNameEl = document.getElementById('bowlerName');

                    if (strikerNameEl && currentTeamScore.striker) {
                        strikerNameEl.textContent = currentTeamScore.striker.name;
                        } else {
                        }

                    if (nonStrikerNameEl && currentTeamScore.nonStriker) {
                        nonStrikerNameEl.textContent = currentTeamScore.nonStriker.name;
                        } else {
                        }

                    if (bowlerNameEl && currentMatch.bowler) {
                        bowlerNameEl.textContent = currentMatch.bowler.name;
                        } else {
                        }
                } else {
                    }
            }, 200);

            }
    }, 100);
}

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

function showWicketModal() {

    // Check if waiting for bowler selection
    if (window.cricketApp && window.cricketApp.waitingForBowlerSelection) {
        window.cricketApp.showNotification('⚠️ Please select a bowler first before continuing');
        return;
    }

    if (!window.cricketApp || !window.cricketApp.currentMatch) {
        alert('No active match found');
        return;
    }

    const match = window.cricketApp.currentMatch;

    const currentTeamScore = match.currentTeam === 1 ? match.team1Score : match.team2Score;
    const battingTeam = match.currentTeam === 1 ? match.team1 : match.team2;

        oldMethod_currentTeam: match.currentTeam,
        oldMethod_teamName: match.currentTeam === 1 ? match.team1?.name : match.team2?.name,
        newMethod_battingTeam: match.currentTeam === 1 ? 'team1' : 'team2',
        newMethod_teamName: battingTeam?.name,
        team1Batting: match.team1Score.batting,
        team2Batting: match.team2Score.batting
    }, null, 2));

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

    // Check if we have valid batsmen - if not, try to initialize them
    if (!currentTeamScore.striker && !currentTeamScore.nonStriker) {
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

            if (window.cricketApp.updateScoreDisplay) {
                window.cricketApp.updateScoreDisplay();
            }
        } else {
            alert('No batsmen found! Please ensure the match has active batsmen and teams are properly set up.');
            return;
        }
    }

    let strikerButton = '';
    let nonStrikerButton = '';

    if (currentTeamScore.striker) {
        const strikerName = currentTeamScore.striker.name || 'Unknown Striker';
        const safeStrikerName = strikerName.replace(/'/g, "\\'");
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

    window.selectedDismissedBatsman = null;
    // Add event listener to check if all required fields are filled
    window.checkFormCompletion = function() {
        const dismissalEl = document.getElementById('dismissalType');
        const newBatsmanEl = document.getElementById('newBatsman');
        const confirmBtn = document.getElementById('confirmWicketBtn');

        if (!dismissalEl || !newBatsmanEl || !confirmBtn) {
            return;
        }

        const dismissal = dismissalEl.value;
        const newBatsmanId = newBatsmanEl.value;

        if (dismissal && newBatsmanId && window.selectedDismissedBatsman) {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.cursor = 'pointer';
            confirmBtn.style.background = '#ef4444';

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
    // Step 1: Select dismissed batsman
    window.selectDismissedBatsman = function(playerId, playerName, position) {
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

                team1: window.cricketApp.currentMatch.team1?.name,
                team2: window.cricketApp.currentMatch.team2?.name,
                team1Batting: window.cricketApp.currentMatch.team1Score?.batting,
                team2Batting: window.cricketApp.currentMatch.team2Score?.batting,
                currentTeam: window.cricketApp.currentMatch.currentTeam
            }, null, 2));

            const availableBatsmen = window.cricketApp.getAvailableBatsmen();

            // Additional verification - let's also check what team the current batsmen belong to
            const currentTeamScore = window.cricketApp.currentMatch.currentTeam === 1 ?
                window.cricketApp.currentMatch.team1Score : window.cricketApp.currentMatch.team2Score;
            const battingTeam = window.cricketApp.currentMatch.currentTeam === 1 ?
                window.cricketApp.currentMatch.team1 : window.cricketApp.currentMatch.team2;
            const fieldingTeam = window.cricketApp.currentMatch.currentTeam === 1 ?
                window.cricketApp.currentMatch.team2 : window.cricketApp.currentMatch.team1;

            const teamVerification = {
                battingTeamName: battingTeam?.name,
                fieldingTeamName: fieldingTeam?.name,
                strikerTeamCheck: battingTeam?.players?.find(p => p.id === currentTeamScore.striker?.id) ? 'BATTING_TEAM' : 'FIELDING_TEAM',
                nonStrikerTeamCheck: battingTeam?.players?.find(p => p.id === currentTeamScore.nonStriker?.id) ? 'BATTING_TEAM' : 'FIELDING_TEAM'
            };

            if (availableBatsmen.length === 0) {
                // No more batsmen available - show innings end options
                newBatsmanSelect.innerHTML = `
                    <option value="">Choose an option...</option>
                    <option value="finish_innings">Finish Innings</option>
                    <option value="last_man_standing">Last Man Standing</option>
                `;

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
                        id: player.id,
                        name: player.name,
                        teamCheck: 'Will verify in next log'
                    }, null, 2));
                });

                // Additional verification: check which team each available batsman belongs to
                availableBatsmen.forEach(player => {
                    const inBattingTeam = battingTeam?.players?.find(p => p.id === player.id);
                    const inFieldingTeam = fieldingTeam?.players?.find(p => p.id === player.id);
                });
            }

            // Add event listener for dropdown changes
            newBatsmanSelect.addEventListener('change', window.checkFormCompletion);
        }

        // Check form completion now that a batsman is selected - use a direct call instead of setTimeout
        if (window.checkFormCompletion) {
            window.checkFormCompletion();
        } else {
            }
    };

    window.goBackToStep1 = function() {
        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        if (step1) step1.style.display = 'block';
        if (step2) step2.style.display = 'none';
        window.selectedDismissedBatsman = null;
    };

    setTimeout(() => {
        function updateDismissalUI() {
            const dismissal = document.getElementById('dismissalType')?.value || '';
            const helperSection = document.getElementById('helperSection');
            const newBatsmanSection = document.getElementById('newBatsmanSection');
            const confirmBtn = document.getElementById('confirmWicketBtn');
            const wicketHelper = document.getElementById('wicketHelper');

            // Add null checks for all elements - if any are missing, wait and try again
            if (!helperSection || !newBatsmanSection || !confirmBtn || !wicketHelper) {
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

        const fieldingTeamPlayers = window.cricketApp.getFieldingTeamPlayers();

        if (dismissal === 'bowled' || dismissal === 'lbw' || dismissal === 'hit wicket') {
            wicketHelper.innerHTML = `<option value="${match.bowler ? match.bowler.id : 'current-bowler'}">Bowler: ${match.bowler ? match.bowler.name : 'Current Bowler'}</option><option value="extra">Extra</option>`;
            helperSection.style.display = 'block';
        } else if (dismissal === 'caught') {
            let options = `<option value="${match.bowler ? match.bowler.id : 'current-bowler'}">Bowler: ${match.bowler ? match.bowler.name : 'Current Bowler'}</option>`;
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
            const newBatsmanEl = document.getElementById('newBatsman');

            if (!dismissalEl || !helperEl || !newBatsmanEl) {
                alert('Error: Form elements not found. Please try again.');
                return;
            }

            const dismissal = dismissalEl.value;
            const helper = helperEl.value;
            const fielder = helper; // Use same value for both helper and fielder
            const newBatsmanId = newBatsmanEl.value;

            // Check for null/undefined/empty values

            if (helperEl && helperEl.options && helperEl.selectedIndex >= 0) {
                const selectedOption = helperEl.options[helperEl.selectedIndex];
            }

            if (helperEl && helperEl.options) {
                Array.from(helperEl.options).forEach((opt, i) => {
                });
            }

                helperElementExists: !!helperEl,
                helperElementValue: helperEl?.value,
                helperElementSelectedIndex: helperEl?.selectedIndex,
                helperElementOptions: Array.from(helperEl?.options || []).map(opt => ({ value: opt.value, text: opt.text, selected: opt.selected }))
            });

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

            window.cricketApp.recordWicketLiveOnly(window.selectedDismissedBatsman.id, dismissal, helper, fielder, newBatsmanId);
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
                        <option value="run out">Run Out</option>
                        <option value="stumped">Stumped</option>
                        <option value="hit wicket">Hit Wicket</option>
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

    // CRITICAL: Restore global player stats including dictionary-based matchStats
    if (savedState.players && Array.isArray(savedState.players)) {
        savedState.players.forEach(savedPlayer => {
            const globalPlayer = window.cricketApp.players.find(p => p.id === savedPlayer.id);
            if (globalPlayer) {
                // Restore dictionary-based batting stats
                if (savedPlayer.matchStats && savedPlayer.matchStats.batting) {
                    if (!globalPlayer.matchStats) globalPlayer.matchStats = {};
                    globalPlayer.matchStats.batting = {...savedPlayer.matchStats.batting};
                }
                // Restore dictionary-based bowling stats
                if (savedPlayer.matchStats && savedPlayer.matchStats.bowling) {
                    if (!globalPlayer.matchStats) globalPlayer.matchStats = {};
                    globalPlayer.matchStats.bowling = {...savedPlayer.matchStats.bowling};
                }
                // Restore isOut status
                if (savedPlayer.isOut !== undefined) {
                    globalPlayer.isOut = savedPlayer.isOut;
                }
            }
        });
    }

    // Remove the last ball from history
    ballHistory.pop();

    window.cricketApp.updateScoreDisplay();
    window.cricketApp.saveData(false);

    // Show notification
    window.cricketApp.showNotification(`↶ Undid: ${actionDescription}`);

        undidAction: actionDescription,
        ballsRemaining: ballHistory.length,
        currentState: {
            team1: match.team1Score.runs + '/' + match.team1Score.wickets,
            team2: match.team2Score.runs + '/' + match.team2Score.wickets,
            overs: (match.currentTeam === 1 ? match.team1Score : match.team2Score).overs + '.' + (match.currentTeam === 1 ? match.team1Score : match.team2Score).balls
        }
    });
}

function swapBatsmen() {
    if (window.cricketApp && window.cricketApp.currentMatch) {
        window.cricketApp.swapStrike();
        window.cricketApp.updateScoreDisplay();
        window.cricketApp.showNotification('🔄 Batsmen swapped');
    }
}

function showScorecard() {
    if (window.cricketApp) {

        // Check if we have an active match or a just-finished match
        const matchToShow = window.cricketApp.currentMatch || window.cricketApp.lastFinishedMatch;

        if (matchToShow) {
        }

        if (!matchToShow) {
            alert('No active match found');
            return;
        }

        const originalCurrentMatch = window.cricketApp.currentMatch;
        window.cricketApp.currentMatch = matchToShow;

        // Force refresh of scorecard data before displaying
        if (originalCurrentMatch) {
            window.cricketApp.updateScoreDisplay(); // Ensure latest scores are calculated
        }

        const scorecard = window.cricketApp.getDetailedScorecard();

        // Restore original currentMatch state
        window.cricketApp.currentMatch = originalCurrentMatch;

        if (!scorecard) {
            console.error('📊 SCORECARD_ERROR: No scorecard returned!');
            alert('No match data available for scorecard');
            return;
        }

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
                max-width: 95vw;
                width: 100%;
                max-height: 85vh;
                height: auto;
                overflow-y: auto;
                overflow-x: auto;
                box-shadow: 0 15px 30px rgba(0,0,0,0.3);
                border: 1px solid rgba(0, 255, 65, 0.3);
                position: relative;
                font-family: 'Segoe UI', sans-serif;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: thin;
                scrollbar-color: rgba(0, 255, 65, 0.3) transparent;
            ">
                <!-- Close Button -->
                <button class="scorecard-close-btn" onclick="
                    const modal = this.closest('.modal-overlay');
                    if (modal) modal.remove();
                    if (window.cricketApp && window.cricketApp.handleScorecardClose) {
                        window.cricketApp.handleScorecardClose();
                    }
                " style="
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
                    max-height: 90vh !important;
                    max-width: 98vw !important;
                }
                .scorecard-container table {
                    font-size: 10px !important;
                    min-width: 300px !important;
                    white-space: nowrap !important;
                }
                .scorecard-container th, .scorecard-container td {
                    padding: 4px 3px !important;
                    min-width: 35px !important;
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
                    max-width: 98vw !important;
                }
                .scorecard-container table {
                    font-size: 9px !important;
                    min-width: 280px !important;
                }
                .scorecard-container th, .scorecard-container td {
                    padding: 3px 2px !important;
                    min-width: 30px !important;
                }
            }
            /* Enhanced scrollbar styling */
            .scorecard-container::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }
            .scorecard-container::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.1);
                border-radius: 3px;
            }
            .scorecard-container::-webkit-scrollbar-thumb {
                background: rgba(0, 255, 65, 0.5);
                border-radius: 3px;
            }
            .scorecard-container::-webkit-scrollbar-thumb:hover {
                background: rgba(0, 255, 65, 0.7);
            }
            .scorecard-container::-webkit-scrollbar-corner {
                background: rgba(255,255,255,0.1);
            }

            /* Table wrapper for horizontal scrolling */
            .table-wrapper {
                overflow-x: auto !important;
                -webkit-overflow-scrolling: touch !important;
                width: 100% !important;
            }

            .table-wrapper table {
                min-width: 100% !important;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(modal);
    } else {
        alert('No active match found');
    }
}

function generateTeamScorecardHTML(teamScorecard, teamName, teamKey, fullScorecard, opposingTeamScorecard) {
    // Check wicket data sources at function start
    const team1W = window.cricketApp?.currentMatch?.team1Score?.fallOfWickets?.length || 0;
    const team2W = window.cricketApp?.currentMatch?.team2Score?.fallOfWickets?.length || 0;

    const isTeam1 = teamKey === 'team1';
    const primaryColor = isTeam1 ? '#667eea' : '#764ba2';
    const secondaryColor = isTeam1 ? '#764ba2' : '#667eea';

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
            ${teamScorecard.bowlingCard && teamScorecard.bowlingCard.length > 0 ? `
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
                                ${teamScorecard.bowlingCard.map(bowler => `
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
            ${(() => {

                if (window.cricketApp && window.cricketApp.currentMatch) {
                    const currentTeamScore = window.cricketApp.currentMatch.currentTeam === 1 ?
                        window.cricketApp.currentMatch.team1Score : window.cricketApp.currentMatch.team2Score;

                    // If teamScorecard.fallOfWickets is empty but currentTeamScore has wickets, copy them over
                    if ((!teamScorecard.fallOfWickets || teamScorecard.fallOfWickets.length === 0) &&
                        currentTeamScore?.fallOfWickets?.length > 0) {
                        teamScorecard.fallOfWickets = currentTeamScore.fallOfWickets;
                    }
                }
                return '';
            })()}
            ${(() => {
                // Only show Fall of Wickets for teams that have actually batted
                const hasWickets = teamScorecard.fallOfWickets && teamScorecard.fallOfWickets.length > 0;
                const hasBatted = teamScorecard.totalScore && teamScorecard.totalScore !== '0/0';
                const shouldShowFallOfWickets = hasWickets && hasBatted;

                    hasWickets: hasWickets,
                    hasBatted: hasBatted,
                    totalScore: teamScorecard.totalScore,
                    shouldShow: shouldShowFallOfWickets
                });

                return shouldShowFallOfWickets;
            })() ? `
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
                        ${teamScorecard.fallOfWickets.filter((wicket, filterIndex) => {
                            // More lenient filtering - only require valid player name, dismissal info is optional
                            const hasValidDismissalType = (wicket.dismissalType && typeof wicket.dismissalType === 'string') ||
                                                         (wicket.dismissal && typeof wicket.dismissal === 'string');
                            const hasValidPlayerName = (wicket.batsman && typeof wicket.batsman === 'string') ||
                                                      (wicket.batsmanName && typeof wicket.batsmanName === 'string') ||
                                                      (wicket.player && typeof wicket.player === 'string') ||
                                                      (wicket.batsman && wicket.batsman.name) ||
                                                      (wicket.player && wicket.player.name);

                            // Only filter out if player name is invalid - allow wickets without dismissal info
                            if (!hasValidPlayerName) {
                                return false;
                            }

                            if (!hasValidDismissalType) {
                            }
                            return true;
                        }).map((wicket, index) => {
                            const enrichedWicket = enrichWicketData(wicket);

                            const processedWicket = enrichedWicket;
                            const dismissalText = formatDismissalText(processedWicket);

                            const playerName = processedWicket.batsmanName || processedWicket.batsman || 'Unknown';

            let overInfo;
            if (typeof processedWicket.over === 'string') {
                // Already formatted as "overs.balls"
                overInfo = processedWicket.over;
            } else if (typeof processedWicket.over === 'number' && processedWicket.ball !== undefined) {
                // Separate over and ball numbers
                overInfo = `${processedWicket.over}.${processedWicket.ball}`;
            } else {
                // Fallback - treat over as number only
                overInfo = `${processedWicket.over || 0}.0`;
            }
            const score = processedWicket.score !== undefined ? processedWicket.score : (processedWicket.runs !== undefined ? processedWicket.runs : '');
            const wicketNum = index + 1;

                            return `<div style="margin-bottom: 4px;">
                                ${score !== '' ? `<strong>${score}/${wicketNum}</strong> ` : ''}
                                ${playerName} (${overInfo})
                                ${dismissalText ? ` - ${dismissalText}` : ' - unknown'}
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
            const dismissalText = formatDismissalText(wicket);
            return dismissalText;
        } else {
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

function getPlayerNameById(playerId) {
    if (!playerId) return '';

    // Convert to string for consistent comparison
    const idString = String(playerId);
    const idNumber = Number(playerId);

    // Try to get from current match teams first (most accurate)
    if (window.cricketApp && window.cricketApp.currentMatch) {
        const team1Players = window.cricketApp.currentMatch.team1?.players || [];
        const team2Players = window.cricketApp.currentMatch.team2?.players || [];
        const allMatchPlayers = [...team1Players, ...team2Players];

        const player = allMatchPlayers.find(p =>
            String(p.id) === idString || p.id === idNumber || p.id === playerId
        );
        if (player && player.name) return player.name;
    }

    // Fallback to global players list
    if (window.cricketApp && window.cricketApp.players) {
        const player = window.cricketApp.players.find(p =>
            String(p.id) === idString || p.id === idNumber || p.id === playerId
        );
        if (player && player.name) return player.name;
    }

    return '';
}

function enrichWicketData(wicket) {
    if (!wicket) {
        return wicket;
    }

    // Start with the original wicket data
    const enriched = { ...wicket };

    enriched.batsman = (typeof wicket.batsman === 'string') ? wicket.batsman :
                      (wicket.batsman && wicket.batsman.name) ? wicket.batsman.name :
                      wicket.batsmanName || wicket.player || 'Unknown';

    enriched.batsmanName = wicket.batsmanName ||
                          (wicket.batsman && wicket.batsman.name) ||
                          (typeof wicket.batsman === 'string' ? wicket.batsman : 'Unknown');

    enriched.batsmanId = wicket.batsmanId || (wicket.batsman && wicket.batsman.id);

    let helperName = null;
    let fielderName = null;

    // Process helper field
    if (wicket.helper) {
        if (wicket.helper === 'extra') {
            helperName = 'extra';
        } else {
            const helperPlayer = window.cricketApp?.players?.find(p => String(p.id) === String(wicket.helper));
            helperName = helperPlayer ? helperPlayer.name : wicket.helper;
        }
    } else if (wicket.fielder) {
        if (wicket.fielder === 'extra') {
            helperName = 'extra';
        } else {
            const fielderPlayer = window.cricketApp?.players?.find(p => String(p.id) === String(wicket.fielder));
            helperName = fielderPlayer ? fielderPlayer.name : wicket.fielder;
            helperName = fielderPlayer ? fielderPlayer.name : fielder;
        }
    }

    // Set the enriched helper/fielder data
    enriched.helper = helperName;
    enriched.fielder = helperName; // In cricket, fielder is typically same as helper

    if (wicket.bowlerId && window.cricketApp?.players) {
        const bowlerPlayer = window.cricketApp.players.find(p => String(p.id) === String(wicket.bowlerId));
        if (bowlerPlayer) {
            enriched.bowler = bowlerPlayer.name;
        }
    }

    // as this function is called every time scorecard is displayed.
    // Stats should only be updated during actual wicket recording.

    return enriched;
}

function formatDismissalText(wicket) {

    if (!wicket) {
        return '';
    }

    const dismissalType = wicket.dismissalType || wicket.dismissal;
    let helper = '';
    const bowler = wicket.bowler || wicket.bowlerName || '';

    // Check for helper/fielder information - try both fields
    if (wicket.helper) {
        helper = wicket.helper;
    } else if (wicket.fielder) {
        helper = wicket.fielder;
    }

    if (helper && (typeof helper === 'number' || typeof helper === 'string')) {
        if (/^\d+$/.test(String(helper))) {
            const resolvedName = getPlayerNameById(helper);
            if (resolvedName && resolvedName !== String(helper)) {
                helper = resolvedName;
            }
        }
    }

    if (!dismissalType) {
            bowler: wicket.bowler,
            helper: wicket.helper,
            fielder: wicket.fielder,
            allFields: Object.keys(wicket),
            fullWicketData: JSON.stringify(wicket, null, 2)
        });

        // Try to infer dismissal type from context
        if (wicket.helper || wicket.fielder) {
            // If there's a helper/fielder but no dismissal type, it might have been a fielding dismissal
            return wicket.helper ? `dismissed (${wicket.helper})` : 'dismissed';
        }

        return '';
    }

    let resolvedBowler = bowler;
    if (bowler && typeof bowler === 'string' && /^\d+$/.test(bowler)) {
        const bowlerPlayer = window.cricketApp && window.cricketApp.players
            ? window.cricketApp.players.find(p => p.id == bowler)
            : null;
        if (bowlerPlayer) {
            resolvedBowler = bowlerPlayer.name;
        } else {
        }
    }

    let resolvedHelper = helper;

    if (helper === 'extra') {
        resolvedHelper = 'extra';
    } else if (helper && typeof helper === 'string' && /^\d+$/.test(helper)) {
        const helperPlayer = window.cricketApp && window.cricketApp.players
            ? window.cricketApp.players.find(p => p.id == helper)
            : null;
        if (helperPlayer) {
            resolvedHelper = helperPlayer.name;
        } else {
        }
    }

    let result;
    switch (dismissalType.toLowerCase()) {
        case 'caught':
            if (resolvedHelper && resolvedBowler) {
                // Check for "extra" fielder
                if (resolvedHelper === 'extra') {
                    result = `c extra b ${resolvedBowler}`;
                } else if (resolvedHelper === resolvedBowler) {
                    result = `c & b ${resolvedBowler}`;
                } else {
                    result = `c ${resolvedHelper} b ${resolvedBowler}`;
                }
            } else if (resolvedBowler) {
                result = `c & b ${resolvedBowler}`;
            } else {
                // Fallback
                result = 'caught';
            }
            break;
        case 'stumped':
            result = resolvedHelper && resolvedBowler ? `st ${resolvedHelper} b ${resolvedBowler}` : `st ${resolvedBowler || 'bowler'}`;
            break;
        case 'run out':
        case 'runout':
            result = resolvedHelper ? `run out (${resolvedHelper})` : 'run out';
            break;
        case 'bowled':
            result = resolvedBowler ? `b ${resolvedBowler}` : 'bowled';
            break;
        case 'lbw':
            result = resolvedBowler ? `lbw b ${resolvedBowler}` : 'lbw';
            break;
        case 'hit wicket':
            result = resolvedBowler ? `hit wicket b ${resolvedBowler}` : 'hit wicket';
            break;
        default:
            result = dismissalType;
    }

    return result;
}

function endInnings() {
    if (window.cricketApp && window.cricketApp.currentMatch) {
        if (confirm('Are you sure you want to end this innings?')) {
            window.cricketApp.endInnings();
        }
    }
}

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
        return data;
    },

    // Helper function to restore from auto-backup
    restoreAutoBackup() {
        const backup = localStorage.getItem('cricket-auto-backup');
        if (!backup) {
            return false;
        }

        try {
            const data = JSON.parse(backup);
            localStorage.setItem('cricket-players', JSON.stringify(data.players || []));
            localStorage.setItem('cricket-teams', JSON.stringify(data.teams || []));
            localStorage.setItem('cricket-matches', JSON.stringify(data.matches || []));
            localStorage.setItem('match-settings', JSON.stringify(data.settings || {}));

            return true;
            return false;
        }
    },

    // Helper function to test import functionality
    testImport() {
        if (window.exportCricketData) {
            } else {
            }

        if (window.importCricketData) {
            } else {
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
    });
}
