/**
 * Cricket Manager D1 API Worker
 * Provides REST API endpoints for cricket app data synchronization
 */

interface CricketGroup {
  id: number;
  group_name: string;
  password_hash: string | null;
  created_at: string;
  updated_at: string;
}

interface CricketPlayer {
  Player_ID: string;
  group_id: number;
  Name: string;
  Bowling_Style: string;
  Batting_Style: string;
  Is_Star: boolean;
  Last_Updated: string;
  Last_Edit_Date: string;
}

interface CricketMatch {
  Match_ID: string;
  group_id: number;
  Date: string;
  Team1: string;
  Team2: string;
  Team1_Captain: string;
  Team2_Captain: string;
  Winning_Team: string;
  Losing_Team: string;
  Winning_Team_Score: string;
  Losing_Team_Score: string;
  Result: string;
  Overs: number;
  Man_Of_The_Match: string;
  Game_Start_Time: string;
  Game_Finish_Time: string;
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers for web app access
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight CORS requests
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check endpoint
      if (path === '/health' && method === 'GET') {
        return Response.json({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          database: 'cricket_mgr'
        }, { headers: corsHeaders });
      }

      // Group authentication
      if (path === '/groups/auth' && method === 'POST') {
        const body = await request.json() as { group_name: string; password_hash: string | null };
        const { group_name, password_hash } = body;
        
        let query = "SELECT * FROM groups WHERE group_name = ?";
        let params = [group_name];
        
        if (password_hash) {
          query += " AND password_hash = ?";
          params.push(password_hash);
        } else {
          query += " AND password_hash IS NULL";
        }
        
        const group = await env.cricket_mgr.prepare(query).bind(...params).first() as CricketGroup | null;
        
        if (group) {
          return Response.json({ 
            success: true, 
            group: { id: group.id, name: group.group_name } 
          }, { headers: corsHeaders });
        } else {
          return Response.json({ 
            success: false, 
            error: 'Invalid group name or password' 
          }, { status: 401, headers: corsHeaders });
        }
      }

      // Create new group
      if (path === '/groups' && method === 'POST') {
        const body = await request.json() as { group_name: string; password_hash: string | null };
        const { group_name, password_hash } = body;
        
        // First check if group already exists
        const existingGroup = await env.cricket_mgr.prepare(
          "SELECT id FROM groups WHERE group_name = ?"
        ).bind(group_name).first();
        
        if (existingGroup) {
          return Response.json({ 
            success: false, 
            error: 'Group name already exists. Please choose a different name.' 
          }, { status: 409, headers: corsHeaders });
        }
        
        try {
          const result = await env.cricket_mgr.prepare(
            "INSERT INTO groups (group_name, password_hash) VALUES (?, ?)"
          ).bind(group_name, password_hash).run();
          
          return Response.json({ 
            success: true, 
            group: { 
              id: result.meta.last_row_id, 
              name: group_name 
            } 
          }, { headers: corsHeaders });
        } catch (error: any) {
          if (error.message?.includes('UNIQUE constraint failed')) {
            return Response.json({ 
              success: false, 
              error: 'Group name already exists. Please choose a different name.' 
            }, { status: 409, headers: corsHeaders });
          }
          throw error;
        }
      }

      // Get group data (players and matches)
      if (path.startsWith('/groups/') && path.endsWith('/data') && method === 'GET') {
        const groupId = parseInt(path.split('/')[2]);
        
        const playersResult = await env.cricket_mgr.prepare(
          "SELECT * FROM player_data WHERE group_id = ? ORDER BY Name"
        ).bind(groupId).all();
        
        const matchesResult = await env.cricket_mgr.prepare(
          "SELECT * FROM match_data WHERE group_id = ? ORDER BY Date DESC"
        ).bind(groupId).all();
        
        return Response.json({ 
          players: playersResult.results || [], 
          matches: matchesResult.results || []
        }, { headers: corsHeaders });
      }

      // Check if group name is available
      if (path.startsWith('/groups/check/') && method === 'GET') {
        const groupName = path.split('/')[3];
        
        const existingGroup = await env.cricket_mgr.prepare(
          "SELECT id FROM groups WHERE group_name = ?"
        ).bind(groupName).first();
        
        return Response.json({ 
          available: !existingGroup,
          message: existingGroup ? 'Group name already exists' : 'Group name is available'
        }, { headers: corsHeaders });
      }

