import { Client } from './client';

export let createClient = (
  config: { subdomain: string },
  auth: { token: string; subdomain?: string }
): Client => {
  let subdomain = auth.subdomain || config.subdomain;

  // If the token contains a colon when decoded from base64, it's likely Basic Auth.
  // OAuth tokens are opaque strings, while basic auth tokens are base64-encoded "email:apikey".
  let isBasicAuth = false;
  try {
    let decoded = Buffer.from(auth.token, 'base64').toString('utf8');
    if (decoded.includes(':') && decoded.includes('@')) {
      isBasicAuth = true;
    }
  } catch {
    // Not base64, so it's a Bearer token
  }

  return new Client({
    token: auth.token,
    subdomain,
    authType: isBasicAuth ? 'basic' : 'bearer'
  });
};
