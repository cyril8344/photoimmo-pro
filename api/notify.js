module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, to, data } = req.body || {};
  if (!type || !to) return res.status(400).json({ error: 'Missing type or recipient' });

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return res.status(500).json({ error: 'Resend API key not configured' });

  const templates = {
    gallery_ready: {
      subject: '📸 Vos photos sont disponibles !',
      html: (d) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1117;color:#e5e7eb;padding:40px;border-radius:16px;">
          <div style="background:#f59e0b;padding:20px;border-radius:12px;text-align:center;margin-bottom:30px;">
            <h1 style="color:#000;margin:0;font-size:24px;">📸 PhotoImmo Pro</h1>
          </div>
          <h2 style="color:#f59e0b;">Vos photos sont prêtes !</h2>
          <p>Bonjour ${d.client_name},</p>
          <p>Les photos de votre bien <strong>${d.address}</strong> sont maintenant disponibles.</p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${d.gallery_url}" style="background:#f59e0b;color:#000;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;">
              Voir mes photos
            </a>
          </div>
          <p style="color:#6b7280;font-size:12px;">Ce lien est privé et vous est destiné uniquement.</p>
        </div>`,
    },
    mission_reminder: {
      subject: '⏰ Rappel mission photo demain',
      html: (d) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1117;color:#e5e7eb;padding:40px;border-radius:16px;">
          <h2 style="color:#f59e0b;">Rappel : Mission demain</h2>
          <p>Bonjour,</p>
          <p>Rappel pour votre mission photo prévue demain :</p>
          <ul>
            <li><strong>Adresse :</strong> ${d.address}</li>
            <li><strong>Client :</strong> ${d.client_name}</li>
            <li><strong>Date :</strong> ${d.date}</li>
          </ul>
        </div>`,
    },
    quote_sent: {
      subject: '📄 Votre devis - PhotoImmo Pro',
      html: (d) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1117;color:#e5e7eb;padding:40px;border-radius:16px;">
          <h2 style="color:#f59e0b;">Votre devis est disponible</h2>
          <p>Bonjour ${d.client_name},</p>
          <p>Veuillez trouver ci-joint votre devis <strong>${d.num}</strong> d'un montant de <strong>${d.ttc} € TTC</strong>.</p>
          <p>Ce devis est valable 30 jours.</p>
          <p style="color:#6b7280;font-size:12px;">PhotoImmo Pro</p>
        </div>`,
    },
  };

  const template = templates[type];
  if (!template) return res.status(400).json({ error: 'Unknown notification type' });

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: 'PhotoImmo Pro <notifications@photoimmo.pro>',
        to: [to],
        subject: template.subject,
        html: template.html(data || {}),
      }),
    });

    const result = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: result.message });
    return res.status(200).json({ success: true, id: result.id });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur envoi email' });
  }
};
