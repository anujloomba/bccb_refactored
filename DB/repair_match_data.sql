-- Comprehensive Match Data Repair and Imputation Script
-- Run this with: wrangler d1 execute cricket_mgr --remote --file=repair_match_data.sql

-- ============================================================================
-- STEP 1: Diagnose the problem - Find all corrupted matches
-- ============================================================================

SELECT '=== CORRUPTED MATCHES REPORT ===' as report;

SELECT 
    Match_ID,
    Team1,
    Team2,
    Team1_Captain,
    Team2_Captain,
    Team1_Composition,
    Team2_Composition,
    Winning_Team,
    Losing_Team,
    Winning_Captain,
    Losing_Captain,
    Result
FROM match_data
WHERE Group_ID = 3
  AND (
    Team1_Captain IS NULL OR Team1_Captain = '' OR
    Team2_Captain IS NULL OR Team2_Captain = '' OR
    Team1_Composition IS NULL OR Team1_Composition = '' OR Team1_Composition = '[]' OR
    Team2_Composition IS NULL OR Team2_Composition = '' OR Team2_Composition = '[]' OR
    Winning_Team IS NULL OR Winning_Team = '' OR
    Losing_Team IS NULL OR Losing_Team = ''
  );

-- ============================================================================
-- STEP 2: Check performance data for these matches
-- ============================================================================

SELECT '=== PERFORMANCE DATA CHECK ===' as report;

SELECT 
    Match_ID,
    COUNT(*) as player_count,
    COUNT(CASE WHEN runs > 0 OR ballsFaced > 0 THEN 1 END) as batsmen_count,
    COUNT(CASE WHEN wickets > 0 OR ballsBowled > 0 THEN 1 END) as bowlers_count
FROM performance_data
WHERE Match_ID IN (
    SELECT Match_ID 
    FROM match_data 
    WHERE Group_ID = 3
)
GROUP BY Match_ID;

-- ============================================================================
-- STEP 3: Impute missing data from Result string and team names
-- ============================================================================

-- Fix Match 1761307572056 based on known data
-- From logs: Team1="Team Dileep", Team2="Team Roshan"
-- Result should tell us who won

SELECT '=== REPAIRING MATCH 1761307572056 ===' as report;

-- First, let's see what data we have for this match
SELECT 
    Match_ID,
    Team1,
    Team2,
    Result,
    Winning_Team_Score,
    Losing_Team_Score
FROM match_data
WHERE Match_ID = '1761307572056';

-- ============================================================================
-- STEP 4: Update with imputed values
-- ============================================================================

-- Update Winning_Team and Losing_Team by parsing Result string
UPDATE match_data
SET 
    Winning_Team = CASE
        WHEN Result LIKE '%Team Dileep wins%' THEN 'Team Dileep'
        WHEN Result LIKE '%Team Roshan wins%' THEN 'Team Roshan'
        WHEN Result LIKE '%Team Himalaya wins%' THEN 'Team Himalaya'
        WHEN Result LIKE '%Team Anuj wins%' THEN 'Team Anuj'
        WHEN Result LIKE '%Team Anil wins%' THEN 'Team Anil'
        WHEN Result LIKE '%Team Omi wins%' THEN 'Team Omi'
        WHEN Result LIKE '%Team Chiru wins%' THEN 'Team Chiru'
        WHEN Result LIKE '%Team Ashish wins%' THEN 'Team Ashish'
        ELSE Winning_Team
    END,
    Losing_Team = CASE
        -- If Team1 is winner, Team2 is loser
        WHEN Result LIKE '%' || Team1 || ' wins%' THEN Team2
        -- If Team2 is winner, Team1 is loser
        WHEN Result LIKE '%' || Team2 || ' wins%' THEN Team1
        ELSE Losing_Team
    END
WHERE Group_ID = 3
  AND (Winning_Team IS NULL OR Winning_Team = '' OR Losing_Team IS NULL OR Losing_Team = '');

-- ============================================================================
-- STEP 5: Impute captain data from team compositions
-- ============================================================================

