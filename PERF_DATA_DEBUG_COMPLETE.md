# Performance Data Debug & Protection - October 26, 2025

## ✅ ACTIONS COMPLETED

### 1. Deleted Corrupted Match from D1
```sql
DELETE FROM match_data WHERE Match_ID = '1761307572056';
DELETE FROM performance_data WHERE Match_ID = '1761307572056';
```

**Result**: Only clean match 1761395072714 remains in D1.

### 2. Added Comprehensive Performance Data Logging

#### At Match Completion (lines 8830-8840):
```javascript
console.log(`🔍 PERF_EXTRACT: Extracting complete player performance data...`);
const performanceData = this.extractCompletePlayerPerformance();
console.log(`✅ PERF_EXTRACT: Extracted ${performanceData.length} performance records`);
console.log(`📊 PERF_EXTRACT_SAMPLE: First record:`, ...);
console.log(`📊 PERF_EXTRACT_ALL: All records:`, ...);
```

#### When Saving Match (lines 8997-9000):
```javascript
console.log(`🔍 MATCH_SAVE: Created finishedMatch object with performanceData`);
console.log(`📊 MATCH_SAVE: performanceData length: ${finishedMatch.performanceData?.length || 0}`);
console.log(`📊 MATCH_SAVE: performanceData exists: ${!!finishedMatch.performanceData}`);
console.log(`📊 MATCH_SAVE: performanceData is array: ${Array.isArray(finishedMatch.performanceData)}`);
```

#### When Adding to Matches Array (lines 9018-9025):
```javascript
console.log(`➕ MATCH_ADD: Adding new match ${matchToSave.id} to matches array`);
console.log(`📊 PERF_ADD: New match has ${matchToSave.performanceData?.length || 0} performance records`);
// ...
console.log(`✅ PERF_FINAL: Match ${matchToSave.id} saved with ${matchToSave.performanceData?.length || 0} performance records`);
```

#### During D1 Sync Collection (lines 3002-3014):
```javascript
console.log(`🔍 PERF_COLLECT: Checking match ${match.id} for performance data...`);
console.log(`🔍 PERF_COLLECT: Has performanceData property: ${!!match.performanceData}`);
console.log(`🔍 PERF_COLLECT: Is array: ${Array.isArray(match.performanceData)}`);
console.log(`🔍 PERF_COLLECT: Length: ${match.performanceData?.length || 0}`);

if (match.performanceData && Array.isArray(match.performanceData)) {
    console.log(`✅ PERF_COLLECT: Adding ${match.performanceData.length} performance records from match ${match.id}`);
} else {
    console.warn(`❌ PERF_COLLECT: Match ${match.id} has NO performanceData - will not sync to D1!`);
}
```

#### Before D1 API Call (lines 3266-3273):
```javascript
console.log(`🚀 D1_SYNC_CALL: About to send ${syncData.matches.length} matches to D1`);
console.log(`📊 D1_PERF_SYNC: Sending ${syncData.performance_data.length} performance records to D1`);
console.log(`📊 D1_PERF_BREAKDOWN: Performance records by match:`, 
    syncData.matches.map(m => ({
        Match_ID: m.Match_ID,
        perf_records: syncData.performance_data.filter(p => p.Match_ID === m.Match_ID).length
    })));
```

### 3. Protection Against Overwrites

The existing protection mechanisms remain in place:

#### Skip Already-Synced Matches (lines 2936-2950):
```javascript
const matchesToSync = this.matches.filter(match => {
    const isCompleted = match.Status === 'Completed' || 
                       match.status === 'Completed' || 
                       match.gameFinishTime || 
                       match.Game_Finish_Time || 
                       match.ended ||
                       (match.Winning_Team && match.Winning_Team !== '');
    
    if (isCompleted && match.__syncedToD1) {
        console.log(`⏭️ PROTECTION: Skipping already-synced completed match ${match.id}`);
        return false; // Skip this match
    }
    
    return true; // Allow sync
});
```

#### Merge Protection for Existing D1 Data (lines 3159-3198):
```javascript
if (existingMatch) {
    console.log(`🛡️ MERGE_PROTECTION: Merging match ${matchId} with existing D1 data`);
    
    const mergeField = (currentValue, existingValue, fieldName) => {
        const isCurrentEmpty = !currentValue || currentValue === '' || currentValue === 'N/A';
        const isExistingEmpty = !existingValue || existingValue === '' || existingValue === 'N/A';
        
        if (isCurrentEmpty && !isExistingEmpty) {
            console.log(`  🔄 MERGE_${fieldName}: Keeping existing value "${existingValue}"`);
            return existingValue; // Keep existing good data
        }
        
        return currentValue; // Use new value
    };
    
    // Merge all critical fields to prevent NULL overwrites
    transformedMatch.Winning_Team = mergeField(transformedMatch.Winning_Team, existingMatch.Winning_Team, 'Winner');
    // ... etc for all fields
}
```

