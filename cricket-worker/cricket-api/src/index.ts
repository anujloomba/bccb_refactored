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
  Team1_Composition?: string;
  Team2_Composition?: string;
  Winning_Team: string;
  Losing_Team: string;
  Winning_Team_Score: string;
  Losing_Team_Score: string;
  Result: string;
  Overs: number;
  Man_Of_The_Match: string;
  Game_Start_Time: string;
  Game_Finish_Time: string;
  Winning_Captain?: string;
  Losing_Captain?: string;
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

      if (path === '/message' && method === 'GET') {
        return new Response('Hello, World!', {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain'
          }
        });
      }

      if (path === '/random' && method === 'GET') {
        const generateUuid = (): string => {
          const cryptoRef = (globalThis as unknown as { crypto?: Crypto }).crypto;
          if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
            return cryptoRef.randomUUID();
          }
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
            const random = Math.random() * 16 | 0;
            const value = char === 'x' ? random : (random & 0x3 | 0x8);
            return value.toString(16);
          });
        };

        const uuid = generateUuid();
        return new Response(uuid, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain'
          }
        });
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

      // Save match (ONLY if it doesn't exist - prevents partial overwrites)
      if (path === '/matches' && method === 'POST') {
        const body = await request.json() as CricketMatch;
        const { 
          Match_ID, group_id, Date, Team1, Team2, Team1_Captain, Team2_Captain,
          Winning_Team, Losing_Team, Winning_Team_Score, Losing_Team_Score, Result,
          Overs, Man_Of_The_Match, Game_Start_Time, Game_Finish_Time,
          Team1_Composition, Team2_Composition, Winning_Captain, Losing_Captain
        } = body;

        // � DEBUG: Log all incoming match data
        console.log('🔍 DEBUG: /matches POST endpoint called');
        console.log(`🔍 DEBUG: Match_ID=${Match_ID}, Team1=${Team1}, Team2=${Team2}`);
        console.log(`🔍 DEBUG: Team1_Captain=${Team1_Captain}, Team2_Captain=${Team2_Captain}`);
        console.log(`🔍 DEBUG: Man_Of_The_Match=${Man_Of_The_Match}`);
        console.log(`🔍 DEBUG: Winning_Captain=${Winning_Captain}, Losing_Captain=${Losing_Captain}`);

        // �🔒 SAFEGUARD: Check if match already exists - prevent partial overwrites
        const existingMatch = await env.cricket_mgr.prepare(
          "SELECT Match_ID, Team1_Captain, Team2_Captain, Man_Of_The_Match, Winning_Captain, Losing_Captain FROM match_data WHERE Match_ID = ?"
        ).bind(Match_ID).first();
        
        if (existingMatch) {
          console.log(`⚠️ WORKER: Match ${Match_ID} already exists in database`);
          console.log(`⚠️ WORKER: Existing data - Team1_Captain=${existingMatch.Team1_Captain}, Team2_Captain=${existingMatch.Team2_Captain}, MOTM=${existingMatch.Man_Of_The_Match}`);
          console.log(`⚠️ WORKER: Incoming data - Team1_Captain=${Team1_Captain}, Team2_Captain=${Team2_Captain}, MOTM=${Man_Of_The_Match}`);
          console.log(`🚫 WORKER: BLOCKING save to prevent data loss`);
          return Response.json({ 
            success: false, 
            error: 'Match already exists. Delete existing match before re-saving.',
            match_id: Match_ID
          }, { status: 409, headers: corsHeaders });
        }

        const serializeComposition = (composition: unknown): string => {
          if (typeof composition === 'string') {
            const trimmed = composition.trim();
            return trimmed || '[]';
          }
          if (Array.isArray(composition)) {
            return JSON.stringify(composition);
          }
          return '[]';
        };

        // 🔍 DEBUG: Log RAW values received from app
        console.log(`🔍 WORKER_RECEIVED: Match ${Match_ID} RAW captain data from app:`);
        console.log(`🔍 WORKER_RECEIVED: Team1_Captain (raw) = "${Team1_Captain}" (type: ${typeof Team1_Captain})`);
        console.log(`🔍 WORKER_RECEIVED: Team2_Captain (raw) = "${Team2_Captain}" (type: ${typeof Team2_Captain})`);
        console.log(`🔍 WORKER_RECEIVED: Winning_Captain (raw) = "${Winning_Captain}" (type: ${typeof Winning_Captain})`);
        console.log(`🔍 WORKER_RECEIVED: Losing_Captain (raw) = "${Losing_Captain}" (type: ${typeof Losing_Captain})`);
        console.log(`🔍 WORKER_RECEIVED: Man_Of_The_Match (raw) = "${Man_Of_The_Match}" (type: ${typeof Man_Of_The_Match})`);

        const sanitizedTeam1Captain = Team1_Captain?.trim() || null;
        const sanitizedTeam2Captain = Team2_Captain?.trim() || null;
        const sanitizedWinningCaptain = Winning_Captain?.trim() || null;
        const sanitizedLosingCaptain = Losing_Captain?.trim() || null;
        const team1CompositionValue = serializeComposition(Team1_Composition);
        const team2CompositionValue = serializeComposition(Team2_Composition);
        const gameStartTimeValue = Game_Start_Time?.trim() || null;
        const gameFinishTimeValue = Game_Finish_Time?.trim() || null;
        const manOfTheMatchValue = Man_Of_The_Match?.trim() || null;
        
        const team1Value = Team1?.trim() || 'Team 1';
        const team2Value = Team2?.trim() || 'Team 2';
        const winningTeamValue = Winning_Team || '';
        const losingTeamValue = Losing_Team || '';
        const resultValue = Result || '';
        const oversValue = typeof Overs === 'number' && !isNaN(Overs) ? Overs : Number(Overs) || 0;

        // 🔍 DEBUG: Log sanitized values that will be inserted
        console.log(`🔍 WORKER_SANITIZED: Match ${Match_ID} AFTER sanitization:`);
        console.log(`🔍 WORKER_SANITIZED: Team1_Captain = ${sanitizedTeam1Captain === null ? 'NULL' : `"${sanitizedTeam1Captain}"`}`);
        console.log(`🔍 WORKER_SANITIZED: Team2_Captain = ${sanitizedTeam2Captain === null ? 'NULL' : `"${sanitizedTeam2Captain}"`}`);
        console.log(`🔍 WORKER_SANITIZED: Winning_Captain = ${sanitizedWinningCaptain === null ? 'NULL' : `"${sanitizedWinningCaptain}"`}`);
        console.log(`🔍 WORKER_SANITIZED: Losing_Captain = ${sanitizedLosingCaptain === null ? 'NULL' : `"${sanitizedLosingCaptain}"`}`);
        console.log(`🔍 WORKER_SANITIZED: Man_Of_The_Match = ${manOfTheMatchValue === null ? 'NULL' : `"${manOfTheMatchValue}"`}`);

        // 🔒 Use INSERT (not INSERT OR REPLACE) to prevent accidental overwrites
        try {
          console.log(`🔍 WORKER_INSERT: Executing INSERT for match ${Match_ID}...`);
          
          const insertResult = await env.cricket_mgr.prepare(`
            INSERT INTO match_data 
            (Match_ID, group_id, Date, Team1, Team2, Team1_Captain, Team2_Captain,
             Team1_Composition, Team2_Composition, Winning_Team, Losing_Team,
             Game_Start_Time, Game_Finish_Time, Winning_Team_Score, Losing_Team_Score,
             Result, Overs, Man_Of_The_Match, Winning_Captain, Losing_Captain) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            Match_ID,
            group_id,
            Date,
            team1Value,
            team2Value,
            sanitizedTeam1Captain,
            sanitizedTeam2Captain,
            team1CompositionValue,
            team2CompositionValue,
            winningTeamValue,
            losingTeamValue,
            gameStartTimeValue,
            gameFinishTimeValue,
            String(Winning_Team_Score || ''),
            String(Losing_Team_Score || ''),
            resultValue,
            oversValue,
            manOfTheMatchValue,
            sanitizedWinningCaptain,
            sanitizedLosingCaptain
          ).run();
          
          console.log(`✅ WORKER_INSERT: INSERT completed for match ${Match_ID}`);
          console.log(`✅ WORKER_INSERT: Result meta:`, JSON.stringify(insertResult.meta));
          
          // 🔍 VERIFY: Read back the data to confirm it was stored
          const verification = await env.cricket_mgr.prepare(`
            SELECT Match_ID, Team1_Captain, Team2_Captain, Winning_Captain, Losing_Captain, Man_Of_The_Match
            FROM match_data
            WHERE Match_ID = ?
          `).bind(Match_ID).first();
          
          console.log(`🔍 WORKER_VERIFY: Data read back from D1 for match ${Match_ID}:`);
          console.log(`🔍 WORKER_VERIFY: Team1_Captain = ${verification?.Team1_Captain === null ? 'NULL' : `"${verification?.Team1_Captain}"`}`);
          console.log(`🔍 WORKER_VERIFY: Team2_Captain = ${verification?.Team2_Captain === null ? 'NULL' : `"${verification?.Team2_Captain}"`}`);
          console.log(`🔍 WORKER_VERIFY: Winning_Captain = ${verification?.Winning_Captain === null ? 'NULL' : `"${verification?.Winning_Captain}"`}`);
          console.log(`🔍 WORKER_VERIFY: Losing_Captain = ${verification?.Losing_Captain === null ? 'NULL' : `"${verification?.Losing_Captain}"`}`);
          console.log(`🔍 WORKER_VERIFY: Man_Of_The_Match = ${verification?.Man_Of_The_Match === null ? 'NULL' : `"${verification?.Man_Of_The_Match}"`}`);
          
          // 🚨 ALERT if data mismatch
          if (verification?.Team1_Captain !== sanitizedTeam1Captain || verification?.Team2_Captain !== sanitizedTeam2Captain) {
            console.error(`🚨 WORKER_MISMATCH: Captain data MISMATCH detected!`);
            console.error(`🚨 WORKER_MISMATCH: Expected Team1_Captain="${sanitizedTeam1Captain}", got "${verification?.Team1_Captain}"`);
            console.error(`🚨 WORKER_MISMATCH: Expected Team2_Captain="${sanitizedTeam2Captain}", got "${verification?.Team2_Captain}"`);
          }
          
          console.log(`✅ WORKER: New match ${Match_ID} saved successfully to D1`);
          return Response.json({ success: true }, { headers: corsHeaders });
          
        } catch (insertError) {
          console.error(`🚨 WORKER_ERROR: INSERT failed for match ${Match_ID}:`, insertError);
          console.error(`🚨 WORKER_ERROR: Error details:`, JSON.stringify(insertError, null, 2));
          return Response.json({ 
            success: false, 
            error: 'Database INSERT failed',
            details: String(insertError)
          }, { status: 500, headers: corsHeaders });
        }
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
          
          console.log('🔍 DEBUG: ============================================');
          console.log('🔍 DEBUG: BULK SYNC /sync/upload endpoint called');
          console.log('🔍 DEBUG: ============================================');
          console.log('Sync upload request:', { 
            group_id, 
            playersCount: players?.length, 
            matchesCount: matches?.length,
            performanceCount: performance_data?.length
          });
          
          // 🐛 DEBUG: Log all match IDs being synced
          if (matches && matches.length > 0) {
            console.log('🔍 DEBUG: Match IDs in sync request:', matches.map(m => m.Match_ID || m.id));
          }
          
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
              
              console.log(`📝 WORKER: Upserting match ${matchId}`);
              
              const team1Name = match.Team1 || (typeof match.team1 === 'object' ? match.team1?.name : match.team1) || 'Team 1';
              const team2Name = match.Team2 || (typeof match.team2 === 'object' ? match.team2?.name : match.team2) || 'Team 2';
              
                            // Handle captains - should always have values since teams are formed from existing players
              const team1Captain = match.Team1_Captain || (typeof match.team1 === 'object' ? match.team1?.captain?.id : '') || '';
              const team2Captain = match.Team2_Captain || (typeof match.team2 === 'object' ? match.team2?.captain?.id : '') || '';
              
              // Convert empty strings to null for foreign key constraints
              // Ensure values are strings before calling trim()
              const team1CaptainFK = team1Captain ? String(team1Captain).trim() || null : null;
              const team2CaptainFK = team2Captain ? String(team2Captain).trim() || null : null;
              
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

              const winningCaptain = match.Winning_Captain || match.winningCaptainId || '';
              const losingCaptain = match.Losing_Captain || match.losingCaptainId || '';
              const winningCaptainFK = String(winningCaptain || '').trim() || null;
              const losingCaptainFK = String(losingCaptain || '').trim() || null;

              const serializeComposition = (value: unknown): string => {
                if (typeof value === 'string') {
                  const trimmed = value.trim();
                  return trimmed || '[]';
                }
                if (Array.isArray(value)) {
                  return JSON.stringify(value);
                }
                return '[]';
              };

              const team1CompositionValue = serializeComposition(match.Team1_Composition ?? match.team1Composition);
              const team2CompositionValue = serializeComposition(match.Team2_Composition ?? match.team2Composition);
              
              const matchDate = match.Date || match.ended || match.started || match.date || new Date().toISOString().split('T')[0];
              const gameStartTimeRaw = match.Game_Start_Time || match.started || null;
              const gameFinishTimeRaw = match.Game_Finish_Time || match.ended || null;
              const gameStartTimeValue = gameStartTimeRaw ? String(gameStartTimeRaw).trim() || null : null;
              const gameFinishTimeValue = gameFinishTimeRaw ? String(gameFinishTimeRaw).trim() || null : null;
              const overs = Number(match.Overs || match.totalOvers || match.overs || 20);
              const result = match.Result || match.result || '';
              
              console.log('� Upserting match data:', {
                matchId,
                team1Name,
                team2Name,
                team1CaptainFK,
                team2CaptainFK
              });
              
              return env.cricket_mgr.prepare(`
                INSERT OR REPLACE INTO match_data 
                (Match_ID, group_id, Date, Team1, Team2, Team1_Captain, Team2_Captain,
                 Team1_Composition, Team2_Composition, Winning_Team, Losing_Team, 
                 Game_Start_Time, Game_Finish_Time, Winning_Team_Score, Losing_Team_Score, 
                 Result, Overs, Man_Of_The_Match, Winning_Captain, Losing_Captain) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                matchId,
                group_id,
                matchDate,
                team1Name,
                team2Name,
                team1CaptainFK, // Use null-converted value
                team2CaptainFK, // Use null-converted value
                team1CompositionValue,
                team2CompositionValue,
                winnerName,
                loserName,
                gameStartTimeValue,
                gameFinishTimeValue,
                String(team1Score ?? ''),
                String(team2Score ?? ''),
                String(result),
                overs,
                manOfTheMatchFK, // Use null-converted value
                winningCaptainFK,
                losingCaptainFK
              ).run();
            } catch (matchError) {
              console.error('❌ WORKER: Match insert error:', matchError, 'Match data:', match);
              throw matchError;
            }
          });
          
          // Wait for all matches to be inserted
          await Promise.all(matchPromises);
          console.log('✅ WORKER: All matches inserted successfully');
          
          // Process performance data last, after players and matches exist
          console.log('Inserting performance data...');
          
          const performancePromises = (performance_data || []).map((perf, index) => {
            try {
              const matchId = String(perf.Match_ID || `match_${Date.now()}_${index}`);
              const playerId = String(perf.Player_ID || `player_${Date.now()}_${index}`);
              
              console.log('📝 Upserting performance for player:', playerId, 'in match:', matchId);
              
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
              
              // Use INSERT OR IGNORE - UNIQUE constraint will prevent duplicates
              return env.cricket_mgr.prepare(`
                INSERT OR IGNORE INTO performance_data 
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
          gameFinishTime: m.Game_Finish_Time,
          // 🔄 CRITICAL: Include team compositions for captain performance tracking
          Team1_Composition: m.Team1_Composition,
          Team2_Composition: m.Team2_Composition
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
          'GET /message',
          'GET /random',
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
