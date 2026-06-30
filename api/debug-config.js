module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Ne jamais exposer les vraies valeurs — juste confirmer si elles sont définies
  res.status(200).json({
    SUPABASE_URL:       process.env.SUPABASE_URL        ? '✅ définie' : '❌ manquante',
    SUPABASE_ANON_KEY:  process.env.SUPABASE_ANON_KEY   ? '✅ définie' : '❌ manquante',
    SUPABASE_KEY:       process.env.SUPABASE_KEY         ? '✅ définie' : '❌ manquante',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? '✅ définie' : '❌ manquante',
    NODE_ENV:           process.env.NODE_ENV || 'non défini',
  });
};