## 🔍 WHAT TO WATCH FOR

### When Playing a New Match:

1. **At Match End** - Look for:
```
🔍 PERF_EXTRACT: Extracting complete player performance data...
✅ PERF_EXTRACT: Extracted 8 performance records
📊 PERF_EXTRACT_SAMPLE: First record: { ... }
```

2. **When Saving** - Look for:
```
🔍 MATCH_SAVE: Created finishedMatch object with performanceData
📊 MATCH_SAVE: performanceData length: 8
📊 MATCH_SAVE: performanceData exists: true
📊 MATCH_SAVE: performanceData is array: true
```

3. **When Adding to Array** - Look for:
```
➕ MATCH_ADD: Adding new match 1761XXXXXXXXX to matches array
📊 PERF_ADD: New match has 8 performance records
✅ PERF_FINAL: Match 1761XXXXXXXXX saved with 8 performance records
```

4. **During D1 Sync** - Look for:
```
🔍 PERF_COLLECT: Checking match 1761XXXXXXXXX for performance data...
🔍 PERF_COLLECT: Has performanceData property: true
🔍 PERF_COLLECT: Is array: true
🔍 PERF_COLLECT: Length: 8
✅ PERF_COLLECT: Adding 8 performance records from match 1761XXXXXXXXX
📊 D1_PERF_SYNC: Sending 8 performance records to D1
```

### What Should NEVER Happen:

❌ **NEVER see**:
```
❌ PERF_COLLECT: Match XXXXX has NO performanceData - will not sync to D1!
```

If you see this, it means performanceData wasn't saved to localStorage during match completion.

## 🧪 TESTING STEPS

1. **Build and Install APK**:
```bash
cd native-android-app
.\gradlew assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

2. **Enable Chrome Remote Debugging**:
```bash
adb logcat -c
adb logcat -s chromium:I | Select-String "PERF_"
```

3. **Play a Complete Match** (4v4, quick match)

4. **Watch for Performance Data Logs**:
   - At match end: Should see "PERF_EXTRACT: Extracted 8 performance records"
   - When saved: Should see "PERF_FINAL: Match saved with 8 performance records"
   - During sync: Should see "PERF_SYNC: Sending 8 performance records to D1"

5. **Verify in D1**:
```bash
wrangler d1 execute cricket_mgr --remote --command="SELECT Match_ID, COUNT(*) as players FROM performance_data WHERE Match_ID IN (SELECT Match_ID FROM match_data WHERE Group_ID = 3) GROUP BY Match_ID"
```

Expected output:
```
Match 1761395072714: 6 players (existing)
Match 1761XXXXXXXXX: 8 players (new match you just played)
```

6. **Verify No Overwrites**:
```bash
wrangler d1 execute cricket_mgr --remote --command="SELECT Match_ID, Team1, Team2, Winning_Team, Losing_Team FROM match_data WHERE Group_ID = 3"
```

Both matches should have complete data (no NULLs or empty strings).

## 📊 EXPECTED LOG SEQUENCE

```
1. Match End:
   🔍 PERF_EXTRACT: Extracting complete player performance data...
   ✅ PERF_EXTRACT: Extracted 8 performance records

2. Match Save:
   🔍 MATCH_SAVE: Created finishedMatch object with performanceData
   📊 MATCH_SAVE: performanceData length: 8

3. Add to Array:
   ➕ MATCH_ADD: Adding new match 1761XXXXXXXXX to matches array
   ✅ PERF_FINAL: Match 1761XXXXXXXXX saved with 8 performance records

4. D1 Sync:
   🔍 PERF_COLLECT: Checking match 1761XXXXXXXXX for performance data...
   ✅ PERF_COLLECT: Adding 8 performance records from match 1761XXXXXXXXX
   📊 D1_PERF_SYNC: Sending 8 performance records to D1
   📊 D1_PERF_BREAKDOWN: Performance records by match: [{Match_ID: "1761XXXXXXXXX", perf_records: 8}]
```

## ✅ SUMMARY

- ❌ Deleted corrupted match 1761307572056 from D1
- ✅ Added 15+ debug log points tracking performance data
- ✅ Existing match protection remains active (merge & skip logic)
- ✅ Version updated to v=20251026-0115
- 🎯 Next: Test with a new match and verify logs show performance data being saved
