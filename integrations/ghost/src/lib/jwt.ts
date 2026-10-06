import { createHmac } from 'node:crypto';
import { createApiServiceError } from 'slates';
export const validateAdminKey = (key: string) => {
  if (!/^[a-f0-9]{24}:[a-f0-9]{64}$/i.test(key))
    throw createApiServiceError(
      'Provide a Ghost integration or staff key as id:hex-secret. A Content API key or previously generated JWT cannot be used as an Admin key. Reconnect with the original key.',
      { reason: 'ghost_auth', parent: {} }
    );
  return key;
};
export const generateGhostJwt = async (apiKey: string): Promise<string> => {
  const [id, secret] = validateAdminKey(apiKey).split(':');
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', kid: id, typ: 'JWT' })).toString(
    'base64url'
  );
  const payload = Buffer.from(
    JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' })
  ).toString('base64url');
  const body = `${header}.${payload}`;
  return `${body}.${createHmac('sha256', Buffer.from(secret!, 'hex')).update(body).digest('base64url')}`;
};
