// One-Time D1 Data Imputation Script
// Run this in browser console while logged into the app
// This will fix NULL captain values in existing D1 matches

async function imputeD1NullValues() {
    console.log('🔧 ===== D1 NULL VALUE IMPUTATION SCRIPT =====');
    console.log('🔧 Starting one-time data repair...\n');
    
    if (!window.cricketApp) {
        console.error('❌ Cricket app not loaded. Please load the app first.');
        return;
    }
    
    const groupId = window.cricketApp.authManager.getCurrentGroupId();
    const groupName = window.cricketApp.authManager.getCurrentGroupName();
    
    if (groupName === 'guest') {
        console.error('❌ Cannot impute data for guest group');
        return;
    }
    
    console.log(`📍 Group: ${groupName} (ID: ${groupId})\n`);
    
    try {
        // Fetch current D1 data
        console.log('📥 Fetching existing D1 data...');
        const d1Data = await window.cricketApp.d1Manager.syncFromD1(groupId);
        
        if (!d1Data || !d1Data.matches) {
            console.error('❌ No match data found in D1');
            return;
        }
        
        console.log(`✅ Fetched ${d1Data.matches.length} matches from D1\n`);
        
        // Get all players for reference
        const players = d1Data.player_info || [];
        const playerMap = new Map(players.map(p => [String(p.Player_ID), p.Name]));
        
        console.log(`📋 Available players: ${players.length}`);
        players.forEach(p => console.log(`   - ${p.Name} (ID: ${p.Player_ID})`));
        console.log('');
        
        // Identify matches with NULL values
        const matchesNeedingRepair = [];
        
        d1Data.matches.forEach(match => {
            const issues = [];
            
            // Check for NULL captains
            if (!match.Team1_Captain || match.Team1_Captain === 'null' || match.Team1_Captain === '') {
                issues.push('Team1_Captain is NULL');
            }
            if (!match.Team2_Captain || match.Team2_Captain === 'null' || match.Team2_Captain === '') {
                issues.push('Team2_Captain is NULL');
            }
            
            // Check for empty compositions
            const t1Comp = match.Team1_Composition;
            const t2Comp = match.Team2_Composition;
            
            if (!t1Comp || t1Comp === '[]' || t1Comp === 'null') {
                issues.push('Team1_Composition is empty');
            }
            if (!t2Comp || t2Comp === '[]' || t2Comp === 'null') {
                issues.push('Team2_Composition is empty');
            }
            
            // Check for NULL winning/losing captains
            if (!match.Winning_Captain || match.Winning_Captain === 'null' || match.Winning_Captain === '') {
                issues.push('Winning_Captain is NULL');
            }
            if (!match.Losing_Captain || match.Losing_Captain === 'null' || match.Losing_Captain === '') {
                issues.push('Losing_Captain is NULL');
            }
            
            if (issues.length > 0) {
                matchesNeedingRepair.push({ match, issues });
            }
        });
        
        console.log(`🔍 Found ${matchesNeedingRepair.length} matches needing repair:\n`);
        
        if (matchesNeedingRepair.length === 0) {
            console.log('✅ All matches have complete data. No repair needed!');
            return;
        }
        
        // Display matches needing repair
        matchesNeedingRepair.forEach(({ match, issues }) => {
            console.log(`📋 Match ${match.Match_ID}: ${match.Team1} vs ${match.Team2}`);
            issues.forEach(issue => console.log(`   ⚠️ ${issue}`));
            console.log('');
        });
        
        // Impute missing values
        const repairedMatches = matchesNeedingRepair.map(({ match, issues }) => {
            console.log(`🔧 REPAIRING Match ${match.Match_ID}: ${match.Team1} vs ${match.Team2}`);
            
            const repaired = { ...match };
            let changesMade = [];
            
            // Parse compositions
            let team1Players = [];
            let team2Players = [];
            
            try {
                team1Players = match.Team1_Composition ? JSON.parse(match.Team1_Composition) : [];
            } catch (e) {
                console.log(`   ⚠️ Could not parse Team1_Composition`);
            }
            
            try {
                team2Players = match.Team2_Composition ? JSON.parse(match.Team2_Composition) : [];
            } catch (e) {
                console.log(`   ⚠️ Could not parse Team2_Composition`);
            }
            
            // Try to get captains from performance data
            const matchPerf = d1Data.match_batting_performance?.filter(p => p.Match_ID === match.Match_ID) || [];
            const matchBowling = d1Data.match_bowling_performance?.filter(p => p.Match_ID === match.Match_ID) || [];
            
            // Get all players who participated
            const allParticipants = new Set([
                ...matchPerf.map(p => String(p.Player_ID)),
                ...matchBowling.map(p => String(p.Player_ID))
            ]);
            
            console.log(`   📊 Found ${allParticipants.size} participants in performance data`);
            
            // Impute Team1_Captain
            if (!repaired.Team1_Captain || repaired.Team1_Captain === 'null' || repaired.Team1_Captain === '') {
                // Try to find captain from team name
                const team1NameMatch = match.Team1?.match(/Team (\w+)/);
                if (team1NameMatch) {
                    const captainName = team1NameMatch[1];
                    const captain = players.find(p => p.Name.toLowerCase() === captainName.toLowerCase());
                    if (captain) {
                        repaired.Team1_Captain = String(captain.Player_ID);
                        changesMade.push(`Team1_Captain: ${captain.Name} (${captain.Player_ID})`);
                    }
                }
                
                // Fallback: use first player in composition or first participant
                if (!repaired.Team1_Captain || repaired.Team1_Captain === '') {
                    if (team1Players.length > 0) {
                        repaired.Team1_Captain = String(team1Players[0]);
                        const name = playerMap.get(repaired.Team1_Captain) || 'Unknown';
                        changesMade.push(`Team1_Captain: ${name} (${repaired.Team1_Captain}) [from composition]`);
                    } else if (allParticipants.size > 0) {
                        repaired.Team1_Captain = Array.from(allParticipants)[0];
                        const name = playerMap.get(repaired.Team1_Captain) || 'Unknown';
                        changesMade.push(`Team1_Captain: ${name} (${repaired.Team1_Captain}) [from participants]`);
                    }
                }
            }
            
            // Impute Team2_Captain
            if (!repaired.Team2_Captain || repaired.Team2_Captain === 'null' || repaired.Team2_Captain === '') {
                // Try to find captain from team name
                const team2NameMatch = match.Team2?.match(/Team (\w+)/);
                if (team2NameMatch) {
                    const captainName = team2NameMatch[1];
                    const captain = players.find(p => p.Name.toLowerCase() === captainName.toLowerCase());
                    if (captain) {
                        repaired.Team2_Captain = String(captain.Player_ID);
                        changesMade.push(`Team2_Captain: ${captain.Name} (${captain.Player_ID})`);
                    }
                }
                
                // Fallback: use first player in composition or second participant
                if (!repaired.Team2_Captain || repaired.Team2_Captain === '') {
                    if (team2Players.length > 0) {
                        repaired.Team2_Captain = String(team2Players[0]);
                        const name = playerMap.get(repaired.Team2_Captain) || 'Unknown';
                        changesMade.push(`Team2_Captain: ${name} (${repaired.Team2_Captain}) [from composition]`);
                    } else if (allParticipants.size > 1) {
                        repaired.Team2_Captain = Array.from(allParticipants)[1];
                        const name = playerMap.get(repaired.Team2_Captain) || 'Unknown';
                        changesMade.push(`Team2_Captain: ${name} (${repaired.Team2_Captain}) [from participants]`);
                    }
                }
            }
            
            // Impute Winning_Captain and Losing_Captain
            if (!repaired.Winning_Captain || repaired.Winning_Captain === 'null' || repaired.Winning_Captain === '') {
                if (match.Winning_Team === match.Team1) {
                    repaired.Winning_Captain = repaired.Team1_Captain;
                    changesMade.push(`Winning_Captain: ${repaired.Winning_Captain} [from Team1_Captain]`);
                } else if (match.Winning_Team === match.Team2) {
                    repaired.Winning_Captain = repaired.Team2_Captain;
                    changesMade.push(`Winning_Captain: ${repaired.Winning_Captain} [from Team2_Captain]`);
                }
            }
            
            if (!repaired.Losing_Captain || repaired.Losing_Captain === 'null' || repaired.Losing_Captain === '') {
                if (match.Losing_Team === match.Team1) {
                    repaired.Losing_Captain = repaired.Team1_Captain;
                    changesMade.push(`Losing_Captain: ${repaired.Losing_Captain} [from Team1_Captain]`);
                } else if (match.Losing_Team === match.Team2) {
                    repaired.Losing_Captain = repaired.Team2_Captain;
                    changesMade.push(`Losing_Captain: ${repaired.Losing_Captain} [from Team2_Captain]`);
                }
            }
            
            // Impute compositions if empty
            if (!repaired.Team1_Composition || repaired.Team1_Composition === '[]' || repaired.Team1_Composition === 'null') {
                if (allParticipants.size > 0) {
                    const participantsArray = Array.from(allParticipants);
                    const halfPoint = Math.ceil(participantsArray.length / 2);
                    repaired.Team1_Composition = JSON.stringify(participantsArray.slice(0, halfPoint));
                    changesMade.push(`Team1_Composition: ${halfPoint} players [from participants]`);
                }
            }
            
            if (!repaired.Team2_Composition || repaired.Team2_Composition === '[]' || repaired.Team2_Composition === 'null') {
                if (allParticipants.size > 0) {
                    const participantsArray = Array.from(allParticipants);
                    const halfPoint = Math.ceil(participantsArray.length / 2);
                    repaired.Team2_Composition = JSON.stringify(participantsArray.slice(halfPoint));
                    changesMade.push(`Team2_Composition: ${participantsArray.length - halfPoint} players [from participants]`);
                }
            }
            
            if (changesMade.length > 0) {
                console.log('   ✅ Changes made:');
                changesMade.forEach(change => console.log(`      - ${change}`));
            } else {
                console.log('   ⚠️ No changes could be made (insufficient data)');
            }
            console.log('');
            
            return repaired;
        });
        
        // Prepare sync payload with repaired matches
        console.log('\n🚀 Preparing to sync repaired data to D1...\n');
        
        const syncPayload = {
            players: d1Data.player_info || [],
            matches: d1Data.matches.map(m => {
                const repaired = repairedMatches.find(r => r.Match_ID === m.Match_ID);
                return repaired || m;
            }),
            performance_data: [
                ...(d1Data.match_batting_performance || []),
                ...(d1Data.match_bowling_performance || [])
            ]
        };
        
        console.log(`📦 Sync payload prepared:`);
        console.log(`   - ${syncPayload.players.length} players`);
        console.log(`   - ${syncPayload.matches.length} matches (${repairedMatches.length} repaired)`);
        console.log(`   - ${syncPayload.performance_data.length} performance records\n`);
        
        // Ask for confirmation
        console.log('⚠️  CONFIRMATION REQUIRED ⚠️');
        console.log('This will update the remote D1 database with imputed values.');
        console.log('Run the following command to proceed:\n');
        console.log('window.confirmImputeSync(syncPayload, groupId, repairedMatches);\n');
        
        // Store for confirmation
        window.imputeSyncPayload = syncPayload;
        window.imputeGroupId = groupId;
        window.imputeRepairedMatches = repairedMatches;
        
    } catch (error) {
        console.error('❌ Error during imputation:', error);
        console.error(error.stack);
    }
}

