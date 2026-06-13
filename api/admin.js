const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const { action, user_id } = req.body || {};
  if (!action || !user_id) return res.status(400).json({ error: 'action et user_id requis' });

  const VALID_ACTIONS = ['suspend', 'unsuspend', 'reset_password'];
  if (!VALID_ACTIONS.includes(action)) {
    return res.status(400).json({ error: 'Action invalide. Actions autorisées : ' + VALID_ACTIONS.join(', ') });
  }

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
    if (action === 'suspend') {
      const { error } = await sbAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: '87600h', // 10 years = effectively permanent
      });
      if (error) throw new Error(error.message);
      return res.status(200).json({ success: true, message: 'Utilisateur suspendu' });
    }

    if (action === 'unsuspend') {
      const { error } = await sbAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: 'none',
      });
      if (error) throw new Error(error.message);
      return res.status(200).json({ success: true, message: 'Utilisateur réactivé' });
    }

    if (action === 'reset_password') {
      // Get user email first
      const { data: userData, error: getUserErr } = await sbAdmin.auth.admin.getUserById(user_id);
      if (getUserErr || !userData?.user?.email) throw new Error('Utilisateur introuvable');

      const { error } = await sbAdmin.auth.resetPasswordForEmail(userData.user.email, {
        redirectTo: `${process.env.APP_URL || ''}/app`,
      });
      if (error) throw new Error(error.message);
      return res.status(200).json({ success: true, message: 'Email de réinitialisation envoyé' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};
