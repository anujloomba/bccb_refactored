-- Impute missing Winning_Captain and Losing_Captain in match_data table
-- This script derives the winning/losing captains from Team1_Captain, Team2_Captain, 
-- and the Winning_Team/Losing_Team fields

-- Step 1: Update Winning_Captain where it's NULL or empty
-- If Winning_Team matches Team1, then Winning_Captain = Team1_Captain
-- If Winning_Team matches Team2, then Winning_Captain = Team2_Captain
UPDATE match_data
SET Winning_Captain = CASE
    WHEN Winning_Team = Team1 THEN Team1_Captain
    WHEN Winning_Team = Team2 THEN Team2_Captain
    ELSE Winning_Captain
END
WHERE (Winning_Captain IS NULL OR Winning_Captain = '')
  AND Winning_Team IS NOT NULL
  AND Winning_Team != '';

-- Step 2: Update Losing_Captain where it's NULL or empty
-- If Losing_Team matches Team1, then Losing_Captain = Team1_Captain
-- If Losing_Team matches Team2, then Losing_Captain = Team2_Captain
UPDATE match_data
SET Losing_Captain = CASE
    WHEN Losing_Team = Team1 THEN Team1_Captain
    WHEN Losing_Team = Team2 THEN Team2_Captain
    ELSE Losing_Captain
END
WHERE (Losing_Captain IS NULL OR Losing_Captain = '')
  AND Losing_Team IS NOT NULL
  AND Losing_Team != '';

-- Step 3: Verify the updates
SELECT 
    Match_ID,
    Team1,
    Team2,
    Team1_Captain,
    Team2_Captain,
    Winning_Team,
    Losing_Team,
    Winning_Captain,
    Losing_Captain,
    CASE
        WHEN Winning_Captain IS NULL OR Winning_Captain = '' THEN '❌ Missing'
        ELSE '✅ Has Value'
    END as Winning_Captain_Status,
    CASE
        WHEN Losing_Captain IS NULL OR Losing_Captain = '' THEN '❌ Missing'
        ELSE '✅ Has Value'
    END as Losing_Captain_Status
FROM match_data
WHERE Status = 'completed' OR Status = 'Completed'
ORDER BY Date DESC, Game_Finish_Time DESC
LIMIT 20;

-- Step 4: Summary statistics
SELECT 
    COUNT(*) as Total_Matches,
    SUM(CASE WHEN Winning_Captain IS NOT NULL AND Winning_Captain != '' THEN 1 ELSE 0 END) as Matches_With_Winning_Captain,
    SUM(CASE WHEN Losing_Captain IS NOT NULL AND Losing_Captain != '' THEN 1 ELSE 0 END) as Matches_With_Losing_Captain,
    SUM(CASE WHEN (Winning_Captain IS NULL OR Winning_Captain = '') THEN 1 ELSE 0 END) as Still_Missing_Winning_Captain,
    SUM(CASE WHEN (Losing_Captain IS NULL OR Losing_Captain = '') THEN 1 ELSE 0 END) as Still_Missing_Losing_Captain
FROM match_data
WHERE Status = 'completed' OR Status = 'Completed';
