// Clear All Match and Performance Data Script
// Run this in browser console while logged into the app
// This will remove all matches and performance data from both local and D1

async function clearAllMatchData() {
    console.log('🗑️ ===== CLEARING ALL MATCH DATA =====');
    console.log('⚠️  WARNING: This will delete ALL matches and performance data!\n');
    
    if (!window.cricketApp) {
        console.error('❌ Cricket app not loaded. Please load the app first.');
        return;
    }
    
    const groupId = window.cricketApp.authManager.getCurrentGroupId();
    const groupName = window.cricketApp.authManager.getCurrentGroupName();
    
    if (groupName === 'guest') {
        console.error('❌ Cannot clear data for guest group');
        return;
    }
    
    console.log(`📍 Group: ${groupName} (ID: ${groupId})\n`);
    
    try {
        // Get current data
        console.log('📥 Fetching current data...');
        const matches = window.cricketApp.matches || [];
        const players = window.cricketApp.players || [];
        
        console.log(`📊 Current data:`);
        console.log(`   - ${matches.length} matches`);
        console.log(`   - ${players.length} players (will be preserved)\n`);
        
        if (matches.length === 0) {
            console.log('✅ No matches to clear!');
            return;
        }
        
        // List matches that will be deleted
        console.log('🗑️  Matches to be deleted:');
        matches.forEach(match => {
            console.log(`   - Match ${match.id}: ${match.team1?.name || match.Team1} vs ${match.team2?.name || match.Team2}`);
        });
        console.log('');
        
        // Clear local matches
        console.log('🗑️  Clearing local match data...');
        window.cricketApp.matches = [];
        
        // Save to localStorage
        console.log('💾 Saving to localStorage...');
        const storageKey = `cricketData_${groupName}`;
        const existingData = JSON.parse(localStorage.getItem(storageKey) || '{}');
        existingData.matches = [];
        localStorage.setItem(storageKey, JSON.stringify(existingData));
        
        console.log('✅ Local data cleared!\n');
        
        // Prepare D1 sync payload (only players, no matches)
        console.log('🚀 Preparing to sync to D1 (removing all matches)...');
        const syncPayload = {
            players: players.map(p => ({
                Player_ID: String(p.id),
                Name: p.name,
                Batting: p.batting,
                Bowling: p.bowling,
                Is_Star: p.is_star ? 1 : 0
            })),
            matches: [],  // Empty matches array
            performance_data: []  // Empty performance data
        };
        
        console.log(`📦 Sync payload:`);
        console.log(`   - ${syncPayload.players.length} players (preserved)`);
        console.log(`   - ${syncPayload.matches.length} matches (cleared)`);
        console.log(`   - ${syncPayload.performance_data.length} performance records (cleared)\n`);
        
        // Ask for confirmation
        console.log('⚠️  CONFIRMATION REQUIRED ⚠️');
        console.log('This will DELETE all matches and performance data from D1.');
        console.log('Players will be preserved.');
        console.log('\nRun the following command to proceed:\n');
        console.log('window.confirmClearSync(syncPayload, groupId);\n');
        
        // Store for confirmation
        window.clearSyncPayload = syncPayload;
        window.clearGroupId = groupId;
        window.deletedMatchCount = matches.length;
        
    } catch (error) {
        console.error('❌ Error during clearing:', error);
        console.error(error.stack);
    }
}

// Confirmation function
window.confirmClearSync = async function() {
    console.log('\n🚀 ===== EXECUTING D1 SYNC (CLEARING DATA) =====\n');
    
    const payload = window.clearSyncPayload;
    const groupId = window.clearGroupId;
    const deletedCount = window.deletedMatchCount;
    
    if (!payload || !groupId) {
        console.error('❌ No pending clear operation. Run clearAllMatchData() first.');
        return;
    }
    
    try {
        console.log('📤 Syncing empty match data to D1...');
        const result = await window.cricketApp.d1Manager.syncToD1(groupId, payload);
        
        console.log('\n✅ ===== SYNC COMPLETE =====');
        console.log('Result:', result);
        console.log(`\n🎉 Successfully deleted ${deletedCount} matches and all performance data!`);
        console.log('✅ Players preserved in database.');
        
        // Clean up
        delete window.clearSyncPayload;
        delete window.clearGroupId;
        delete window.deletedMatchCount;
        
        console.log('\n✅ All match data cleared!');
        console.log('🔄 Refresh the page to see the updated state.');
        
    } catch (error) {
        console.error('\n❌ Sync failed:', error);
        console.error(error.stack);
    }
};

// Make function available globally
window.clearAllMatchData = clearAllMatchData;

console.log('✅ Clear data script loaded!');
console.log('📋 Run: clearAllMatchData()');
console.log('⚠️  This will delete ALL matches and performance data (players will be preserved)');
