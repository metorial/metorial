import { createPublicKey, type JsonWebKey, verify } from 'node:crypto';
import {
  type ErrorRecord,
  forbiddenError,
  internalServerError,
  ServiceError,
  unauthorizedError
} from '@lowerdeck/error';

// https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-authentication?view=azure-bot-service-4.0#authenticate-requests-from-the-bot-connector-service-to-your-bot
export let BOT_CONNECTOR_OPENID_METADATA_URL =
  'https://login.botframework.com/v1/.well-known/openidconfiguration';
export let BOT_CONNECTOR_ISSUER = 'https://api.botframework.com';
// "Industry-standard clock-skew is 5 minutes."
export let BOT_CONNECTOR_CLOCK_SKEW_SECONDS = 300;
// Bot Framework requires refreshing the keys at least every 24 hours.
let KEY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// Rate-limits unknown-kid refreshes so forged tokens can't force a fetch per request.
let UNKNOWN_KID_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export type BotConnectorJwtFailure =
  | 'auth_missing'
  | 'token_malformed'
  | 'algorithm_unsupported'
  | 'key_not_found'
  | 'signature_invalid'
  | 'issuer_invalid'
  | 'audience_invalid'
  | 'token_expired'
  | 'token_not_yet_valid'
  | 'service_url_mismatch'
  | 'endorsement_missing';

export class BotConnectorJwtError extends ServiceError<ErrorRecord<any, any>> {
  constructor(
    readonly failure: BotConnectorJwtFailure,
    message: string
  ) {
    let record = failure === 'endorsement_missing' ? forbiddenError : unauthorizedError;
    super(record({ message, reason: failure }));
    this.name = 'BotConnectorJwtError';
  }
}

export class BotConnectorMetadataError extends ServiceError<ErrorRecord<any, any>> {
  constructor(message: string) {
    super(internalServerError({ message, reason: 'bot_connector_metadata_unavailable' }));
    this.name = 'BotConnectorMetadataError';
  }
}

interface SigningKey extends JsonWebKey {
  kid?: string;
  endorsements?: unknown;
}

interface KeyCache {
  algorithms: string[];
  keys: SigningKey[];
  fetchedAt: number;
}

let keyCache: KeyCache | null = null;
let pendingKeyFetch: Promise<KeyCache> | null = null;

