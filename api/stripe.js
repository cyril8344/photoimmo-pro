const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const { action, user_id, email, plan } = req.body || {};

  if (action === 'create_checkout') {
    if (!user_id || !email) return res.status(400).json({ error: 'Missing user_id or email' });
    try {
      const priceId = plan === 'yearly'
        ? process.env.STRIPE_PRICE_YEARLY
        : process.env.STRIPE_PRICE_MONTHLY;
      const session = await stripe.checkout.sessions.create({
        customer_email: email,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        metadata: { user_id },
        success_url: `${process.env.APP_URL}/app?subscribed=1`,
        cancel_url: `${process.env.APP_URL}/app`,
      });
      return res.status(200).json({ url: session.url });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (action === 'portal') {
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    try {
      const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const { data } = await sb.from('subscriptions').select('stripe_customer_id').eq('user_id', user_id).single();
      if (!data?.stripe_customer_id) return res.status(404).json({ error: 'No subscription found' });
      const session = await stripe.billingPortal.sessions.create({
        customer: data.stripe_customer_id,
        return_url: `${process.env.APP_URL}/app`,
      });
      return res.status(200).json({ url: session.url });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Unknown action' });
};
