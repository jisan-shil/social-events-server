import { createRemoteJWKSet, jwtVerify } from 'jose';

let jwks;

export async function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Please log in to continue' });
  }

  try {
    jwks ??= createRemoteJWKSet(new URL(process.env.AUTH_JWKS_URL));
    const { payload } = await jwtVerify(token, jwks);
    if (!payload.email) throw new Error('No email in token');

    req.user = {
      id: payload.id || payload.sub,
      email: payload.email,
      name: payload.name,
    };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Your session is invalid or expired' });
  }
}