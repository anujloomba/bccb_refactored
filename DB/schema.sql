-- Cricket Manager D1 Database Schema
-- Fixed version with proper table order and constraints

-- Create groups table first (referenced by other tables)
CREATE TABLE groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_name TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default guest group
INSERT INTO groups (group_name, password_hash) VALUES ('guest', NULL);

-- Create player_data table with foreign key to groups
CREATE TABLE player_data (
    Player_ID TEXT PRIMARY KEY,
    group_id INTEGER NOT NULL DEFAULT 1,
    Name TEXT NOT NULL,
    Bowling_Style TEXT,
    Batting_Style TEXT,
    Is_Star BOOLEAN DEFAULT FALSE,
    Last_Updated DATE,
    Last_Edit_Date DATE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

-- Create match_data table with foreign keys
CREATE TABLE match_data (
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
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (Team1_Captain) REFERENCES player_data(Player_ID) ON DELETE SET NULL,
    FOREIGN KEY (Team2_Captain) REFERENCES player_data(Player_ID) ON DELETE SET NULL,
    FOREIGN KEY (Man_Of_The_Match) REFERENCES player_data(Player_ID) ON DELETE SET NULL
);

-- Create performance_data table with foreign keys
CREATE TABLE performance_data (
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
    FOREIGN KEY (dismissalBowler) REFERENCES player_data(Player_ID) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_player_group ON player_data(group_id);
CREATE INDEX idx_match_group ON match_data(group_id);
CREATE INDEX idx_performance_match ON performance_data(Match_ID);
CREATE INDEX idx_performance_player ON performance_data(Player_ID);
CREATE INDEX idx_groups_name ON groups(group_name);