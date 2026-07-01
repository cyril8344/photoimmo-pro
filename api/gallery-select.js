module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, photo_id, selected } = req.body || {};

  if (!token || !photo_id || typeof selected !== 'boolean') {
    return res.status(400).json({ error: 'Champs requis manquants : token, photo_id, selected' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Serveur non configuré' });
  }

  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data: gallery, error: gErr } = await sb
    .from('galleries')
    .select('id')
    .eq('token', token)
    .eq('ready', true)
    .single();

  if (gErr || !gallery) {
    return res.status(404).json({ error: 'Galerie introuvable ou non publiée' });
  }

  const { error } = await sb
    .from('gallery_photos')
    .update({ selected })
    .eq('id', photo_id)
    .eq('gallery_id', gallery.id);

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
};
