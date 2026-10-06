import { createHash, createPrivateKey, createSign, randomBytes } from 'node:crypto';
import { createAxios, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, invalid, object, safeError } from './lib/client';

const tokenUrl = 'https://api.zoominfo.com/gtm/oauth/v1/token';
const scopeNames = [
  'api:data:contact',
  'api:data:company',
  'api:data:intent',
  'api:data:news',
  'api:data:scoops'
] as const;
const validateText = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim() || /[\r\n]/.test(value))
    throw invalid(`${label} is required and must not contain line breaks.`);
  return value;
};
const exchange = async (body: URLSearchParams, clientId: string, clientSecret: string) => {
  const http = createAxios({ timeout: 30000, maxRedirects: 0 });
  try {
    const response = await http.post<unknown>(tokenUrl, body.toString(), {
      headers: {
        Authorization: `Basic ${Buffer.from(`${validateText(clientId, 'Client ID')}:${validateText(clientSecret, 'Client secret')}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      }
    });
    if (response.status !== 200)
      throw invalid('ZoomInfo did not return a successful token response.');
    return object(response.data, 'token response');
  } catch (error) {
    throw safeError(error);
  }
};
const oauthOutput = (data: Record<string, unknown>) => {
  const seconds = typeof data.expires_in === 'number' ? data.expires_in : Number.NaN;
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0 ||
    !Number.isFinite(new Date(Date.now() + seconds * 1000).getTime())
  )
    throw invalid('ZoomInfo did not return a valid positive token lifetime in seconds.');
  if (
    data.token_type !== undefined &&
    (typeof data.token_type !== 'string' || data.token_type.toLowerCase() !== 'bearer')
  )
    throw invalid('ZoomInfo returned an unsupported token type.');
  const output = normalizeOAuthTokenResponse(data, {
    providerLabel: 'ZoomInfo',
    required: true,
    expiresInType: 'number'
  });
  validateText(output.token, 'Access token');
  if (output.refreshToken !== undefined) validateText(output.refreshToken, 'Refresh token');
  return { ...output, apiVersion: 'new' as const };
};
const verifyCurrent = async (output: { token: string }) => {
  await new Client({ token: output.token, apiVersion: 'new' }).getUsage();
};
const authenticateLegacy = async (body?: string, assertion?: string) => {
  const http = createAxios({ timeout: 30000, maxRedirects: 0 });
  try {
    const response = await http.post<unknown>(
      'https://api.zoominfo.com/authenticate',
      body ?? '',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          ...(assertion ? { Authorization: `Bearer ${assertion}` } : {})
        }
      }
    );
    if (response.status !== 200)
      throw invalid('ZoomInfo did not return a successful authentication response.');
    const data = object(response.data, 'authentication response');
    const token = validateText(data.jwt, 'Authentication token');
    let expiresAt: string | undefined;
    // exp is used only for refresh scheduling, never as a verified identity claim.
    try {
      const encoded = token.split('.')[1];
      const payload = encoded
        ? object(JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')))
        : undefined;
      if (
        typeof payload?.exp === 'number' &&
        Number.isFinite(payload.exp) &&
        payload.exp > 0 &&
        Number.isFinite(new Date(payload.exp * 1000).getTime())
      )
        expiresAt = new Date(payload.exp * 1000).toISOString();
    } catch {
      /* An opaque token has no discoverable expiry. */
    }
    return { token, expiresAt, apiVersion: 'legacy' as const };
  } catch (error) {
    throw safeError(error);
  }
};
const passwordOutput = (input: { username: string; password: string }) =>
  authenticateLegacy(
    new URLSearchParams({
      username: validateText(input.username, 'Username'),
      password: validateText(input.password, 'Password')
    }).toString()
  );
