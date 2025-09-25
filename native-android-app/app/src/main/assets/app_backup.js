// Cricket PWA - Complete Application Logic with BCCB Integration
console.log('🔥 JAVASCRIPT LOADING STARTED');

// Global debug flag
const DEBUG_MODE = true;

// Simple utility functions for consistent ID handling
function findPlayerButton(playerId, selector = '[data-player-id]') {
    const allButtons = document.querySelectorAll(selector);
    
    for (const btn of allButtons) {
        const btnId = btn.getAttribute('data-player-id');
        if (btnId == playerId) {
            return btn;
        }
    }
    return null;
}

// Test DOM Content Loaded event early
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 EARLY DOM TEST: DOM Content Loaded event fired!');
});

// IMMEDIATE TEST: Try to instantiate CricketApp right away
setTimeout(function() {
    console.log('⚡ IMMEDIATE TEST: Trying to instantiate CricketApp...');
    try {
        if (typeof CricketApp === 'undefined') {
            console.error('❌ IMMEDIATE: CricketApp class not defined yet');
            return;
        }
        window.cricketApp = new CricketApp();
        console.log('✅ IMMEDIATE: Cricket app instantiated!', window.cricketApp);
        window.app = window.cricketApp;
        console.log('✅ IMMEDIATE: Global app reference created');
    } catch (error) {
        console.error('❌ IMMEDIATE: Cricket app instantiation failed:', error);
    }
}, 1000);

// Backup initialization - try multiple times
let initAttempts = 0;
const maxInitAttempts = 5;

function tryInitializeCricketApp() {
    initAttempts++;
    console.log(`🔄 INIT ATTEMPT ${initAttempts}: Trying to initialize CricketApp...`);
    
    if (typeof CricketApp === 'undefined') {
        console.log(`❌ INIT ATTEMPT ${initAttempts}: CricketApp class not available yet`);
        if (initAttempts < maxInitAttempts) {
            setTimeout(tryInitializeCricketApp, 500);
        }
        return;
    }
    
    if (window.cricketApp) {
        console.log(`✅ INIT ATTEMPT ${initAttempts}: CricketApp already exists`);
        return;
    }
    
    try {
        window.cricketApp = new CricketApp();
        window.app = window.cricketApp;
        console.log(`✅ INIT ATTEMPT ${initAttempts}: CricketApp successfully initialized!`);
    } catch (error) {
        console.error(`❌ INIT ATTEMPT ${initAttempts}: Failed to initialize CricketApp:`, error);
        if (initAttempts < maxInitAttempts) {
            setTimeout(tryInitializeCricketApp, 500);
        }
    }
}

// Start trying to initialize
setTimeout(tryInitializeCricketApp, 500);

// Define critical global functions immediately to prevent errors
window.showPage = window.showPage || function(pageId) {
    console.log('🔧 EMERGENCY showPage called for:', pageId);
    
    // Try to hide all content sections
    const contentSections = document.querySelectorAll('.content');
    contentSections.forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    // Try to show the requested section
    const targetSection = document.getElementById(pageId);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
        console.log('✅ EMERGENCY: Activated page:', pageId);
    } else {
        console.log('❌ EMERGENCY: Page not found:', pageId);
    }
    
    // Update navigation if possible
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const targetNavItem = document.querySelector(`[onclick="showPage('${pageId}')"]`) || 
                          document.querySelector(`a[href="#${pageId}"]`);
    if (targetNavItem) {
        targetNavItem.classList.add('active');
    }
};

