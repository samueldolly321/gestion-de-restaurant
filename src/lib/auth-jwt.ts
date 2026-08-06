import jwt from 'jsonwebtoken';

// Secret de signature des jetons. À définir dans .env (JWT_SECRET).
// Fallback de dev pour ne pas planter en local, mais À CHANGER en production.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production';
const TOKEN_TTL = '30d'; // Durée de validité d'une session

export interface AppTokenPayload {
  uid: string;
  email: string;
  name?: string;
}

// Émet un jeton signé pour un utilisateur authentifié (login / register).
export function signAppToken(payload: AppTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// Vérifie et décode un jeton ; lève une erreur si invalide/expiré.
export function verifyAppToken(token: string): AppTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AppTokenPayload;
}
