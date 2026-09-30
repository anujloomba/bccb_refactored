-- Cricket Manager D1 Database Schema
-- Fixed version with proper table order and constraints

-- Create groups table first (referenced by other tables)
CREATE TABLE groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_name TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  admin_password_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default guest group
INSERT INTO groups (group_name, password_hash) VALUES ('guest', NULL);

-- Create player_data table (FK to groups removed for flexibility)
CREATE TABLE player_data (
    Player_ID TEXT PRIMARY KEY,
    group_id INTEGER NOT NULL DEFAULT 1,
    Name TEXT NOT NULL,
    Bowling_Style TEXT,
    Batting_Style TEXT,
    Is_Star BOOLEAN DEFAULT FALSE,
    Last_Updated DATE,
    Last_Edit_Date DATE
);

-- Create match_data table (all FKs removed for flexibility)
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
    Winning_Captain TEXT,
    Losing_Captain TEXT,
    Import_Fingerprint TEXT
);

-- Create performance_data table (all FKs removed for flexibility)
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
    UNIQUE(Match_ID, Player_ID)
);

-- Game Day: device registrations, scheduled games, RSVPs, shared tosses, and live trips
CREATE TABLE group_devices (
    device_id TEXT PRIMARY KEY,
    group_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    player_id TEXT,
    platform TEXT NOT NULL DEFAULT 'web',
    push_token TEXT,
    app_version TEXT,
    route_window_start INTEGER NOT NULL DEFAULT 0,
    route_calls INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game_days (
    id TEXT PRIMARY KEY,
    group_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    reach_by TEXT NOT NULL,
    timezone TEXT NOT NULL,
    venue_name TEXT NOT NULL,
    venue_address TEXT,
    venue_lat REAL NOT NULL,
    venue_lng REAL NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled')),
    created_by_device TEXT,
    reminder_sent_at TEXT,
    last_nudged_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game_day_rsvps (
    game_day_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    response TEXT NOT NULL CHECK (response IN ('yes', 'no', 'maybe')),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (game_day_id, player_id)
);

CREATE TABLE group_tosses (
    id TEXT PRIMARY KEY,
    group_id INTEGER NOT NULL,
    game_day_id TEXT,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trip_locations (
    game_day_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    accuracy REAL,
    heading REAL,
    speed REAL,
    status TEXT NOT NULL DEFAULT 'travelling' CHECK (status IN ('travelling', 'arrived', 'stopped')),
    distance_meters REAL,
    eta_seconds INTEGER,
    eta_computed_at TEXT,
    client_started_ms INTEGER,
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (game_day_id, player_id)
);

-- Create indexes for better performance
CREATE INDEX idx_group_devices_group ON group_devices(group_id);
CREATE INDEX idx_group_devices_player ON group_devices(group_id, player_id);
CREATE INDEX idx_game_days_group_start ON game_days(group_id, starts_at);
CREATE INDEX idx_game_days_reminder ON game_days(status, reminder_sent_at, starts_at);
CREATE INDEX idx_group_tosses_group ON group_tosses(group_id, created_at);
CREATE INDEX idx_trip_locations_device ON trip_locations(device_id);
CREATE INDEX idx_player_group ON player_data(group_id);
CREATE INDEX idx_match_group ON match_data(group_id);
CREATE UNIQUE INDEX idx_match_group_import_fingerprint
    ON match_data(group_id, Import_Fingerprint)
    WHERE Import_Fingerprint IS NOT NULL;
CREATE INDEX idx_performance_match ON performance_data(Match_ID);
CREATE INDEX idx_performance_player ON performance_data(Player_ID);
CREATE INDEX idx_groups_name ON groups(group_name);