const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Disable Vercel's automatic body parsing so we receive the raw body.
// Stripe webhook signature verification requires the raw, unparsed body.
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'Stripe not configured' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return res.status(500).json({ error: 'Supabase not configured' });
  if (!process.env.STRIPE_WEBHOOK_SECRET) return res.status(500).json({ error: 'Webhook secret not configured' });

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  let event;
  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];
    if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header' });
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      if (!userId) {
        console.error('checkout.session.completed: missing user_id in metadata');
        return res.status(200).json({ received: true });
      }
      // Detect plan from the price id in the line items (best effort via interval)
      const plan = session.metadata?.plan || 'monthly';
      await sb.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        status: 'active',
        plan,
      }, { onConflict: 'user_id' });
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      if (invoice.subscription) {
        await sb.from('subscriptions').update({ status: 'active' })
          .eq('stripe_subscription_id', invoice.subscription);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      await sb.from('subscriptions').update({ status: 'cancelled' })
        .eq('stripe_subscription_id', sub.id);
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object;
      const status = sub.status === 'active' ? 'active' : sub.status;
      await sb.from('subscriptions').update({ status })
        .eq('stripe_subscription_id', sub.id);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
