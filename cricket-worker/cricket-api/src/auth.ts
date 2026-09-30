export async function isAdminGroup(
  env: Env,
  groupId: number,
  adminPasswordHash: unknown
): Promise<boolean> {
  if (typeof adminPasswordHash !== 'string' || adminPasswordHash.length === 0) {
    return false;
  }
  const group = await env.cricket_mgr.prepare(
    'SELECT id FROM groups WHERE id = ? AND admin_password_hash = ?'
  ).bind(groupId, adminPasswordHash).first<{ id: number }>();
  return Boolean(group);
}