      // Find group by name
      if (path.startsWith('/groups/find/') && method === 'GET') {
        const groupName = path.split('/')[3];
        
        const groupResult = await env.cricket_mgr.prepare(
          "SELECT id, group_name FROM groups WHERE group_name = ?"
        ).bind(groupName).first();
        
        if (!groupResult) {
          return Response.json({ error: 'Group not found' }, { status: 404, headers: corsHeaders });
        }
        
        return Response.json({ 
          id: groupResult.id, 
          name: groupResult.group_name 
        }, { headers: corsHeaders });
      }

      // Save/Update player
      if (path === '/players' && method === 'POST') {
        const body = await request.json() as CricketPlayer;
        const { Player_ID, group_id, Name, Bowling_Style, Batting_Style, Is_Star } = body;
        
        // Upsert player (insert or update if exists)
        await env.cricket_mgr.prepare(`
          INSERT OR REPLACE INTO player_data 
          (Player_ID, group_id, Name, Bowling_Style, Batting_Style, Is_Star, Last_Updated) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          Player_ID, 
          group_id, 
          Name, 
          Bowling_Style, 
          Batting_Style, 
          Is_Star, 
          new Date().toISOString().split('T')[0]
        ).run();
        
        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // Save match
      if (path === '/matches' && method === 'POST') {
        const body = await request.json() as CricketMatch;
        const { 
          Match_ID, group_id, Date, Team1, Team2, Team1_Captain, Team2_Captain,
          Winning_Team, Losing_Team, Winning_Team_Score, Losing_Team_Score, Result, Overs
        } = body;
        
        await env.cricket_mgr.prepare(`
          INSERT OR REPLACE INTO match_data 
          (Match_ID, group_id, Date, Team1, Team2, Team1_Captain, Team2_Captain,
           Winning_Team, Losing_Team, Winning_Team_Score, Losing_Team_Score, Result, Overs) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          Match_ID, group_id, Date, Team1, Team2, Team1_Captain, Team2_Captain,
          Winning_Team, Losing_Team, Winning_Team_Score, Losing_Team_Score, Result, Overs
        ).run();
        
        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // Bulk data sync - upload (from app to D1)
      if (path === '/sync/upload' && method === 'POST') {
        try {
          const body = await request.json() as {
            group_id: number;
            players: any[];
            matches: any[];
            performance_data?: any[];
          };
          const { group_id, players, matches, performance_data } = body;
          
          console.log('Sync upload request:', { 
            group_id, 
            playersCount: players?.length, 
            matchesCount: matches?.length,
            performanceCount: performance_data?.length
          });
          
          // Verify group exists before proceeding
          console.log('Verifying group exists...');
          const groupCheck = await env.cricket_mgr.prepare(
            "SELECT id, group_name FROM groups WHERE id = ?"
          ).bind(group_id).first();
          
          if (!groupCheck) {
            throw new Error(`Group with ID ${group_id} does not exist. Cannot insert data.`);
          }
          
          console.log('Group verified:', { id: groupCheck.id, name: groupCheck.group_name });
          
          // Process players first to ensure they exist before matches reference them
          console.log('Inserting players first...');
          console.log('Group ID for insertion:', group_id);
          
          const playerPromises = players.map((player, index) => {
            try {
              // Handle both formats: app format (id, name) and D1 format (Player_ID, Name)
              const playerId = String(player.Player_ID || player.id || `player_${Date.now()}_${index}`);
              const playerName = player.Name || player.name || 'Unknown Player';
              const bowlingStyle = player.Bowling_Style || player.bowling || 'Medium';
              const battingStyle = player.Batting_Style || player.batting || 'Reliable';
              const isStar = player.Is_Star !== undefined ? player.Is_Star : (player.is_star || false);
              
              console.log(`Inserting player ${index}:`, { 
                playerId, 
                playerName, 
                groupId: group_id,
                bowlingStyle,
                battingStyle,
                isStar
              });
              
              return env.cricket_mgr.prepare(`
                INSERT OR REPLACE INTO player_data 
                (Player_ID, group_id, Name, Bowling_Style, Batting_Style, Is_Star, Last_Updated) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).bind(
                playerId,
                group_id,
                playerName,
                bowlingStyle,
                battingStyle,
                isStar,
                new Date().toISOString().split('T')[0]
              ).run();
            } catch (playerError) {
              console.error(`Player insert error for player ${index}:`, playerError, 'Player data:', player);
              throw playerError;
            }
          });
          
          // Wait for all players to be inserted first (sequential for better error tracking)
          console.log('Executing player insertions sequentially...');
          for (let i = 0; i < playerPromises.length; i++) {
            try {
              await playerPromises[i];
              console.log(`Player ${i} inserted successfully`);
            } catch (error) {
              console.error(`Failed to insert player ${i}:`, error);
              throw error;
            }
          }
          console.log('All players inserted successfully');
          
          // Process matches after players are inserted
          console.log('Inserting matches...');
          const matchPromises = matches.map((match, index) => {
            try {
              // Handle D1 format (direct field access) vs app format (object extraction)
              const matchId = String(match.Match_ID || match.id || `match_${Date.now()}_${index}`);
              const team1Name = match.Team1 || (typeof match.team1 === 'object' ? match.team1?.name : match.team1) || 'Team 1';
              const team2Name = match.Team2 || (typeof match.team2 === 'object' ? match.team2?.name : match.team2) || 'Team 2';
              
                            // Handle captains - should always have values since teams are formed from existing players
              const team1Captain = match.Team1_Captain || (typeof match.team1 === 'object' ? match.team1?.captain?.id : '') || '';
              const team2Captain = match.Team2_Captain || (typeof match.team2 === 'object' ? match.team2?.captain?.id : '') || '';
              
              // Convert empty strings to null for foreign key constraints
              const team1CaptainFK = team1Captain.trim() || null;
              const team2CaptainFK = team2Captain.trim() || null;
              
              // Validate that captains have values (they should always exist)
              if (!team1CaptainFK) {
                console.warn(`Warning: Team1_Captain is empty for team ${team1Name}. Setting to NULL.`);
              }
              if (!team2CaptainFK) {
                console.warn(`Warning: Team2_Captain is empty for team ${team2Name}. Setting to NULL.`);
              }
              
              const winnerName = match.Winning_Team || match.winner || '';
              const loserName = match.Losing_Team || match.loser || '';
              
              const team1Score = match.Winning_Team_Score || match.finalScore?.team1 || '';
              const team2Score = match.Losing_Team_Score || match.finalScore?.team2 || '';
              
              // Handle Man of the Match - should always have a value for completed matches
              const manOfTheMatch = match.Man_Of_The_Match || (typeof match.manOfTheMatch === 'object' ? match.manOfTheMatch?.name : match.manOfTheMatch) || '';
              
              // Convert to string and then handle empty values for foreign key constraint
              const manOfTheMatchStr = String(manOfTheMatch || '');
              const manOfTheMatchFK = manOfTheMatchStr.trim() || null;
              
              // Validate that Man of the Match has a value
              if (!manOfTheMatchFK) {
                console.warn(`Warning: Man_Of_The_Match is empty for match ${matchId}. Setting to NULL.`);
              }
              
              const matchDate = match.Date || match.ended || match.started || match.date || new Date().toISOString().split('T')[0];
              const gameStartTime = match.Game_Start_Time || match.started || null;
              const gameFinishTime = match.Game_Finish_Time || match.ended || null;
              const overs = Number(match.Overs || match.totalOvers || match.overs || 20);
              const result = match.Result || match.result || '';
              
                              console.log('Processing match:', {
                matchId,
                team1Name,
                team2Name,
                winnerName,
                loserName,
                team1Score,
                team2Score,
                manOfTheMatchFK,
                team1CaptainFK,
                team2CaptainFK
              });
              
              return env.cricket_mgr.prepare(`
                INSERT OR REPLACE INTO match_data 
                (Match_ID, group_id, Date, Team1, Team2, Team1_Captain, Team2_Captain,
                 Team1_Composition, Team2_Composition, Winning_Team, Losing_Team, 
                 Winning_Team_Score, Losing_Team_Score, Result, Man_Of_The_Match, 
                 Game_Start_Time, Game_Finish_Time, Overs) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                matchId,
                group_id,
                matchDate,
                team1Name,
                team2Name,
                team1CaptainFK, // Use null-converted value
                team2CaptainFK, // Use null-converted value
                match.Team1_Composition || '[]', // Team compositions as JSON strings
                match.Team2_Composition || '[]',
                winnerName,
                loserName,
                String(team1Score),
                String(team2Score),
                String(result),
                manOfTheMatchFK, // Use null-converted value
                gameStartTime,
                gameFinishTime,
                overs
              ).run();
            } catch (matchError) {
              console.error('Match insert error:', matchError, 'Match data:', match);
              throw matchError;
            }
          });
          
          // Wait for all matches to be inserted
          await Promise.all(matchPromises);
          console.log('All matches inserted successfully');
          
          // Process performance data last, after players and matches exist
          console.log('Inserting performance data...');
          const performancePromises = (performance_data || []).map((perf, index) => {
            try {
              const matchId = String(perf.Match_ID || `match_${Date.now()}_${index}`);
              const playerId = String(perf.Player_ID || `player_${Date.now()}_${index}`);
              
              console.log('Processing performance for player:', playerId, 'in match:', matchId);
              
              // Handle dismissal fields - convert empty strings to NULL and validate Player_IDs
              const dismissalType = perf.dismissalType === '' ? null : perf.dismissalType;
              
              // For dismissalFielder, check if it's a valid Player_ID format (timestamp-like number)
              // If it's not a valid Player_ID format (like "fielder" or player name), set to NULL
              let dismissalFielder = perf.dismissalFielder;
              if (dismissalFielder === '' || dismissalFielder === null || dismissalFielder === undefined) {
                dismissalFielder = null;
              } else if (dismissalFielder === 'fielder' || dismissalFielder === 'bowler' || isNaN(Number(dismissalFielder))) {
                // If it's a generic string like "fielder" or not a number, set to NULL
                console.warn(`Invalid dismissalFielder value "${dismissalFielder}" for player ${playerId}, setting to NULL`);
                dismissalFielder = null;
              }
              
              // For dismissalBowler, check if it's a valid Player_ID format (timestamp-like number)
              // If it's not a valid Player_ID format (like "Anil" or "bowler"), set to NULL
              let dismissalBowler = perf.dismissalBowler;
              if (dismissalBowler === '' || dismissalBowler === null || dismissalBowler === undefined) {
                dismissalBowler = null;
              } else if (dismissalBowler === 'bowler' || dismissalBowler === 'fielder' || isNaN(Number(dismissalBowler))) {
                // If it's a generic string like "bowler" or not a number, set to NULL
                console.warn(`Invalid dismissalBowler value "${dismissalBowler}" for player ${playerId}, setting to NULL`);
                dismissalBowler = null;
              }
              
              return env.cricket_mgr.prepare(`
                INSERT OR REPLACE INTO performance_data 
                (Match_ID, Player_ID, notOuts, runs, ballsFaced, fours, sixes,
                 ballsBowled, runsConceded, wickets, extras, maidenOvers, 
                 isOut, dismissalType, dismissalFielder, dismissalBowler) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                matchId,
                playerId,
                Number(perf.notOuts || 0),
                Number(perf.runs || 0),
                Number(perf.ballsFaced || 0),
                Number(perf.fours || 0),
                Number(perf.sixes || 0),
                Number(perf.ballsBowled || 0),
                Number(perf.runsConceded || 0),
                Number(perf.wickets || 0),
                Number(perf.extras || 0),
                Number(perf.maidenOvers || 0),
                Boolean(perf.isOut || false),
                dismissalType, // NULL if empty
                dismissalFielder, // NULL if empty
                dismissalBowler // NULL if empty
              ).run();
            } catch (perfError) {
              console.error('Performance insert error:', perfError, 'Performance data:', perf);
              throw perfError;
            }
          });
          
          // Wait for all performance data to be inserted
          await Promise.all(performancePromises);
          console.log('All performance data inserted successfully');
          
          return Response.json({ 
            success: true, 
            uploaded: { 
              players: players.length, 
              matches: matches.length,
              performance_records: performance_data?.length || 0
            } 
          }, { headers: corsHeaders });
          
        } catch (error) {
          console.error('Sync upload error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
          const errorStack = error instanceof Error ? error.stack : 'No stack trace available';
          
          return Response.json({ 
            success: false, 
            error: errorMessage,
            details: errorStack || 'No stack trace available'
          }, { 
            status: 500, 
            headers: corsHeaders 
          });
        }
      }

      // DELETE all performance data for a group
      if (path.match(/^\/groups\/\d+\/performance$/) && method === 'DELETE') {
        const groupId = parseInt(path.split('/')[2]);
        
        console.log(`🗑️ WORKER: Deleting all performance data for group ${groupId}`);
        const result = await env.cricket_mgr.prepare(
          "DELETE FROM performance_data WHERE Match_ID IN (SELECT Match_ID FROM match_data WHERE group_id = ?)"
        ).bind(groupId).run();
        
        console.log(`✅ WORKER: Deleted ${result.meta.changes} performance records for group ${groupId}`);
        return Response.json({ 
          success: true, 
          deleted: result.meta.changes,
          message: `Deleted ${result.meta.changes} performance records for group ${groupId}`
        }, { headers: corsHeaders });
      }

      // DELETE all matches for a group
      if (path.match(/^\/groups\/\d+\/matches$/) && method === 'DELETE') {
        const groupId = parseInt(path.split('/')[2]);
        
        console.log(`🗑️ WORKER: Deleting all match data for group ${groupId}`);
        const result = await env.cricket_mgr.prepare(
          "DELETE FROM match_data WHERE group_id = ?"
        ).bind(groupId).run();
        
        console.log(`✅ WORKER: Deleted ${result.meta.changes} match records for group ${groupId}`);
        return Response.json({ 
          success: true, 
          deleted: result.meta.changes,
          message: `Deleted ${result.meta.changes} match records for group ${groupId}`
        }, { headers: corsHeaders });
      }

      // DELETE all players for a group
      if (path.match(/^\/groups\/\d+\/players$/) && method === 'DELETE') {
        const groupId = parseInt(path.split('/')[2]);
        
        console.log(`🗑️ WORKER: Deleting all player data for group ${groupId}`);
        const result = await env.cricket_mgr.prepare(
          "DELETE FROM player_data WHERE group_id = ?"
        ).bind(groupId).run();
        
        console.log(`✅ WORKER: Deleted ${result.meta.changes} player records for group ${groupId}`);
        return Response.json({ 
          success: true, 
          deleted: result.meta.changes,
          message: `Deleted ${result.meta.changes} player records for group ${groupId}`
        }, { headers: corsHeaders });
      }

      // Bulk data sync - download (from D1 to app)
      if (path.startsWith('/sync/download/') && method === 'GET') {
        const groupId = parseInt(path.split('/')[3]);
        
        const playersResult = await env.cricket_mgr.prepare(
          "SELECT * FROM player_data WHERE group_id = ? ORDER BY Name"
        ).bind(groupId).all();
        
        const matchesResult = await env.cricket_mgr.prepare(
          "SELECT * FROM match_data WHERE group_id = ? ORDER BY Date DESC"
        ).bind(groupId).all();
        
        // Fetch performance data for this group
        const performanceResult = await env.cricket_mgr.prepare(
          "SELECT * FROM performance_data WHERE Match_ID IN (SELECT Match_ID FROM match_data WHERE group_id = ?)"
        ).bind(groupId).all();
        
        // Convert D1 format to app format
        const players = (playersResult.results as unknown as CricketPlayer[]).map(p => ({
          id: p.Player_ID,
          name: p.Name,
          bowling: p.Bowling_Style,
          batting: p.Batting_Style,
          is_star: p.Is_Star,
          matches: 0, // Will be calculated by app
          innings: 0,
          runs: 0,
          wickets: 0,
          // Add other default stats...
        }));
        
        const matches = (matchesResult.results as unknown as CricketMatch[]).map(m => ({
          id: m.Match_ID,
          date: m.Date,
          team1: { 
            name: m.Team1,
            captain: m.Team1_Captain
          },
          team2: { 
            name: m.Team2,
            captain: m.Team2_Captain
          },
          winningTeam: m.Winning_Team,
          losingTeam: m.Losing_Team,
          result: m.Result,
          overs: m.Overs,
          finalScore: {
            team1: m.Winning_Team_Score || 'N/A',
            team2: m.Losing_Team_Score || 'N/A'
          },
          // Convert Man_Of_The_Match Player_ID back to app format
          manOfTheMatch: m.Man_Of_The_Match ? {
            player: {
              id: m.Man_Of_The_Match
            }
          } : null,
          gameStartTime: m.Game_Start_Time,
          gameFinishTime: m.Game_Finish_Time
        }));
        
        return Response.json({ 
          players, 
          matches,
          performance_data: performanceResult.results, // Include performance data for app reconstruction
          teams: [] // Teams are generated dynamically
        }, { headers: corsHeaders });
      }

      // Default 404 response
      return Response.json({ 
        error: 'Endpoint not found',
        available_endpoints: [
          'GET /health',
          'POST /groups/auth',
          'POST /groups',
          'GET /groups/check/{name}',
          'GET /groups/{id}/data',
          'GET /groups/find/{name}',
          'POST /players',
          'POST /matches',
          'POST /sync/upload',
          'GET /sync/download/{groupId}',
          'DELETE /groups/{groupId}/performance',
          'DELETE /groups/{groupId}/matches',
          'DELETE /groups/{groupId}/players'
        ]
      }, { status: 404, headers: corsHeaders });

    } catch (error: any) {
      console.error('API Error:', error);
      return Response.json({ 
        error: 'Internal server error',
        message: error.message 
      }, { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  },
} satisfies ExportedHandler<Env>;
