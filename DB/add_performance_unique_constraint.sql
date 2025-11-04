-- Migration: Add UNIQUE constraint to performance_data table
-- This prevents duplicate performance records for the same (Match_ID, Player_ID) combination

-- Step 1: Create a new table with the UNIQUE constraint
CREATE TABLE performance_data_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Match_ID TEXT NOT NULL,
    Player_ID TEXT NOT NULL,
    notOuts INTEGER DEFAULT 0,
    runs INTEGER DEFAULT 0,
    ballsFaced INTEGER DEFAULT 0,
    fours INTEGER DEFAULT 0,
    sixes INTEGER DEFAULT 0,
    ballsBowled INTEGER DEFAULT 0,
    runsConceded INTEGER DEFAULT 0,
    wickets INTEGER DEFAULT 0,
    extras INTEGER DEFAULT 0,
    maidenOvers INTEGER DEFAULT 0,
    isOut BOOLEAN DEFAULT FALSE,
    dismissalType TEXT,
    dismissalFielder TEXT,
    dismissalBowler TEXT,
    FOREIGN KEY (Match_ID) REFERENCES match_data(Match_ID) ON DELETE CASCADE,
    FOREIGN KEY (Player_ID) REFERENCES player_data(Player_ID) ON DELETE CASCADE,
    FOREIGN KEY (dismissalBowler) REFERENCES player_data(Player_ID) ON DELETE SET NULL,
    UNIQUE(Match_ID, Player_ID) -- THIS IS THE NEW CONSTRAINT
);

-- Step 2: Copy data from old table, removing duplicates (keep first occurrence)
INSERT INTO performance_data_new 
SELECT id, Match_ID, Player_ID, notOuts, runs, ballsFaced, fours, sixes,
       ballsBowled, runsConceded, wickets, extras, maidenOvers, isOut,
       dismissalType, dismissalFielder, dismissalBowler
FROM performance_data
WHERE id IN (
    SELECT MIN(id) 
    FROM performance_data 
    GROUP BY Match_ID, Player_ID
);

-- Step 3: Drop old table
DROP TABLE performance_data;

-- Step 4: Rename new table to original name
ALTER TABLE performance_data_new RENAME TO performance_data;

-- Step 5: Recreate indexes
CREATE INDEX idx_performance_match ON performance_data(Match_ID);
CREATE INDEX idx_performance_player ON performance_data(Player_ID);
