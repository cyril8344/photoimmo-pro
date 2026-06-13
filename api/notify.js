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
    quote_followup: {
      subject: '⏰ Votre devis est en attente de validation',
      html: (d) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1117;color:#e5e7eb;padding:40px;border-radius:16px;">
          <h2 style="color:#f59e0b;">Rappel : votre devis est en attente</h2>
          <p>Bonjour ${d.client_name},</p>
          <p>Nous n'avons pas encore reçu votre réponse concernant le devis <strong>${d.num}</strong> d'un montant de <strong>${d.ttc} € TTC</strong>.</p>
          <p>Ce devis expire le <strong>${d.expires}</strong>.</p>
          <p>N'hésitez pas à nous contacter pour toute question.</p>
          <p style="color:#6b7280;font-size:12px;">PhotoImmo Pro</p>
        </div>`,
    },
    shooting_reminder: {
      subject: '📷 Rappel : shooting demain à votre adresse',
      html: (d) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1117;color:#e5e7eb;padding:40px;border-radius:16px;">
          <h2 style="color:#f59e0b;">Votre shooting est demain</h2>
          <p>Bonjour ${d.client_name},</p>
          <p>Rappel : votre séance photo est prévue <strong>demain</strong> :</p>
          <ul>
            <li><strong>Adresse :</strong> ${d.address}</li>
            <li><strong>Date :</strong> ${d.date}</li>
          </ul>
          <p>Merci de vous assurer que le bien est prêt pour la prise de vue.</p>
        </div>`,
    },
    gallery_not_downloaded: {
      subject: '🖼️ Vos photos vous attendent depuis 7 jours',
      html: (d) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1117;color:#e5e7eb;padding:40px;border-radius:16px;">
          <h2 style="color:#f59e0b;">Vos photos sont toujours disponibles</h2>
          <p>Bonjour ${d.client_name},</p>
          <p>Vos photos de <strong>${d.address}</strong> sont disponibles depuis 7 jours et n'ont pas encore été consultées.</p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${d.gallery_url}" style="background:#f59e0b;color:#000;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;">Accéder à mes photos</a>
          </div>
        </div>`,
    },
    invoice_reminder: {
      subject: '📋 Rappel de paiement — Facture ${d.num}',
      html: (d) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1117;color:#e5e7eb;padding:40px;border-radius:16px;">
          <h2 style="color:#f59e0b;">Rappel de paiement</h2>
          <p>Bonjour ${d.client_name},</p>
          <p>Sauf erreur de notre part, la facture <strong>${d.num}</strong> d'un montant de <strong>${d.ttc} € TTC</strong> est toujours en attente de règlement.</p>
          <p>Date d'échéance : <strong>${d.due_date}</strong></p>
          <p>Merci de procéder au règlement dans les meilleurs délais.</p>
          <p style="color:#6b7280;font-size:12px;">PhotoImmo Pro</p>
        </div>`,
    },
    invoice_sent: {
      subject: `📋 Votre facture \${d.num} — PhotoImmo Pro`,
      html: (d) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1117;color:#e5e7eb;padding:40px;border-radius:16px;">
          <div style="background:#f59e0b;padding:20px;border-radius:12px;text-align:center;margin-bottom:30px;">
            <h1 style="color:#000;margin:0;font-size:24px;">📋 PhotoImmo Pro</h1>
          </div>
          <h2 style="color:#f59e0b;">Votre facture est disponible</h2>
          <p>Bonjour ${d.client_name},</p>
          <p>Veuillez trouver ci-dessous votre facture <strong>${d.num}</strong>.</p>
          <div style="background:#1a1d27;border-radius:12px;padding:20px;margin:20px 0;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="color:#9ca3af;padding:6px 0;">Numéro de facture</td><td style="text-align:right;font-weight:bold;color:#f59e0b;">${d.num}</td></tr>
              <tr><td style="color:#9ca3af;padding:6px 0;">Montant TTC</td><td style="text-align:right;font-weight:bold;font-size:18px;color:#e5e7eb;">${d.ttc}</td></tr>
              <tr><td style="color:#9ca3af;padding:6px 0;">Date d'échéance</td><td style="text-align:right;color:#e5e7eb;">${d.due_date}</td></tr>
            </table>
          </div>
          <p>Merci de procéder au règlement avant la date d'échéance indiquée.</p>
          <p style="color:#6b7280;font-size:12px;margin-top:30px;border-top:1px solid #374151;padding-top:15px;">
            PhotoImmo Pro — Photographie immobilière professionnelle<br/>
            Pénalités de retard applicables en cas de retard de paiement.
          </p>
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
