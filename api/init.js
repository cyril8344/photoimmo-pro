module.exports = function handler(req, res) {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache');
  res.status(200).send(
    `window.__SUPABASE_URL__=${JSON.stringify(url)};` +
    `window.__SUPABASE_KEY__=${JSON.stringify(key)};`
  );
};
