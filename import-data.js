// Direct data import script for BCCB integration
// This script loads your cricket data directly into localStorage

async function importBCCBData() {
    try {
        console.log('🏏 Starting BCCB data import...');
        
        // Load the combined JSON file
        const response = await fetch('./cricket_players.json');
        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Loaded data structure:', data);
        
        // Extract players, matches, teams
        const players = data.players || [];
        const matches = data.matches || [];
        const teams = data.teams || [];
        
        // Store in localStorage
        localStorage.setItem('cricket-players', JSON.stringify(players));
        localStorage.setItem('cricket-matches', JSON.stringify(matches));
        localStorage.setItem('cricket-teams', JSON.stringify(teams));
        
        // Store metadata
        const metadata = {
            imported: new Date().toISOString(),
            source: 'BCCB CSV conversion',
            playerCount: players.length,
            matchCount: matches.length
        };
        localStorage.setItem('cricket-metadata', JSON.stringify(metadata));
        
        console.log('✅ BCCB data imported successfully:');
        console.log(`   - ${players.length} players`);
        console.log(`   - ${matches.length} matches`);
        console.log(`   - ${teams.length} teams`);
        
        return { players, matches, teams };
        
    } catch (error) {
        console.error('❌ BCCB data import failed:', error);
        throw error;
    }
}

// Auto-import when script loads
importBCCBData().then(() => {
    console.log('🎯 Data ready for Cricket PWA');
}).catch(error => {
    console.error('💥 Import failed:', error);
});
