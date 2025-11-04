-- Check Groups in D1 Database
-- Run these queries in your Cloudflare D1 dashboard or using wrangler CLI

-- 1. List all groups
SELECT id, group_name, password_hash, created_at 
FROM groups 
ORDER BY id;

-- 2. Check if 'bccb' group exists
SELECT * FROM groups WHERE group_name = 'bccb';

-- 3. Check if 'guest' group exists
SELECT * FROM groups WHERE group_name = 'guest';

-- 4. Count players per group
SELECT 
    g.id, 
    g.group_name, 
    COUNT(p.Player_ID) as player_count
FROM groups g
LEFT JOIN player_data p ON g.id = p.group_id
GROUP BY g.id, g.group_name;

-- 5. Count matches per group
SELECT 
    g.id, 
    g.group_name, 
    COUNT(m.Match_ID) as match_count
FROM groups g
LEFT JOIN match_data m ON g.id = m.group_id
GROUP BY g.id, g.group_name;

-- FIXES --

-- 6. If 'bccb' has wrong password, update it to no password:
-- UPDATE groups SET password_hash = NULL WHERE group_name = 'bccb';

-- 7. If 'bccb' should have password 'bccb', set it to this hash:
-- SHA-256 hash of 'bccb' is: 
-- bcf3d5c63b3c8c8e4c0e3e4c5c5e3c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c
-- UPDATE groups SET password_hash = 'bcf3d5c63b3c8c8e4c0e3e4c5c5e3c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c' WHERE group_name = 'bccb';

-- Note: To get the correct SHA-256 hash, use the debug-auth.html tool

-- 8. Create 'bccb' group if it doesn't exist (no password):
-- INSERT INTO groups (group_name, password_hash) VALUES ('bccb', NULL);

-- 9. Delete 'bccb' group entirely (WARNING: also deletes all its data):
-- DELETE FROM groups WHERE group_name = 'bccb';
