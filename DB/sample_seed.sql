-- Sample seed data for testing winning/losing captain columns
DELETE FROM match_data;
DELETE FROM player_data;

INSERT INTO player_data (Player_ID, group_id, Name, Bowling_Style, Batting_Style, Is_Star, Last_Updated, Last_Edit_Date) VALUES
  ('player1', 1, 'Rohit Sharma', 'Medium', 'Aggressive', 1, DATE('now'), DATE('now')),
  ('player2', 1, 'Virat Kohli', 'Medium', 'Technical', 1, DATE('now'), DATE('now')),
  ('player3', 1, 'Hardik Pandya', 'Fast', 'Power Hitter', 1, DATE('now'), DATE('now')),
  ('player4', 1, 'Jasprit Bumrah', 'Fast', 'Reliable', 0, DATE('now'), DATE('now'));

INSERT INTO match_data (
  Match_ID,
  group_id,
  Date,
  Team1,
  Team2,
  Team1_Captain,
  Team2_Captain,
  Team1_Composition,
  Team2_Composition,
  Winning_Team,
  Losing_Team,
  Game_Start_Time,
  Game_Finish_Time,
  Winning_Team_Score,
  Losing_Team_Score,
  Result,
  Overs,
  Man_Of_The_Match,
  Winning_Captain,
  Losing_Captain
) VALUES (
  'match1',
  1,
  DATE('now'),
  'Mumbai Indians',
  'Gujarat Titans',
  'player1',
  'player3',
  '["player1","player4"]',
  '["player2","player3"]',
  'Mumbai Indians',
  'Gujarat Titans',
  '2025-10-10T14:00:00Z',
  '2025-10-10T17:00:00Z',
  '180/4',
  '172/8',
  'Mumbai Indians won by 8 runs',
  20,
  'player1',
  'player1',
  'player3'
);