-- For matches where we have composition but no captain, use first player as captain
UPDATE match_data
SET 
    Team1_Captain = CASE
        WHEN (Team1_Captain IS NULL OR Team1_Captain = '') 
             AND Team1_Composition IS NOT NULL 
             AND Team1_Composition != '' 
             AND Team1_Composition != '[]'
        THEN json_extract(Team1_Composition, '$[0]')
        ELSE Team1_Captain
    END,
    Team2_Captain = CASE
        WHEN (Team2_Captain IS NULL OR Team2_Captain = '') 
             AND Team2_Composition IS NOT NULL 
             AND Team2_Composition != '' 
             AND Team2_Composition != '[]'
        THEN json_extract(Team2_Composition, '$[0]')
        ELSE Team2_Captain
    END
WHERE Group_ID = 3;

-- ============================================================================
-- STEP 6: Derive Winning_Captain and Losing_Captain
-- ============================================================================

UPDATE match_data
SET 
    Winning_Captain = CASE
        WHEN Winning_Team = Team1 THEN Team1_Captain
        WHEN Winning_Team = Team2 THEN Team2_Captain
        ELSE Winning_Captain
    END,
    Losing_Captain = CASE
        WHEN Losing_Team = Team1 THEN Team1_Captain
        WHEN Losing_Team = Team2 THEN Team2_Captain
        ELSE Losing_Captain
    END
WHERE Group_ID = 3
  AND (Winning_Captain IS NULL OR Winning_Captain = '' OR Losing_Captain IS NULL OR Losing_Captain = '');

-- ============================================================================
-- STEP 7: Verify repairs
-- ============================================================================

SELECT '=== AFTER REPAIR - ALL MATCHES ===' as report;

SELECT 
    Match_ID,
    Team1,
    Team2,
    Team1_Captain,
    Team2_Captain,
    CASE 
        WHEN Team1_Composition IS NULL THEN 'NULL'
        WHEN Team1_Composition = '' THEN 'EMPTY'
        WHEN Team1_Composition = '[]' THEN 'EMPTY_ARRAY'
        ELSE 'OK'
    END as T1_Comp_Status,
    CASE 
        WHEN Team2_Composition IS NULL THEN 'NULL'
        WHEN Team2_Composition = '' THEN 'EMPTY'
        WHEN Team2_Composition = '[]' THEN 'EMPTY_ARRAY'
        ELSE 'OK'
    END as T2_Comp_Status,
    Winning_Team,
    Losing_Team,
    Winning_Captain,
    Losing_Captain,
    SUBSTR(Result, 1, 40) as Result_Preview
FROM match_data
WHERE Group_ID = 3
ORDER BY Match_ID DESC;

-- ============================================================================
-- STEP 8: Check remaining NULL values
-- ============================================================================

SELECT '=== REMAINING ISSUES ===' as report;

SELECT 
    Match_ID,
    'Team1_Captain' as issue_field
FROM match_data
WHERE Group_ID = 3 AND (Team1_Captain IS NULL OR Team1_Captain = '')
UNION ALL
SELECT 
    Match_ID,
    'Team2_Captain' as issue_field
FROM match_data
WHERE Group_ID = 3 AND (Team2_Captain IS NULL OR Team2_Captain = '')
UNION ALL
SELECT 
    Match_ID,
    'Winning_Team' as issue_field
FROM match_data
WHERE Group_ID = 3 AND (Winning_Team IS NULL OR Winning_Team = '')
UNION ALL
SELECT 
    Match_ID,
    'Losing_Team' as issue_field
FROM match_data
WHERE Group_ID = 3 AND (Losing_Team IS NULL OR Losing_Team = '');

-- ============================================================================
-- STEP 9: Performance data completeness check
-- ============================================================================

SELECT '=== PERFORMANCE DATA COMPLETENESS ===' as report;

SELECT 
    m.Match_ID,
    m.Team1,
    m.Team2,
    COALESCE(COUNT(p.Player_ID), 0) as players_recorded,
    COALESCE(SUM(CASE WHEN p.runs > 0 OR p.ballsFaced > 0 THEN 1 ELSE 0 END), 0) as players_with_batting,
    COALESCE(SUM(CASE WHEN p.wickets > 0 OR p.ballsBowled > 0 THEN 1 ELSE 0 END), 0) as players_with_bowling
FROM match_data m
LEFT JOIN performance_data p ON m.Match_ID = p.Match_ID
WHERE m.Group_ID = 3
GROUP BY m.Match_ID, m.Team1, m.Team2
ORDER BY m.Match_ID DESC;

SELECT '=== REPAIR SCRIPT COMPLETE ===' as report;