// Confirmation function
window.confirmImputeSync = async function(payload, groupId, repairedMatches) {
    console.log('\n🚀 ===== EXECUTING D1 SYNC =====\n');
    
    try {
        console.log('📤 Uploading repaired data to D1...');
        const result = await window.cricketApp.d1Manager.syncToD1(groupId, payload);
        
        console.log('\n✅ ===== SYNC COMPLETE =====');
        console.log('Result:', result);
        console.log(`\n🎉 Successfully repaired and synced ${repairedMatches.length} matches!`);
        console.log('\nRepaired matches:');
        repairedMatches.forEach(m => {
            console.log(`   ✅ ${m.Match_ID}: ${m.Team1} vs ${m.Team2}`);
            console.log(`      T1_Cap: ${m.Team1_Captain}, T2_Cap: ${m.Team2_Captain}`);
        });
        
        // Clean up
        delete window.imputeSyncPayload;
        delete window.imputeGroupId;
        delete window.imputeRepairedMatches;
        
        console.log('\n✅ Data imputation complete!');
        console.log('You can now verify the changes in D1 database.');
        
    } catch (error) {
        console.error('\n❌ Sync failed:', error);
        console.error(error.stack);
    }
};

// Make function available globally
window.imputeD1NullValues = imputeD1NullValues;

console.log('✅ Imputation script loaded!');
console.log('📋 Run: imputeD1NullValues()');
