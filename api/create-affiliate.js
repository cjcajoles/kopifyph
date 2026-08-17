// Admin-only: creates a REAL affiliate account — a Supabase Auth login plus
// the linked profiles/affiliates rows — so the affiliate can sign in at
// affiliate-login.html and see their own dashboard. Runs server-side only,
// since creating an Auth user requires SUPABASE_SERVICE_ROLE_KEY (never
// exposed in browser code).
//
// The caller's own Supabase access token is verified against profiles.role
// = 'admin' before anything is created, so this can't be called by just
// anyone who finds the URL.

const crypto = require('crypto');

// Same publishable ("anon") key used client-side in supabase-config.js —
// safe here too, it's not a secret. Only used to resolve who's calling.
const SUPABASE_ANON_KEY = 'sb_publishable_mzAmx4bXFuOjbiOsOu1XCA_0oBx8t6r';

const SB_ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
};

function randomPassword() {
  return crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12);
}

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

  const { name, email, address, region, code, facebookLink } = req.body || {};
  if (!name || !email || !address || !region || !code) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const normalizedCode = String(code).trim().toUpperCase();
  const tempPassword = randomPassword();
  let newUserId = null;

  try {
    const createRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: SB_ADMIN_HEADERS,
      body: JSON.stringify({ email, password: tempPassword, email_confirm: true }),
    });
    const created = await createRes.json();
    if (!createRes.ok) {
      const msg = /already.*registered|already exists/i.test(created?.msg || created?.message || '')
        ? 'That email already has an account.'
        : "Couldn't create that login.";
      res.status(400).json({ error: msg });
      return;
    }
    newUserId = created.id;

    const profileRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: { ...SB_ADMIN_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({ id: newUserId, email, role: 'affiliate', affiliate_code: normalizedCode, full_name: name }),
    });
    if (!profileRes.ok) throw new Error('profiles insert failed: ' + await profileRes.text());

    const affiliateRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/affiliates`, {
      method: 'POST',
      headers: { ...SB_ADMIN_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({ name, email, code: normalizedCode, region, address, facebook_link: facebookLink || null, status: 'Active' }),
    });
    if (!affiliateRes.ok) throw new Error('affiliates insert failed: ' + await affiliateRes.text());

    res.status(200).json({ email, code: normalizedCode, tempPassword });
  } catch (err) {
    console.error('create-affiliate error:', err);
    // Don't leave an orphaned, unusable login behind if a later step failed
    // (e.g. the affiliate code was already taken).
    if (newUserId) {
      await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${newUserId}`, {
        method: 'DELETE',
        headers: SB_ADMIN_HEADERS,
      }).catch(() => {});
    }
    const isDup = /duplicate key|already exists/i.test(err.message || '');
    res.status(isDup ? 400 : 500).json({ error: isDup ? 'That affiliate code is already taken.' : 'Something went wrong creating that affiliate.' });
  }
};
