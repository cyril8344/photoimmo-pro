const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

  let html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');

  // Inject real values in place of the placeholders
  html = html
    .replace(/__SUPABASE_URL__/g, JSON.stringify(url))
    .replace(/__SUPABASE_KEY__/g, JSON.stringify(key));

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(html);
};
