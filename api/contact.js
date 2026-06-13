module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'Resend API key not configured' });

  const { name, email, phone, address, type, message, photographer_slug } = req.body || {};

  if (!name || !email || !photographer_slug) {
    return res.status(400).json({ error: 'Champs requis manquants : name, email, photographer_slug' });
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Format email invalide' });
  }

  // Look up photographer email via Supabase (optional — falls back to notifications@)
  let photographerEmail = 'notifications@photoimmo.pro';
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const { data: profileData } = await sb
        .from('user_profiles')
        .select('user_id')
        .eq('portfolio_slug', photographer_slug)
        .single();
      if (profileData?.user_id) {
        const { data: userData } = await sb.auth.admin.getUserById(profileData.user_id);
        if (userData?.user?.email) photographerEmail = userData.user.email;
      }
    } catch (_) {
      // Fall through to default email
    }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PhotoImmo Pro <notifications@photoimmo.pro>',
        to: [photographerEmail],
        reply_to: email,
        subject: `📩 Nouveau contact portfolio — ${name}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1117;color:#e5e7eb;padding:40px;border-radius:16px;">
            <div style="background:#f59e0b;padding:20px;border-radius:12px;text-align:center;margin-bottom:30px;">
              <h1 style="color:#000;margin:0;font-size:24px;">📸 PhotoImmo Pro</h1>
            </div>
            <h2 style="color:#f59e0b;">Nouveau contact depuis votre portfolio</h2>
            <div style="background:#1a1d27;border-radius:12px;padding:20px;margin:20px 0;">
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="color:#9ca3af;padding:6px 0;width:140px;">Nom</td><td style="color:#e5e7eb;font-weight:bold;">${name}</td></tr>
                <tr><td style="color:#9ca3af;padding:6px 0;">Email</td><td><a href="mailto:${email}" style="color:#f59e0b;">${email}</a></td></tr>
                ${phone ? `<tr><td style="color:#9ca3af;padding:6px 0;">Téléphone</td><td style="color:#e5e7eb;">${phone}</td></tr>` : ''}
                ${address ? `<tr><td style="color:#9ca3af;padding:6px 0;">Adresse du bien</td><td style="color:#e5e7eb;">${address}</td></tr>` : ''}
                ${type ? `<tr><td style="color:#9ca3af;padding:6px 0;">Type de bien</td><td style="color:#e5e7eb;">${type}</td></tr>` : ''}
              </table>
            </div>
            ${message ? `
            <div style="background:#1a1d27;border-radius:12px;padding:20px;margin:20px 0;">
              <p style="color:#9ca3af;margin:0 0 8px 0;font-size:12px;">MESSAGE</p>
              <p style="color:#e5e7eb;margin:0;">${message.replace(/\n/g, '<br>')}</p>
            </div>
            ` : ''}
            <p style="color:#6b7280;font-size:12px;margin-top:20px;">
              Contact via le portfolio : ${photographer_slug}
            </p>
          </div>
        `,
      }),
    });

    const result = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: result.message || 'Erreur envoi' });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};