export let resetBotConnectorKeyCache = () => {
  keyCache = null;
  pendingKeyFetch = null;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let fetchJson = async (url: string) => {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (error) {
    throw new BotConnectorMetadataError(
      `Failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!response.ok) {
    throw new BotConnectorMetadataError(`Fetching ${url} returned HTTP ${response.status}`);
  }
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new BotConnectorMetadataError(`${url} did not return JSON`);
  }
};

let loadKeys = async (): Promise<KeyCache> => {
  let metadata = await fetchJson(BOT_CONNECTOR_OPENID_METADATA_URL);
  if (!isRecord(metadata) || typeof metadata.jwks_uri !== 'string') {
    throw new BotConnectorMetadataError('OpenID metadata is missing jwks_uri');
  }

  let jwksUrl: URL;
  try {
    jwksUrl = new URL(metadata.jwks_uri);
  } catch {
    throw new BotConnectorMetadataError('OpenID metadata jwks_uri is not a URL');
  }
  if (jwksUrl.protocol !== 'https:') {
    throw new BotConnectorMetadataError('OpenID metadata jwks_uri must use HTTPS');
  }

  let algorithms = Array.isArray(metadata.id_token_signing_alg_values_supported)
    ? metadata.id_token_signing_alg_values_supported.filter(
        (value): value is string => typeof value === 'string'
      )
    : [];

  let jwks = await fetchJson(jwksUrl.toString());
  if (!isRecord(jwks) || !Array.isArray(jwks.keys)) {
    throw new BotConnectorMetadataError('JWKS document is missing keys');
  }

  return {
    algorithms,
    keys: jwks.keys.filter(isRecord) as SigningKey[],
    fetchedAt: Date.now()
  };
};

let getKeys = async (forceRefresh: boolean) => {
  let now = Date.now();
  let fresh = keyCache && now - keyCache.fetchedAt < KEY_CACHE_TTL_MS;
  let mayRefreshEarly =
    !keyCache || now - keyCache.fetchedAt >= UNKNOWN_KID_REFRESH_INTERVAL_MS;

  if (fresh && !(forceRefresh && mayRefreshEarly)) return keyCache!;

  if (!pendingKeyFetch) {
    pendingKeyFetch = loadKeys()
      .then(result => {
        keyCache = result;
        return result;
      })
      .finally(() => {
        pendingKeyFetch = null;
      });
  }
  return pendingKeyFetch;
};

let decodeSegment = (segment: string): unknown => {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) {
    throw new BotConnectorJwtError('token_malformed', 'JWT segment is not base64url');
  }
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
  } catch {
    throw new BotConnectorJwtError('token_malformed', 'JWT segment is not JSON');
  }
};

export interface VerifiedBotConnectorToken {
  claims: Record<string, unknown>;
  serviceUrl?: string;
  endorsements?: string[];
}

// Activity-dependent checks happen later in `assertActivityMatchesToken`.
export let verifyBotConnectorToken = async (input: {
  authorization: string | null;
  appId: string;
  nowMs?: number;
}): Promise<VerifiedBotConnectorToken> => {
  let match = input.authorization?.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    throw new BotConnectorJwtError(
      'auth_missing',
      'Missing Bearer token in Authorization header'
    );
  }

  let parts = match[1]!.split('.');
  if (parts.length !== 3 || parts.some(part => part.length === 0)) {
    throw new BotConnectorJwtError('token_malformed', 'JWT must have three segments');
  }

  let header = decodeSegment(parts[0]!);
  let claims = decodeSegment(parts[1]!);
  if (!isRecord(header) || !isRecord(claims)) {
    throw new BotConnectorJwtError(
      'token_malformed',
      'JWT header and payload must be objects'
    );
  }

  if (header.alg !== 'RS256') {
    throw new BotConnectorJwtError('algorithm_unsupported', 'JWT must be signed with RS256');
  }
  if (typeof header.kid !== 'string' || !header.kid) {
    throw new BotConnectorJwtError('token_malformed', 'JWT header is missing kid');
  }

  let keys = await getKeys(false);
  let key = keys.keys.find(candidate => candidate.kid === header.kid);
  if (!key) {
    keys = await getKeys(true);
    key = keys.keys.find(candidate => candidate.kid === header.kid);
  }
  if (!key) {
    throw new BotConnectorJwtError('key_not_found', 'JWT signing key is not published');
  }

  if (keys.algorithms.length > 0 && !keys.algorithms.includes('RS256')) {
    throw new BotConnectorJwtError(
      'algorithm_unsupported',
      'OpenID metadata does not allow RS256 signatures'
    );
  }

  let signatureValid = false;
  try {
    let publicKey = createPublicKey({ key: key as JsonWebKey, format: 'jwk' });
    signatureValid = verify(
      'RSA-SHA256',
      Buffer.from(`${parts[0]}.${parts[1]}`),
      publicKey,
      Buffer.from(parts[2]!, 'base64url')
    );
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) {
    throw new BotConnectorJwtError('signature_invalid', 'JWT signature is invalid');
  }

  if (claims.iss !== BOT_CONNECTOR_ISSUER) {
    throw new BotConnectorJwtError('issuer_invalid', 'JWT issuer is not the Bot Connector');
  }

  let expectedAudience = input.appId.toLowerCase();
  let audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (
    !audiences.some(
      audience => typeof audience === 'string' && audience.toLowerCase() === expectedAudience
    )
  ) {
    throw new BotConnectorJwtError(
      'audience_invalid',
      'JWT audience is not this bot’s Microsoft App ID'
    );
  }

  let nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1000);
  if (typeof claims.exp !== 'number') {
    throw new BotConnectorJwtError('token_malformed', 'JWT is missing exp');
  }
  if (nowSeconds > claims.exp + BOT_CONNECTOR_CLOCK_SKEW_SECONDS) {
    throw new BotConnectorJwtError('token_expired', 'JWT has expired');
  }
  if (
    typeof claims.nbf === 'number' &&
    nowSeconds < claims.nbf - BOT_CONNECTOR_CLOCK_SKEW_SECONDS
  ) {
    throw new BotConnectorJwtError('token_not_yet_valid', 'JWT is not valid yet');
  }

  return {
    claims,
    serviceUrl:
      typeof claims.serviceurl === 'string'
        ? claims.serviceurl
        : typeof claims.serviceUrl === 'string'
          ? claims.serviceUrl
          : undefined,
    endorsements: Array.isArray(key.endorsements)
      ? key.endorsements.filter((value): value is string => typeof value === 'string')
      : undefined
  };
};

let normalizeServiceUrlForComparison = (value: string) =>
  value.trim().replace(/\/+$/, '').toLowerCase();

export let assertActivityMatchesToken = (
  token: VerifiedBotConnectorToken,
  activity: { serviceUrl?: unknown; channelId?: unknown }
) => {
  if (
    !token.serviceUrl ||
    typeof activity.serviceUrl !== 'string' ||
    normalizeServiceUrlForComparison(token.serviceUrl) !==
      normalizeServiceUrlForComparison(activity.serviceUrl)
  ) {
    throw new BotConnectorJwtError(
      'service_url_mismatch',
      'JWT serviceUrl claim does not match the activity serviceUrl'
    );
  }

  if (
    token.endorsements &&
    typeof activity.channelId === 'string' &&
    !token.endorsements.includes(activity.channelId)
  ) {
    throw new BotConnectorJwtError(
      'endorsement_missing',
      'JWT signing key is not endorsed for the activity channel'
    );
  }
};
