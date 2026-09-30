-- Game Day: device registrations, scheduled games, RSVPs, shared tosses, and live trips.

CREATE TABLE IF NOT EXISTS group_devices (
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

CREATE INDEX IF NOT EXISTS idx_group_devices_group ON group_devices(group_id);
CREATE INDEX IF NOT EXISTS idx_group_devices_player ON group_devices(group_id, player_id);

CREATE TABLE IF NOT EXISTS game_days (
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

CREATE INDEX IF NOT EXISTS idx_game_days_group_start ON game_days(group_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_game_days_reminder ON game_days(status, reminder_sent_at, starts_at);

CREATE TABLE IF NOT EXISTS game_day_rsvps (
    game_day_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    response TEXT NOT NULL CHECK (response IN ('yes', 'no', 'maybe')),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (game_day_id, player_id)
);

CREATE TABLE IF NOT EXISTS group_tosses (
    id TEXT PRIMARY KEY,
    group_id INTEGER NOT NULL,
    game_day_id TEXT,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_tosses_group ON group_tosses(group_id, created_at);

CREATE TABLE IF NOT EXISTS trip_locations (
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

CREATE INDEX IF NOT EXISTS idx_trip_locations_device ON trip_locations(device_id);
