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
      subject: (d) => `Vos photos sont disponibles — ${d.address || 'PhotoImmo Pro'}`,
      html: (d) => `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Vos photos sont prêtes</title></head>
<body style="margin:0;padding:0;background:#f4f3ef;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f3ef;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#c9963c 0%,#e8b96e 50%,#c9963c 100%);border-radius:14px 14px 0 0;padding:32px 40px;text-align:center;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="center">
        <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:12px;padding:8px 18px;margin-bottom:12px;">
          <span style="font-family:Georgia,serif;font-size:14px;font-weight:bold;color:#fff;letter-spacing:0.05em;">PI</span>
          <span style="font-family:Georgia,serif;font-size:14px;font-weight:bold;color:#fff;margin-left:8px;letter-spacing:0.02em;">PhotoImmo Pro</span>
        </div>
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:bold;color:#fff;margin:0;line-height:1.2;">Vos photos sont prêtes</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#ffffff;padding:40px 40px 32px;border-left:1px solid #e8e4dc;border-right:1px solid #e8e4dc;">

    <p style="font-family:Arial,sans-serif;font-size:15px;color:#4a4a5a;margin:0 0 20px;">Bonjour <strong style="color:#1c1c28;">${d.client_name || 'Madame, Monsieur'}</strong>,</p>

    <p style="font-family:Arial,sans-serif;font-size:15px;color:#4a4a5a;margin:0 0 24px;line-height:1.7;">
      Nous avons le plaisir de vous informer que vos photos immobilières sont désormais disponibles dans votre galerie privée.
    </p>

    <!-- Property address block -->
    ${d.address ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f4;border-left:3px solid #c9963c;border-radius:0 8px 8px 0;margin:0 0 28px;"><tr><td style="padding:14px 18px;">
      <div style="font-family:Arial,sans-serif;font-size:11px;color:#c9963c;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">Bien photographié</div>
      <div style="font-family:Arial,sans-serif;font-size:15px;color:#1c1c28;font-weight:600;">${d.address}</div>
    </td></tr></table>` : ''}

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td align="center">
        <a href="${d.gallery_url}" style="display:inline-block;background:#c9963c;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:10px;letter-spacing:0.03em;">
          Voir mes photos →
        </a>
      </td></tr>
    </table>

    <p style="font-family:Arial,sans-serif;font-size:14px;color:#4a4a5a;line-height:1.7;margin:0 0 8px;">
      Depuis votre galerie, vous pouvez&nbsp;:
    </p>
    <ul style="font-family:Arial,sans-serif;font-size:14px;color:#4a4a5a;line-height:1.9;margin:0 0 24px;padding-left:20px;">
      <li>Consulter l'ensemble des photos</li>
      <li>Sélectionner vos préférées</li>
      <li>Télécharger les photos en haute résolution</li>
    </ul>

    <p style="font-family:Arial,sans-serif;font-size:13px;color:#8a8a9a;margin:0;line-height:1.6;">
      Ce lien est personnel et privé — il vous est destiné exclusivement.
    </p>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#1c1c28;border-radius:0 0 14px 14px;padding:24px 40px;text-align:center;">
    <p style="font-family:Arial,sans-serif;font-size:13px;color:#c9963c;font-weight:600;margin:0 0 6px;">PhotoImmo Pro</p>
    <p style="font-family:Arial,sans-serif;font-size:12px;color:#6b6b7a;margin:0;line-height:1.6;">Photographie immobilière professionnelle</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`,
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
      subject: (d) => `📄 Devis ${d.num} — PhotoImmo Pro`,
      html: (d) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1117;color:#e5e7eb;padding:40px;border-radius:16px;">
          <div style="background:#c9963c;padding:20px;border-radius:12px;text-align:center;margin-bottom:30px;">
            <h1 style="color:#0f1117;margin:0;font-size:22px;font-weight:bold;">📸 PhotoImmo Pro</h1>
          </div>
          <h2 style="color:#f5be64;margin-top:0;">Votre devis est disponible</h2>
          <p>Bonjour ${d.client_name},</p>
          <p>Veuillez trouver en pièce jointe votre devis <strong style="color:#f5be64;">${d.num}</strong>${d.address ? ' pour le bien situé au <strong>' + d.address + '</strong>' : ''}.</p>
          <div style="background:#1a1d27;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #2d3148;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="color:#9ca3af;padding:6px 0;">Numéro de devis</td><td style="text-align:right;font-weight:bold;color:#f5be64;">${d.num}</td></tr>
              <tr><td style="color:#9ca3af;padding:6px 0;">Montant TTC</td><td style="text-align:right;font-weight:bold;font-size:18px;color:#e5e7eb;">${d.ttc}</td></tr>
              <tr><td style="color:#9ca3af;padding:6px 0;">Valable jusqu'au</td><td style="text-align:right;color:#e5e7eb;">${d.expires}</td></tr>
            </table>
          </div>
          ${d.accept_url ? `
          <div style="text-align:center;margin:28px 0;">
            <a href="${d.accept_url}" style="background:linear-gradient(135deg,#c9963c,#e8b96e);color:#0a0906;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">
              ✓ Accepter ce devis
            </a>
          </div>
          <p style="text-align:center;color:#6b7280;font-size:13px;">Ou vous pouvez retourner ce devis signé avec la mention <em>"Bon pour accord"</em>.</p>
          ` : `<p>Pour l'accepter, retournez-le signé avec la mention <em>"Bon pour accord"</em> accompagné d'un acompte de 30 %.</p>`}
          <p style="color:#6b7280;font-size:12px;margin-top:30px;border-top:1px solid #374151;padding-top:15px;">
            PhotoImmo Pro — Photographie immobilière professionnelle<br/>
            Ce devis a été généré automatiquement, ne pas répondre directement à cet email.
          </p>
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
      subject: (d) => `Vos photos vous attendent — ${d.address || 'PhotoImmo Pro'}`,
      html: (d) => `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Vos photos vous attendent</title></head>
