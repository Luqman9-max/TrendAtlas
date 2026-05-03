const { createClient } = require('@supabase/supabase-js');

/**
 * Auth Middleware — verifies Supabase JWT on protected routes.
 *
 * Extracts the Bearer token from the Authorization header,
 * verifies it using Supabase's getUser() which validates the JWT server-side.
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Auth not configured' });
    }

    // Use service role to verify the user's JWT
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }

    // Attach user to request for downstream handlers
    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth] Token verification failed:', err.message);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token verification failed',
    });
  }
}

module.exports = { authMiddleware };
