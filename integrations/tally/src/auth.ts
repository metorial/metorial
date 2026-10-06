import { createHash, randomBytes } from 'node:crypto';
import { createAxios, normalizeOAuthTokenResponse, requestAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { credential, incomplete, protect, reject, row, upstream } from './lib/contracts';

const scopes = [
  {
    title: 'User identity',
    description: 'Read your authenticated user identity.',
    scope: 'user'
  },
  {
    title: 'Forms and workspaces',
    description: 'Read and manage your forms and accessible workspaces.',
    scope: 'forms'
  },
  {
    title: 'Responses',
    description: 'Read responses, download submission PDFs and delete exact submissions.',
    scope: 'responses'
  }
];
const tokenRequest = async (
  host: 'https://api.tally.so' | 'https://tally.so',
  body: Record<string, string>,
  previousRefreshToken?: string
) => {
  const client = createAxios({ baseURL: host, timeout: 30000, maxRedirects: 0 });
  const response = await requestAxios(
    'Tally OAuth token exchange',
    () =>
      client.post<unknown>(
        '/oauth/token',
        host === 'https://api.tally.so' ? new URLSearchParams(body).toString() : body,
        {
          headers: {
            'Content-Type':
              host === 'https://api.tally.so'
                ? 'application/x-www-form-urlencoded'
                : 'application/json'
          }
        }
      ),
    upstream
  );
  if (response.status !== 200) incomplete();
  const data = row(response.data);
  protect(data, { clientSecret: body.client_secret });
  if (
    data.token_type !== undefined &&
    (typeof data.token_type !== 'string' || data.token_type.toLowerCase() !== 'bearer')
  )
    incomplete();
  if (data.expires_in !== undefined && data.expires_in !== null) {
    const seconds =
      typeof data.expires_in === 'string' ? Number(data.expires_in) : data.expires_in;
    if (
      typeof seconds !== 'number' ||
      !Number.isFinite(seconds) ||
      seconds <= 0 ||
      Date.now() + seconds * 1000 > 8.64e15
    )
      incomplete();
  }
  const normalized = normalizeOAuthTokenResponse(data, {
    providerLabel: 'Tally',
    previousRefreshToken,
    refreshTokenFallbackMode: 'falsy'
  });
  credential(normalized.token);
  if (normalized.refreshToken !== undefined) credential(normalized.refreshToken);
  return normalized;
};
const profile = async (output: { token: string }) => {
  const user = await new Client(output).getCurrentUser();
  return { profile: { id: user.id, email: user.email, name: user.name ?? user.email } };
};
export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      oauthIssuer: z.literal('api_tally').optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes,
    getAuthorizationUrl: async ctx => {
      const codeVerifier = randomBytes(32).toString('base64url');
      const challenge = createHash('sha256').update(codeVerifier).digest('base64url');
      const requested = ctx.scopes.length ? ctx.scopes : scopes.map(item => item.scope);
      if (requested.some(scope => !scopes.some(item => item.scope === scope)))
        reject(
          'Use the documented user, forms and responses permissions for this connection.'
        );
      const params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: requested.join(' '),
        code_challenge: challenge,
        code_challenge_method: 'S256'
      });
      return {
        url: `https://api.tally.so/oauth/authorize?${params}`,
        callbackState: { oauthIssuer: 'api_tally', codeVerifier }
      };
    },
    handleCallback: async ctx => {
      const current = ctx.callbackState?.oauthIssuer === 'api_tally';
      const verifier: unknown = ctx.callbackState?.codeVerifier;
      if (
        current &&
        (typeof verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier))
      )
        reject(
          'OAuth verification state is missing or invalid. Reconnect to restart authorization.'
        );
      const body: Record<string, string> = {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        grant_type: 'authorization_code',
        redirect_uri: ctx.redirectUri
      };
      if (current) body.code_verifier = verifier as string;
      const output = await tokenRequest(
        current ? 'https://api.tally.so' : 'https://tally.so',
        body
      );
      return {
        output: { ...output, oauthIssuer: current ? ('api_tally' as const) : undefined }
      };
    },
    handleTokenRefresh: async (ctx: {
      output: {
        token: string;
        refreshToken?: string;
        expiresAt?: string;
        oauthIssuer?: 'api_tally';
      };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken)
        reject('This connection has no refresh token. Reconnect to authorize it again.');
      const current = ctx.output.oauthIssuer === 'api_tally';
      const output = await tokenRequest(
        current ? 'https://api.tally.so' : 'https://tally.so',
        {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: credential(ctx.output.refreshToken)
        },
        ctx.output.refreshToken
      );
      return { output: { ...output, oauthIssuer: ctx.output.oauthIssuer } };
    },
    getProfile: async (ctx: { output: { token: string } }) => profile(ctx.output)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Your user-scoped Tally API key. It inherits your account permissions.')
    }),
    getOutput: async ctx => ({ output: { token: credential(ctx.input.token) } }),
    getProfile: async (ctx: { output: { token: string } }) => profile(ctx.output)
  });