<body style="margin:0;padding:0;background:#f4f3ef;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f3ef;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">
  <tr><td style="background:linear-gradient(135deg,#c9963c 0%,#e8b96e 50%,#c9963c 100%);border-radius:14px 14px 0 0;padding:32px 40px;text-align:center;">
    <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:12px;padding:8px 18px;margin-bottom:12px;">
      <span style="font-family:Georgia,serif;font-size:14px;font-weight:bold;color:#fff;letter-spacing:0.05em;">PI</span>
      <span style="font-family:Georgia,serif;font-size:14px;font-weight:bold;color:#fff;margin-left:8px;">PhotoImmo Pro</span>
    </div>
    <div style="font-family:Georgia,serif;font-size:24px;font-weight:bold;color:#fff;margin:0;">Vos photos vous attendent encore</div>
  </td></tr>
  <tr><td style="background:#ffffff;padding:40px 40px 32px;border-left:1px solid #e8e4dc;border-right:1px solid #e8e4dc;">
    <p style="font-family:Arial,sans-serif;font-size:15px;color:#4a4a5a;margin:0 0 20px;">Bonjour <strong style="color:#1c1c28;">${d.client_name || 'Madame, Monsieur'}</strong>,</p>
    <p style="font-family:Arial,sans-serif;font-size:15px;color:#4a4a5a;margin:0 0 24px;line-height:1.7;">
      Vos photos${d.address ? ` de <strong style="color:#1c1c28;">${d.address}</strong>` : ''} sont disponibles depuis 7 jours dans votre galerie privée et n'ont pas encore été consultées.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td align="center">
        <a href="${d.gallery_url}" style="display:inline-block;background:#c9963c;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:10px;letter-spacing:0.03em;">
          Accéder à mes photos →
        </a>
      </td></tr>
    </table>
    <p style="font-family:Arial,sans-serif;font-size:13px;color:#8a8a9a;margin:0;line-height:1.6;">Ce lien est personnel et privé — il vous est destiné exclusivement.</p>
  </td></tr>
  <tr><td style="background:#1c1c28;border-radius:0 0 14px 14px;padding:24px 40px;text-align:center;">
    <p style="font-family:Arial,sans-serif;font-size:13px;color:#c9963c;font-weight:600;margin:0 0 6px;">PhotoImmo Pro</p>
    <p style="font-family:Arial,sans-serif;font-size:12px;color:#6b6b7a;margin:0;">Photographie immobilière professionnelle</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`,
    },
    invoice_reminder: {
      subject: (d) => `📋 Rappel de paiement — Facture ${d.num}`,
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
      subject: (d) => `📋 Votre facture ${d.num} — PhotoImmo Pro`,
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
    const emailPayload = {
      from: process.env.EMAIL_FROM || 'PhotoImmo Pro <onboarding@resend.dev>',
      to: [to],
      subject: typeof template.subject === 'function' ? template.subject(data || {}) : template.subject,
      html: template.html(data || {}),
    };
    if (data?.pdf_base64) {
      emailPayload.attachments = [{
        filename: data.pdf_filename || 'document.pdf',
        content: data.pdf_base64,
      }];
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: result.message });
    return res.status(200).json({ success: true, id: result.id });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur envoi email' });
  }
};
