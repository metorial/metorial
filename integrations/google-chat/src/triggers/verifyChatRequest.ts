import { Buffer } from 'node:buffer';
import { createAxios } from 'slates';

// https://developers.google.com/workspace/chat/verify-requests-from-chat

export let GOOGLE_CHAT_ISSUER = 'chat@system.gserviceaccount.com';
export let GOOGLE_CHAT_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/chat@system.gserviceaccount.com';
export let GOOGLE_ID_TOKEN_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
export let GOOGLE_ID_TOKEN_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

// Google's client libraries accept five minutes of clock skew for these tokens.
let CLOCK_SKEW_SECONDS = 300;
let DEFAULT_JWKS_TTL_MS = 60 * 60 * 1000;

export type GoogleChatAuthenticationAudience = 'project_number' | 'endpoint_url';

export interface GoogleChatJwk {
  kid?: string;
  kty?: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
}

export interface GoogleChatJwks {
  keys: GoogleChatJwk[];
  // From Cache-Control max-age.
  maxAgeMs?: number;
}

let parseMaxAge = (cacheControl: unknown) => {
  if (typeof cacheControl !== 'string') return undefined;
  let match = /max-age=(\d+)/i.exec(cacheControl);
  return match ? Number(match[1]) * 1000 : undefined;
};

let certificateHttp = createAxios({ timeout: 10_000 });

// An object so contract tests can stub the fetch; the cache is only for performance.
export let googleChatCertificates = {
  fetchJwks: async (url: string): Promise<GoogleChatJwks> => {
    let response = await certificateHttp.get(url);
    let keys = Array.isArray(response.data?.keys) ? response.data.keys : [];
    return { keys, maxAgeMs: parseMaxAge(response.headers?.['cache-control']) };
  },
  cache: new Map<string, { keys: GoogleChatJwk[]; fetchedAt: number; expiresAt: number }>(),
  clearCache() {
    this.cache.clear();
  }
};

// Caps refreshes so random `kid` values cannot force a fetch per request.
let MIN_UNKNOWN_KID_REFRESH_MS = 60 * 1000;

let getKey = async (url: string, kid: string) => {
  let cached = googleChatCertificates.cache.get(url);
  let now = Date.now();
  if (cached && cached.expiresAt > now) {
    let key = cached.keys.find(entry => entry.kid === kid);
    if (key || now - cached.fetchedAt < MIN_UNKNOWN_KID_REFRESH_MS) return key;
  }

  // Expired cache, or an unknown kid after the minimum interval (key rotation).
  let fresh: GoogleChatJwks;
  try {
    fresh = await googleChatCertificates.fetchJwks(url);
  } catch (error) {
    // Keys outlive rotation, so a cached key stays usable while a refresh fails.
    let stale = cached?.keys.find(entry => entry.kid === kid);
    if (stale) return stale;
    throw error;
  }
  googleChatCertificates.cache.set(url, {
    keys: fresh.keys,
    fetchedAt: now,
    expiresAt: now + (fresh.maxAgeMs ?? DEFAULT_JWKS_TTL_MS)
  });
  return fresh.keys.find(entry => entry.kid === kid);
};

export type GoogleChatTokenFailure =
  | 'missing'
  | 'malformed'
  | 'unsupported_algorithm'
  | 'unknown_key'
  | 'signature_invalid'
  | 'issuer_invalid'
  | 'audience_invalid'
  | 'expired'
  | 'not_yet_valid'
  | 'email_invalid'
  | 'certificates_unavailable';

export type GoogleChatTokenVerification =
  | { ok: true; claims: Record<string, unknown> }
  | { ok: false; failure: GoogleChatTokenFailure; message: string };

let fail = (
  failure: GoogleChatTokenFailure,
  message: string
): GoogleChatTokenVerification => ({
  ok: false,
  failure,
  message
});

