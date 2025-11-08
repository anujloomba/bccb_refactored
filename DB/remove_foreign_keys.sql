-- Migration script to remove all foreign key constraints
-- This will recreate the tables without FK constraints

-- Step 1: Create temporary tables with new schema (no FKs)
CREATE TABLE player_data_new (
    Player_ID TEXT PRIMARY KEY,
    group_id INTEGER NOT NULL DEFAULT 1,
    Name TEXT NOT NULL,
    Bowling_Style TEXT,
    Batting_Style TEXT,
    Is_Star BOOLEAN DEFAULT FALSE,
    Last_Updated DATE,
    Last_Edit_Date DATE
);

CREATE TABLE match_data_new (
    Match_ID TEXT PRIMARY KEY,
    group_id INTEGER NOT NULL DEFAULT 1,
    Date DATE NOT NULL,
    Team1 TEXT NOT NULL,
    Team2 TEXT NOT NULL,
    Team1_Captain TEXT,
    Team2_Captain TEXT,
    Team1_Composition TEXT,
    Team2_Composition TEXT,
    Winning_Team TEXT,
    Losing_Team TEXT,
    Game_Start_Time DATETIME,
    Game_Finish_Time DATETIME,
    Winning_Team_Score TEXT,
    Losing_Team_Score TEXT,
    Result TEXT,
    Overs INTEGER,
    Man_Of_The_Match TEXT,
    Winning_Captain TEXT,
    Losing_Captain TEXT
);

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
    dismissalBowler TEXT
);

-- Step 2: Copy data from old tables to new tables
INSERT INTO player_data_new SELECT * FROM player_data;
INSERT INTO match_data_new SELECT * FROM match_data;
INSERT INTO performance_data_new SELECT * FROM performance_data;

-- Step 3: Drop old tables
DROP TABLE performance_data;
DROP TABLE match_data;
DROP TABLE player_data;

-- Step 4: Rename new tables to original names
ALTER TABLE player_data_new RENAME TO player_data;
ALTER TABLE match_data_new RENAME TO match_data;
ALTER TABLE performance_data_new RENAME TO performance_data;

-- Step 5: Recreate indexes
CREATE INDEX idx_player_group ON player_data(group_id);
CREATE INDEX idx_match_group ON match_data(group_id);
CREATE INDEX idx_performance_match ON performance_data(Match_ID);
CREATE INDEX idx_performance_player ON performance_data(Player_ID);