const pkiOutput = async (input: {
  clientId: string;
  privateKey: string;
  username?: string;
}) => {
  const username = validateText(input.username, 'Username for legacy PKI authentication');
  const clientId = validateText(input.clientId, 'Client ID');
  let assertion: string;
  try {
    const key = createPrivateKey(input.privateKey);
    if (key.asymmetricKeyType !== 'rsa')
      throw invalid('Legacy PKI authentication requires an RSA private key.');
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
      'base64url'
    );
    const payload = Buffer.from(
      JSON.stringify({
        aud: 'enterprise_api',
        iss: 'api-client@zoominfo.com',
        iat: now,
        exp: now + 300,
        client_id: clientId,
        username
      })
    ).toString('base64url');
    const signingInput = `${header}.${payload}`;
    assertion = `${signingInput}.${createSign('RSA-SHA256').update(signingInput).end().sign(key).toString('base64url')}`;
  } catch {
    throw invalid(
      'Legacy PKI authentication requires a valid RSA PEM private key. The key is used locally to sign an assertion.'
    );
  }
  return authenticateLegacy(undefined, assertion);
};
const clientCredentialsOutput = async (input: {
  clientId: string;
  clientSecret: string;
  scopes?: string[];
}) => {
  const body = new URLSearchParams({ grant_type: 'client_credentials' });
  if (input.scopes?.length) body.set('scope', input.scopes.join(' '));
  const output = oauthOutput(await exchange(body, input.clientId, input.clientSecret));
  await verifyCurrent(output);
  return { output };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      apiVersion: z.enum(['new', 'legacy']).optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0 (PKCE)',
    key: 'oauth_pkce',
    scopes: scopeNames.map(scope => ({
      title: `${scope.split(':').at(-1)} data`,
      description:
        'Access the corresponding search and enrichment API; usage and lookup accept these scopes.',
      scope
    })),
    getAuthorizationUrl: async ctx => {
      const codeVerifier = randomBytes(32).toString('base64url');
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        code_challenge: createHash('sha256').update(codeVerifier).digest('base64url'),
        code_challenge_method: 'S256'
      });
      if (ctx.scopes.length) params.set('scope', ctx.scopes.join(' '));
      return {
        url: `https://api.zoominfo.com/gtm/oauth/v1/authorize?${params}`,
        callbackState: { codeVerifier, expectedState: ctx.state }
      };
    },
    handleCallback: async ctx => {
      if (validateText(ctx.callbackState.expectedState, 'OAuth callback state') !== ctx.state)
        throw invalid('OAuth callback state did not match.');
      const verifier = validateText(ctx.callbackState.codeVerifier, 'PKCE verifier');
      if (!/^[A-Za-z0-9_\-.~]{43,128}$/.test(verifier))
        throw invalid('OAuth PKCE verifier is invalid.');
      const data = await exchange(
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: validateText(ctx.code, 'Authorization code'),
          redirect_uri: ctx.redirectUri,
          code_verifier: verifier
        }),
        ctx.clientId,
        ctx.clientSecret
      );
      const output = oauthOutput(data);
      await verifyCurrent(output);
      return {
        output,
        ...(typeof data.scope === 'string'
          ? { scopes: data.scope.split(/\s+/).filter(Boolean) }
          : {})
      };
    },
    handleTokenRefresh: async (ctx: {
      output: { refreshToken?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      const refreshToken = validateText(ctx.output.refreshToken, 'Refresh token');
      const data = await exchange(
        new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
        ctx.clientId,
        ctx.clientSecret
      );
      // ZoomInfo invalidates the used token on refresh; it cannot be a fallback.
      validateText(data.refresh_token, 'Replacement refresh token');
      const output = oauthOutput(data);
      return { output };
    },
    getProfile: async () => ({ profile: { name: 'ZoomInfo GTM API' } })
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Username & Password (Legacy Enterprise API)',
    key: 'legacy_password',
    inputSchema: z.object({
      username: z.string().describe('ZoomInfo account username/email'),
      password: z.string().describe('ZoomInfo account password')
    }),
    getOutput: async ctx => ({ output: await passwordOutput(ctx.input) }),
    handleTokenRefresh: async (ctx: { input: { username: string; password: string } }) => ({
      output: await passwordOutput(ctx.input)
    }),
    getProfile: async () => ({ profile: { name: 'ZoomInfo Enterprise API' } })
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'PKI Authentication (Legacy Enterprise API)',
    key: 'legacy_pki',
    inputSchema: z.object({
      clientId: z.string().describe('Client ID from the ZoomInfo Admin Portal'),
      privateKey: z
        .string()
        .describe('RSA PEM private key used locally to sign the authentication assertion'),
      username: z
        .string()
        .optional()
        .describe(
          'Required by the documented legacy PKI protocol. Existing connections must supply their ZoomInfo username before authenticating again.'
        )
    }),
    getOutput: async ctx => ({ output: await pkiOutput(ctx.input) }),
    handleTokenRefresh: async (ctx: {
      input: { clientId: string; privateKey: string; username?: string };
    }) => ({ output: await pkiOutput(ctx.input) }),
    getProfile: async () => ({ profile: { name: 'ZoomInfo Enterprise API' } })
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'OAuth Client Credentials',
    key: 'client_credentials',
    inputSchema: z.object({
      clientId: z.string().describe('Registered ZoomInfo application client ID'),
      clientSecret: z.string().describe('Registered ZoomInfo application client secret'),
      scopes: z
        .array(z.enum(scopeNames))
        .optional()
        .describe(
          'Optional subset of Data API scopes registered for the application; omitted requests the application defaults.'
        )
    }),
    getOutput: async ctx => clientCredentialsOutput(ctx.input),
    handleTokenRefresh: async (ctx: {
      input: { clientId: string; clientSecret: string; scopes?: string[] };
    }) => clientCredentialsOutput(ctx.input),
    getProfile: async () => ({ profile: { name: 'ZoomInfo GTM API' } })
  });
