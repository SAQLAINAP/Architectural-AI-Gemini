import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabase && supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If Supabase is not configured, allow anonymous access for development
    const sb = getSupabase();
    if (!sb) {
      req.userId = 'anonymous';
      next();
      return;
    }

    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const sb = getSupabase();

  if (!sb) {
    // No Supabase configured, accept any token for development
    req.userId = 'dev-user';
    next();
    return;
  }

  try {
    const { data: { user }, error } = await sb.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.userId = user.id;
    req.userEmail = user.email;
    next();
  } catch (err) {
    logger.error({ err }, 'Auth middleware error');
    res.status(401).json({ error: 'Authentication failed' });
  }
}
