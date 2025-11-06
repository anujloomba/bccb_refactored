// Player Comparison Container Template
exports.playerComparisonContainer = `
<div class="player-comparison-container">
    <div class="comparison-selectors">
        <div class="comparison-selector">
            <label>Player 1</label>
            <select id="scoringPlayer1Select" onchange="window.cricketApp.updateScoringSpiderChart();" style="color: #00ff88; font-weight: bold; background-color: #1a1a1a;">
                <option value="" style="color: #ffffff;">Select Player 1</option>
                ${'${player1Options}'}
            </select>
        </div>
        <div class="comparison-selector">
            <label>Player 2</label>
            <select id="scoringPlayer2Select" onchange="window.cricketApp.updateScoringSpiderChart();" style="color: #00ccff; font-weight: bold; background-color: #1a1a1a;">
                <option value="" style="color: #ffffff;">Select Player 2</option>
                ${'${player2Options}'}
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
</div>`;

// Spider Chart Container Template
exports.spiderChartContainer = `
<div class="spider-chart">
    <canvas id="${'${canvasId}'}" width="400" height="400"></canvas>
</div>`;
// Player Analytics Card Template
exports.playerAnalyticsCard = `
<div class="player-analytics-card" onclick="window.cricketApp.showAdvancedPlayerDetails('${'${playerName}'}')">
    <div class="player-rank">${'${playerRank}'}</div>
    <div class="player-info">${'${cardBody}'}</div>
</div>`;

// Analytics Grid Container Template
exports.analyticsGridContainer = `
<div class="analytics-grid-container">
    ${'${playerCards}'}
</div>`;
// Stats row for performance tables
const statsRow = `<div class="stats-row ${'${rowClass}'}"><span class="player-name">${'${playerName}'}</span><span class="metric-value">${'${metricValue}'}</span></div>`;
Templates.statsRow = statsRow;
// Player analytics card body (for use inside playerAnalyticsCard)
const playerAnalyticsCardBody = `
    <div class="player-name">${'${playerName}'}</div>
    <div class="player-role">${'${playerRole}'}</div>
    <div class="performance-rating">
        <span style="font-size: 12px; color: rgba(255,255,255,0.8);">Performance:</span>
        <div class="rating-bar">
            <div class="rating-fill ${'${ratingClass}'}" style="width: ${'${performanceRating}%'}"></div>
        </div>
        <span style="font-size: 12px; color: white; font-weight: bold;">${'${performanceRatingValue}'}</span>
    </div>
    <div class="player-stats">
        <div class="stat-item"><span class="stat-label">Runs:</span><span class="stat-value">${'${runs}'}</span></div>
        <div class="stat-item"><span class="stat-label">Avg:</span><span class="stat-value">${'${avg}'}</span></div>
        <div class="stat-item"><span class="stat-label">SR:</span><span class="stat-value">${'${sr}'}</span></div>
        <div class="stat-item"><span class="stat-label">Wickets:</span><span class="stat-value">${'${wickets}'}</span></div>
        <div class="stat-item"><span class="stat-label">Form:</span><span class="stat-value">${'${formIndex}'}</span></div>
        <div class="stat-item"><span class="stat-label">Matches:</span><span class="stat-value">${'${matches}'}</span></div>
    </div>
    <div class="performance-indicators"><div class="indicator ${'${indicatorClass}'}">${'${indicatorIcon}'}</div></div>
`;

Templates.playerAnalyticsCardBody = playerAnalyticsCardBody;
// Analytics grid container for player cards
const analyticsGridContainer = `
    <div style="margin-top: 30px;">
        <h3 style="color: #00ff41; margin-bottom: 20px; text-align: center;">🏆 Player Rankings</h3>
        <div class="analytics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
            ${'${playerCards}'}
        </div>
    </div>
`;

Templates.analyticsGridContainer = analyticsGridContainer;
// This file contains all embedded HTML templates and UI snippets extracted from app.js
// Usage: Import or require this file in app.js and reference the templates as needed.

const Templates = {
    noMatchHistory: '<div class="no-matches">No match history available</div>',
    errorMatchHistory: '<div class="no-matches">Error loading match history</div>',
    matchHistoryItem: `
        <div class="match-history-item">
            <div class="match-summary">
                <div class="match-teams">${'${winningCaptain}'} vs ${'${losingCaptain}'}</div>
            </div>
        </div>
    `,
    performanceStatsSection: `
        <div class="performance-stats-section">
            <div class="sort-controls">
                <label for="performanceSort">Sort by:</label>
                <select id="performanceSort" onchange="window.cricketApp.updatePerformanceSort(this.value)">
                    <!-- options here -->
                </select>
            </div>
            <div id="performanceStatsGrid" class="performance-grid">
                <!-- Stats will be loaded here -->
            </div>
        </div>
    `,
    performanceCard: `
        <div class="performance-card full-width">
            <h4>📊 ${'${this.getMetricDisplayName(sortBy)}'}</h4>
            <div class="stats-table">
                <div class="stats-header">
                    <span>Player</span>
                    <span>${'${this.getMetricDisplayName(sortBy)}'}</span>
                </div>
                <!-- rows here -->
            </div>
        </div>
    `,
    noPlayersMetric: `
        <div class="stats-row">
            <span class="player-name" style="text-align: center; grid-column: 1 / -1;">No players meet the minimum requirements for this metric</span>
        </div>
    `,
    analyticsEmpty: `
        <div class="analytics-empty" style="margin-top: 20px;">
            <h5>📊 No Player Data Available</h5>
            <p>Start playing matches to see detailed player analytics</p>
        </div>
    `,
    playerAnalyticsCard: `
        <div class="player-analytics-card" onclick="window.cricketApp.showAdvancedPlayerDetails('${'${player.name}'}')">
            <div class="player-rank">${'${index + 1}'}</div>
            <div class="player-info">
                <!-- player info here -->
            </div>
        </div>
    `
};

if (typeof module !== 'undefined') {
    module.exports = Templates;
}
