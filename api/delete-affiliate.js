// Admin-only: fully removes an affiliate — their Supabase Auth login (which
// cascades and removes their profiles row too, see schema.sql), and their
// row in the public affiliates roster. Runs server-side since deleting an
// Auth user requires SUPABASE_SERVICE_ROLE_KEY.

const SUPABASE_ANON_KEY = 'sb_publishable_mzAmx4bXFuOjbiOsOu1XCA_0oBx8t6r';

const SB_ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
};

async function requireAdmin(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return false;

  const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return false;
  const user = await userRes.json();

  const profileRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`,
    { headers: SB_ADMIN_HEADERS }
  );
  const profiles = await profileRes.json();
  return profiles[0]?.role === 'admin';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const isAdmin = await requireAdmin(req);
  if (!isAdmin) {
    res.status(403).json({ error: 'Admins only' });
    return;
  }

  const { code } = req.body || {};
  if (!code) {
    res.status(400).json({ error: 'Missing affiliate code' });
    return;
  }

  try {
    const profileRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/profiles?affiliate_code=eq.${encodeURIComponent(code)}&select=id`,
      { headers: SB_ADMIN_HEADERS }
    );
    const profiles = await profileRes.json();
    const userId = profiles[0]?.id;

    if (userId) {
      // Cascades to delete their profiles row too (profiles.id references
      // auth.users(id) on delete cascade).
      await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: SB_ADMIN_HEADERS,
      });
    }

    await fetch(`${process.env.SUPABASE_URL}/rest/v1/affiliates?code=eq.${encodeURIComponent(code)}`, {
      method: 'DELETE',
      headers: { ...SB_ADMIN_HEADERS, Prefer: 'return=minimal' },
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('delete-affiliate error:', err);
    res.status(500).json({ error: 'Something went wrong deleting that affiliate.' });
  }
};