// Make sure global functions are available
window.getCurrentTeams = window.getCurrentTeams || function() {
    if (window.cricketApp && window.cricketApp.teams) {
        return window.cricketApp.teams;
    }
    if (window.app && window.app.teams) {
        return window.app.teams;
    }
    return [];
};

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
        // For team generation, we'll use category-based scoring
        // Return false to always use category-based approach
        return false;
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
        // For team generation, use category-based scoring
        const battingScoreMap = { 'Reliable': 6, 'So-So': 3, 'Tailend': 1, 'R': 6, 'S': 3, 'U': 1 };
        return battingScoreMap[player.battingStyle || player.batting] || 0;
    }    /**
     * Calculates bowling performance score (0-10)  
     */
    calculateBowlingPerformanceScore(player) {
        // For team generation, use category-based scoring
        const bowlingScoreMap = { 'Fast': 5, 'Medium': 3, 'DNB': 1 };
        return bowlingScoreMap[player.bowlingStyle || player.bowling] || 0;
    }    /**
     * Determines player role based on batting and bowling styles
     */
    getPlayerRole(player) {
        const battingScore = { 'Reliable': 6, 'So-So': 3, 'Tailend': 1 }[player.batting] || 0;
        const bowlingScore = { 'Fast': 5, 'Medium': 3, 'DNB': 1 }[player.bowling] || 0;
        
        // If player doesn't bowl (DNB), they're likely a batsman
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
        
        // Default to bowler if primarily good at bowling
        return 'bowler';
    }

    /**
     * Enhanced team balancing that uses mixed data approach
     */
    balanceTeamsWithStats(selectedPlayers, captain1, captain2, shouldShuffle = false) {
        // Calculate average performance for each category to help players without enough data
        const categoryAverages = this.calculateCategoryAverages(selectedPlayers);
        
        // Enhance players without enough data with category averages
        const enhancedPlayers = selectedPlayers.map(player => ({
            ...player,
            enhancedScore: this.getEnhancedPlayerScore(player, categoryAverages)
        }));
        
        return this.balanceTeamsWithEnhancedScores(enhancedPlayers, captain1, captain2, shouldShuffle);
    }

    /**
     * Calculate average performance for each batting/bowling category
     */
    calculateCategoryAverages(players) {
        const playersWithData = players.filter(p => this.hasEnoughData(p));
        
        if (playersWithData.length === 0) {
            // No players have enough data, return default values
            return {
                batting: { 'Reliable': 6, 'So-So': 3, 'Tailend': 1 },
                bowling: { 'Fast': 5, 'Medium': 3, 'DNB': 1 }
            };
        }
        
        const battingAverages = {};
        const bowlingAverages = {};
        
        // Group players by their categories and calculate averages
        ['Reliable', 'So-So', 'Tailend'].forEach(battingStyle => {
            const playersInCategory = playersWithData.filter(p => 
                (p.batting || p.battingStyle) === battingStyle
            );
            
            if (playersInCategory.length > 0) {
                const avgScore = playersInCategory.reduce((sum, p) => 
                    sum + this.calculateBattingPerformanceScore(p), 0
                ) / playersInCategory.length;
                battingAverages[battingStyle] = avgScore;
            } else {
                // Use default if no players in this category have data
                battingAverages[battingStyle] = { 'Reliable': 6, 'So-So': 3, 'Tailend': 1 }[battingStyle];
            }
        });
        
        ['Fast', 'Medium', 'DNB'].forEach(bowlingStyle => {
            const playersInCategory = playersWithData.filter(p => 
                (p.bowling || p.bowlingStyle) === bowlingStyle
            );
            
            if (playersInCategory.length > 0) {
                const avgScore = playersInCategory.reduce((sum, p) => 
                    sum + this.calculateBowlingPerformanceScore(p), 0
                ) / playersInCategory.length;
                bowlingAverages[bowlingStyle] = avgScore;
            } else {
                // Use default if no players in this category have data
                bowlingAverages[bowlingStyle] = { 'Fast': 5, 'Medium': 3, 'DNB': 1 }[bowlingStyle];
            }
        });
        
        return {
            batting: battingAverages,
            bowling: bowlingAverages
        };
    }

    /**
     * Get enhanced player score using mix of actual stats and category averages
     */
    getEnhancedPlayerScore(player, categoryAverages) {
        // For team generation, we don't have specific match data, so use category averages
        // Use category averages for players without enough data
        const battingStyle = player.batting || player.battingStyle;
        const bowlingStyle = player.bowling || player.bowlingStyle;
        
        const battingScore = categoryAverages.batting[battingStyle] || 3;
        const bowlingScore = categoryAverages.bowling[bowlingStyle] || 3;
        
        // Apply same role weighting as performance-based scoring
        const role = this.getPlayerRole(player);
        let weightedScore;
        
        switch(role) {
            case 'batsman':
                weightedScore = battingScore * 0.8 + bowlingScore * 0.2;
                break;
            case 'bowler':
                weightedScore = battingScore * 0.2 + bowlingScore * 0.8;
                break;
            case 'allrounder':
                weightedScore = battingScore * 0.5 + bowlingScore * 0.5;
                break;
            default:
                weightedScore = battingScore * 0.6 + bowlingScore * 0.4;
        }
        
        return Math.round(weightedScore);
    }

    /**
     * Balance teams using enhanced scores (mix of stats and category averages)
     */
    balanceTeamsWithEnhancedScores(enhancedPlayers, captain1, captain2, shouldShuffle = false) {
        const teamA = [captain1];
        const teamB = [captain2];

        const otherPlayers = enhancedPlayers.filter(p => p.id !== captain1.id && p.id !== captain2.id);

        // Separate players into star and regular
        const starPlayers = otherPlayers.filter(p => p.is_star || p.isStar || false);
        const regularPlayers = otherPlayers.filter(p => !(p.is_star || p.isStar));

        // Sort by enhanced score
        starPlayers.sort((a, b) => b.enhancedScore - a.enhancedScore);
        regularPlayers.sort((a, b) => b.enhancedScore - a.enhancedScore);

        // Add shuffling for variety
        if (shouldShuffle) {
            this.shufflePlayersWithSameScore(starPlayers);
            this.shufflePlayersWithSameScore(regularPlayers);
        }

        // Determine starting turn based on captain strength
        const captain1Score = this.getEnhancedPlayerScore(captain1, {
            batting: { 'Reliable': 6, 'So-So': 3, 'Tailend': 1 },
            bowling: { 'Fast': 5, 'Medium': 3, 'DNB': 1 }
        });
        const captain2Score = this.getEnhancedPlayerScore(captain2, {
            batting: { 'Reliable': 6, 'So-So': 3, 'Tailend': 1 },
            bowling: { 'Fast': 5, 'Medium': 3, 'DNB': 1 }
        });
        
        let turn = captain1Score <= captain2Score ? 0 : 1;

        // Distribute star players
        for (const player of starPlayers) {
            if (turn === 0) {
                teamA.push(player);
                turn = 1;
            } else {
                teamB.push(player);
                turn = 0;
            }
        }

        // Distribute regular players
        for (const player of regularPlayers) {
            if (turn === 0) {
                teamA.push(player);
                turn = 1;
            } else {
                teamB.push(player);
                turn = 0;
            }
        }

        // Balance team sizes
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
     * Generate balanced teams with the enhanced statistics-based algorithm
     */
    generateBalancedTeams(players) {
        if (players.length < 4) {
            throw new Error('Need at least 4 players to create teams');
        }

        // Get available players
        const availablePlayers = [...players];
        
        // Check if we have players with enough data for enhanced balancing
        const playersWithData = availablePlayers.filter(p => this.hasEnoughData(p));
        const useEnhancedBalancing = playersWithData.length > 0;
        
        console.log(`🎯 Team Generation: Using ${useEnhancedBalancing ? 'Enhanced Statistics-Based' : 'Category-Based'} Balancing`);
        console.log(`📊 Players with enough data (≥2 matches): ${playersWithData.length}/${availablePlayers.length}`);
        
        let captain1, captain2, balancedResult;
        
        if (useEnhancedBalancing) {
            // Use enhanced balancing with statistics
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
            
            // Use enhanced balancing
            balancedResult = this.balanceTeamsWithStats(availablePlayers, captain1, captain2);
            
            console.log(`👑 Captain 1: ${captain1.name} (Enhanced Score: ${captain1.enhancedScore || 'N/A'})`);
            console.log(`👑 Captain 2: ${captain2.name} (Enhanced Score: ${captain2.enhancedScore || 'N/A'})`);
            
        } else {
            // Fallback to original category-based balancing
            const sortedPlayers = availablePlayers.sort((a, b) => this.skillScore(b) - this.skillScore(a));
            
            // Separate star players and regular players
            const starPlayers = sortedPlayers.filter(p => p.is_star || p.isStar);
            const regularPlayers = sortedPlayers.filter(p => !(p.is_star || p.isStar));
            
            captain1 = starPlayers.length > 0 ? starPlayers[0] : regularPlayers[0];
            captain2 = starPlayers.length > 1 ? starPlayers[1] : 
                      (regularPlayers[0] !== captain1 ? regularPlayers[0] : regularPlayers[1]);
            
            // Use original balancing
            balancedResult = this.balanceTeams(availablePlayers, captain1, captain2);
            
            console.log(`👑 Captain 1: ${captain1.name} (Skill Score: ${this.skillScore(captain1)})`);
            console.log(`👑 Captain 2: ${captain2.name} (Skill Score: ${this.skillScore(captain2)})`);
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
        
        console.log(`⚡ Team Lightning Strength: ${teamAStrength.toFixed(1)}`);
        console.log(`🌩️ Team Thunder Strength: ${teamBStrength.toFixed(1)}`);
        console.log(`📊 Balance Difference: ${Math.abs(teamAStrength - teamBStrength).toFixed(1)}`);

        return {
            teamA: {
                id: Date.now(),
                name: 'Team Lightning ⚡',
                captain: captain1.name,
                players: teamA,
                strength: teamAStrength,
                balancingMethod: useEnhancedBalancing ? 'statistics-based' : 'category-based',
                created: new Date().toISOString()
            },
            teamB: {
                id: Date.now() + 1,
                name: 'Team Thunder 🌩️',
                captain: captain2.name,
                players: teamB,
                strength: teamBStrength,
                balancingMethod: useEnhancedBalancing ? 'statistics-based' : 'category-based',
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
     * Generate player comparison data (simplified spider chart data)
     */
    generatePlayerComparison(player1, player2) {
        if (!player1 || !player2) return null;

        const metrics = [
            { name: 'Runs/Match', key: 'runsPerMatch', max: 50 },
            { name: 'Batting Avg', key: 'battingAverage', max: 50 },
            { name: 'Strike Rate', key: 'strikeRate', max: 200 },
            { name: 'Wickets/Match', key: 'wicketsPerMatch', max: 3 },
            { name: 'Economy', key: 'economy', max: 10, invert: true }, // Lower is better
            { name: '4s/Match', key: 'foursPerMatch', max: 8 }
        ];

        const getMetricValue = (player, metric) => {
            switch(metric.key) {
                case 'runsPerMatch':
                    return player.matches > 0 ? (player.runs || 0) / player.matches : 0;
                case 'wicketsPerMatch':
                    return player.matches > 0 ? (player.wickets || 0) / player.matches : 0;
                case 'foursPerMatch':
                    return player.matches > 0 ? (player.fours || 0) / player.matches : 0;
                case 'battingAverage':
                    return player.matches > 0 ? (player.runs || 0) / player.matches : 0;
                case 'strikeRate':
                    return this.calculateStrikeRate(player) || 0;
                case 'economy':
                    return this.calculateBowlerEconomy(player) || 0;
                default:
                    return player[metric.key] || 0;
            }
        };

        const player1Data = metrics.map(metric => {
            let value = getMetricValue(player1, metric);
            if (metric.invert) {
                value = metric.max - value; // For economy, invert so lower is better
            }
            return {
                metric: metric.name,
                value: Math.min(value / metric.max * 100, 100) // Normalize to 0-100
            };
        });

        const player2Data = metrics.map(metric => {
            let value = getMetricValue(player2, metric);
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
        
        // Use new calculation formulas
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

// Group Authentication Manager
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
            } catch (e) {
                console.error('Error loading current group:', e);
            }
        }
        // Default guest group
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

    // Update UI to show current group
    updateUI() {
        const groupNameElement = document.getElementById('currentGroupName');
        if (groupNameElement) {
            groupNameElement.textContent = this.currentGroup.name;
            
            // Update styling based on group type - with null check
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

    // Create new group (both localStorage and D1)
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
                throw new Error('Group name already exists');
            }

            // Hash password if provided
            const passwordHash = await this.hashPassword(password);

            // Try to create group in D1 first
            let d1GroupId = null;
            try {
                console.log(`🌩️ Creating group "${groupName}" in D1...`);
                const d1Manager = new D1ApiManager();
                if (await d1Manager.checkConnection()) {
                    const d1Result = await d1Manager.createGroup(groupName, passwordHash);
                    if (d1Result.success) {
                        d1GroupId = d1Result.group.id;
                        console.log(`✅ Group created in D1 with ID: ${d1GroupId}`);
                    } else {
                        throw new Error(d1Result.error || 'Failed to create group in D1');
                    }
                } else {
                    console.warn('⚠️ D1 not available, creating group locally only');
                }
            } catch (d1Error) {
                console.error('❌ Failed to create group in D1:', d1Error);
                throw new Error(`Failed to create group in cloud database: ${d1Error.message}`);
            }

            // Create group object (use D1 ID if available, otherwise timestamp)
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
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Login to existing group
    async loginToGroup(groupName, password) {
        try {
            console.log('🔐 LOGIN DEBUG: Attempting login with:', { groupName, password: password ? '***' : 'null' });
            
            if (!groupName || groupName.trim() === '') {
                throw new Error('Group name is required');
            }

            const originalGroupName = groupName;
            groupName = groupName.trim().toLowerCase();
            console.log('🔐 LOGIN DEBUG: Normalized group name:', originalGroupName, '->', groupName);

            // Handle guest group
            if (groupName === 'guest') {
                console.log('🔐 LOGIN DEBUG: Guest login detected');
                const guestGroup = {
                    id: 1,
                    name: 'guest',
                    hasPassword: false
                };
                this.saveCurrentGroup(guestGroup);
                return { success: true, group: guestGroup };
            }

            // Find group in localStorage (will be replaced with D1 query)
            const existingGroups = this.getLocalGroups();
            console.log('🔐 LOGIN DEBUG: Local groups found:', existingGroups.map(g => g.name));
            const group = existingGroups.find(g => g.name === groupName);
            console.log('🔐 LOGIN DEBUG: Group found in localStorage:', !!group);

            if (!group) {
                console.log('🔐 LOGIN DEBUG: Group not found in localStorage, trying D1...');
                // Try D1 authentication directly
                return await this.loginWithD1(groupName, password);
            }

            console.log('🔐 LOGIN DEBUG: Verifying password...');
            // Verify password
            const passwordValid = await this.verifyPassword(password, group.passwordHash);
            console.log('🔐 LOGIN DEBUG: Password valid:', passwordValid);
            if (!passwordValid) {
                throw new Error('Invalid password');
            }

            // Switch to group
            this.saveCurrentGroup({
                id: group.id,
                name: group.name,
                hasPassword: group.hasPassword
            });

            return { success: true, group: group };
        } catch (error) {
            console.error('🔐 LOGIN DEBUG: Login error:', error);
            return { success: false, error: error.message };
        }
    }

    // Method to try D1 authentication directly
    async loginWithD1(groupName, password) {
        try {
            console.log('🔐 D1 LOGIN DEBUG: Attempting D1 login for:', groupName);
            
            // Special handling for 'bccb' group - add it to localStorage if it doesn't exist
            if (groupName === 'bccb') {
                console.log('🔐 D1 LOGIN DEBUG: Adding bccb group to localStorage');
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
                console.log('🔐 D1 LOGIN DEBUG: Retrying login with stored group');
                return await this.loginToGroup(groupName, password);
            }
            
            throw new Error('Group not found. Please check group name and try again.');
        } catch (error) {
            console.error('🔐 D1 LOGIN DEBUG: D1 login error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get groups from localStorage (temporary until D1 integration)
    getLocalGroups() {
        const stored = localStorage.getItem('cricket-groups');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Error loading groups:', e);
            }
        }
        return [];
    }

    // Migrate existing local groups to D1
    async migrateLocalGroupsToD1() {
        try {
            console.log('🔄 Checking for local groups that need D1 migration...');
            const localGroups = this.getLocalGroups();
            const d1Manager = new D1ApiManager();
            
            if (!await d1Manager.checkConnection()) {
                console.warn('⚠️ D1 not available for migration');
                return { success: false, error: 'D1 not available' };
            }

            let migratedCount = 0;
            for (const group of localGroups) {
                if (group.name === 'guest') continue; // Skip guest group
                
                try {
                    console.log(`🌩️ Migrating group "${group.name}" to D1...`);
                    
                    // Try to create the group in D1
                    const d1Result = await d1Manager.createGroup(group.name, group.passwordHash);
                    
                    if (d1Result.success) {
                        // Update local group with D1 ID
                        group.id = d1Result.group.id;
                        migratedCount++;
                        console.log(`✅ Migrated group "${group.name}" with D1 ID: ${d1Result.group.id}`);
                    } else if (d1Result.error && d1Result.error.includes('already exists')) {
                        // Group already exists in D1, authenticate to get ID
                        console.log(`🔍 Group "${group.name}" already exists in D1, authenticating...`);
                        const authResult = await d1Manager.authenticateGroup(group.name, group.passwordHash);
                        if (authResult.success) {
                            group.id = authResult.group.id;
                            console.log(`✅ Linked existing D1 group "${group.name}" with ID: ${authResult.group.id}`);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Failed to migrate group "${group.name}":`, error);
                }
            }
            
            // Save updated groups back to localStorage
            localStorage.setItem('cricket-groups', JSON.stringify(localGroups));
            
            console.log(`✅ Migration complete: ${migratedCount} groups migrated to D1`);
            return { success: true, migratedCount };
            
        } catch (error) {
            console.error('❌ Group migration failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Get current group ID for data isolation
    getCurrentGroupId() {
        return this.currentGroup.id;
    }

    // Get current group name
    getCurrentGroupName() {
        return this.currentGroup.name;
    }

    // Check if user is in guest group
    isGuest() {
        return this.currentGroup.name === 'guest';
    }
}

// D1 API Manager for Cloudflare Database Integration
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

    // Generic API call handler
    async apiCall(endpoint, method = 'GET', data = null) {
        try {
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
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('D1 API call failed:', error);
            throw error;
        }
    }

    // Group Management APIs
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
        console.log(`🌩️ D1-MANAGER: syncToD1 called for group ${groupId}`);
        console.log(`🌩️ D1-MANAGER: Data contains ${allData.players?.length || 0} players, ${allData.matches?.length || 0} matches`);
        
        const result = await this.apiCall('/sync/upload', 'POST', {
            group_id: groupId,
            players: allData.players || [],
            matches: allData.matches || []
            // Note: Performance data is not yet handled by the Worker
        });
        
        console.log(`✅ D1-MANAGER: syncToD1 completed successfully for group ${groupId}`);
        return result;
    }

    async syncFromD1(groupId) {
        return await this.apiCall(`/sync/download/${groupId}`);
    }

    // Check if D1 is available
    async checkConnection() {
        try {
            await this.apiCall('/health');
            return true;
        } catch (error) {
            console.warn('D1 connection not available:', error.message);
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
                
                // Also save to group-specific storage and trigger D1 sync
                this.teams = this.tempTeams;
                this.saveData(true); // Trigger D1 sync when teams are saved
                
                this.showNotification('✅ Teams saved! You can resume later.');
            } catch (e) {
                this.showNotification('❌ Failed to save teams: ' + e.message);
            }
        } else {
            this.showNotification('❌ No teams to save.');
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
                    this.showNotification('✅ Loaded saved teams!');
                    return true;
                }
            }
        } catch (e) {
            this.showNotification('❌ Failed to load saved teams: ' + e.message);
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
        this.analytics = new AnalyticsEngine();
        this.teamBalancer = new TeamBalancer();
        
        // Initialize group authentication with persistent login
        this.authManager = new GroupAuthManager();
        
        // Initialize D1 API manager
        this.d1Manager = new D1ApiManager();
        
        // Initialize data manager for CSV/JSON integration (legacy)
        this.dataManager = new CricketDataManager();
        
        this.init();
    }

    async init() {
        this.updateGreeting();
        
        // Initialize authentication UI and debug auth state
        console.log('🔐 AUTH DEBUG: Current group on startup:', this.authManager.getCurrentGroupName());
        console.log('🔐 AUTH DEBUG: Current group ID:', this.authManager.getCurrentGroupId());
        console.log('🔐 AUTH DEBUG: Is guest?', this.authManager.isGuest());
        this.authManager.updateUI();
        
        // Load data from CSV/JSON
        await this.loadDataFromManager();
        
        this.updateStats();
        this.loadPlayers();
        this.loadTeams();
        
        // Load match history to ensure analytics has access to match data
        console.log('📊 INIT DEBUG: Loading match history for analytics...');
        this.loadMatchHistory();
        
        // Add debug functions to window for easy console access
        window.debugBowlerSelection = () => this.debugBowlerSelection();
        window.debugTestButton = () => this.debugTestButtonClick();
        window.debugForceReset = () => this.debugForceResetBowlerSelection();
        window.debugAppState = () => this.debugAppState();
        
        // Add data debugging functions
        window.debugDataAccess = () => this.debugDataAccess();
        window.debugLoadMatches = () => this.debugLoadMatches();
        window.debugAnalytics = () => this.debugAnalytics();
        window.debugLoadPipeline = () => this.debugLoadPipeline();
        window.debugPlayerData = () => this.debugPlayerData();
        window.debugEditModal = (playerId) => this.debugEditModal(playerId);
        window.importCricketData = () => this.importCricketData();
        window.refreshDataFromJson = () => this.refreshDataFromJson();
        window.clearCacheAndRefresh = () => this.clearCacheAndRefresh();
        window.showStorageInfo = () => this.showStorageInfo();
        window.previewExportData = () => this.previewExportData();
        
        // Update greeting every minute
        setInterval(() => this.updateGreeting(), 60000);
        
        // Check if app is in wiped state before loading sample data
        const isWipedState = localStorage.getItem('cricket-wiped-state') === 'true';
        
        // Initialize with BCCB data if empty (but only if not in wiped state)
        if (this.players.length === 0 && !isWipedState) {
            console.log('📊 Loading sample data as fallback...');
            this.initSampleData();
            this.showNotification('⚠️ No data loaded - loading sample data');
        } else if (isWipedState) {
            console.log('🗑️ App is in wiped state - maintaining empty data');
            this.showNotification('📭 Data was wiped - app is empty');
        } else {
            console.log(`✅ Found ${this.players.length} existing players`);
            this.showNotification(`📱 ${this.players.length} players ready`);
        }
    }

    async loadDataFromManager() {
        try {
            console.log('🔄 Starting data loading from manager...');
            
            // Check if this is a post-wipe state (should not load anything)
            const isWipedState = localStorage.getItem('cricket-wiped-state') === 'true';
            const wipeTimestamp = localStorage.getItem('cricket-wipe-timestamp');
            
            if (isWipedState) {
                console.log('🗑️ WIPE STATE: App is in wiped state, maintaining empty data');
                console.log(`🗑️ WIPE STATE: Wiped at: ${wipeTimestamp ? new Date(wipeTimestamp).toLocaleString() : 'Unknown'}`);
                
                // Initialize with empty state
                this.players = [];
                this.matches = [];
                this.teams = [];
                this.currentMatch = null;
                
                // Check if we're in a custom group - if so, try to sync from D1
                const currentGroup = this.authManager.getCurrentGroupName();
                if (currentGroup !== 'guest') {
                    console.log(`🗑️ WIPE STATE: But we're in custom group "${currentGroup}", attempting D1 sync...`);
                    try {
                        const isConnected = await this.d1Manager.checkConnection();
                        if (isConnected) {
                            const groupId = this.authManager.getCurrentGroupId();
                            const cloudData = await this.d1Manager.syncFromD1(groupId);
                            
                            if (cloudData && (cloudData.players?.length > 0 || cloudData.matches?.length > 0)) {
                                this.players = cloudData.players || [];
                                this.matches = cloudData.matches || [];
                                this.teams = cloudData.teams || [];
                                
                                // Save to localStorage for offline access
                                this.saveData(false);
                                
                                console.log(`☁️ WIPE RECOVERY: Loaded ${this.players.length} players from D1 for group "${currentGroup}"`);
                                this.showDataSource('D1 Cloud Database (Recovered)');
                                this.showNotification(`☁️ Recovered ${this.players.length} players from cloud`);
                                this.updateSyncStatus('✅ Synced', new Date());
                                
                                // Clear wipe state since we recovered data
                                localStorage.removeItem('cricket-wiped-state');
                                localStorage.removeItem('cricket-wipe-timestamp');
                                
                                return;
                            }
                        }
                    } catch (d1Error) {
                        console.warn('D1 recovery failed:', d1Error);
                    }
                }
                
                console.log('✅ Maintained wiped state - no data loaded');
                this.showDataSource('Wiped State (Empty)');
                this.showNotification(`📭 Data wiped for group "${currentGroup}" - add players or sync from cloud`);
                return;
            }
            
            // Try to sync from D1 first if not guest and D1 is available
            const currentGroup = this.authManager.getCurrentGroupName();
            const currentGroupId = this.authManager.getCurrentGroupId();
            
            console.log(`🔐 AUTH DEBUG: Current group: "${currentGroup}", ID: ${currentGroupId}`);
            console.log(`🔐 AUTH DEBUG: Is guest group: ${currentGroup === 'guest'}`);
            
            if (currentGroup !== 'guest') {
                console.log(`☁️ Attempting to sync from D1 for group: ${currentGroup}`);
                try {
                    const isConnected = await this.d1Manager.checkConnection();
                    console.log(`🌐 D1 CONNECTION: ${isConnected ? 'Available' : 'Not available'}`);
                    
                    if (isConnected) {
                        console.log(`📡 SYNC DEBUG: Downloading data for group ID: ${currentGroupId}`);
                        const cloudData = await this.d1Manager.syncFromD1(currentGroupId);
                        console.log(`📡 SYNC DEBUG: Downloaded data:`, {
                            players: cloudData?.players?.length || 0,
                            matches: cloudData?.matches?.length || 0,
                            teams: cloudData?.teams?.length || 0
                        });
                        
                        if (cloudData && (cloudData.players?.length > 0 || cloudData.matches?.length > 0)) {
                            this.players = cloudData.players || [];
                            this.matches = cloudData.matches || [];
                            this.teams = cloudData.teams || [];
                            this.currentMatch = null;
                            
                            // Save to localStorage for offline access
                            this.saveData(false);
                            
                            console.log(`☁️ Loaded ${this.players.length} players from D1 cloud`);
                            this.showDataSource('D1 Cloud Database');
                            this.showNotification(`☁️ Synced ${this.players.length} players from cloud`);
                            this.updateSyncStatus('✅ Synced', new Date());
                            return;
                        }
                    }
                } catch (d1Error) {
                    console.warn('D1 sync failed, falling back to localStorage:', d1Error);
                    this.updateSyncStatus('⚠️ Offline', null);
                }
            }
            
            // Try to load from localStorage
            console.log('📱 Checking localStorage...');
            const localData = await this.loadFromLocalStorage();
            if (localData && localData.players && localData.players.length > 0) {
                this.players = localData.players;
                this.matches = localData.matches || [];
                this.teams = localData.teams || [];
                this.currentMatch = JSON.parse(localStorage.getItem(`cricket-current-match-group-${this.authManager.getCurrentGroupId()}`) || 'null');
                
                console.log(`✅ Loaded ${this.players.length} players from localStorage`);
                this.showDataSource('localStorage');
                this.showNotification(`📱 Loaded ${this.players.length} players from device`);
                this.updateSyncStatus('📱 Local only', null);
                return;
            }
            
            // No data in localStorage - initialize with empty state
            console.log('� No data in localStorage, starting with empty state...');
            this.players = [];
            this.matches = [];
            this.teams = [];
            this.currentMatch = null;
            
            // Mark app as initialized
            localStorage.setItem('app-initialized', 'true');
            localStorage.setItem('app-initialization-date', new Date().toISOString());
            this.saveData(false); // Save empty state to localStorage
            
            console.log('📭 Starting with empty state - ready for user input');
            this.showDataSource('Empty State');
            this.showNotification('� Welcome! Add players or import data to get started');
            
        } catch (error) {
            console.error('❌ Error in loadDataFromManager:', error);
            this.showNotification('❌ Error loading data: ' + error.message);
        }
    }
    
    // Function removed - app now uses localStorage-only data model

    // Load data from localStorage (for APK/offline version)
    async loadFromLocalStorage() {
        try {
            // Get current group ID for data isolation
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
                    // Convert D1 format to app format
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
                    
                    console.log(`✅ Loaded ${players.length} players and ${data.matches?.length || 0} matches from group "${groupName}"`);
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
                console.log(`✅ Loaded ${players.length} players from group "${groupName}" localStorage`);
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
                        
                        console.log(`✅ Loaded ${players.length} players from legacy localStorage for guest group`);
                        return { players, matches: data.matches || [], teams: [] };
                    }
                }
                
                // Legacy individual keys
                const legacyPlayers = JSON.parse(localStorage.getItem('cricket-players') || '[]');
                const legacyMatches = JSON.parse(localStorage.getItem('cricket-matches') || '[]');
                const legacyTeams = JSON.parse(localStorage.getItem('cricket-teams') || '[]');
                
                if (legacyPlayers.length > 0) {
                    console.log(`✅ Loaded ${legacyPlayers.length} players from legacy localStorage for guest group`);
                    return { players: legacyPlayers, matches: legacyMatches, teams: legacyTeams };
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    }

    initSampleData() {
        // BCCB Real Player Data (converted from CSV) - Fallback only
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
        console.log('📊 UPDATE STATS called - matches count:', this.matches.length);
        const playerCountEl = document.getElementById('playerCount');
        const captainCountEl = document.getElementById('captainCount');
        const matchCountEl = document.getElementById('matchCount');
        
        if (playerCountEl) playerCountEl.textContent = this.players.length;
        if (captainCountEl) captainCountEl.textContent = this.getUniqueCaptainsCount();
        if (matchCountEl) matchCountEl.textContent = this.matches.length;
        
        // Update match history display
        console.log('📊 About to call loadMatchHistory()');
        this.loadMatchHistory();
        
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

    loadMatchHistory() {
        const historyContainer = document.getElementById('matchHistoryContainer');
        if (!historyContainer) {
            console.log('CRICKET_DEBUG: LOAD - Match history container not found!');
            return;
        }

        // Final fallback: try to load from localStorage anyway
        try {
            const localData = JSON.parse(localStorage.getItem('cricket-stats'));
            if (localData && (localData.matches || localData.history)) {
                console.log('CRICKET_DEBUG: LOAD - Using localStorage fallback data');

                // Update app's internal matches array from localStorage
                if (localData.matches && Array.isArray(localData.matches)) {
                    this.matches = localData.matches;
                    console.log(`📦 Updated app matches array from localStorage with ${this.matches.length} matches`);
                }

                this.displayMatchHistory(localData, historyContainer);

                // Refresh analytics after loading match data
                console.log('📦 Refreshing analytics after localStorage match history load...');
                this.updateScoringTabView();
            } else {
                historyContainer.innerHTML = '<div class="no-matches">No match history available</div>';
            }
        } catch (localError) {
            console.error('❌ MATCH HISTORY DEBUG: localStorage fallback failed:', localError);
            historyContainer.innerHTML = '<div class="no-matches">Error loading match history</div>';
        }
    }

        displayMatchHistory(data, historyContainer) {
        console.log('🎯 MATCH HISTORY DEBUG: Processing match history data:', data);
        
        // Handle both new format (matches) and legacy format (history)
        const matchesData = data.matches || data.history || [];
        
        if (!data || matchesData.length === 0) {
            historyContainer.innerHTML = '<div class="no-matches">No match history available</div>';
            console.log('⚠️ MATCH HISTORY DEBUG: No match data found');
            return;
        }

        console.log(`📋 MATCH HISTORY DEBUG: Found ${matchesData.length} matches in data`);

        // Sort matches by date (newest first)
        const sortedMatches = matchesData.sort((a, b) => {
            const dateA = new Date(a.Date || a.Date_Saved);
            const dateB = new Date(b.Date || b.Date_Saved);
            return dateB - dateA;
        });

        historyContainer.innerHTML = sortedMatches.map((match, index) => {
            console.log(`🔍 MATCH HISTORY DEBUG: Processing match ${index + 1}:`, match);
            
            // Handle both formats
            const matchDate = match.Date || match.Date_Saved;
            const date = new Date(matchDate);
            const formattedDate = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            // Handle new format vs legacy format
            let winningTeam, losingTeam, winningTeamScore, losingTeamScore;
            let matchResult;
            
            if (match.Team1 && match.Team2) {
                // New format
                const team1 = match.Team1;
                const team2 = match.Team2;
                const team1Captain = this.getPlayerNameFromId(match.Team1_Captain, data.player_info);
                const team2Captain = this.getPlayerNameFromId(match.Team2_Captain, data.player_info);
                
                // Use actual team names
                winningTeam = match.Winning_Team || team1;
                losingTeam = (match.Winning_Team === team1) ? team2 : team1;
                
                winningTeamScore = match.Winning_Team_Score || 'N/A';
                losingTeamScore = match.Losing_Team_Score || 'N/A';
                matchResult = match.Result || `${match.Winning_Team} won`;
            } else {
                // Legacy format
                winningTeam = match.Winning_Team || 'Team A';
                losingTeam = match.Losing_Team || 'Team B';
                winningTeamScore = match.Winning_Team_Score || 'N/A';
                losingTeamScore = match.Losing_Team_Score || 'N/A';
                
                // Calculate margin for legacy format
                const winningScoreParts = (winningTeamScore || '0/0').split('/');
                const losingScoreParts = (losingTeamScore || '0/0').split('/');
                const winningScore = parseInt(winningScoreParts[0]) || 0;
                const losingScore = parseInt(losingScoreParts[0]) || 0;
                const margin = winningScore - losingScore;
                matchResult = `${winningCaptain}'s Team won by ${margin} runs`;
            }

            console.log(`✅ MATCH HISTORY DEBUG: Match processed: ${winningTeam} vs ${losingTeam}`);

            return `
                <div class="match-history-item">
                    <div class="match-summary">
                        <div class="match-teams">${winningTeam} vs ${losingTeam}</div>
                        <div class="match-date">${formattedDate}</div>
                    </div>
                    <div class="match-result">${matchResult}</div>
                    <div class="match-scores">${winningTeamScore} vs ${losingTeamScore}</div>
                </div>
            `;
        }).join('');

        console.log('✅ MATCH HISTORY DEBUG: Match history display completed');
    }

    // Helper function to get player name from Player_ID
    getPlayerNameFromId(playerId, playerInfo) {
        if (!playerId || !playerInfo) return 'Unknown';
        
        // Handle both object format {P001: {name: "..."}} and array format [{Player_ID: "P001", Name: "..."}]
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
        // Get current group ID for data isolation
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
                    console.log('🔄 Replacing duplicate match with newer version:', matchId);
                    matchMap.set(matchId, { match, timestamp });
                } else {
                    console.log('🔄 Keeping existing newer version of match:', matchId);
                }
            }
        });
        
        const uniqueMatches = Array.from(matchMap.values()).map(item => item.match);
        
        if (uniqueMatches.length !== this.matches.length) {
            console.log(`📊 Removed ${this.matches.length - uniqueMatches.length} duplicate matches, kept most recent versions`);
            this.matches = uniqueMatches;
        }
        
        // Create consolidated data structure
        const consolidatedData = {
            player_info: this.players.map(player => ({
                Player_ID: player.id || Date.now(), // Store as integer, not string with 'P' prefix
                Name: player.name,
                Bowling_Style: player.bowling || player.bowlingStyle || 'Medium',
                Batting_Style: player.batting || player.battingStyle || 'Reliable',
                Is_Star: player.is_star || player.isStar || false,
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
            console.log('🔄 Cleared wipe state - app now has active data');
        }
        
        console.log(`💾 Data saved for group "${groupName}": ${this.players.length} players, ${this.matches.length} matches`);
        
        // Auto-sync to D1 if not guest group and saveToJSON is true (permanent saves)
        if (saveToJSON && groupName !== 'guest') {
            console.log(`🌩️ AUTO-SYNC: Triggering D1 sync for group "${groupName}" (saveToJSON: ${saveToJSON})`);
            this.syncToD1(consolidatedData).catch(error => {
                console.error('❌ AUTO-SYNC: D1 sync failed:', error);
                this.updateSyncStatus('⚠️ Sync failed', null);
            });
        } else {
            console.log(`⚠️ AUTO-SYNC: Skipping D1 sync - saveToJSON: ${saveToJSON}, groupName: "${groupName}"`);
        }
    }

    // Sync data to D1 cloud database
    async syncToD1(data = null) {
        const groupId = this.authManager.getCurrentGroupId();
        const groupName = this.authManager.getCurrentGroupName();
        
        console.log(`🌩️ SYNC-TO-D1: Starting sync for group "${groupName}" (ID: ${groupId})`);
        
        if (groupName === 'guest') {
            console.log('⚠️ SYNC-TO-D1: Skipping D1 sync for guest group');
            return;
        }

        try {
            this.updateSyncStatus('🔄 Syncing...', null, true);
            
            console.log(`🌩️ SYNC-TO-D1: About to create sync data...`);
            console.log(`🌩️ SYNC-TO-D1: this.players is:`, this.players);
            console.log(`🌩️ SYNC-TO-D1: this.matches is:`, this.matches);
            
            // Always create properly formatted sync data - ignore passed data for now
            const syncData = {
                players: this.players.map(player => ({
                    Player_ID: player.id || Date.now(), // Store as integer
                    Name: player.name,
                    Bowling_Style: player.bowling || 'Medium',
                    Batting_Style: player.batting || 'Reliable',
                    Is_Star: player.is_star || false,
                    Last_Updated: new Date().toISOString().split('T')[0],
                })),
                matches: this.matches
                // Removed performance data since Worker doesn't handle it yet
            };

            console.log(`🌩️ SYNC-TO-D1: Sync data prepared - ${syncData.players?.length || 'undefined'} players, ${syncData.matches?.length || 'undefined'} matches`);
            
            console.log(`🌩️ SYNC-TO-D1: About to call d1Manager.syncToD1...`);
            await this.d1Manager.syncToD1(groupId, syncData);
            
            this.updateSyncStatus('✅ Synced', new Date());
            console.log(`✅ SYNC-TO-D1: Successfully synced data to D1 for group ${groupName}`);
            
        } catch (error) {
            console.error('❌ SYNC-TO-D1: Failed to sync to D1:', error);
            console.error('❌ SYNC-TO-D1: Error stack:', error.stack);
            this.updateSyncStatus('❌ Sync failed', null);
            // Don't throw error - let the app continue working offline
        }
    }

    // Update sync status in UI
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
                await this.dataManager.saveJSONData(this.players, this.matches, this.teams, true);
                
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
    addPlayer(name, bowlingType = 'Medium', battingStyle = 'So-So', playerType = 'Regular') {
        try {
            console.log('addPlayer method called with:', { name, bowlingType, battingStyle, playerType });
            
            // Validate input
            if (!name || typeof name !== 'string' || name.trim() === '') {
                throw new Error('Invalid player name');
            }
            
            const newPlayer = {
                id: Date.now(),
                name: name.trim(),
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
            
            console.log('Created new player object:', newPlayer);
            
            this.players.push(newPlayer);
            console.log('Player added to array, total players:', this.players.length);
            
            // Save data with error handling
            try {
                this.saveData(true); // Create JSON backup when adding new player
                console.log('Data saved successfully');
            } catch (saveError) {
                console.error('Error saving data:', saveError);
            }
            
            // Update stats with error handling
            try {
                this.updateStats();
                console.log('Stats updated');
            } catch (statsError) {
                console.error('Error updating stats:', statsError);
            }
            
            // Load players with error handling
            try {
                this.loadPlayers();
                console.log('Players list reloaded');
            } catch (loadError) {
                console.error('Error loading players:', loadError);
            }
            
            // Also save to the data manager if available
            if (this.dataManager) {
                try {
                    this.dataManager.addPlayer(newPlayer);
                    console.log('Player added to data manager');
                } catch (dmError) {
                    console.error('Error adding to data manager:', dmError);
                }
            }
            
            // Save updated data to localStorage
            if (typeof window.saveAppData === 'function') {
                window.saveAppData();
                console.log('App data saved after adding player');
            }
            
            this.showNotification(`✅ ${name.trim()} added successfully!`);
            console.log('addPlayer method completed successfully');
            
        } catch (error) {
            console.error('Error in addPlayer method:', error);
            this.showNotification(`❌ Error adding player: ${error.message}`);
            throw error; // Re-throw to be caught by calling function
        }
    }

    showAddPlayerModal() {
        console.log('🔵 CricketApp.showAddPlayerModal() called');
        const modal = document.getElementById('addPlayerModal');
        if (modal) {
            console.log('🔍 Modal element found, current classes:', modal.className);
            console.log('🔍 Modal display style before:', window.getComputedStyle(modal).display);
            
            // Remove inline display style and add active class
            modal.style.display = '';  // Clear inline style
            modal.classList.add('active');
            
            console.log('🔍 Modal classes after adding active:', modal.className);
            console.log('🔍 Modal display style after:', window.getComputedStyle(modal).display);
            console.log('✅ Modal opened successfully');
            
            // Check if modal is actually visible
            const rect = modal.getBoundingClientRect();
            console.log('🔍 Modal position and size:', { 
                top: rect.top, 
                left: rect.left, 
                width: rect.width, 
                height: rect.height,
                visible: rect.width > 0 && rect.height > 0
            });
        } else {
            console.error('❌ Modal element not found');
        }
    }

    // Scoring Analytics Methods
    showScoringAnalytics(type) {
        console.log('📊 SCORING ANALYTICS DEBUG: showScoringAnalytics called with type:', type);
        // Update active button
        document.querySelectorAll('.chart-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${type}AnalyticsBtn`).classList.add('active');

        const container = document.getElementById('scoringAnalyticsContent');
        console.log('📊 SCORING ANALYTICS DEBUG: container found:', !!container);
        
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
        console.log('📊 SCORING ANALYTICS DEBUG: renderScoringPerformanceStats called, container:', !!container);
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
        console.log('🔄 Manual analytics refresh triggered');
        
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
        if (['averageRuns', 'strikeRate', 'foursPerMatch', 'sixesPerMatch', 'fifties'].includes(sortBy)) {
            // Batting metrics - require at least 1 match with batting data
            filteredData = statsData.filter(player => 
                player.matches >= 1 && (player.runs > 0 || player.ballsFaced > 0)
            );
        } else if (['bowlingEconomy', 'bowlingStrikeRate', 'bowlingAverage'].includes(sortBy)) {
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
        
        // Also add player analytics cards below the performance stats
        console.log('📊 ANALYTICS DEBUG: Adding player analytics cards to container');
        const playerAnalyticsContent = this.generatePlayerAnalyticsHTML();
        container.innerHTML += playerAnalyticsContent;
    }

    generatePlayerAnalyticsHTML() {
        // Player rankings section removed as requested
        return '';
    }

    calculatePlayerStatistics() {
        console.log('CRICKET_DEBUG: ANALYTICS - Calculating player statistics...');
        console.log('CRICKET_DEBUG: ANALYTICS - Current matches array length: ' + (this.matches?.length || 0));
        console.log('CRICKET_DEBUG: ANALYTICS - Current players array length: ' + (this.players?.length || 0));
        console.log('CRICKET_DEBUG: ANALYTICS - teamBalancer exists: ' + !!(this.teamBalancer));
        console.log('CRICKET_DEBUG: ANALYTICS - teamBalancer.getPlayerRole exists: ' + !!(this.teamBalancer && this.teamBalancer.getPlayerRole));
        
        // First, try to get data from localStorage which has the aggregated format
        let consolidatedData = null;
        try {
            const storedData = localStorage.getItem('cricket-stats');
            if (storedData) {
                consolidatedData = JSON.parse(storedData);
                console.log('CRICKET_DEBUG: ANALYTICS - Found consolidated data:');
                console.log('CRICKET_DEBUG: ANALYTICS - players: ' + (consolidatedData.player_info?.length || 0));
                console.log('CRICKET_DEBUG: ANALYTICS - battingRecords: ' + (consolidatedData.match_batting_performance?.length || 0));
                console.log('CRICKET_DEBUG: ANALYTICS - bowlingRecords: ' + (consolidatedData.match_bowling_performance?.length || 0));
            }
        } catch (error) {
            console.log('CRICKET_DEBUG: ANALYTICS - Error parsing stored data: ' + error.message);
        }
        
        // If no consolidated data, calculate from current app state
        if (!consolidatedData || !consolidatedData.match_batting_performance) {
            console.log('📊 No consolidated data found, using app state');
            console.log('📊 App state - matches:', this.matches?.length || 0, 'players:', this.players?.length || 0);
            return this.calculateStatsFromAppState();
        }
        
        // Calculate aggregated stats from match performance data
        const playerStatsMap = new Map();
        
        // Initialize all players
        (consolidatedData.player_info || this.players).forEach(player => {
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
            // Filter based on minimum requirements - more flexible
            const hasBattingData = player.matches >= 1 && (player.runs > 0 || player.ballsFaced > 0);
            const hasBowlingData = player.wickets > 0 || player.totalOvers >= 1;
            
            return player.matches > 0 && (hasBattingData || hasBowlingData);
        });

        console.log('📊 Calculated stats for players:', allPlayerStats.map(p => ({ 
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
            // Filter based on minimum requirements - more flexible
            const hasBattingData = player.matches >= 1 && (player.runs > 0 || player.ballsFaced > 0);
            const hasBowlingData = player.wickets > 0 || player.totalOvers >= 1;
            
            return player.matches > 0 && (hasBattingData || hasBowlingData);
        });

        return allPlayerStats;
    }
    
    calculateBattingCVFromStats(stats) {
        // Simplified calculation for batting consistency
        if (!stats.matches || stats.matches < 2) return 1;
        
        const avgRuns = stats.runs / stats.matches;
        if (avgRuns === 0) return 1;
        
        // Estimate CV based on performance level
        if (avgRuns > 30) return 0.4; // Good consistency
        if (avgRuns > 15) return 0.6; // Moderate consistency  
        return 0.8; // Lower consistency
    }
    
    calculateBowlingCVFromStats(stats) {
        // Simplified calculation for bowling consistency
        if (!stats.bowlingMatches || stats.bowlingMatches < 2) return 1;
        
        const avgWickets = stats.wickets / stats.bowlingMatches;
        if (avgWickets === 0) return 1;
        
        // Estimate CV based on performance level
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
            } catch (error) {
                console.error('Error calculating scoring metric:', metric.key, error);
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

        // Draw spider chart on canvas
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
        
        // Draw player2 data
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
        console.log('🏏 Rendering batting spider chart for:', player1.name, 'vs', player2.name);
        
        const container = document.getElementById('battingSpiderChartContainer');
        if (!container) {
            console.error('❌ battingSpiderChartContainer not found!');
            return;
        }
        
        const battingMetrics = [
            { name: 'Strike Rate', key: 'strikeRate', max: 200 },
            { name: 'Average', key: 'battingAverage', max: 50 },
            { name: '4s/Match', key: 'foursPerMatch', max: 8 },
            { name: '6s/Match', key: 'sixesPerMatch', max: 4 },
            { name: 'Runs/Match', key: 'runsPerMatch', max: 50 }
        ];

        const getBattingMetricValue = (player, metric) => {
            try {
                let value = 0;
                switch(metric.key) {
                    case 'foursPerMatch':
                        value = player.matches > 0 ? (player.fours || 0) / player.matches : 0;
                        break;
                    case 'sixesPerMatch':
                        value = player.matches > 0 ? (player.sixes || 0) / player.matches : 0;
                        break;
                    case 'runsPerMatch':
                        value = player.matches > 0 ? (player.runs || 0) / player.matches : 0;
                        break;
                    case 'strikeRate':
                        const sr = window.cricketApp.calculateStrikeRate(player);
                        value = isNaN(sr) ? 0 : sr;
                        break;
                    case 'battingAverage':
                        value = player.matches > 0 ? (player.runs || 0) / player.matches : 0;
                        break;
                    default:
                        value = player[metric.key] || 0;
                        break;
                }
                return isNaN(value) ? 0 : Number(value);
            } catch (error) {
                console.error('Error calculating batting metric:', metric.key, error);
                return 0;
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
            window.cricketApp.drawSpiderChartCanvas('battingSpiderCanvas', player1, player2, battingMetrics, getBattingMetricValue);
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
            { name: 'Wickets/Match', key: 'wicketsPerMatch', max: 3 }
        ];

        const getBowlingMetricValue = (player, metric) => {
            try {
                let value = 0;
                switch(metric.key) {
                    case 'wicketsPerMatch':
                        value = player.matches > 0 ? (player.wickets || 0) / player.matches : 0;
                        break;
                    case 'economy':
                        const eco = window.cricketApp.calculateBowlerEconomy(player);
                        value = isNaN(eco) ? 0 : eco;
                        break;
                    case 'bowlingAverage':
                        const avg = window.cricketApp.calculateBowlingAverage(player);
                        value = isNaN(avg) ? 0 : avg;
                        break;
                    case 'bowlingStrikeRate':
                        const sr = window.cricketApp.calculateBowlingStrikeRate(player);
                        value = isNaN(sr) ? 0 : sr;
                        break;
                    default:
                        value = player[metric.key] || 0;
                        break;
                }
                return isNaN(value) ? 0 : Number(value);
            } catch (error) {
                console.error('Error calculating bowling metric:', metric.key, error);
                return 0;
            }
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
            window.cricketApp.drawSpiderChartCanvas('bowlingSpiderCanvas', player1, player2, bowlingMetrics, getBowlingMetricValue);
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
            
            // Removed percentage labels for cleaner appearance
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
            const numValue = isNaN(value) ? 0 : Number(value);
            const normalized = Math.min(Math.max(numValue / metric.max, 0), 1); // Ensure 0-1 range
            const adjustedValue = metric.invert ? (1 - normalized) : normalized;
            
            console.log(`  ${metric.name}: raw=${numValue.toFixed(2)}, max=${metric.max}, normalized=${normalized.toFixed(3)}, adjusted=${adjustedValue.toFixed(3)} = ${(adjustedValue * 100).toFixed(1)}%`);
            
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
        
        // Draw player2 data
        ctx.strokeStyle = '#00ccff'; // Bright cyan-blue for better visibility
        ctx.fillStyle = 'rgba(0, 204, 255, 0.2)';
        ctx.beginPath();
        
        console.log(`📊 ${player2.name} values:`);
        for (let i = 0; i < metrics.length; i++) {
            const metric = metrics[i];
            const value = getMetricValue(player2, metric);
            const numValue = isNaN(value) ? 0 : Number(value);
            const normalized = Math.min(Math.max(numValue / metric.max, 0), 1); // Ensure 0-1 range
            const adjustedValue = metric.invert ? (1 - normalized) : normalized;
            
            console.log(`  ${metric.name}: raw=${numValue.toFixed(2)}, max=${metric.max}, normalized=${normalized.toFixed(3)}, adjusted=${adjustedValue.toFixed(3)} = ${(adjustedValue * 100).toFixed(1)}%`);
            
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
        console.log('📊 UPDATE SCORING TAB VIEW DEBUG: called');
        const hasActiveMatch = this.currentMatch && this.currentMatch.status !== 'completed';
        console.log('📊 UPDATE SCORING TAB VIEW DEBUG: hasActiveMatch:', hasActiveMatch);
        const preGameView = document.getElementById('preGameAnalytics');
        const liveView = document.getElementById('liveMatchView');
        const titleElement = document.getElementById('scoringPageTitle');
        console.log('📊 UPDATE SCORING TAB VIEW DEBUG: preGameView found:', !!preGameView);
        console.log('📊 UPDATE SCORING TAB VIEW DEBUG: liveView found:', !!liveView);
        
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
            console.log('📊 UPDATE SCORING TAB VIEW DEBUG: No active match, showing analytics');
            preGameView.style.display = 'block';
            liveView.style.display = 'none';
            titleElement.textContent = 'Player Analytics';
            
            // Change tab label to "Analytics" before match starts
            if (scoringNavItem) {
                scoringNavItem.textContent = 'Analytics';
            }
            
            // Initialize analytics view
            console.log('📊 UPDATE SCORING TAB VIEW DEBUG: Calling showScoringAnalytics');
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
        console.log('🎯 Player names being rendered:', this.players.map(p => `ID:${p.id} Name:"${p.name}"`).join(', '));
        
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
                const self = this;
                
                newContainer.addEventListener('click', function(event) {
                    console.log('Click event fired on container, target:', event.target);
                    const playerCard = event.target.closest('.player-checkbox-item');
                    console.log('Found player card:', !!playerCard);
                    
                    if (playerCard) {
                        console.log('Player card clicked:', playerCard);
                        event.preventDefault();
                        event.stopPropagation();
                        
                        // Handle player selection directly here instead of calling window function
                        self.togglePlayerSelectionDirect(playerCard);
                    }
                });
                
                console.log('Event listener added successfully');
                
                // Single update count after setup
                setTimeout(() => {
                    console.log('🔄 Initial player count update...');
                    updatePlayerCountDirectly();
                }, 150);
            }
        }, 100);
    }
    
    // Direct count update function
    updatePlayerCountDirectly() {
        const checkboxes = document.querySelectorAll('input[name="todayPlayers"]:checked');
        const count = checkboxes.length;
        const label = document.getElementById('selectedPlayerCount');
        
        console.log('� updatePlayerCountDirectly - checkboxes found:', checkboxes.length);
        console.log('🔍 updatePlayerCountDirectly - label found:', !!label);
        
        if (label) {
            label.textContent = count.toString();
            console.log('✅ Count updated directly to:', count);
        } else {
            console.error('❌ selectedPlayerCount element not found');
            // Try to find the element with different selectors
            const altLabel = document.querySelector('.player-count') || document.querySelector('#selectedPlayerCount');
            if (altLabel) {
                altLabel.textContent = count.toString();
                console.log('✅ Count updated via alternative selector:', count);
            }
        }
        
        // Also call the window function if available
        if (typeof window.updateSelectedPlayerCountInline === 'function') {
            window.updateSelectedPlayerCountInline();
        }
    }

    // Direct player selection toggle method - optimized
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
        
        // Debounced count update to prevent excessive updates
        if (this.countUpdateTimeout) {
            clearTimeout(this.countUpdateTimeout);
        }
        this.countUpdateTimeout = setTimeout(() => {
            this.updatePlayerCountDirectly();
        }, 50);
    }

    showInlineCaptainSelection(selectedPlayers) {
        console.log('🔵 showInlineCaptainSelection called with players:', selectedPlayers.map(p => p.name));
        
        // Store selected players for later use
        this.todaySelectedPlayers = selectedPlayers;
        console.log('🔍 Stored todaySelectedPlayers:', this.todaySelectedPlayers.map(p => p.name));
        
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
        console.log('🔵 generateTeamsWithSelectedPlayersInline called');
        const captain1Id = document.getElementById('captain1SelectInline').value;
        const captain2Id = document.getElementById('captain2SelectInline').value;
        console.log('🔍 Selected captain IDs:', captain1Id, captain2Id);
        console.log('🔍 Available todaySelectedPlayers:', this.todaySelectedPlayers?.map(p => `${p.id}:${p.name}`));
        
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
        console.log('🔍 Found captains:', captain1?.name, captain2?.name);
        
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
                                             ${!isCaptain ? 'onclick=\"movePlayerDirectly(this)\"' : ''}>${p.name}${isCaptain ? ' (C)' : ''}</span>`;
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
        this.saveData(true); // Trigger D1 sync when creating teams
        this.updateStats();
        this.loadTeams();
        
        this.showNotification(`✅ Team "${name}" created!`);
    }

    loadTeams() {
        const teamList = document.getElementById('teamList');
        
        // First check if there are saved teams to display
        try {
            const saved = localStorage.getItem('savedTeams');
            if (saved) {
                const teams = JSON.parse(saved);
                if (Array.isArray(teams) && teams.length === 2) {
                    this.tempTeams = teams;
                    this.showInlineTeamsResult(teams[0], teams[1]);
                    return; // Exit early, don't show the "No teams yet" message
                }
            }
        } catch (e) {
            console.error('Error loading saved teams:', e);
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
                
                // Add mobile-friendly event listeners after DOM is ready
                setTimeout(() => {
                    const tossBtn = document.getElementById('main-toss-btn');
                    if (tossBtn) {
                        console.log('Adding toss button event listeners');
                        
                        // Remove any existing onclick attribute
                        tossBtn.removeAttribute('onclick');
                        
                        // Add both click and touchend events for better mobile support
                        ['click', 'touchend'].forEach(eventType => {
                            tossBtn.addEventListener(eventType, (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Toss button triggered via:', eventType);
                                startToss();
                            }, { passive: false });
                        });
                    } else {
                        console.error('❌ Could not find toss button to add event listeners');
                    }
                }, 100);
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
                striker: null, // Must be manually selected by user
                nonStriker: null, // Must be manually selected by user
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
                striker: null, // Must be manually selected by user  
                nonStriker: null, // Must be manually selected by user
                extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0 },
                fallOfWickets: [],
                overByOver: []
            },
            bowler: null, // Must be manually selected by user - no automatic assignment
            totalOvers: totalOvers,
            status: 'active',
            ballByBall: [],
            started: new Date().toISOString()
        };

        this.saveData(false); // Save locally only during match setup
        this.updateScoreDisplay();
        this.updateScoringTabView(); // Update scoring tab to show live view
        
        // Automatically switch to scoring tab when match starts
        if (typeof showPage === 'function') {
            showPage('scoring');
            console.log('🎯 Automatically switched to scoring tab');
        }
        
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
        console.log('🏏 DEBUG: ensureBatsmenInitialized called');
        
        if (!this.currentMatch) {
            console.log('🏏 DEBUG: No current match found');
            return false;
        }
        
        // FIX: Use currentTeam instead of batting flag to determine which team is batting
        const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1Score : this.currentMatch.team2Score;
            
        console.log('🏏 DEBUG: Current team score:', {
            currentTeam: this.currentMatch.currentTeam,
            usingTeam: this.currentMatch.currentTeam === 1 ? 'team1' : 'team2',
            team1Batting: this.currentMatch.team1Score.batting,
            team2Batting: this.currentMatch.team2Score.batting,
            striker: currentTeamScore.striker?.name || 'NOT SET',
            nonStriker: currentTeamScore.nonStriker?.name || 'NOT SET',
            strikerId: currentTeamScore.striker?.id || 'NOT SET',
            nonStrikerId: currentTeamScore.nonStriker?.id || 'NOT SET'
        });
            
        // Check if batsmen are manually set
        if (!currentTeamScore.striker || !currentTeamScore.nonStriker) {
            console.log('⚠️ DEBUG: Batsmen not set - striker:', !!currentTeamScore.striker, 'nonStriker:', !!currentTeamScore.nonStriker);
            console.log('⚠️ Batsmen must be manually selected - no automatic assignment');
            return false; // Don't auto-assign, require manual selection
        }
        
        console.log('✅ DEBUG: Batsmen are properly set:', {
            striker: currentTeamScore.striker.name,
            nonStriker: currentTeamScore.nonStriker.name
        });
        
        // Ensure match stats are initialized for existing batsmen
        if (currentTeamScore.striker) {
            if (!currentTeamScore.striker.matchRuns) currentTeamScore.striker.matchRuns = 0;
            if (!currentTeamScore.striker.matchBalls) currentTeamScore.striker.matchBalls = 0;
            if (!currentTeamScore.striker.matchBoundaries) currentTeamScore.striker.matchBoundaries = { fours: 0, sixes: 0 };
        }
        
        if (currentTeamScore.nonStriker) {
            if (!currentTeamScore.nonStriker.matchRuns) currentTeamScore.nonStriker.matchRuns = 0;
            if (!currentTeamScore.nonStriker.matchBalls) currentTeamScore.nonStriker.matchBalls = 0;
            if (!currentTeamScore.nonStriker.matchBoundaries) currentTeamScore.nonStriker.matchBoundaries = { fours: 0, sixes: 0 };
        }
        
        return true;
    }

    addRuns(runs) {
        console.log('🏏 🔥 SCORING DEBUG: addRuns called with runs:', runs);
        console.log('🏏 🔥 SCORING DEBUG: Current match exists:', !!this.currentMatch);
        
        if (this.currentMatch) {
            const currentTeamScore = this.currentMatch.currentTeam === 1 ? 
                this.currentMatch.team1Score : this.currentMatch.team2Score;
            console.log('🏏 🔥 SCORING DEBUG: Current team:', this.currentMatch.currentTeam);
            console.log('🏏 🔥 SCORING DEBUG: Striker before scoring:', currentTeamScore.striker?.name, 'ID:', currentTeamScore.striker?.id);
            console.log('🏏 🔥 SCORING DEBUG: Striker status:', currentTeamScore.striker?.currentMatchStatus);
            console.log('🏏 🔥 SCORING DEBUG: Non-striker:', currentTeamScore.nonStriker?.name, 'Status:', currentTeamScore.nonStriker?.currentMatchStatus);
        }
        
        console.log('🏏 DEBUG: addRuns called with runs:', runs);
        console.log('🏏 DEBUG: Full current match state:', JSON.stringify({
            currentTeam: this.currentMatch?.currentTeam,
            team1Score: {
                batting: this.currentMatch?.team1Score.batting,
                striker: this.currentMatch?.team1Score.striker?.name || 'NOT SET',
                nonStriker: this.currentMatch?.team1Score.nonStriker?.name || 'NOT SET'
            },
            team2Score: {
                batting: this.currentMatch?.team2Score.batting,
                striker: this.currentMatch?.team2Score.striker?.name || 'NOT SET',
                nonStriker: this.currentMatch?.team2Score.nonStriker?.name || 'NOT SET'
            },
            bowler: this.currentMatch?.bowler?.name || 'NOT SET'
        }, null, 2));
        
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
            
        // Check if striker is out - prevent scoring for out players
        if (currentTeamScore.striker && currentTeamScore.striker.currentMatchStatus === 'out') {
            console.log('🔧 SCORING DEBUG: Striker', currentTeamScore.striker.name, 'is out - cannot score runs');
            this.showNotification('⚠️ Current striker is out. Please select a new batsman.');
            return;
        }
        
        console.log('🏏 DEBUG: Current match state after ensureBatsmenInitialized:', {
            striker: this.currentMatch?.currentTeam === 1 ? this.currentMatch.team1Score.striker?.name : this.currentMatch?.team2Score.striker?.name,
            nonStriker: this.currentMatch?.currentTeam === 1 ? this.currentMatch.team1Score.nonStriker?.name : this.currentMatch?.team2Score.nonStriker?.name,
            bowler: this.currentMatch?.bowler?.name,
            team1Batting: this.currentMatch?.team1Score.batting,
            team2Batting: this.currentMatch?.team2Score.batting
        });

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

        console.log('🏏 SCORING DEBUG: Recording runs for batsman:', {
            runs: runs,
            batsmanName: currentTeamScore.striker?.name,
            batsmanId: currentTeamScore.striker?.id,
            over: currentTeamScore.overs,
            ball: currentTeamScore.balls + 1,
            currentStrikerObj: currentTeamScore.striker,
            currentStrikerMatchRuns: currentTeamScore.striker?.matchRuns,
            currentStrikerMatchBalls: currentTeamScore.striker?.matchBalls
        });

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
            console.log('🏏 🔥 SCORING DEBUG: About to update striker stats:', currentTeamScore.striker.name);
            this.updateBatsmanStats(currentTeamScore.striker.id, runs, 1);
            console.log('🏏 SCORING DEBUG: Updated stats for batsman:', {
                batsmanName: currentTeamScore.striker.name,
                batsmanId: currentTeamScore.striker.id,
                runsAdded: runs,
                ballsFaced: 1,
                afterUpdateMatchRuns: currentTeamScore.striker.matchRuns,
                afterUpdateMatchBalls: currentTeamScore.striker.matchBalls
            });
        } else {
            console.error('❌ SCORING DEBUG: No striker found to credit runs to!');
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
        
        console.log('🏏 DEBUG: Final match state after addRuns:', {
            striker: this.currentMatch?.currentTeam === 1 ? this.currentMatch.team1Score.striker?.name : this.currentMatch?.team2Score.striker?.name,
            nonStriker: this.currentMatch?.currentTeam === 1 ? this.currentMatch.team1Score.nonStriker?.name : this.currentMatch?.team2Score.nonStriker?.name,
            bowler: this.currentMatch?.bowler?.name,
            team1Batting: this.currentMatch?.team1Score.batting,
            team2Batting: this.currentMatch?.team2Score.batting
        });
        
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
        console.log('🔧 🔥 STATS DEBUG: updateBatsmanStats called for player:', playerId, 'runs:', runs, 'balls:', balls);
        
        // Find and update the player in the global players array (for career stats)
        const player = this.players.find(p => p.id === playerId);
        console.log('🔧 🔥 STATS DEBUG: Found global player:', player?.name, 'Status:', player?.currentMatchStatus);
        
        if (player) {
            // Check if player is already out - don't update stats for out players
            if (player.currentMatchStatus === 'out') {
                console.log('🔧 🔥 STATS DEBUG: Player', player.name, 'is out - skipping stats update');
                return;
            }
            
            console.log('🔧 🔥 STATS DEBUG: Before update - matchRuns:', player.matchRuns, 'matchBalls:', player.matchBalls);
            
            console.log('🔧 UPDATE STATS DEBUG: Starting updateBatsmanStats for player:', playerId, 'runs:', runs, 'balls:', balls);
            if (!player.matchRuns) player.matchRuns = 0;
            if (!player.matchBalls) player.matchBalls = 0;
            if (!player.boundaries) player.boundaries = { fours: 0, sixes: 0 };
            
            console.log('🔧 UPDATE STATS DEBUG: Before update - Global player:', {
                name: player.name,
                id: player.id,
                matchRuns: player.matchRuns,
                matchBalls: player.matchBalls
            });
            
            // Update current match stats (for live display)
            player.matchRuns += runs;
            player.matchBalls += balls;
            
            console.log('🔧 UPDATE STATS DEBUG: After update - Global player:', {
                name: player.name,
                id: player.id,
                matchRuns: player.matchRuns,
                matchBalls: player.matchBalls
            });
            
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
                
                console.log('🔧 UPDATE STATS DEBUG: Before update - Local striker:', {
                    name: currentTeamScore.striker.name,
                    id: currentTeamScore.striker.id,
                    matchRuns: currentTeamScore.striker.matchRuns,
                    matchBalls: currentTeamScore.striker.matchBalls
                });
                
                currentTeamScore.striker.matchRuns += runs;
                currentTeamScore.striker.matchBalls += balls;
                
                console.log('🔧 UPDATE STATS DEBUG: After update - Local striker:', {
                    name: currentTeamScore.striker.name,
                    id: currentTeamScore.striker.id,
                    matchRuns: currentTeamScore.striker.matchRuns,
                    matchBalls: currentTeamScore.striker.matchBalls
                });
            } else if (currentTeamScore.striker && currentTeamScore.striker.id === playerId) {
                console.log('🔧 UPDATE STATS DEBUG: Striker is same object as global player - no separate update needed');
            }
            
            // For last man standing, don't update non-striker separately as it's the same player
            if (currentTeamScore.nonStriker && currentTeamScore.nonStriker.id === playerId && 
                currentTeamScore.nonStriker !== player && !isLastManStanding) {
                if (!currentTeamScore.nonStriker.matchRuns) currentTeamScore.nonStriker.matchRuns = 0;
                if (!currentTeamScore.nonStriker.matchBalls) currentTeamScore.nonStriker.matchBalls = 0;
                
                console.log('🔧 UPDATE STATS DEBUG: Before update - Local non-striker:', {
                    name: currentTeamScore.nonStriker.name,
                    id: currentTeamScore.nonStriker.id,
                    matchRuns: currentTeamScore.nonStriker.matchRuns,
                    matchBalls: currentTeamScore.nonStriker.matchBalls
                });
                
                currentTeamScore.nonStriker.matchRuns += runs;
                currentTeamScore.nonStriker.matchBalls += balls;
                
                console.log('🔧 UPDATE STATS DEBUG: After update - Local non-striker:', {
                    name: currentTeamScore.nonStriker.name,
                    id: currentTeamScore.nonStriker.id,
                    matchRuns: currentTeamScore.nonStriker.matchRuns,
                    matchBalls: currentTeamScore.nonStriker.matchBalls
                });
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
        console.log(`🎾 updateBowlerStats called for playerId: ${playerId}, runs: ${runs}, balls: ${balls}, wickets: ${wickets}`);
        
        // Update global player stats using normalized ID matching
        const player = this.players.find(p => String(parseFloat(p.id)) === String(parseFloat(playerId)));
        console.log(`🎾 Found global player for bowling stats: ${player ? player.name : 'NOT FOUND'}`);
        
        if (player) {
            console.log(`🎾 Before update - ${player.name}: balls=${player.matchBowlingBalls || 0}, runs=${player.matchBowlingRuns || 0}, wickets=${player.matchBowlingWickets || 0}`);
            
            // Initialize match-specific bowling stats if not present
            if (!player.matchBowlingRuns) player.matchBowlingRuns = 0;
            if (!player.matchBowlingBalls) player.matchBowlingBalls = 0;
            if (!player.matchBowlingWickets) player.matchBowlingWickets = 0;
            
            // Update current match bowling stats
            player.matchBowlingRuns += runs;
            player.matchBowlingBalls += balls;
            player.matchBowlingWickets += wickets;
            
            console.log(`🎾 After update - ${player.name}: balls=${player.matchBowlingBalls}, runs=${player.matchBowlingRuns}, wickets=${player.matchBowlingWickets}`);
            
            // Update career bowling stats
            player.wickets += wickets;
            // Note: would need separate fields for bowling runs conceded and balls bowled in player data structure
        } else {
            console.error(`🎾 ERROR: Could not find player with ID ${playerId} in global players array`);
        }
        
        // Safety check: If bowler is a separate object (not a reference), update it too
        if (this.currentMatch && this.currentMatch.bowler && 
            String(parseFloat(this.currentMatch.bowler.id)) === String(parseFloat(playerId)) && this.currentMatch.bowler !== player) {
            console.log(`🎾 Updating currentMatch.bowler object separately: ${this.currentMatch.bowler.name}`);
            
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
        
        // Update player in global players array using normalized ID matching
        const globalPlayer = this.players.find(p => String(parseFloat(p.id)) === String(parseFloat(playerId)));
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
            const team1Player = this.currentMatch.team1?.players?.find(p => p.id === playerId);
            if (team1Player) {
                team1Player.currentMatchStatus = 'out';
                team1Player.isOut = true;
                team1Player.dismissalType = dismissalType;
                team1Player.dismissalBowler = dismissalBowler;
                team1Player.dismissalFielder = dismissalFielder;
            }

            const team2Player = this.currentMatch.team2?.players?.find(p => p.id === playerId);
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
                const teamPlayer = team.players?.find(p => p.id === playerId);
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
        console.log('🃏 🔥 SCORECARD DEBUG: generateBattingCard called for team:', team.name);
        console.log('🃏 🔥 SCORECARD DEBUG: Team score object:', teamScore);
        console.log('🃏 🔥 SCORECARD DEBUG: Current striker:', teamScore.striker?.name, 'ID:', teamScore.striker?.id);
        console.log('🃏 🔥 SCORECARD DEBUG: Current non-striker:', teamScore.nonStriker?.name, 'ID:', teamScore.nonStriker?.id);
        
        console.log('generateBattingCard called for team:', team.name);
        return team.players.map(player => {
            // Get the latest stats from global players array instead of team player object
            const globalPlayer = this.players.find(p => p.id === player.id);
            const currentPlayer = globalPlayer || player; // Fallback to team player if not found
            
            const isStriker = teamScore.striker?.id === player.id;
            const isNonStriker = teamScore.nonStriker?.id === player.id;
            const isOut = currentPlayer.currentMatchStatus === 'out';
            
            console.log('🃏 🔥 SCORECARD PLAYER DEBUG:', {
                playerName: player.name,
                playerId: player.id,
                currentMatchStatus: currentPlayer.currentMatchStatus,
                isOut,
                isStriker,
                isNonStriker,
                matchRuns: currentPlayer.matchRuns || 0,
                matchBalls: currentPlayer.matchBalls || 0
            });
            
            console.log('Player:', player.name, 'currentMatchStatus:', currentPlayer.currentMatchStatus, 'isOut:', isOut);
            
            const runs = currentPlayer.matchRuns || 0;
            const balls = currentPlayer.matchBalls || 0;
            const fours = (currentPlayer.matchBoundaries?.fours || currentPlayer.boundaries?.fours) || 0;
            const sixes = (currentPlayer.matchBoundaries?.sixes || currentPlayer.boundaries?.sixes) || 0;
            
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
        console.log(`Generating bowling card for team: ${team.name}`);
        console.log(`Current match bowler:`, this.currentMatch?.bowler?.name || 'No bowler set');
        
        return team.players.map(player => {
            // Get the latest stats from global players array instead of team player object
            // Use normalized ID matching to handle decimal vs integer mismatch
            const globalPlayer = this.players.find(p => p.id === player.id);
            const currentPlayer = globalPlayer || player; // Fallback to team player if not found
            
            const ballsBowled = currentPlayer.matchBowlingBalls || 0;
            const overs = ballsBowled > 0 ? `${Math.floor(ballsBowled / 6)}.${ballsBowled % 6}` : '0.0';
            const runsConceded = currentPlayer.matchBowlingRuns || 0;
            const wickets = currentPlayer.matchBowlingWickets || 0;
            
            console.log(`Bowling card for ${player.name}:`, {
                playerId: player.id,
                globalPlayerFound: !!globalPlayer,
                matchBowlingBalls: currentPlayer.matchBowlingBalls || 0,
                matchBowlingRuns: currentPlayer.matchBowlingRuns || 0,
                matchBowlingWickets: currentPlayer.matchBowlingWickets || 0,
                calculatedOvers: overs,
                willBeFiltered: !(ballsBowled > 0 || (currentPlayer.matchBowlingWickets || 0) > 0)
            });
            
            const economy = ballsBowled >= 6 ? (runsConceded / (ballsBowled / 6)).toFixed(2) : 
                           ballsBowled > 0 ? ((runsConceded / ballsBowled) * 6).toFixed(2) : '0.00';
            
            return {
                name: player.name,
                overs: overs,
                runs: runsConceded,
                wickets: wickets,
                economy: economy
            };
        }).filter(bowler => {
            // Always show bowlers who have bowled or taken wickets
            if (bowler.overs !== '0.0' || bowler.wickets > 0) {
                return true;
            }
            
            // Also show the current bowler even if they haven't bowled yet
            if (this.currentMatch && this.currentMatch.bowler) {
                const currentBowlerName = this.currentMatch.bowler.name;
                if (bowler.name === currentBowlerName) {
                    console.log(`Including current bowler ${bowler.name} even with 0.0 overs`);
                    return true;
                }
            }
            
            return false;
        });
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
        
        // Note: Opening batsmen must be manually selected by user - no automatic assignment
        console.log('⚠️ Opening batsmen must be manually selected for second innings');
        currentTeamScore.striker = null;
        currentTeamScore.nonStriker = null;
        
        // Note: Bowler must be manually selected by user - no automatic assignment
        console.log('⚠️ Bowler must be manually selected for second innings');
        
        // Initialize bowling stats for existing bowler if any
        if (this.currentMatch.bowler) {
            console.log('✅ Using existing bowler for second innings:', this.currentMatch.bowler.name);
            // Initialize bowling stats if not already set
            if (!this.currentMatch.bowler.matchBowlingRuns) {
                this.currentMatch.bowler.matchBowlingRuns = 0;
                this.currentMatch.bowler.matchBowlingBalls = 0;
                this.currentMatch.bowler.matchBowlingWickets = 0;
            }
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

        // FIX: Use currentTeam property for consistent team determination
        const battingTeamScore = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1Score : this.currentMatch.team2Score;
        
        const battingTeamName = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1.name : this.currentMatch.team2.name;

        // DEBUG: Log the team determination issue
        console.log('🔧 DISPLAY DEBUG: Team determination comparison:', JSON.stringify({
            currentTeam: this.currentMatch.currentTeam,
            team1Batting: this.currentMatch.team1Score.batting,
            team2Batting: this.currentMatch.team2Score.batting,
            battingTeamDetermined: this.currentMatch.currentTeam === 1 ? 'team1' : 'team2',
            currentTeamBasedName: this.currentMatch.currentTeam === 1 ? this.currentMatch.team1.name : this.currentMatch.team2.name,
            battingTeamBasedName: battingTeamName
        }, null, 2));

        console.log('Updating score display with:', {
            teamName: battingTeamName,
            striker: battingTeamScore.striker?.name,
            nonStriker: battingTeamScore.nonStriker?.name,
            bowler: this.currentMatch.bowler?.name
        });

        // Update basic score display
        const currentTeamEl = document.getElementById('currentTeam');
        const currentScoreEl = document.getElementById('currentScore');
        const currentOverEl = document.getElementById('currentOver');
        
        if (currentTeamEl) {
            currentTeamEl.textContent = battingTeamName;
            console.log('Updated currentTeam element to:', battingTeamName);
        } else {
            console.error('currentTeam element not found');
        }
        
        if (currentScoreEl) {
            let scoreText = `${battingTeamScore.runs}/${battingTeamScore.wickets}`;
            
            // Remove target information from score text for cleaner display
            currentScoreEl.textContent = scoreText;
        } else {
            console.error('currentScore element not found');
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
            console.error('currentOver element not found');
        }

        // Update player names in scoring interface
        const strikerNameEl = document.getElementById('strikerName');
        const nonStrikerNameEl = document.getElementById('nonStrikerName');
        const bowlerNameEl = document.getElementById('bowlerName');
        
        if (strikerNameEl) {
            if (battingTeamScore.striker && battingTeamScore.striker.name) {
                strikerNameEl.textContent = battingTeamScore.striker.name;
                console.log('Updated strikerName element to:', battingTeamScore.striker.name);
            } else {
                strikerNameEl.textContent = 'Striker';
                console.log('No striker data, set to default');
            }
        } else {
            console.error('strikerName element not found');
        }
        
        if (nonStrikerNameEl) {
            if (battingTeamScore.nonStriker && battingTeamScore.nonStriker.name) {
                nonStrikerNameEl.textContent = battingTeamScore.nonStriker.name;
                console.log('Updated nonStrikerName element to:', battingTeamScore.nonStriker.name);
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
        
        if (strikerScoreEl && battingTeamScore.striker) {
            const runs = battingTeamScore.striker.matchRuns || 0;
            const balls = battingTeamScore.striker.matchBalls || 0;
            const strikeRate = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';
            
            console.log('📊 DISPLAY DEBUG: Striker score display:', {
                strikerName: battingTeamScore.striker.name,
                strikerId: battingTeamScore.striker.id,
                matchRuns: battingTeamScore.striker.matchRuns,
                matchBalls: battingTeamScore.striker.matchBalls,
                calculatedRuns: runs,
                calculatedBalls: balls,
                displayText: `${runs}* (${balls})`
            });
            
            strikerScoreEl.textContent = `${runs}* (${balls})`;
        } else if (strikerScoreEl) {
            strikerScoreEl.textContent = '0* (0)';
            console.log('📊 DISPLAY DEBUG: No striker data, showing default');
        }
        
        if (nonStrikerScoreEl && battingTeamScore.nonStriker) {
            const runs = battingTeamScore.nonStriker.matchRuns || 0;
            const balls = battingTeamScore.nonStriker.matchBalls || 0;
            const strikeRate = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';
            
            console.log('📊 DISPLAY DEBUG: Non-striker score display:', {
                nonStrikerName: battingTeamScore.nonStriker.name,
                nonStrikerId: battingTeamScore.nonStriker.id,
                matchRuns: battingTeamScore.nonStriker.matchRuns,
                matchBalls: battingTeamScore.nonStriker.matchBalls,
                calculatedRuns: runs,
                calculatedBalls: balls,
                displayText: `${runs} (${balls})`
            });
            
            nonStrikerScoreEl.textContent = `${runs} (${balls})`;
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
        const matchToSave = normalizedMatch || finishedMatch;
        
        // Check for duplicate matches by ID before adding
        const existingMatchIndex = this.matches.findIndex(match => 
            match.id === matchToSave.id || match.Match_ID === matchToSave.id
        );
        
        if (existingMatchIndex >= 0) {
            const existingMatch = this.matches[existingMatchIndex];
            const existingTimestamp = new Date(existingMatch.ended || existingMatch.gameFinishTime || existingMatch.Game_Finish_Time || 0).getTime();
            const newTimestamp = new Date(matchToSave.ended || matchToSave.gameFinishTime || matchToSave.Game_Finish_Time || Date.now()).getTime();
            
            if (newTimestamp >= existingTimestamp) {
                console.log('📝 Match exists, updating with newer version:', matchToSave.id);
                this.matches[existingMatchIndex] = matchToSave;
            } else {
                console.log('📝 Match exists, keeping existing newer version:', matchToSave.id);
            }
        } else {
            console.log('📝 Adding new match:', matchToSave.id);
            this.matches.push(matchToSave);
        }
        
        console.log(`📊 Total matches after save: ${this.matches.length}`);
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
                    
                    <button onclick="window.cricketApp.resetAppAfterMatch()" style="
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
        
        // Auto-close after 10 seconds and reset app
        setTimeout(() => {
            const modal = document.querySelector('.match-result-modal');
            if (modal) {
                modal.remove();
                this.resetAppAfterMatch();
            }
        }, 10000);
    }

    resetAppAfterMatch() {
        // Close the modal first
        const modal = document.querySelector('.match-result-modal');
        if (modal) {
            modal.remove();
        }
        
        // Clear saved teams from localStorage
        localStorage.removeItem('savedTeams');
        
        // Clear temporary teams
        this.tempTeams = null;
        
        // Clear current teams
        this.teams = [];
        
        // Navigate to home page
        if (typeof showPage === 'function') {
            showPage('home');
        }
        
        // Show success message
        this.showNotification('🏠 App reset! Ready for a new match.');
        
        console.log('🔄 App reset after match completion');
    }

    async executeCompleteDataWipe() {
        try {
            console.log('🗑️ WIPE DEBUG: Starting complete data wipe process...');
            
            // Step 1: Create comprehensive backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `cricket-complete-backup-${timestamp}.json`;
            
            console.log('📦 WIPE DEBUG: Creating backup file:', filename);
            
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
            console.log('💾 WIPE DEBUG: Found localStorage keys:', allLocalStorageKeys.length);
            
            allLocalStorageKeys.forEach(key => {
                completeBackup.localStorage[key] = localStorage.getItem(key);
            });
            
            // Step 2: Save backup to downloads (Android-compatible approach)
            const jsonStr = JSON.stringify(completeBackup, null, 2);
            
            console.log('📦 WIPE DEBUG: Attempting to create backup download...');
            console.log('📦 WIPE DEBUG: User agent:', navigator.userAgent);
            console.log('📦 WIPE DEBUG: Platform:', navigator.platform);
            console.log('📦 WIPE DEBUG: Download support:', 'download' in document.createElement('a'));
            console.log('📦 WIPE DEBUG: Blob support:', typeof Blob !== 'undefined');
            console.log('📦 WIPE DEBUG: Backup size:', jsonStr.length, 'chars');
            
            try {
                // Try standard download method first
                console.log('📦 WIPE DEBUG: Creating blob...');
                const blob = new Blob([jsonStr], { type: 'application/json' });
                console.log('📦 WIPE DEBUG: Blob created, size:', blob.size);
                
                const url = URL.createObjectURL(blob);
                console.log('📦 WIPE DEBUG: Object URL created:', url);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                console.log('📦 WIPE DEBUG: Download element created with download attribute:', a.download);
                console.log('📦 WIPE DEBUG: Download element href:', a.href);
                
                document.body.appendChild(a);
                console.log('📦 WIPE DEBUG: Element added to body, triggering click...');
                a.click();
                console.log('📦 WIPE DEBUG: Click triggered');
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                console.log('✅ WIPE DEBUG: Backup file download initiated:', filename);
                
                // Additional checks for Android
                if (navigator.userAgent.includes('Android')) {
                    console.log('📱 WIPE DEBUG: Android detected, adding Android-specific handling...');
                    
                    // Check if downloads are accessible
                    if (navigator.storage && navigator.storage.estimate) {
                        navigator.storage.estimate().then(estimate => {
                            console.log('📱 WIPE DEBUG: Storage estimate:', estimate);
                        });
                    }
                }
                
                // For Android, also try to trigger download via window.open
                setTimeout(() => {
                    try {
                        console.log('📱 WIPE DEBUG: Trying alternative download method (data URI)...');
                        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr);
                        console.log('📱 WIPE DEBUG: Data URI length:', dataUri.length);
                        const newWindow = window.open(dataUri, filename);
                        console.log('📱 WIPE DEBUG: Window.open result:', newWindow);
                        if (newWindow) {
                            console.log('📱 WIPE DEBUG: New window opened, will close in 2 seconds');
                            setTimeout(() => {
                                newWindow.close();
                                console.log('📱 WIPE DEBUG: Window closed');
                            }, 2000);
                        } else {
                            console.log('⚠️ WIPE DEBUG: Window.open returned null/undefined');
                        }
                        console.log('✅ WIPE DEBUG: Alternative download method attempted');
                    } catch (altError) {
                        console.log('⚠️ WIPE DEBUG: Alternative download failed:', altError);
                    }
                }, 500);
                
            } catch (downloadError) {
                console.error('❌ WIPE DEBUG: Backup download failed:', downloadError);
                console.error('❌ WIPE DEBUG: Error stack:', downloadError.stack);
                
                // Try to diagnose download issues
                console.log('🔍 WIPE DEBUG: Diagnosing download failure...');
                console.log('🔍 WIPE DEBUG: Document domain:', document.domain);
                console.log('🔍 WIPE DEBUG: Location:', location.href);
                console.log('🔍 WIPE DEBUG: Document readyState:', document.readyState);
                
                // Fallback: Show the backup data in a modal for manual copying
                alert(`Backup creation failed. Please copy this data manually:\n\nFilename: ${filename}\n\nData will be shown in console.`);
                console.log('📋 BACKUP DATA (copy this):', jsonStr);
            }
            
            console.log('✅ WIPE DEBUG: Backup process completed, proceeding with wipe');
            
            // Clear ALL localStorage keys (complete scrub) but preserve login state
            console.log('🗑️ WIPE DEBUG: Starting localStorage complete wipe...');
            const keysBefore = Object.keys(localStorage).length;
            
            // Save current group info before wiping
            const currentGroup = localStorage.getItem('cricket-current-group');
            
            localStorage.clear();
            const keysAfter = Object.keys(localStorage).length;
            console.log(`🗑️ WIPE DEBUG: localStorage cleared. Before: ${keysBefore}, After: ${keysAfter}`);
            
            // Restore current group after wipe (maintain login state)
            if (currentGroup) {
                localStorage.setItem('cricket-current-group', currentGroup);
                console.log('🗑️ WIPE DEBUG: Preserved login state for current group');
            }
            
            // Set a persistent marker to prevent reloading from asset files
            localStorage.setItem('cricket-wiped-state', 'true');
            localStorage.setItem('cricket-wipe-timestamp', new Date().toISOString());
            
            console.log('🗑️ WIPE DEBUG: localStorage cleared completely but login preserved');
            
            // Step 4: Permanently delete JSON files
            console.log('🗑️ WIPE DEBUG: Permanently deleting JSON files...');
            try {
                if (this.dataManager) {
                    // Clear/delete all JSON data files
                    await this.dataManager.saveJSONData(
                        { player_info: [], matches: [], match_batting_performance: [], match_bowling_performance: [], index: [] }, 
                        true
                    );
                    console.log('✅ WIPE DEBUG: JSON files cleared/overwritten with empty data');
                }
            } catch (jsonError) {
                console.error('⚠️ WIPE DEBUG: Failed to clear JSON files:', jsonError);
            }
            
            // Step 5: Reset all app data
            console.log('🔄 WIPE DEBUG: Resetting app data...');
            this.players = [];
            this.matches = [];
            this.teams = [];
            this.currentMatch = null;
            this.tempTeams = null;
            
            // Step 6: Clear any window-level data
            if (typeof window.cricketData !== 'undefined') {
                window.cricketData = null;
                console.log('🗑️ WIPE DEBUG: Cleared window.cricketData');
            }
            
            console.log('✅ WIPE DEBUG: Data structures reset in memory (no localStorage save for wiped state)');
            
            // Step 7: Update UI to reflect empty state
            this.updateStats();
            this.loadPlayers();
            this.loadTeams();
            this.loadMatchHistory(); // Refresh match history to show empty state
            
            console.log('🎯 WIPE DEBUG: Complete data wipe finished successfully');
            this.showNotification(`✅ All data wiped! Backup saved: ${filename}`);
            
            return filename;
            
        } catch (error) {
            console.error('❌ WIPE DEBUG: Error during complete data wipe:', error);
            this.showNotification('❌ Wipe failed: ' + error.message);
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
            } catch (e) {
                console.error('Error parsing saved match:', e);
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
        
        // Ensure currentMatch is loaded from localStorage with validation
        const savedMatch = localStorage.getItem('cricket-current-match');
        if (savedMatch && savedMatch !== 'null') {
            try {
                this.currentMatch = JSON.parse(savedMatch);
                console.log('🏏 Match data loaded for resume:', this.currentMatch);
                
                // Validate and fix any corrupted data
                this.validateAndFixMatchData();
                
            } catch (e) {
                console.error('Error loading match for resume:', e);
            }
        }
        
        // Navigate to scoring tab to continue the match
        if (typeof showPage === 'function') {
            showPage('scoring');
        }
        
        // Force update the scoring tab view to show the active match
        setTimeout(() => {
            console.log('🏏 Updating scoring tab view for resumed match');
            this.updateScoringTabView();
            
            // Force refresh the live match display
            if (this.currentMatch) {
                this.updateScoreDisplay();
                
                // Force save the corrected match data back to localStorage
                localStorage.setItem('cricket-current-match', JSON.stringify(this.currentMatch));
            }
        }, 200);
        
        this.showNotification('🏏 Match resumed! Continue playing.');
    }

    validateAndFixMatchData() {
        if (!this.currentMatch) return;
        
        console.log('🔧 Validating match data for resume...');
        
        // Ensure team scores exist and have proper structure
        if (!this.currentMatch.team1Score) {
            this.currentMatch.team1Score = { runs: 0, wickets: 0, overs: 0, balls: 0, batting: false };
        }
        if (!this.currentMatch.team2Score) {
            this.currentMatch.team2Score = { runs: 0, wickets: 0, overs: 0, balls: 0, batting: false };
        }
        
        // Ensure current team is properly set
        if (!this.currentMatch.currentTeam) {
            this.currentMatch.currentTeam = 1;
        }
        
        // Validate player status and fix any corruption
        [this.currentMatch.team1, this.currentMatch.team2].forEach((team, teamIndex) => {
            if (team && team.players) {
                team.players.forEach(player => {
                    // Reset corrupted match status - let the game state determine the real status
                    if (player.currentMatchStatus === 'out' && (!player.matchRuns || player.matchRuns === 0) && (!player.matchBalls || player.matchBalls === 0)) {
                        console.log(`🔧 Resetting corrupted status for player ${player.name}`);
                        player.currentMatchStatus = null;
                    }
                    
                    // Ensure player has match stats
                    if (typeof player.matchRuns === 'undefined') player.matchRuns = 0;
                    if (typeof player.matchBalls === 'undefined') player.matchBalls = 0;
                    if (typeof player.fours === 'undefined') player.fours = 0;
                    if (typeof player.sixes === 'undefined') player.sixes = 0;
                });
            }
        });
        
        console.log('🔧 Match data validation completed');
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
        
        this.showNotification('🏠 Match quit! App restarted fresh.');
        console.log('🔄 Match quit and app restarted fresh');
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
        // Batting strike rate = avg(runs/ballsfaced)
        const ballsFaced = player.ballsFaced || 0;
        if (ballsFaced === 0) return '0.0';
        return ((player.runs || 0) / ballsFaced * 100).toFixed(1);
    }

    calculateBowlerEconomy(player) {
        console.log('CRICKET_DEBUG: ANALYTICS - Calculating bowler economy for player: ' + (player?.name || 'unknown'));
        
        // Bowling economy = sum(runsConceded)/sum(ballsBowled/6)
        const ballsBowled = player.ballsBowled || 0;
        const runsConceded = player.runsConceded || 0;
        const oversPlayed = ballsBowled / 6;
        const economy = oversPlayed > 0 ? (runsConceded / oversPlayed) : 0;
        
        console.log('CRICKET_DEBUG: ANALYTICS - Economy calculation: ballsBowled=' + ballsBowled + ', runsConceded=' + runsConceded + ', economy=' + economy);
        
        return economy; // Return the number, not the formatted string
    }

    calculateBowlingAverage(player) {
        console.log('CRICKET_DEBUG: ANALYTICS - Getting bowling average for player: ' + (player?.name || 'unknown'));
        
        const wickets = player.wickets || 0;
        const runsConceded = player.runsConceded || 0;
        
        console.log('CRICKET_DEBUG: ANALYTICS - Bowling average calculation: wickets=' + wickets + ', runsConceded=' + runsConceded);
        
        if (wickets === 0) {
            console.log('CRICKET_DEBUG: ANALYTICS - No wickets, returning 0 bowling average');
            return 0;
        }
        
        const average = runsConceded / wickets;
        console.log('CRICKET_DEBUG: ANALYTICS - Bowling average=' + average);
        
        return average;
    }

    calculateBowlingStrikeRate(player) {
        console.log('CRICKET_DEBUG: ANALYTICS - Getting bowling strike rate for player: ' + (player?.name || 'unknown'));
        
        // Try to get already calculated value first
        if (player.bowlingStrikeRate !== undefined && player.bowlingStrikeRate > 0) {
            console.log('CRICKET_DEBUG: ANALYTICS - Using pre-calculated bowlingStrikeRate: ' + player.bowlingStrikeRate);
            return player.bowlingStrikeRate;
        }
        
        const wickets = player.wickets || 0;
        let ballsBowled = player.ballsBowled || 0;
        
        // If ballsBowled is 0, try to calculate from totalOvers
        if (ballsBowled === 0 && player.totalOvers) {
            ballsBowled = player.totalOvers * 6;
            console.log('CRICKET_DEBUG: ANALYTICS - Calculated ballsBowled from totalOvers: ' + ballsBowled);
        }
        
        console.log('CRICKET_DEBUG: ANALYTICS - Bowling strike rate calculation: wickets=' + wickets + ', ballsBowled=' + ballsBowled);
        console.log('CRICKET_DEBUG: ANALYTICS - Player object keys:', Object.keys(player));
        
        if (wickets === 0) {
            console.log('CRICKET_DEBUG: ANALYTICS - No wickets, returning 0 bowling strike rate');
            return 0;
        }
        
        const strikeRate = ballsBowled / wickets;
        console.log('CRICKET_DEBUG: ANALYTICS - Bowling strike rate=' + strikeRate);
        
        return strikeRate;
    }

    calculateRunsConceded(player) {
        console.log('CRICKET_DEBUG: ANALYTICS - Getting runs conceded for player: ' + (player?.name || 'unknown'));
        
        // Use actual runs conceded data
        const runsConceded = player.runsConceded || 0;
        
        console.log('CRICKET_DEBUG: ANALYTICS - Runs conceded: ' + runsConceded);
        
        return runsConceded;
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
        console.log('📊 ANALYTICS DEBUG: loadPlayerAnalytics called');
        const analyticsDiv = document.getElementById('playerAnalytics');
        console.log('📊 ANALYTICS DEBUG: analyticsDiv found:', !!analyticsDiv);
        if (!analyticsDiv) return;

        // Initialize with default sorting
        this.updatePlayerAnalytics('runs');
    }

    updatePlayerAnalytics(sortBy) {
        console.log('📊 ANALYTICS DEBUG: updatePlayerAnalytics called with sortBy:', sortBy);
        const analyticsDiv = document.getElementById('playerAnalytics');
        if (!analyticsDiv) return;

        const sortedPlayers = this.analyticsEngine.sortPlayersByStat(this.players, sortBy);
        console.log('📊 ANALYTICS DEBUG: sortedPlayers count:', sortedPlayers.length);
        
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
        console.log('CRICKET_DEBUG: getPlayerMetricValue called with metric:', metric, 'for player:', player.name);
        
        // Get cricket app from global scope since this is a CricketApp method
        const cricketApp = window.cricketApp;
        console.log('CRICKET_DEBUG: cricketApp available:', !!cricketApp);
        
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
                console.log('CRICKET_DEBUG: bowlingStrikeRate case reached for player:', player.name);
                if (cricketApp) {
                    console.log('CRICKET_DEBUG: Calling cricketApp.calculateBowlingStrikeRate');
                    const bsr = cricketApp.calculateBowlingStrikeRate(player);
                    console.log('CRICKET_DEBUG: bowlingStrikeRate result:', bsr);
                    return bsr > 0 ? parseFloat(bsr.toFixed(1)) : 0;
                } else {
                    console.log('CRICKET_DEBUG: No cricketApp, returning 0');
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
                console.log('CRICKET_DEBUG: Unknown metric:', metric);
                return 0;
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
    
    debugDataAccess() {
        console.log('CRICKET_DEBUG: === DATA ACCESS DEBUG ===');
        console.log('CRICKET_DEBUG: App matches array: ' + (this.matches?.length || 0));
        console.log('CRICKET_DEBUG: App players array: ' + (this.players?.length || 0));
        
        // Test localStorage access
        const localData = localStorage.getItem('cricket-stats');
        console.log('CRICKET_DEBUG: localStorage cricket-stats exists: ' + !!localData);
        
        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                console.log('CRICKET_DEBUG: localStorage data - player_info: ' + (parsed.player_info?.length || 0));
                console.log('CRICKET_DEBUG: localStorage data - matches: ' + (parsed.matches?.length || 0));
                console.log('CRICKET_DEBUG: localStorage data - batting_performance: ' + (parsed.match_batting_performance?.length || 0));
                console.log('CRICKET_DEBUG: localStorage data - bowling_performance: ' + (parsed.match_bowling_performance?.length || 0));
            } catch (e) {
                console.log('CRICKET_DEBUG: localStorage parse error: ' + e.message);
            }
        }
        
        // Test Android data loader
        if (window.androidDataLoader) {
            console.log('CRICKET_DEBUG: Android data loader available');
            window.androidDataLoader.loadData()
                .then(data => {
                    console.log('CRICKET_DEBUG: Android loader - player_info: ' + (data?.player_info?.length || 0));
                    console.log('CRICKET_DEBUG: Android loader - matches: ' + (data?.matches?.length || 0));
                    console.log('CRICKET_DEBUG: Android loader - batting_performance: ' + (data?.match_batting_performance?.length || 0));
                    console.log('CRICKET_DEBUG: Android loader - bowling_performance: ' + (data?.match_bowling_performance?.length || 0));
                })
                .catch(e => console.log('CRICKET_DEBUG: Android data loader error: ' + e.message));
        } else {
            console.log('CRICKET_DEBUG: Android data loader NOT available');
        }
        
        // Test regular fetch
        fetch('./cricket_stats.json')
            .then(response => {
                console.log('CRICKET_DEBUG: Fetch response status: ' + response.status);
                return response.json();
            })
            .then(data => {
                console.log('CRICKET_DEBUG: Fetch - player_info: ' + (data?.player_info?.length || 0));
                console.log('CRICKET_DEBUG: Fetch - matches: ' + (data?.matches?.length || 0));
                console.log('CRICKET_DEBUG: Fetch - batting_performance: ' + (data?.match_batting_performance?.length || 0));
                console.log('CRICKET_DEBUG: Fetch - bowling_performance: ' + (data?.match_bowling_performance?.length || 0));
            })
            .catch(e => console.log('CRICKET_DEBUG: Fetch error: ' + e.message));
    }
    
    debugLoadPipeline() {
        console.log('CRICKET_DEBUG: === LOAD PIPELINE DEBUG ===');
        console.log('CRICKET_DEBUG: Testing complete data loading pipeline...');
        
        // Step 1: Initial state
        console.log('CRICKET_DEBUG: Initial app state:');
        console.log('CRICKET_DEBUG: - this.matches: ' + (this.matches?.length || 0));
        console.log('CRICKET_DEBUG: - this.players: ' + (this.players?.length || 0));
        
        // Step 2: Call loadDataFromManager
        console.log('CRICKET_DEBUG: Calling loadDataFromManager...');
        this.loadDataFromManager()
            .then(() => {
                console.log('CRICKET_DEBUG: loadDataFromManager complete');
                console.log('CRICKET_DEBUG: After loadDataFromManager:');
                console.log('CRICKET_DEBUG: - this.matches: ' + (this.matches?.length || 0));
                console.log('CRICKET_DEBUG: - this.players: ' + (this.players?.length || 0));
                
                // Step 3: Call loadMatchHistory
                console.log('CRICKET_DEBUG: Calling loadMatchHistory...');
                return this.loadMatchHistory();
            })
            .then(() => {
                console.log('CRICKET_DEBUG: loadMatchHistory complete');
                console.log('CRICKET_DEBUG: After loadMatchHistory:');
                console.log('CRICKET_DEBUG: - this.matches: ' + (this.matches?.length || 0));
                console.log('CRICKET_DEBUG: - this.players: ' + (this.players?.length || 0));
                
                if (this.matches && this.matches.length > 0) {
                    console.log('CRICKET_DEBUG: First match details: ' + JSON.stringify(this.matches[0]));
                }
                
                // Step 4: Try analytics
                console.log('CRICKET_DEBUG: Calling calculatePlayerStatistics...');
                this.calculatePlayerStatistics();
            })
            .catch(error => {
                console.log('CRICKET_DEBUG: Pipeline error: ' + error.message);
            });
    }
    
    debugLoadMatches() {
        console.log('CRICKET_DEBUG: === MANUAL MATCH RELOAD ===');
        console.log('CRICKET_DEBUG: Current matches count: ' + (this.matches?.length || 0));
        console.log('CRICKET_DEBUG: Calling loadMatchHistory...');
        
        this.loadMatchHistory().then(() => {
            console.log('CRICKET_DEBUG: Match history reloaded successfully');
            console.log('CRICKET_DEBUG: New matches count: ' + (this.matches?.length || 0));
            console.log('CRICKET_DEBUG: Match data sample: ' + JSON.stringify(this.matches?.[0] || 'No matches'));
        }).catch(error => {
            console.log('CRICKET_DEBUG: Match reload failed: ' + error.message);
        });
    }
    
    debugAnalytics() {
        console.log('CRICKET_DEBUG: === MANUAL ANALYTICS REFRESH ===');
        console.log('CRICKET_DEBUG: Current matches for analytics: ' + (this.matches?.length || 0));
        console.log('CRICKET_DEBUG: Current players for analytics: ' + (this.players?.length || 0));
        
        if (!this.matches || this.matches.length === 0) {
            console.log('CRICKET_DEBUG: WARNING - No matches available for analytics');
            return;
        }
        
        console.log('CRICKET_DEBUG: Calling calculatePlayerStatistics...');
        this.calculatePlayerStatistics();
        console.log('CRICKET_DEBUG: Analytics calculation triggered');
        console.log('CRICKET_DEBUG: ===============================');
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
            console.log('ImportCricketData: Starting import process');
            
            // Check if we're in a mobile WebView environment
            const isAndroidWebView = /Android.*wv\)|; wv\)/i.test(navigator.userAgent);
            const hasFileSystemAccess = 'showOpenFilePicker' in window;
            
            console.log('ImportCricketData: Environment check', { isAndroidWebView, hasFileSystemAccess });
            
            // For Android WebView or if File System Access API is not available, use traditional file input
            if (isAndroidWebView || !hasFileSystemAccess) {
                console.log('ImportCricketData: Using traditional file input method');
                
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
                        console.log('ImportCricketData: File selected, event:', event);
                        const file = event.target.files[0];
                        if (file) {
                            console.log('ImportCricketData: Processing file:', file.name, 'size:', file.size);
                            const text = await file.text();
                            console.log('ImportCricketData: File text loaded, length:', text.length);
                            const data = JSON.parse(text);
                            console.log('ImportCricketData: JSON parsed successfully, calling processImportedData...');
                            await this.processImportedData(data, file.name);
                            console.log('ImportCricketData: processImportedData completed successfully');
                        } else {
                            console.log('ImportCricketData: No file selected');
                            this.showNotification('ℹ️ No file selected');
                        }
                    } catch (error) {
                        console.error('ImportCricketData: File processing error:', error);
                        this.showNotification('❌ Error processing file: ' + error.message);
                    } finally {
                        // Clean up
                        console.log('ImportCricketData: Cleaning up file input');
                        document.body.removeChild(input);
                    }
                };
                
                // Trigger file selection
                input.click();
                
            } else {
                console.log('ImportCricketData: Using modern File System Access API');
                
                // Use modern API for desktop browsers
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
        } catch (error) {
            console.error('❌ ImportCricketData: Import error:', error);
            
            // Handle user cancellation gracefully
            if (error.name === 'AbortError' || error.message.includes('aborted')) {
                console.log('ImportCricketData: User cancelled file selection');
                this.showNotification('ℹ️ Import cancelled');
            } else {
                this.showNotification('❌ Import failed: ' + error.message);
            }
        }
    }

    // Process imported cricket data
    async processImportedData(data, filename) {
        try {
            console.log('🔄 IMPORT DEBUG: processImportedData called with filename:', filename);
            console.log('🔄 IMPORT DEBUG: data keys:', Object.keys(data));
            
            let players = [];
            let matches = [];
            
            // Handle different data formats
            if (data.player_info) {
                console.log('🔄 IMPORT DEBUG: Processing cricket_stats.json format');
                // cricket_stats.json format
                players = data.player_info.map(playerInfo => ({
                    id: typeof playerInfo.Player_ID === 'string' ? 
                        parseInt(playerInfo.Player_ID.replace('P', '')) : 
                        parseInt(playerInfo.Player_ID) || playerInfo.Player_ID,
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
            
            // Mark as user data since data has been restored
            localStorage.removeItem('cricket-wiped-state');
            localStorage.removeItem('cricket-wipe-timestamp');
            localStorage.setItem('cricket-has-user-data', 'true');
            localStorage.setItem('cricket-last-save-time', Date.now().toString());
            
            console.log('✅ IMPORT DEBUG: Cleared wipe state and set user data markers');
            
            // Clear any cached data in data loaders to force fresh load
            if (window.androidDataLoader) {
                window.androidDataLoader.dataLoaded = false;
                window.androidDataLoader.cricketData = null;
                console.log('🔄 IMPORT DEBUG: Cleared Android data loader cache');
            }
            
            // Comprehensive UI refresh after import
            console.log('🔄 IMPORT DEBUG: Refreshing all UI components...');
            this.updateStats();
            this.loadPlayers(); // Refresh players list
            this.loadMatchHistory(); // Refresh match history
            this.loadTeams(); // Refresh teams
            
            console.log(`✅ Imported ${players.length} players and ${matches.length} matches from ${filename}`);
            this.showNotification(`✅ Imported ${players.length} players and ${matches.length} matches from ${filename}`);
            
        } catch (error) {
            console.error('❌ Process import error:', error);
            this.showNotification('❌ Import processing failed: ' + error.message);
        }
    }

    // Refresh data from cricket_stats.json (useful when JSON file is modified)
    async refreshDataFromJson() {
        try {
            console.log('🔄 Refreshing data from cricket_stats.json...');
            this.showNotification('🔄 Refreshing data from cricket_stats.json...');
            
            let statsData = null;
            
            // Detect Android WebView environment - improved detection
            const isAndroid = (navigator.userAgent.includes('Android') && window.location.protocol === 'file:') || 
                             (typeof window.AndroidInterface !== 'undefined') ||
                             (window.location.href.startsWith('file:///android_asset/'));
            
            console.log('🔍 Refresh environment detection:', {
                userAgent: navigator.userAgent,
                protocol: window.location.protocol,
                href: window.location.href,
                isAndroid: isAndroid,
                hasAndroidDataLoader: !!window.androidDataLoader
            });
            
            if (isAndroid && window.androidDataLoader) {
                // Use Android-compatible data loader
                console.log('📱 Using Android data loader for refresh...');
                statsData = await window.androidDataLoader.loadData();
                console.log('📱 Android data loader returned:', statsData ? 'data' : 'null');
            } else if (isAndroid) {
                // Android environment but no data loader - try XMLHttpRequest directly
                console.log('📱 Android detected but no data loader, trying XMLHttpRequest for refresh...');
                try {
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', './cricket_stats.json', false); // Synchronous for simplicity
                    xhr.send();
                    if (xhr.status === 200 || xhr.status === 0) {
                        statsData = JSON.parse(xhr.responseText);
                        console.log('📱 Direct XMLHttpRequest successful for refresh');
                    }
                } catch (xhrError) {
                    console.log('📱 Direct XMLHttpRequest failed for refresh:', xhrError.message);
                }
            } else {
                // Use fetch for web browsers
                const response = await fetch('./cricket_stats.json?' + Math.random(), {
                    cache: 'no-cache',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                statsData = await response.json();
            }
            
            console.log('🔍 Stats data structure:', statsData ? Object.keys(statsData) : 'null');
            
            if (statsData && statsData.player_data && Array.isArray(statsData.player_data)) {
                console.log('✅ cricket_stats.json loaded successfully for refresh');
                console.log('📊 Found', statsData.player_data.length, 'players in JSON');
                
                // Convert cricket_stats.json format to app format
                const newPlayers = [];
                let playerId = 1;
                
                statsData.player_data.forEach(playerInfo => {
                    const player = {
                        id: playerId++,
                        name: playerInfo.Name || '',
                        bowling: playerInfo.Bowling_Style || 'Medium',
                        batting: playerInfo.Batting_Style || 'So-So',
                        is_star: playerInfo.Is_Star || false,
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
                        oversBowled: 0,
                        ballsBowled: 0,
                        runsConceded: 0,
                        economy: 0,
                        bowlingAverage: 0,
                        catches: 0,
                        isSelected: false,
                        currentMatchStatus: null
                    };
                    newPlayers.push(player);
                    console.log('✅ Converted player:', player.name);
                });
                
                // Update players data
                this.players = newPlayers;
                this.matches = statsData.match_data || [];
                
                console.log('📊 Final player count:', this.players.length);
                
                // Save to localStorage
                this.saveData(false);
                
                // Refresh UI
                this.updateStats();
                this.renderPlayersUI();
                
                console.log(`✅ Successfully refreshed ${this.players.length} players from cricket_stats.json`);
                this.showNotification(`✅ Refreshed ${this.players.length} players from cricket_stats.json`);
                this.showDataSource('cricket_stats.json (Refreshed)');
                
            } else {
                throw new Error('Invalid cricket_stats.json format or no player data found. Expected player_data array.');
            }
            
        } catch (error) {
            console.error('❌ Refresh from JSON error:', error);
            this.showNotification('❌ Refresh failed: ' + error.message);
        }
    }

    // Clear all cached data and force refresh from JSON
    async clearCacheAndRefresh() {
        try {
            console.log('🗑️ Clearing cache and refreshing from cricket_stats.json...');
            this.showNotification('🗑️ Clearing cache and refreshing...');
            
            // Clear all localStorage data including user data markers
            const keysToRemove = [
                'cricket-stats',
                'cricket-players', 
                'cricket-matches',
                'cricket-teams',
                'cricket-current-match',
                'cricket-has-user-data',  // Clear user data marker
                'cricket-last-save-time', // Clear save time marker
                'app-initialized',
                'last-json-refresh',
                'last_save_timestamp',
                'cricket_stats_json'
            ];
            
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.log('🗑️ Removed:', key);
            });
            
            console.log('✅ Cache cleared, now loading fresh data...');
            
            // Now reload data fresh
            await this.refreshDataFromJson();
            
        } catch (error) {
            console.error('❌ Clear cache and refresh error:', error);
            this.showNotification('❌ Clear cache failed: ' + error.message);
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

            // Check if we're in a mobile WebView environment
            const isAndroidWebView = /Android.*wv\)|; wv\)/i.test(navigator.userAgent);
            const hasFileSystemAccess = 'showOpenFilePicker' in window;
            
            console.log('ImportAndMergeData: Environment check', { isAndroidWebView, hasFileSystemAccess });

            // For Android WebView or if File System Access API is not available, use traditional file input
            if (isAndroidWebView || !hasFileSystemAccess) {
                console.log('ImportAndMergeData: Using traditional file input method');
                
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
                        console.log('ImportAndMergeData: File selected');
                        const file = event.target.files[0];
                        if (file) {
                            console.log('ImportAndMergeData: Processing file:', file.name);
                            const text = await file.text();
                            const data = JSON.parse(text);
                            await this.performSmartMerge(data, file.name);
                        } else {
                            console.log('ImportAndMergeData: No file selected');
                            this.showNotification('ℹ️ No file selected');
                        }
                    } catch (error) {
                        console.error('ImportAndMergeData: File processing error:', error);
                        this.showNotification('❌ Error processing file: ' + error.message);
                    } finally {
                        // Clean up
                        document.body.removeChild(input);
                    }
                };
                
                // Trigger file selection
                input.click();
                
            } else {
                console.log('ImportAndMergeData: Using modern File System Access API');
                
                // Use modern API for desktop browsers
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
        } catch (error) {
            console.error('❌ Import and merge error:', error);
            
            // Handle user cancellation gracefully
            if (error.name === 'AbortError' || error.message.includes('aborted')) {
                console.log('ImportAndMergeData: User cancelled file selection');
                this.showNotification('ℹ️ Import cancelled');
            } else {
                this.showNotification('❌ Import and merge failed: ' + error.message);
            }
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
                    id: typeof playerInfo.Player_ID === 'string' ? 
                        parseInt(playerInfo.Player_ID.replace('P', '')) : 
                        parseInt(playerInfo.Player_ID) || playerInfo.Player_ID,
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

    // Data Export functionality - JSON only
    exportDataToCSV() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            // Export as JSON only (removed CSV export as we're using cricket_stats.json only)
            const jsonData = {
                players: this.players,
                matches: this.matches,
                teams: this.teams,
                exportDate: new Date().toISOString(),
                source: 'Cricket PWA Export'
            };
            
            this.downloadJSON(jsonData, `cricket-data-backup-${timestamp}.json`);
            this.showNotification('📁 Data exported to JSON successfully!');
        } catch (error) {
            this.showNotification('❌ Export failed: ' + error.message);
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
    showDataSource(source = null) {
        const indicator = document.getElementById('data-source');
        const sourceName = document.getElementById('source-name');
        
        if (indicator && sourceName) {
            if (source) {
                this.dataSource = source;
            }
            
            // Determine data source based on current state
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

    // Get available batsmen (players not currently batting and not out)
    getAvailableBatsmen() {
        console.log('🏏 🔥 AVAILABLE BATSMEN DEBUG: getAvailableBatsmen called');
        
        if (!this.currentMatch) {
            console.log('❌ 🔥 AVAILABLE BATSMEN DEBUG: No current match');
            return [];
        }
        
        const currentTeamScore = this.currentMatch.currentTeam === 1 ? this.currentMatch.team1Score : this.currentMatch.team2Score;
        const battingTeam = this.currentMatch.currentTeam === 1 ? this.currentMatch.team1 : this.currentMatch.team2;
        
        console.log('🏏 🔥 AVAILABLE BATSMEN DEBUG: Current team:', this.currentMatch.currentTeam);
        console.log('🏏 🔥 AVAILABLE BATSMEN DEBUG: Batting team name:', battingTeam?.name);
        console.log('🏏 🔥 AVAILABLE BATSMEN DEBUG: Total team players:', battingTeam?.players?.length);
        
        if (!battingTeam || !battingTeam.players) {
            console.log('❌ TEAM_DEBUG getAvailableBatsmen: No batting team or players found');
            return [];
        }
        
        // Get players who are currently batting
        const currentBatsmenIds = [];
        if (currentTeamScore.striker) {
            currentBatsmenIds.push(currentTeamScore.striker.id);
            console.log('🏏 Current striker:', currentTeamScore.striker.name, 'ID:', currentTeamScore.striker.id);
        }
        if (currentTeamScore.nonStriker) {
            currentBatsmenIds.push(currentTeamScore.nonStriker.id);
            console.log('🏏 Current non-striker:', currentTeamScore.nonStriker.name, 'ID:', currentTeamScore.nonStriker.id);
        }
        
        // Get players who are already out
        const outBatsmenIds = currentTeamScore.fallOfWickets ? currentTeamScore.fallOfWickets.map(w => w.batsman?.id).filter(id => id) : [];
        console.log('🏏 🔥 AVAILABLE BATSMEN DEBUG: Players out from fallOfWickets (IDs):', outBatsmenIds);
        console.log('🏏 🔥 AVAILABLE BATSMEN DEBUG: Players out from fallOfWickets (names):', currentTeamScore.fallOfWickets?.map(w => w.batsman?.name) || []);
        
        // Check global players for currentMatchStatus = 'out'
        const globalOutPlayers = this.players.filter(p => p.currentMatchStatus === 'out');
        console.log('🏏 🔥 AVAILABLE BATSMEN DEBUG: Global players marked as out:', globalOutPlayers.map(p => ({id: p.id, name: p.name})));
        
        // Return players who are not currently batting and not out
        const availableBatsmen = battingTeam.players.filter(player => {
            // Convert all IDs to strings for comparison
            const playerIdStr = String(parseFloat(player.id));
            const isCurrentlyBatting = currentBatsmenIds.some(id => String(parseFloat(id)) === playerIdStr);
            const isOutFromFallOfWickets = outBatsmenIds.some(id => String(parseFloat(id)) === playerIdStr);
            const isOutFromStatus = player.currentMatchStatus === 'out';
            const isAvailable = !isCurrentlyBatting && !isOutFromFallOfWickets && !isOutFromStatus;
            
            console.log('🏏 🔥 AVAILABLE BATSMEN FILTER:', {
                playerName: player.name,
                playerId: player.id,
                playerIdNormalized: playerIdStr,
                currentBatsmenIds: currentBatsmenIds.map(id => String(parseFloat(id))),
                isCurrentlyBatting,
                isOutFromFallOfWickets,
                isOutFromStatus,
                currentMatchStatus: player.currentMatchStatus,
                isAvailable
            });
            
            return isAvailable;
        });
        
        console.log('🏏 Available batsmen:', availableBatsmen.map(p => ({ id: p.id, name: p.name })));
        return availableBatsmen;
    }

    // Get fielding team players (the team that's bowling)
    getFieldingTeamPlayers() {
        if (!this.currentMatch) {
            console.log('❌ getFieldingTeamPlayers: No current match');
            return [];
        }
        
        // Get the fielding team (opposite of batting team)
        const fieldingTeam = this.currentMatch.currentTeam === 1 ? this.currentMatch.team2 : this.currentMatch.team1;
        
        console.log('🏏 getFieldingTeamPlayers: Fielding team is', this.currentMatch.currentTeam === 1 ? 'team2' : 'team1');
        console.log('🏏 getFieldingTeamPlayers: Fielding team players:', fieldingTeam?.players?.map(p => p.name));
        
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
        
        // FIX: Use currentTeam property for consistent team determination
        // Determine bowling team as the opposite of batting team
        const battingTeam = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team1 : this.currentMatch.team2;
        const bowlingTeam = this.currentMatch.currentTeam === 1 ? 
            this.currentMatch.team2 : this.currentMatch.team1;
            
        console.log('🔧 BOWLER_DEBUG: Team determination:', {
            currentTeam: this.currentMatch.currentTeam,
            team1Batting: this.currentMatch.team1Score.batting,
            battingTeamName: battingTeam?.name,
            bowlingTeamName: bowlingTeam?.name,
            oldMethod_battingFlag: this.currentMatch.team1Score.batting ? 'team1' : 'team2',
            oldMethod_bowlingTeam: this.currentMatch.team1Score.batting ? this.currentMatch.team2?.name : this.currentMatch.team1?.name
        });
        
        console.log('✅ DEBUG: Bowling team determined:', bowlingTeam?.name, 'with', bowlingTeam?.players?.length, 'players');
        
        if (!bowlingTeam || !bowlingTeam.players) {
            console.log('❌ DEBUG: Bowling team not found or no players:', bowlingTeam);
            return;
        }
        
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
                const appInstance = window.cricketApp || window.app;
                if (appInstance && appInstance.players) {
                    selectedBowler = appInstance.players.find(p => p.id === newBowlerId || p.id == newBowlerId || p.id === parseInt(newBowlerId) || p.id === newBowlerId.toString());
                    console.log('✅ Selected bowler found in all players:', selectedBowler); // Debug log
                }
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
                
                // Get the app instance with proper error handling
                const appInstance = window.cricketApp || window.app;
                if (!appInstance) {
                    console.error('❌ Cricket app not initialized during bowler selection');
                    return;
                }
                
                // Update match bowler
                appInstance.currentMatch.bowler = {
                    id: selectedBowler.id,
                    name: selectedBowler.name,
                    matchBowlingRuns: 0,
                    matchBowlingBalls: 0,
                    matchBowlingWickets: 0
                };
                
                console.log('✅ Updated match bowler:', appInstance.currentMatch.bowler); // Debug log
                
                // STEP 1: Clear waiting flag IMMEDIATELY
                console.log('🚫 STEP 1: Clearing waitingForBowlerSelection flag...');
                console.log('  - Before:', appInstance.waitingForBowlerSelection);
                appInstance.waitingForBowlerSelection = false;
                console.log('  - After:', appInstance.waitingForBowlerSelection);
                
                // STEP 2: Re-enable buttons immediately
                console.log('🔓 STEP 2: Enabling scoring buttons immediately...');
                appInstance.enableAllScoringButtons();
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
                    console.log('  - waitingForBowlerSelection:', appInstance.waitingForBowlerSelection);
                    appInstance.enableAllScoringButtons();
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
        
        // Special handling for scoring page to trigger analytics
        if (pageId === 'scoring') {
            console.log('📊 SCORING PAGE DEBUG: Scoring page activated, updating scoring tab view');
            if (window.cricketApp && window.cricketApp.updateScoringTabView) {
                window.cricketApp.updateScoringTabView();
            } else {
                console.error('📊 SCORING PAGE DEBUG: cricketApp or updateScoringTabView not available');
            }
        }
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
    console.log('🟡 Global showAddPlayerModal() called');
    const modal = document.getElementById('addPlayerModal');
    if (modal) {
        modal.style.display = '';  // Clear inline style
        modal.classList.add('active');
        console.log('✅ Global modal opened successfully');
    } else {
        console.error('❌ Global modal element not found');
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
        console.log('🔧 MODAL DEBUG: Attempting to close modal:', modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none'; // Fix: Also hide the modal completely
            console.log('✅ MODAL DEBUG: Modal closed successfully:', modalId);
        } else {
            console.error('❌ MODAL DEBUG: Modal not found:', modalId);
        }
    } catch (error) {
        console.error('❌ MODAL DEBUG: Error closing modal:', error);
    }
}

// Form Handlers
function addPlayer(event) {
    event.preventDefault();
    
    try {
        console.log('addPlayer function called');
        
        const name = document.getElementById('playerName').value;
        const bowlingType = document.getElementById('bowlingType').value;
        const battingStyle = document.getElementById('battingStyle').value;
        const playerType = document.getElementById('playerType').value;
        
        console.log('Form values:', { name, bowlingType, battingStyle, playerType });
        
        // Validate required fields
        if (!name || name.trim() === '') {
            if (window.cricketApp && window.cricketApp.showNotification) {
                window.cricketApp.showNotification('❌ Player name is required');
            } else {
                alert('Player name is required');
            }
            return;
        }
        
        // Get the app instance with proper error handling
        const appInstance = window.cricketApp || window.app;
        if (!appInstance) {
            console.error('❌ Cricket app not initialized');
            alert('App not ready, please try again');
            return;
        }
        
        console.log('Calling appInstance.addPlayer...');
        appInstance.addPlayer(name.trim(), bowlingType, battingStyle, playerType);
        console.log('appInstance.addPlayer completed');
        
        // Reset form
        const form = event.target;
        if (form && typeof form.reset === 'function') {
            form.reset();
            console.log('Form reset completed');
        }
        
        // Close modal with delay to ensure DOM operations complete
        setTimeout(() => {
            try {
                closeModal('addPlayerModal');
                console.log('Modal closed');
            } catch (modalError) {
                console.error('Error closing modal:', modalError);
            }
        }, 100);
        
    } catch (error) {
        console.error('Error in addPlayer function:', error);
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

// Global function for player count update - optimized
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

// Global Functions for HTML onclick handlers
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
            console.error('❌ Cricket app not initialized');
        }
    }
}

function generateBalancedTeams() {
    const appInstance = window.cricketApp || window.app;
    if (appInstance) {
        appInstance.generateBalancedTeams();
    } else {
        console.error('❌ Cricket app not initialized');
    }
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
            
            // Add input event listener to track changes in real-time
            nameInput.addEventListener('input', function() {
                console.log('🎯 REAL-TIME: Input value changed to:', `"${nameInput.value}"`);
            });
            
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
    // Get the correct input elements from the edit modal (using actual HTML IDs)
    const editModal = document.getElementById('editPlayerModal');
    const nameInput = editModal ? editModal.querySelector('#playerName') : null;
    const bowlingSelect = editModal ? editModal.querySelector('#bowlingType') : null;
    const battingSelect = editModal ? editModal.querySelector('#battingStyle') : null;
    const playerTypeSelect = editModal ? editModal.querySelector('#playerType') : null;
    
    console.log('🔧 Saving player changes for ID:', playerId);
    
    // IMMEDIATE input check when save function starts
    console.log('🔧 SAVE START - Input state check:', {
        modalExists: !!editModal,
        nameInputExists: !!nameInput,
        currentInputValue: nameInput ? `"${nameInput.value}"` : 'NO INPUT',
        inputValueLength: nameInput ? nameInput.value.length : 0
    });
    
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
    
    console.log('🔧 Found player:', player.name);
    
    // Get the name value - use input if available and has value, otherwise use original player name
    let playerName = '';
    console.log('🔧 Input element check:', {
        nameInputExists: !!nameInput,
        nameInputValue: nameInput ? nameInput.value : 'NO INPUT',
        inputValueLength: nameInput ? nameInput.value.length : 0,
        inputValueTrimmed: nameInput ? nameInput.value.trim() : 'NO INPUT',
        originalPlayerName: player.name || player.Name || ''
    });
    
    // Force read the input value directly
    const inputValue = nameInput ? nameInput.value : '';
    console.log('🔧 Direct input value read:', JSON.stringify(inputValue));
    console.log('🔧 Input value type:', typeof inputValue);
    console.log('🔧 Input value === empty string:', inputValue === '');
    console.log('🔧 Input value length:', inputValue.length);
    
    if (nameInput && inputValue && inputValue.trim() && inputValue.trim() !== '') {
        playerName = inputValue.trim();
        console.log('🔧 Using new name from input:', playerName);
    } else {
        playerName = player.name || player.Name || ''; 
        console.log('🔧 Using original player name:', playerName);
        console.log('🔧 Fallback reason - nameInput exists:', !!nameInput);
        console.log('🔧 Fallback reason - inputValue exists:', !!inputValue);
        console.log('🔧 Fallback reason - inputValue trimmed:', inputValue ? inputValue.trim() : 'NO VALUE');
    }
    
    if (!playerName) {
        console.error('❌ No valid player name found');
        appInstance.showNotification('❌ Player name cannot be empty');
        return;
    }
    
    console.log('🔧 Updating player data...');
    
    // Update player data
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
    
    console.log('🔧 Player updated:', {
        oldName: oldName,
        newName: player.name,
        bowling: player.bowling,
        batting: player.batting,
        is_star: player.is_star
    });
    
    // Log the exact player object after update
    console.log('🔧 Complete updated player object:', JSON.stringify(player, null, 2));
    
    // Check if the player exists in the main array
    const foundInArray = appInstance.players.find(p => p.id === playerId);
    console.log('🔧 Player found in main array after update:', foundInArray ? foundInArray.name : 'NOT FOUND');
    
    // Use the app's proper save method instead of just localStorage
    try {
        // Save using the app's data persistence method
        appInstance.saveData(true); // Create JSON backup when editing player (player info change)
        console.log('✅ Data saved using app saveData method');
        
        // Force refresh of all UI components immediately
        appInstance.updateStats();
        appInstance.loadPlayers();
        appInstance.loadTeams();
        
        // Close modal
        closeEditPlayerModal();
        
        // Show success message
        appInstance.showNotification(`✅ ${player.name} updated successfully!`);
        
        console.log('✅ Player update completed successfully');
        
    } catch (error) {
        console.error('❌ Error saving player data:', error);
        appInstance.showNotification('❌ Error saving changes: ' + error.message);
    }
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
        // Try to use the data manager save system first
        if (window.cricketApp && window.cricketApp.dataManager && window.cricketApp.dataManager.saveJSONData) {
            // Convert cricketStatsData to app format and use data manager
            const appData = {
                players: window.cricketApp.players || [],
                matches: window.cricketApp.matches || [],
                teams: window.cricketApp.teams || []
            };
            
            window.cricketApp.dataManager.saveJSONData(appData).then(() => {
                console.log('✅ Used data manager save successfully');
                if (window.cricketApp && window.cricketApp.showNotification) {
                    window.cricketApp.showNotification('📁 Data updated using data manager (server unavailable)');
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
    
    // Automatically switch to scoring tab when match starts
    if (typeof showPage === 'function') {
        showPage('scoring');
        console.log('🎯 Automatically switched to scoring tab from match setup');
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
window.updateSelectedPlayerCountInline = function() {
    // Direct implementation to avoid recursion
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
    console.log('🔵 proceedToCaptainSelectionInline called');
    const checkedBoxes = document.querySelectorAll('input[name="todayPlayers"]:checked');
    console.log('🔍 Found checked boxes:', checkedBoxes.length);
    
    if (checkedBoxes.length < 4) {
        window.cricketApp.showNotification('❌ Please select at least 4 players');
        return;
    }
    
    // Get selected player objects
    const selectedPlayerIds = Array.from(checkedBoxes).map(cb => cb.value.toString());
    console.log('🔍 Selected player IDs:', selectedPlayerIds);
    console.log('🔍 Available players:', window.cricketApp.players.map(p => `${p.id}:${p.name}`));
    
    const selectedPlayers = window.cricketApp.players.filter(p => selectedPlayerIds.includes(p.id.toString()));
    console.log('🔍 Selected players:', selectedPlayers.map(p => p.name));
    
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
    // Save the temporarily stored teams to permanent teams
    if (window.cricketApp.tempTeams) {
        // Clear existing teams and add the current teams
        window.cricketApp.teams = [...window.cricketApp.tempTeams];
        window.cricketApp.saveData(false); // Save to localStorage
        
        // Clear temporary teams and saved teams from localStorage since they're now permanent
        window.cricketApp.tempTeams = null;
        localStorage.removeItem('savedTeams');
        
        // Show teams with toss button
        window.cricketApp.loadTeams();
        window.cricketApp.showNotification('🎉 Teams are ready! Click TOSS to start the match!');
    } else {
        window.cricketApp.showNotification('❌ No teams to confirm!');
    }
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

// Initialize the cricket app
window.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Content Loaded, initializing cricket app...');
    window.cricketApp = new CricketApp();
    console.log('✅ Cricket app initialized:', window.cricketApp);

    // Set up global analytics engine reference
    window.analyticsEngine = window.cricketApp.analytics;
    console.log('✅ Analytics engine available globally:', !!window.analyticsEngine);

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
                console.log('🏏 FORCE LOADING match history after DOM ready...');
                if (window.cricketApp && window.cricketApp.loadMatchHistory) {
                    window.cricketApp.loadMatchHistory();
                } else {
                    console.error('❌ loadMatchHistory method not found on cricketApp');
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

// Create global app reference for backward compatibility
window.app = window.cricketApp;

// Toss Functionality - Inline Display
function startToss() {
    console.log('🎯 startToss() called');
    
    try {
        const teams = getCurrentTeams();
        console.log('Teams found:', teams.length);
        
        if (teams.length !== 2) {
            console.log('❌ Not exactly 2 teams');
            showMessage('Need exactly 2 teams for toss!', 'error');
            return;
        }

        // Find the toss button container and create inline toss display
        const tossButton = document.getElementById('main-toss-btn') || document.querySelector('.toss-btn');
        console.log('Toss button found:', !!tossButton);
        
        if (!tossButton) {
            console.error('❌ Toss button not found!');
            showMessage('Toss button not found!', 'error');
            return;
        }
        
        const tossContainer = tossButton.parentElement;
        console.log('Toss container found:', !!tossContainer);
        
        // Remove existing toss result if any
        const existingTossResult = document.getElementById('toss-result-container');
        if (existingTossResult) {
            existingTossResult.remove();
            console.log('Removed existing toss result');
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
        console.log('Toss result container inserted');

        // Hide the toss button
        tossButton.style.display = 'none';

        // Animate coin flip
        const coinAnimation = document.getElementById('coin-animation');
        const tossStatus = document.getElementById('toss-status');
        const tossResult = document.getElementById('toss-result');
        
        console.log('Starting coin animation');
        
        // Spin the coin
        let rotations = 0;
        const spinInterval = setInterval(() => {
            rotations += 180;
            coinAnimation.style.transform = `rotateY(${rotations}deg)`;
        }, 100);

        // After 2 seconds, show result
        setTimeout(() => {
            console.log('Showing toss result');
            clearInterval(spinInterval);
            
            // Randomly select winning team
            const winningTeam = teams[Math.floor(Math.random() * 2)];
            console.log('Winning team:', winningTeam.name);
            
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
            
            // Get fresh references after cloning
            const newBatButton = document.getElementById('bat-first');
            const newBowlButton = document.getElementById('bowl-first');
            const newBackButton = document.getElementById('back-to-toss');

            // Add mobile-friendly event listeners
            ['click', 'touchend'].forEach(eventType => {
                newBatButton.addEventListener(eventType, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Bat first chosen');
                    highlightChoice('bat-first');
                    startMatchWithChoice(winningTeam, 'bat');
                }, { passive: false });

                newBowlButton.addEventListener(eventType, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Bowl first chosen');
                    highlightChoice('bowl-first');
                    startMatchWithChoice(winningTeam, 'bowl');
                }, { passive: false });

                newBackButton.addEventListener(eventType, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Back to toss chosen');
                    backToToss();
                }, { passive: false });
            });
            
        }, 2000);
        
    } catch (error) {
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
    try {
        console.log('🔍 Getting current teams...');
        
        // First try the main app instance
        if (window.cricketApp && window.cricketApp.teams && window.cricketApp.teams.length > 0) {
            console.log('✅ Teams found in cricketApp:', window.cricketApp.teams.length);
            return window.cricketApp.teams;
        }
        
        // Fallback to global app
        if (window.app && window.app.teams && window.app.teams.length > 0) {
            console.log('✅ Teams found in global app:', window.app.teams.length);
            return window.app.teams;
        }
        
        // Try localStorage as fallback
        const teamsData = localStorage.getItem('cricket-teams');
        if (teamsData) {
            const teams = JSON.parse(teamsData);
            if (teams && teams.length > 0) {
                console.log('✅ Teams found in localStorage:', teams.length);
                return teams;
            }
        }
        
        console.log('❌ No teams found in any location');
        return [];
        
    } catch (error) {
        console.error('❌ Error getting teams:', error);
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
}

function toggleBatsmanSelection(playerId, playerName) {
    // Wait a bit for DOM to be ready if needed
    setTimeout(() => {
        // Find button by checking all buttons
        const allButtons = document.querySelectorAll('[data-player-id]');
        let button = null;
        
        for (const btn of allButtons) {
            const btnId = btn.getAttribute('data-player-id');
            if (btnId == playerId) {
                button = btn;
                break;
            }
        }
        
        const confirmButton = document.getElementById('confirm-batsmen');
        const summaryDiv = document.getElementById('selection-summary');
        const selectedPlayersList = document.getElementById('selected-players-list');
        
        // Check if button exists before accessing its properties
        if (!button) {
            console.error('❌ Button not found for player ID:', playerId);
            console.log('🔍 Available buttons:', document.querySelectorAll('[data-player-id]').length);
            console.log('🔍 Player selection container exists:', !!document.getElementById('player-selection-container'));
            
            // Debug: show all available player IDs
            const allButtons = document.querySelectorAll('[data-player-id]');
            console.log('🔍 All available player IDs:', Array.from(allButtons).map(btn => btn.getAttribute('data-player-id')));
            console.log('🔍 Looking for player ID:', playerId, 'Type:', typeof playerId);
            return;
        }
        
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
        
        // Update summary display - with null checks
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
        
        // Enable/disable confirm button - with null check
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
}

function selectBowler(playerId, playerName) {
    // Clear previous selection
    document.querySelectorAll('.bowler-btn').forEach(btn => {
        btn.style.background = 'rgba(255,255,255,0.1)';
        btn.style.borderColor = 'rgba(255,255,255,0.3)';
        btn.style.transform = 'scale(1)';
    });
    
    // Highlight selected bowler with darker blue
    const button = findPlayerButton(playerId);
    if (button) {
        button.style.background = '#1d4ed8';
        button.style.borderColor = '#1d4ed8';
        button.style.transform = 'scale(1.05)';
    }
    
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
            const button = findPlayerButton(batsman.id);
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
                    const displayTeamScore = currentMatch.currentTeam === 1 ? 
                        currentMatch.team1Score : currentMatch.team2Score;
                    
                    console.log('Current match data for display:', {
                        team: currentMatch.team1?.name,
                        striker: displayTeamScore.striker?.name,
                        nonStriker: displayTeamScore.nonStriker?.name,
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
                    
                    if (strikerNameEl && displayTeamScore.striker) {
                        strikerNameEl.textContent = displayTeamScore.striker.name;
                        console.log('FORCED: Updated striker to:', displayTeamScore.striker.name);
                    } else {
                        console.error('FAILED: Failed to update striker - element or data missing');
                    }
                    
                    if (nonStrikerNameEl && displayTeamScore.nonStriker) {
                        nonStrikerNameEl.textContent = displayTeamScore.nonStriker.name;
                        console.log('FORCED: Updated non-striker to:', displayTeamScore.nonStriker.name);
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





// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log(' SW registered'))
            .catch(error => console.log(' SW registration failed'));
    });
}
