// The single Xendit webhook for the whole account — Xendit only allows one
// callback URL per event type, so this doubles as a router: Kopify orders
// (external_id starting "KPY") get marked Paid directly in Supabase, with
// stock automatically deducted; every other invoice (e.g. the existing
// Lovable digital product) is forwarded unchanged to its original Zapier
// webhook, so that automation keeps working without any change on Zapier's side.

const SB_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
};

async function markPaidAndDeductStock(orderNumber) {
  // Idempotency guard — Xendit retries (and we've manually clicked "Resend"
  // plenty ourselves) could otherwise deduct stock twice for one order.
  const getRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}&select=status,pack,boxes`,
    { headers: SB_HEADERS }
  );
  const rows = await getRes.json();
  const order = rows[0];
  if (!order || order.status === 'Paid') return;

  const patchRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}`,
    { method: 'PATCH', headers: { ...SB_HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'Paid' }) }
  );
  if (!patchRes.ok) throw new Error('Could not update order: ' + await patchRes.text());

  const prodRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/products?name=eq.${encodeURIComponent(order.pack)}&select=stock`,
    { headers: SB_HEADERS }
  );
  const products = await prodRes.json();
  const product = products[0];
  if (!product) return; // pack name didn't match a known product — nothing to deduct

  const newStock = Math.max(0, product.stock - order.boxes);
  await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/products?name=eq.${encodeURIComponent(order.pack)}`,
    { method: 'PATCH', headers: { ...SB_HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify({ stock: newStock }) }
  );
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/stock_movements`, {
    method: 'POST',
    headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify({ product_name: order.pack, delta: -order.boxes, reason: `Order ${orderNumber} paid` }),
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = req.headers['x-callback-token'];
  if (!token || token !== process.env.XENDIT_WEBHOOK_TOKEN) {
    res.status(401).json({ error: 'Invalid webhook token' });
    return;
  }

  const payload = req.body || {};
  const externalId = payload.external_id || '';

  try {
    if (externalId.startsWith('KPY')) {
      if (payload.status === 'PAID' || payload.status === 'SETTLED') {
        await markPaidAndDeductStock('#' + externalId);
      }
      // Any other Kopify-order status (EXPIRED, PENDING, ...) — nothing to do yet.
      res.status(200).json({ ok: true });
      return;
    }

    // Not a Kopify order — relay untouched to the existing Zapier automation.
    const forwardRes = await fetch(process.env.ZAPIER_FORWARD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!forwardRes.ok) {
      console.error('Zapier forward failed:', forwardRes.status);
      res.status(502).json({ error: 'Could not forward to Zapier' });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('xendit-webhook error:', err);
    res.status(500).json({ error: 'Unexpected server error' });
  }
};
