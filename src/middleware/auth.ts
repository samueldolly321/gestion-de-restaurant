import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

// Jeton fixe utilisé par le login de test (bypass Firebase, usage local uniquement).
// N'est accepté que lorsque ENABLE_TEST_LOGIN === 'true'.
export const TEST_LOGIN_TOKEN = 'TEST-LOGIN-TOKEN';

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];

  // Bypass local : jeton de test accepté seulement si le drapeau est actif.
  if (process.env.ENABLE_TEST_LOGIN === 'true' && token === TEST_LOGIN_TOKEN) {
    req.user = {
      uid: 'test-super-admin',
      email: 'admin@test.local',
      name: 'Admin Test',
    } as unknown as DecodedIdToken;
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
