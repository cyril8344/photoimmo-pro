const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Resend API key not configured' });
  }

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email requis' });

  // Verify admin role via Authorization header
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);

  const sbUser = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY || SUPABASE_SERVICE_KEY);
  const { data: { user: callerUser }, error: authErr } = await sbUser.auth.getUser(token);
  if (authErr || !callerUser) return res.status(401).json({ error: 'Token invalide' });

  // Check admin role
  const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: callerProfile } = await sbAdmin
    .from('user_profiles')
    .select('role')
    .eq('user_id', callerUser.id)
    .single();

  if (!callerProfile || callerProfile.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }

  try {
    // Generate invite link via Supabase Admin
    const { data: linkData, error: linkErr } = await sbAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
    });
    if (linkErr) throw new Error(linkErr.message);

    const inviteUrl = linkData?.properties?.action_link || '';

    // Send invitation email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PhotoImmo Pro <notifications@photoimmo.pro>',
        to: [email],
        subject: '🎉 Invitation à rejoindre PhotoImmo Pro',
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1117;color:#e5e7eb;padding:40px;border-radius:16px;">
            <div style="background:#f59e0b;padding:20px;border-radius:12px;text-align:center;margin-bottom:30px;">
              <h1 style="color:#000;margin:0;font-size:24px;">📸 PhotoImmo Pro</h1>
            </div>
            <h2 style="color:#f59e0b;">Vous avez été invité !</h2>
            <p>Bonjour,</p>
            <p>Un administrateur vous invite à rejoindre PhotoImmo Pro, la plateforme de gestion pour photographes immobiliers.</p>
            ${inviteUrl ? `
            <div style="text-align:center;margin:30px 0;">
              <a href="${inviteUrl}" style="background:#f59e0b;color:#000;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;">
                Accepter l'invitation
              </a>
            </div>
            ` : ''}
            <p style="color:#6b7280;font-size:12px;">Ce lien expire dans 24 heures. PhotoImmo Pro</p>
          </div>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    if (!emailResponse.ok) throw new Error(emailResult.message || 'Erreur envoi email');

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur invitation' });
  }
};
