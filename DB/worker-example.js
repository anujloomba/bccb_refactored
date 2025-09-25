// Cloudflare Worker for Cricket Manager D1 API
// This is an example of what you need to deploy

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (path === '/health') {
        return Response.json({ status: 'ok', timestamp: Date.now() }, { headers: corsHeaders });
      }

      // Group authentication
      if (path === '/groups/auth' && method === 'POST') {
        const body = await request.json();
        const { group_name, password_hash } = body;
        
        const group = await env.cricket_mgr.prepare(
          "SELECT * FROM groups WHERE group_name = ? AND (password_hash = ? OR password_hash IS NULL)"
        ).bind(group_name, password_hash).first();
        
        if (group) {
          return Response.json({ success: true, group }, { headers: corsHeaders });
        } else {
          return Response.json({ success: false, error: 'Invalid credentials' }, { 
            status: 401, 
            headers: corsHeaders 
          });
        }
      }

      // Create new group
      if (path === '/groups' && method === 'POST') {
        const body = await request.json();
        const { group_name, password_hash } = body;
        
        try {
          const result = await env.cricket_mgr.prepare(
            "INSERT INTO groups (group_name, password_hash) VALUES (?, ?)"
          ).bind(group_name, password_hash).run();
          
          return Response.json({ 
            success: true, 
            group: { id: result.meta.last_row_id, group_name } 
          }, { headers: corsHeaders });
        } catch (error) {
          return Response.json({ 
            success: false, 
            error: 'Group name already exists' 
          }, { status: 409, headers: corsHeaders });
        }
      }

      // Get group data
      if (path.startsWith('/groups/') && path.endsWith('/data') && method === 'GET') {
        const groupId = path.split('/')[2];
        
        const players = await env.cricket_mgr.prepare(
          "SELECT * FROM player_data WHERE group_id = ?"
        ).bind(groupId).all();
        
        const matches = await env.cricket_mgr.prepare(
          "SELECT * FROM match_data WHERE group_id = ?"
        ).bind(groupId).all();
        
        return Response.json({ 
          players: players.results, 
          matches: matches.results 
        }, { headers: corsHeaders });
      }

      // Sync data upload
      if (path === '/sync/upload' && method === 'POST') {
        const body = await request.json();
        const { group_id, players, matches } = body;
        
        // This would implement bulk upsert logic
        // For now, return success
        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // Sync data download
      if (path.startsWith('/sync/download/') && method === 'GET') {
        const groupId = path.split('/')[3];
        
        const players = await env.cricket_mgr.prepare(
          "SELECT * FROM player_data WHERE group_id = ?"
        ).bind(groupId).all();
        
        const matches = await env.cricket_mgr.prepare(
          "SELECT * FROM match_data WHERE group_id = ?"
        ).bind(groupId).all();
        
        return Response.json({ 
          players: players.results, 
          matches: matches.results 
        }, { headers: corsHeaders });
      }

      return Response.json({ error: 'Not found' }, { 
        status: 404, 
        headers: corsHeaders 
      });

    } catch (error) {
      return Response.json({ 
        error: error.message 
      }, { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  },
};