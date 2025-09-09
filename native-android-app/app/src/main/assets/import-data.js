// Direct data import script for BCCB integration
// This script loads your cricket data directly into localStorage

async function importBCCBData() {
    try {
        console.log('🏏 Starting BCCB data import...');
        
        // Load the combined JSON file
        const response = await fetch('./cricket_stats.json');
        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Loaded data structure:', data);
        
        // Store the entire cricket stats data
        localStorage.setItem('cricket-stats', JSON.stringify(data));
        
        // Store metadata
        const metadata = {
            imported: new Date().toISOString(),
            source: 'Cricket Stats JSON',
            playerCount: data.player_info ? data.player_info.length : 0,
            matchCount: data.matches ? data.matches.length : 0
        };
        localStorage.setItem('cricket-metadata', JSON.stringify(metadata));
        
        console.log('✅ Cricket stats data imported successfully:');
        console.log(`   - ${data.player_info ? data.player_info.length : 0} players`);
        console.log(`   - ${data.matches ? data.matches.length : 0} matches`);
        console.log(`   - ${data.match_batting_performance ? data.match_batting_performance.length : 0} batting records`);
        console.log(`   - ${data.match_bowling_performance ? data.match_bowling_performance.length : 0} bowling records`);
        
        return data;
        
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