let decodeSegment = (segment: string): Record<string, unknown> | undefined => {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) return undefined;
  try {
    let value = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(segment, 'base64url'))
    );
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

let audienceMatches = (aud: unknown, expected: string) =>
  typeof aud === 'string' ? aud === expected : Array.isArray(aud) && aud.includes(expected);

export interface VerifyGoogleChatTokenOptions {
  authorization: string | null;
  audienceType: GoogleChatAuthenticationAudience;
  /** Project number for `project_number`, endpoint URL for `endpoint_url`. */
  audience: string;
  /** ID token emails accepted for `endpoint_url`; defaults to Google Chat's. */
  allowedEmails?: string[];
  nowSeconds?: number;
}

export let verifyGoogleChatBearerToken = async (
  options: VerifyGoogleChatTokenOptions
): Promise<GoogleChatTokenVerification> => {
  let header = options.authorization?.trim();
  if (!header) return fail('missing', 'Missing Authorization header');

  let match = /^Bearer\s+([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(header);
  if (!match) return fail('malformed', 'Authorization header is not a bearer JWT');

  let [, encodedHeader, encodedPayload, encodedSignature] = match as unknown as [
    string,
    string,
    string,
    string
  ];
  let jwtHeader = decodeSegment(encodedHeader);
  let claims = decodeSegment(encodedPayload);
  if (!jwtHeader || !claims) return fail('malformed', 'JWT segments are not valid JSON');

  if (jwtHeader.alg !== 'RS256') {
    return fail('unsupported_algorithm', 'JWT must be signed with RS256');
  }
  if (typeof jwtHeader.kid !== 'string' || !jwtHeader.kid) {
    return fail('malformed', 'JWT header is missing kid');
  }

  let jwksUrl =
    options.audienceType === 'project_number'
      ? GOOGLE_CHAT_JWKS_URL
      : GOOGLE_ID_TOKEN_JWKS_URL;

  let jwk: GoogleChatJwk | undefined;
  try {
    jwk = await getKey(jwksUrl, jwtHeader.kid);
  } catch {
    return fail('certificates_unavailable', 'Google public certificates could not be fetched');
  }
  if (!jwk || jwk.kty !== 'RSA' || !jwk.n || !jwk.e) {
    return fail('unknown_key', 'JWT kid does not match a current Google signing key');
  }

  let signatureValid = false;
  try {
    let key = await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    signatureValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      Buffer.from(encodedSignature, 'base64url'),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    );
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) return fail('signature_invalid', 'JWT signature is invalid');

  if (options.audienceType === 'project_number') {
    if (claims.iss !== GOOGLE_CHAT_ISSUER) {
      return fail('issuer_invalid', 'JWT issuer is not Google Chat');
    }
  } else {
    if (typeof claims.iss !== 'string' || !GOOGLE_ID_TOKEN_ISSUERS.includes(claims.iss)) {
      return fail('issuer_invalid', 'ID token issuer is not Google');
    }
    let allowedEmails = options.allowedEmails ?? [GOOGLE_CHAT_ISSUER];
    if (
      typeof claims.email !== 'string' ||
      !allowedEmails.includes(claims.email) ||
      claims.email_verified !== true
    ) {
      return fail('email_invalid', 'ID token was not issued to Google Chat');
    }
  }

  if (!audienceMatches(claims.aud, options.audience)) {
    return fail('audience_invalid', 'JWT audience does not match this registration');
  }

  let now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp + CLOCK_SKEW_SECONDS < now) {
    return fail('expired', 'JWT is expired');
  }
  if (typeof claims.iat === 'number' && claims.iat - CLOCK_SKEW_SECONDS > now) {
    return fail('not_yet_valid', 'JWT was issued in the future');
  }
  if (typeof claims.nbf === 'number' && claims.nbf - CLOCK_SKEW_SECONDS > now) {
    return fail('not_yet_valid', 'JWT is not valid yet');
  }

  return { ok: true, claims };
};
