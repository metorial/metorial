import { createHash, randomBytes } from 'node:crypto';
import { createAuthenticatedAxios, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { type AuthOutput, Client } from './lib/client';
import { fail, parse, required, upstream, z } from './lib/native';

const tokenClient = createAuthenticatedAxios({
  baseURL: 'https://secure.soundcloud.com',
  timeout: 30_000,
  maxRedirects: 0,
  maxContentLength: 1024 * 1024,
  maxBodyLength: 1024 * 1024,
  contentType: 'application/x-www-form-urlencoded',
  headers: { Accept: 'application/json; charset=utf-8' },
  errorAdapter: upstream
});
const tokenSchema = z
  .object({
    access_token: z.string().min(1),
    refresh_token: z.string().min(1).optional(),
    expires_in: z.number().int().positive(),
    scope: z.string().optional(),
    token_type: z.string().optional()
  })
  .passthrough();
async function exchange(
  params: Record<string, string>,
  mode: NonNullable<AuthOutput['authMode']>,
  previousRefreshToken?: string,
  basic?: string
): Promise<AuthOutput> {
  let response: { data: unknown; status: number };
  try {
    response = await tokenClient.post(
      '/oauth/token',
      new URLSearchParams(params).toString(),
      basic ? { headers: { Authorization: `Basic ${basic}` } } : undefined
    );
  } catch (error) {
    throw upstream(error);
  }
  const data = parse(tokenSchema, response.data);
  if (
    previousRefreshToken !== undefined &&
    (!data.refresh_token?.trim() || data.refresh_token === previousRefreshToken)
  )
    throw fail(
      'SoundCloud did not return a distinct replacement for the single-use refresh token. The grant may already be consumed; reconnect rather than retrying it.'
    );
  if (data.expires_in > Math.floor((8.64e15 - Date.now()) / 1000))
    throw fail(
      'SoundCloud returned an invalid token lifetime. Reconnect rather than guessing expiry.'
    );
  const output = normalizeOAuthTokenResponse(data, {
    providerLabel: 'SoundCloud',
    required: true,
    expiresInType: 'number',
    previousRefreshToken
  });
  return { ...output, authMode: mode };
}
export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authMode: z.enum(['authorization_code', 'client_credentials']).optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    key: 'oauth',
    name: 'OAuth',
    scopes: [],
    getAuthorizationUrl: async ctx => {
      required(ctx.clientId, 'Client ID');
      required(ctx.state, 'OAuth state');
      required(ctx.redirectUri, 'Redirect URI');
      const codeVerifier = randomBytes(48).toString('base64url'),
        codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
      const query = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });
      return {
        url: `https://secure.soundcloud.com/authorize?${query}`,
        callbackState: { codeVerifier, state: ctx.state }
      };
    },
    handleCallback: async ctx => {
      const saved = parse(
        z.object({
          codeVerifier: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
          state: z.string().min(1)
        }),
        ctx.callbackState
      );
      if (saved.state !== ctx.state)
        throw fail('OAuth state changed. Restart SoundCloud authorization.');
      return {
        output: await exchange(
          {
            grant_type: 'authorization_code',
            client_id: required(ctx.clientId, 'Client ID'),
            client_secret: required(ctx.clientSecret, 'Client secret'),
            redirect_uri: required(ctx.redirectUri, 'Redirect URI'),
            code: required(ctx.code, 'Authorization code'),
            code_verifier: saved.codeVerifier
          },
          'authorization_code'
        )
      };
    },
    handleTokenRefresh: async (ctx: {
      output: AuthOutput;
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken)
        throw fail('No SoundCloud refresh token is available. Reconnect using OAuth.');
      return {
        output: await exchange(
          {
            grant_type: 'refresh_token',
            client_id: required(ctx.clientId, 'Client ID'),
            client_secret: required(ctx.clientSecret, 'Client secret'),
            refresh_token: required(ctx.output.refreshToken, 'Refresh token')
          },
          'authorization_code',
          ctx.output.refreshToken
        )
      };
    },
    getProfile: async (ctx: { output: AuthOutput }) => {
      const user = await new Client(ctx.output).getMe();
      return {
        profile: {
          id: user.urn,
          name: user.full_name || user.username,
          imageUrl: user.avatar_url ?? undefined,
          email: user.email ?? undefined
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    key: 'client_credentials',
    name: 'Client Credentials',
    inputSchema: z.object({
      clientId: z.string().describe('SoundCloud application Client ID'),
      clientSecret: z.string().describe('SoundCloud application Client Secret')
    }),
    getOutput: async ctx => {
      const id = required(ctx.input.clientId, 'Client ID'),
        secret = required(ctx.input.clientSecret, 'Client secret');
      if (id.includes(':'))
        throw fail('Client ID cannot contain a colon in HTTP Basic authentication.');
      return {
        output: await exchange(
          { grant_type: 'client_credentials' },
          'client_credentials',
          undefined,
          Buffer.from(`${id}:${secret}`, 'utf8').toString('base64')
        )
      };
    },
    handleTokenRefresh: async (ctx: {
      output: AuthOutput;
      input: { clientId: string; clientSecret: string };
    }) => {
      if (!ctx.output.refreshToken)
        throw fail(
          'No SoundCloud application refresh token is available. Reconnect Client Credentials.'
        );
      return {
        output: await exchange(
          {
            grant_type: 'refresh_token',
            client_id: required(ctx.input.clientId, 'Client ID'),
            client_secret: required(ctx.input.clientSecret, 'Client secret'),
            refresh_token: required(ctx.output.refreshToken, 'Refresh token')
          },
          'client_credentials',
          ctx.output.refreshToken
        )
      };
    },
    getProfile: async () => ({ profile: { name: 'SoundCloud public-resource application' } })
  });
