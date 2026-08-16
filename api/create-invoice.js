// Creates a Xendit invoice for a Kopify order and returns its payment URL.
// Runs server-side only (Vercel serverless function) — this is the one place
// XENDIT_SECRET_KEY is used, since exposing it in browser code would let
// anyone create invoices (and see/cancel existing ones) on our Xendit account.
//
// Voucher codes are re-validated here rather than trusted from the client —
// a shopper editing devtools can change what checkout.html *displays*, but
// not what actually gets charged, since this function computes its own
// authoritative discount and is the only place the real Xendit invoice is made.

async function validateVoucher(voucherCode, subtotal) {
  if (!voucherCode) return { discount: 0, appliedCode: null };

  const url = `${process.env.SUPABASE_URL}/rest/v1/vouchers?code=eq.${encodeURIComponent(voucherCode.toUpperCase())}&select=*`;
  const res = await fetch(url, {
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const rows = await res.json();
  const v = rows[0];
  if (!v) return { discount: 0, appliedCode: null };

  const today = new Date().toISOString().slice(0, 10);
  const isValid = today >= v.valid_from && today <= v.valid_until
    && v.used_count < v.usage_limit
    && subtotal >= v.min_spend;
  if (!isValid) return { discount: 0, appliedCode: null };

  const discount = v.type === 'Percentage' ? Math.round(subtotal * v.amount / 100) : Math.min(v.amount, subtotal);

  // Best-effort usage count — not perfectly race-safe under simultaneous
  // redemptions, and counts at invoice-creation rather than confirmed
  // payment, which is an accepted simplification for a small promo-code
  // volume rather than building a fully atomic reservation system.
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/vouchers?id=eq.${v.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ used_count: v.used_count + 1 }),
  });

  return { discount, appliedCode: v.code };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { orderNumber, amount, subtotal, voucherCode, payerEmail, payerName, description, successUrl, failureUrl } = req.body || {};
  if (!orderNumber || !amount || !payerEmail || !successUrl || !failureUrl) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // Xendit's external_id is a plain identifier — strip the leading "#" so it
  // travels cleanly through URLs; the webhook re-adds it when matching back
  // to orders.order_number.
  const externalId = String(orderNumber).replace(/^#/, '');

  try {
    const { discount, appliedCode } = await validateVoucher(voucherCode, subtotal ?? amount);
    const finalAmount = Math.max(0, amount - discount);

    // Keep the order row (already inserted by checkout.html with a
    // client-computed total) in sync with the server-authoritative amount —
    // this is what actually matters if the two ever disagree.
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ total: finalAmount, discount, voucher_code: appliedCode }),
    });

    const xenditRes = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64'),
      },
      body: JSON.stringify({
        external_id: externalId,
        amount: finalAmount,
        payer_email: payerEmail,
        description: description || `Kopify PH order ${orderNumber}${payerName ? ' — ' + payerName : ''}`,
        currency: 'PHP',
        success_redirect_url: successUrl,
        failure_redirect_url: failureUrl,
      }),
    });

    const data = await xenditRes.json();
    if (!xenditRes.ok) {
      console.error('Xendit invoice creation failed:', data);
      res.status(502).json({ error: 'Could not create payment invoice' });
      return;
    }

    res.status(200).json({ invoiceUrl: data.invoice_url });
  } catch (err) {
    console.error('create-invoice error:', err);
    res.status(500).json({ error: 'Unexpected server error' });
  }
};
