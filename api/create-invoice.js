// Creates a Xendit invoice for a Kopify order and returns its payment URL.
// Runs server-side only (Vercel serverless function) — this is the one place
// XENDIT_SECRET_KEY is used, since exposing it in browser code would let
// anyone create invoices (and see/cancel existing ones) on our Xendit account.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { orderNumber, amount, payerEmail, payerName, description, successUrl, failureUrl } = req.body || {};
  if (!orderNumber || !amount || !payerEmail || !successUrl || !failureUrl) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // Xendit's external_id is a plain identifier — strip the leading "#" so it
  // travels cleanly through URLs; the webhook re-adds it when matching back
  // to orders.order_number.
  const externalId = String(orderNumber).replace(/^#/, '');

  try {
    const xenditRes = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64'),
      },
      body: JSON.stringify({
        external_id: externalId,
        amount,
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
