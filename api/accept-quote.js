module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Config Supabase manquante' });

  const headers = {
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
  };

  // GET — fetch quote details by token
  if (req.method === 'GET') {
    const token = req.query.token;
    if (!token) return res.status(400).json({ error: 'Token manquant' });

    const r = await fetch(`${SB_URL}/rest/v1/quotes?accept_token=eq.${token}&select=id,num,ht,tva,ttc,status,created_at,client_id,mission_id`, { headers });
    const quotes = await r.json();
    if (!quotes?.length) return res.status(404).json({ error: 'Devis introuvable ou lien expiré' });
    const q = quotes[0];

    // Fetch client name
    const rc = await fetch(`${SB_URL}/rest/v1/clients?id=eq.${q.client_id}&select=name,email`, { headers });
    const clients = await rc.json();
    const client = clients?.[0] || {};

    return res.status(200).json({ quote: q, client });
  }

  // POST — accept or refuse
  if (req.method === 'POST') {
    const { token, action } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Token manquant' });

    const newStatus = action === 'refuse' ? 'Refusé' : 'Accepté';

    // Find quote
    const r = await fetch(`${SB_URL}/rest/v1/quotes?accept_token=eq.${token}&select=id,mission_id,status`, { headers });
    const quotes = await r.json();
    if (!quotes?.length) return res.status(404).json({ error: 'Devis introuvable' });
    const q = quotes[0];

    if (q.status === 'Accepté' || q.status === 'Refusé') {
      return res.status(200).json({ success: true, already: true, status: q.status });
    }

    // Update quote status
    await fetch(`${SB_URL}/rest/v1/quotes?id=eq.${q.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ status: newStatus }),
    });

    // Update mission status if accepted
    if (newStatus === 'Accepté' && q.mission_id) {
      await fetch(`${SB_URL}/rest/v1/missions?id=eq.${q.mission_id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ status: 'Accepté' }),
      });
    }

    return res.status(200).json({ success: true, status: newStatus });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
