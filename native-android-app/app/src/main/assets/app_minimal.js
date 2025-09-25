// Cricket PWA - Minimal Working Version
// Global debug flag
const DEBUG_MODE = true;

// Simple utility functions
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

// Simple message display function
function showMessage(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    try {
        if (window.cricketApp && window.cricketApp.showNotification) {
            window.cricketApp.showNotification(message);
        }
    } catch (e) {
        }
}

// Essential Cricket App Class
class CricketApp {
    constructor() {
        this.players = [];
        this.matches = [];
        this.teams = [];
        this.currentMatch = null;
        this.tempTeams = null;
        
        // Load data from localStorage
        this.loadFromLocalStorage();
        
        }

    loadFromLocalStorage() {
        try {
            const savedPlayers = localStorage.getItem('cricket-players');
            if (savedPlayers) {
                this.players = JSON.parse(savedPlayers);
                }

            const savedMatches = localStorage.getItem('cricket-matches');
            if (savedMatches) {
                this.matches = JSON.parse(savedMatches);
                }

            const savedTeams = localStorage.getItem('cricket-teams');
            if (savedTeams) {
                this.teams = JSON.parse(savedTeams);
                }

            const savedCurrentMatch = localStorage.getItem('cricket-current-match');
            if (savedCurrentMatch && savedCurrentMatch !== 'null') {
                this.currentMatch = JSON.parse(savedCurrentMatch);
                }
        } catch (error) {
            }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('cricket-players', JSON.stringify(this.players));
            localStorage.setItem('cricket-matches', JSON.stringify(this.matches));
            localStorage.setItem('cricket-teams', JSON.stringify(this.teams));
            if (this.currentMatch) {
                localStorage.setItem('cricket-current-match', JSON.stringify(this.currentMatch));
            }
            } catch (error) {
            }
    }

    showNotification(message) {
        // Simple notification display
        try {
            let notificationEl = document.getElementById('notification');
            if (!notificationEl) {
                notificationEl = document.createElement('div');
                notificationEl.id = 'notification';
                notificationEl.style.cssText = `
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #2563eb;
                    color: white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    z-index: 1000;
                    max-width: 90%;
                    text-align: center;
                `;
                document.body.appendChild(notificationEl);
            }
            
            notificationEl.textContent = message;
            notificationEl.style.display = 'block';
            
            setTimeout(() => {
                notificationEl.style.display = 'none';
            }, 3000);
        } catch (error) {
            }
    }

    updateScoreDisplay() {
        // Basic score display update
        try {
            if (this.currentMatch) {
                const team1Score = this.currentMatch.team1Score || { runs: 0, wickets: 0, overs: 0 };
                const team2Score = this.currentMatch.team2Score || { runs: 0, wickets: 0, overs: 0 };
                
                }
        } catch (error) {
            }
    }

    getAvailableBatsmen() {
        try {
            if (!this.currentMatch) {
                return [];
            }

            const battingTeam = this.currentMatch.currentTeam === 1 ? 
                this.currentMatch.team1 : this.currentMatch.team2;
            
            if (!battingTeam || !battingTeam.players) {
                return [];
            }

            // Return all players for now - simplified logic
            return battingTeam.players;
        } catch (error) {
            return [];
        }
    }
}

// Define critical global functions immediately
window.showPage = window.showPage || function(pageId) {
    try {
        // Hide all content sections
        const contentSections = document.querySelectorAll('.content');
        contentSections.forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        
        // Show the requested section
        const targetSection = document.getElementById(pageId);
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.style.display = 'block';
            } else {
            }
        
        // Update navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        
        const targetNavItem = document.querySelector(`[onclick="showPage('${pageId}')"]`) || 
                              document.querySelector(`a[href="#${pageId}"]`);
        if (targetNavItem) {
            targetNavItem.classList.add('active');
        }
    } catch (error) {
        }
};

// Initialize the app when DOM is ready
window.addEventListener('DOMContentLoaded', function() {
    try {
        window.cricketApp = new CricketApp();
        window.app = window.cricketApp; // Backward compatibility
        } catch (error) {
        }
});

// Backup initialization attempts
setTimeout(function() {
    if (!window.cricketApp) {
        try {
            window.cricketApp = new CricketApp();
            window.app = window.cricketApp;
            } catch (error) {
            }
    } else {
        }
}, 1000);

setTimeout(function() {
    if (!window.cricketApp) {
        } else {
        }
}, 2000);

