-- One-Time D1 Data Imputation Script
-- This script will fix NULL captain values in match_data table
-- Run this in Cloudflare D1 Console or via wrangler d1 execute

-- Step 1: Identify matches with NULL captains
-- First, let's see what we're working with
SELECT 
    Match_ID,
    Date,
    Team1,
    Team2,
    Team1_Captain,
    Team2_Captain,
    Winning_Captain,
    Losing_Captain,
    Team1_Composition,
    Team2_Composition,
    Winning_Team,
    Losing_Team
FROM match_data
WHERE group_id = (SELECT id FROM groups WHERE group_name = 'bccb')
  AND (
    Team1_Captain IS NULL 
    OR Team2_Captain IS NULL 
    OR Winning_Captain IS NULL 
    OR Losing_Captain IS NULL
    OR Team1_Captain = ''
    OR Team2_Captain = ''
    OR Winning_Captain = ''
    OR Losing_Captain = ''
  )
ORDER BY Date DESC;

-- Step 2: Get all available players for reference
SELECT Player_ID, Name FROM player_data 
WHERE group_id = (SELECT id FROM groups WHERE group_name = 'bccb')
ORDER BY Name;

-- Step 3: Impute Team1_Captain based on team name pattern "Team [PlayerName]"
-- This will extract captain names from team names and update
UPDATE match_data
SET Team1_Captain = (
    SELECT p.Player_ID 
    FROM player_data p
    WHERE p.group_id = match_data.group_id
    AND LOWER(p.Name) = LOWER(
        CASE 
            WHEN Team1 LIKE 'Team %' THEN TRIM(SUBSTR(Team1, 6))
            ELSE NULL
        END
    )
    LIMIT 1
)
WHERE group_id = (SELECT id FROM groups WHERE group_name = 'bccb')
  AND (Team1_Captain IS NULL OR Team1_Captain = '')
  AND Team1 LIKE 'Team %';

-- Step 4: Impute Team2_Captain based on team name pattern
UPDATE match_data
SET Team2_Captain = (
    SELECT p.Player_ID 
    FROM player_data p
    WHERE p.group_id = match_data.group_id
    AND LOWER(p.Name) = LOWER(
        CASE 
            WHEN Team2 LIKE 'Team %' THEN TRIM(SUBSTR(Team2, 6))
            ELSE NULL
        END
    )
    LIMIT 1
)
WHERE group_id = (SELECT id FROM groups WHERE group_name = 'bccb')
  AND (Team2_Captain IS NULL OR Team2_Captain = '')
  AND Team2 LIKE 'Team %';

-- Step 5: For matches where captain couldn't be inferred from team name,
-- use the first player from Team1_Composition
UPDATE match_data
SET Team1_Captain = (
    SELECT json_extract(Team1_Composition, '$[0]')
    WHERE Team1_Composition IS NOT NULL 
    AND Team1_Composition != '[]'
    AND Team1_Composition != ''
)
WHERE group_id = (SELECT id FROM groups WHERE group_name = 'bccb')
  AND (Team1_Captain IS NULL OR Team1_Captain = '')
  AND Team1_Composition IS NOT NULL
  AND Team1_Composition != '[]';

-- Step 6: Use first player from Team2_Composition for Team2_Captain
UPDATE match_data
SET Team2_Captain = (
    SELECT json_extract(Team2_Composition, '$[0]')
    WHERE Team2_Composition IS NOT NULL 
    AND Team2_Composition != '[]'
    AND Team2_Composition != ''
)
WHERE group_id = (SELECT id FROM groups WHERE group_name = 'bccb')
  AND (Team2_Captain IS NULL OR Team2_Captain = '')
  AND Team2_Composition IS NOT NULL
  AND Team2_Composition != '[]';

-- Step 7: Impute Winning_Captain from Team1_Captain or Team2_Captain
-- If Winning_Team matches Team1, use Team1_Captain
UPDATE match_data
SET Winning_Captain = Team1_Captain
WHERE group_id = (SELECT id FROM groups WHERE group_name = 'bccb')
  AND (Winning_Captain IS NULL OR Winning_Captain = '')
  AND Winning_Team = Team1
  AND Team1_Captain IS NOT NULL
  AND Team1_Captain != '';

-- If Winning_Team matches Team2, use Team2_Captain
UPDATE match_data
SET Winning_Captain = Team2_Captain
WHERE group_id = (SELECT id FROM groups WHERE group_name = 'bccb')
  AND (Winning_Captain IS NULL OR Winning_Captain = '')
  AND Winning_Team = Team2
  AND Team2_Captain IS NOT NULL
  AND Team2_Captain != '';

-- Step 8: Impute Losing_Captain from Team1_Captain or Team2_Captain
-- If Losing_Team matches Team1, use Team1_Captain
UPDATE match_data
SET Losing_Captain = Team1_Captain
WHERE group_id = (SELECT id FROM groups WHERE group_name = 'bccb')
  AND (Losing_Captain IS NULL OR Losing_Captain = '')
  AND Losing_Team = Team1
  AND Team1_Captain IS NOT NULL
  AND Team1_Captain != '';

-- If Losing_Team matches Team2, use Team2_Captain
UPDATE match_data
SET Losing_Captain = Team2_Captain
WHERE group_id = (SELECT id FROM groups WHERE group_name = 'bccb')
  AND (Losing_Captain IS NULL OR Losing_Captain = '')
  AND Losing_Team = Team2
  AND Team2_Captain IS NOT NULL
  AND Team2_Captain != '';

-- Step 9: Verify the fix - show all matches that still have NULL captains
SELECT 
    Match_ID,
    Date,
    Team1,
    Team2,
    Team1_Captain,
    Team2_Captain,
    Winning_Captain,
    Losing_Captain
FROM match_data
WHERE group_id = (SELECT id FROM groups WHERE group_name = 'bccb')
  AND (
    Team1_Captain IS NULL 
    OR Team2_Captain IS NULL 
    OR Winning_Captain IS NULL 
    OR Losing_Captain IS NULL
    OR Team1_Captain = ''
    OR Team2_Captain = ''
    OR Winning_Captain = ''
    OR Losing_Captain = ''
  )
ORDER BY Date DESC;

-- Step 10: Show summary of all matches with their captain values
SELECT 
    Match_ID,
    Date,
    Team1 || ' vs ' || Team2 AS Match,
    COALESCE(Team1_Captain, 'NULL') AS T1_Cap,
    COALESCE(Team2_Captain, 'NULL') AS T2_Cap,
    COALESCE(Winning_Captain, 'NULL') AS Win_Cap,
    COALESCE(Losing_Captain, 'NULL') AS Lose_Cap
FROM match_data
WHERE group_id = (SELECT id FROM groups WHERE group_name = 'bccb')
ORDER BY Date DESC;
