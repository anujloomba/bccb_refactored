# Data Overwrite Debug Logging - October 22, 2025

## Issue Report
User reported that existing match data in `match_data` remote table is being overwritten when a new match finishes. Some columns that previously had data are being changed to NULL.

## Root Cause Investigation
The issue likely occurs during the data sync process when a completed match triggers `saveData(true)`, which then calls `syncToD1()` to upload match data to the D1 database.

## Debug Logging Added

### 1. **saveData() Function Entry Point** (Line ~2551)
**Location:** Start of `saveData()` method  
**Purpose:** Track what matches exist in memory BEFORE any transformation  
**Logs:**
```
💾 SAVE_DATA_START: Shows saveToJSON flag, group name, and count of matches
💾 SAVE_DATA_MATCHES: Complete dump of all matches with key fields (captains, compositions, winners, status)
```

### 2. **Match Transformation Start** (Line ~2877)
**Location:** Beginning of `matchesToSync.map()` iteration  
**Purpose:** Track each match as it enters the transformation pipeline  
**Logs:**
```
🔍 TRANSFORM_START: Match ID being transformed
🔍 TRANSFORM_RAW: Complete raw match data BEFORE transformation
🔍 TRANSFORM_PLAYERS: Player array counts for both teams
```

### 3. **Match Transformation Result** (Line ~3020)
**Location:** End of match transformation, right before returning transformed object  
**Purpose:** Track exactly what data is being prepared for D1 sync  
**Logs:**
```
🔍 TRANSFORM_RESULT: Complete transformed match showing all captain/composition/winner fields
```

### 4. **D1 Sync Preparation** (Line ~3087)
**Location:** Just before calling `d1Manager.syncToD1()`  
**Purpose:** Track the final payload being sent to D1  
**Logs:**
```
🚀 D1_SYNC_CALL: Count of matches being sent
🚀 D1_SYNC_PAYLOAD: Complete array of match data with all critical fields
```

### 5. **D1 API Manager Entry** (Line ~1584)
**Location:** Inside `D1ApiManager.syncToD1()` method  
**Purpose:** Track data at the API layer before HTTP call  
**Logs:**
```
🌩️ D1_API_SYNC: Group ID and preparation message
🌩️ D1_API_PAYLOAD: Match count
🌩️ D1_API_MATCHES: Complete match array showing all fields
🌩️ D1_API_RESULT: Response from D1 after sync completes
```

### 6. **Match End Save** (Line ~8785)
**Location:** In `endMatch()` when match is added to this.matches array  
**Purpose:** Track the exact data being saved when match completes  
**Logs:**
```
➕ MATCH_ADD: New match being added to array
🔄 MATCH_REPLACE: Existing match being replaced
⏭️ MATCH_SKIP: Older version being skipped
📊 MATCH_END_FINAL: Total match count after save
📊 MATCH_END_DATA: Complete data of the match just saved
```

## Log Emoji Legend
- 💾 = saveData() entry point
- 🔍 = Transformation/inspection points
- 🚀 = D1 sync initiation
- 🌩️ = D1 API layer
- ➕ = Match addition
- 🔄 = Match replacement
- ⏭️ = Match skip
- 📊 = Final data state

## Debug Strategy

### Step 1: Reproduce the Issue
1. Ensure you have 2 completed matches with all fields populated
2. Start and complete a 3rd match
3. Check the D1 database to see if previous matches lost data

### Step 2: Analyze the Logs
Follow the data flow through these checkpoints:

1. **📊 MATCH_END_DATA** - Verify the match being saved has all fields
2. **💾 SAVE_DATA_MATCHES** - Check if existing matches still have their data
3. **🔍 TRANSFORM_RAW** - See if existing matches lose data during transformation
4. **🔍 TRANSFORM_RESULT** - Check if transformation is creating NULL values
5. **🚀 D1_SYNC_PAYLOAD** - Verify what's being sent to D1
6. **🌩️ D1_API_MATCHES** - Confirm API layer has correct data

### Step 3: Identify Where Data Loss Occurs
Compare the data at each checkpoint:
- If data is correct at MATCH_END but NULL at SAVE_DATA_MATCHES → Issue in matches array management
- If data is correct at SAVE_DATA_MATCHES but NULL at TRANSFORM_RAW → Issue with match filtering
- If data is correct at TRANSFORM_RAW but NULL at TRANSFORM_RESULT → Issue in transformation logic
- If data is correct at TRANSFORM_RESULT but NULL at D1_API_MATCHES → Issue in sync data preparation
- If data is correct at D1_API_MATCHES but NULL in D1 → Issue with server-side INSERT OR REPLACE

## Key Fields to Monitor
For each match, track these critical fields:
- `Match_ID` - Must be consistent
- `Team1_Captain` / `Team2_Captain` - Should NOT become NULL
- `Team1_Composition` / `Team2_Composition` - Should remain as JSON arrays
- `Winning_Team` / `Losing_Team` - Should NOT become empty
- `Winning_Captain` / `Losing_Captain` - Should NOT become NULL
- `Status` - Should remain "Completed"

## Expected Behavior
- Completed matches with `__syncedToD1 = true` should be SKIPPED from sync
- Only NEW matches or IN-PROGRESS matches should be synced
- Transformation should preserve all existing field values
- D1 INSERT OR REPLACE should only affect the specific Match_ID being synced

## Cache Version
Updated to: `v=20251022-0045`

## Files Modified
1. `app.js` - Added 6 debug logging checkpoints
2. `index.html` - Updated cache-busting version
3. `DATA_OVERWRITE_DEBUG.md` - This documentation

## Next Steps
1. Build and install the app
2. Reproduce the issue (complete a match when 2+ matches already exist)
3. Review console logs for the data flow
4. Identify at which checkpoint the data becomes NULL
5. Fix the specific transformation or sync logic that's causing the issue
