module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Config Supabase manquante' });

  const token = req.query.token;
  if (!token) return res.status(400).json({ error: 'Token manquant' });

  const headers = {
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
  };

  const r = await fetch(
    `${SB_URL}/rest/v1/galleries?token=eq.${encodeURIComponent(token)}&ready=eq.true&select=id,token,property_address,ready,created_at`,
    { headers }
  );
  const galleries = await r.json();
  if (!galleries?.length) return res.status(404).json({ error: 'Galerie introuvable ou non publiée' });
  const gallery = galleries[0];

  const rp = await fetch(
    `${SB_URL}/rest/v1/gallery_photos?gallery_id=eq.${gallery.id}&select=id,name,full_url,thumb_url,selected,created_at&order=created_at.asc`,
    { headers }
  );
  const photos = await rp.json();

  return res.status(200).json({ gallery, photos: photos || [] });
};
