import { createHash, randomBytes } from 'node:crypto';
import {
  createApiServiceError,
  createAxios,
  getApiErrorStatus,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { nativeExchangeAccessTokenResponse, parseNative } from './lib/native';
import { ConnectionGuard, fail, text } from './lib/validation';

const outputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  clientId: z.string().optional(),
  clientCredentialFingerprint: z.string().optional(),
  userId: z.string().optional(),
  teamId: z.string().optional()
});
const credentialFingerprint = (clientId: string, clientSecret: string) =>
  createHash('sha256')
    .update(JSON.stringify([clientId, clientSecret]))
    .digest('hex');
const tokenApi = createAxios({
  baseURL: 'https://api.canva.com/rest/v1',
  timeout: 30000,
  maxRedirects: 0,
  validateStatus: () => true
});
async function exchange(clientId: string, clientSecret: string, body: URLSearchParams) {
  text(clientId, 'OAuth client ID');
  text(clientSecret, 'OAuth client secret');
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const guard = new ConnectionGuard([
    clientSecret,
    basic,
    body.get('code'),
    body.get('code_verifier'),
    body.get('refresh_token')
  ]);
  let response: Awaited<ReturnType<typeof tokenApi.post<unknown>>>;
  try {
    response = await tokenApi.post<unknown>('/oauth/token', body.toString(), {
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  } catch (error) {
    let status: ReturnType<typeof getApiErrorStatus>;
    try {
      status = getApiErrorStatus(error);
    } catch {
      status = undefined;
    }
    throw createApiServiceError(
      'Canva token exchange failed. Reconnect if a single-use code or refresh token may already have been consumed.',
      {
        upstreamStatus:
          typeof status === 'number' &&
          Number.isInteger(status) &&
          status >= 100 &&
          status <= 599
            ? status
            : undefined
      }
    );
  }
  guard.check([response.data, response.headers]);
  if (response.status !== 200)
    throw createApiServiceError(
      'Canva did not accept token exchange. Check client credentials, redirect URL and original grant; reconnect instead of retrying a consumed token.',
      { upstreamStatus: response.status }
    );
  const data = parseNative(nativeExchangeAccessTokenResponse, response.data);
  text(data.access_token, 'Canva access token');
  text(data.refresh_token, 'Canva refresh token');
  if (
    data.token_type.toLowerCase() !== 'bearer' ||
    data.expires_in <= 0 ||
    Date.now() + data.expires_in * 1000 > 8.64e15
  )
    fail('Canva returned an unusable token response. Reconnect.');
  return normalizeOAuthTokenResponse(data, {
    providerLabel: 'Canva',
    required: true,
    expiresInType: 'number'
  });
}
export const auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://www.canva.dev/docs/apps/rest-apis/authentication/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://www.canva.dev/docs/apps/rest-apis/scopes/'
      }
    ],
    scopes: [
      { title: 'Read Assets', description: 'Read asset metadata', scope: 'asset:read' },
      {
        title: 'Write Assets',
        description: 'Upload, update and delete assets',
        scope: 'asset:write'
      },
      {
        title: 'Read Brand Template Content',
        description: 'Read brand template datasets',
        scope: 'brandtemplate:content:read'
      },
      {
        title: 'Read Brand Template Metadata',
        description: 'Read brand templates',
        scope: 'brandtemplate:meta:read'
      },
      {
        title: 'Read Comments',
        description: 'Read design comments and replies',
        scope: 'comment:read'
      },
      {
        title: 'Write Comments',
        description: 'Create design comments and replies',
        scope: 'comment:write'
      },
      {
        title: 'Read Design Content',
        description: 'Export design content',
        scope: 'design:content:read'
      },
      {
        title: 'Write Design Content',
        description: 'Create, import and autofill designs',
        scope: 'design:content:write'
      },
      {
        title: 'Read Design Metadata',
        description: 'Read and search designs',
        scope: 'design:meta:read'
      },
      {
        title: 'Read Folders',
        description: 'Read folders and their contents',
        scope: 'folder:read'
      },
      {
        title: 'Write Folders',
        description: 'Create, move, update and delete folders',
        scope: 'folder:write'
      },
      {
        title: 'Read Profile',
        description: 'Read the optional display name',
        scope: 'profile:read'
      }
    ],
    inputSchema: z.object({
      codeVerifier: z.string().optional(),
      clientId: z.string().optional(),
      redirectUri: z.string().optional()
    }),
    getAuthorizationUrl: async ctx => {
      text(ctx.clientId, 'OAuth client ID');
      text(ctx.redirectUri, 'OAuth redirect URL');
      const codeVerifier = randomBytes(64).toString('base64url');
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(' '),
        code_challenge: createHash('sha256').update(codeVerifier).digest('base64url'),
        code_challenge_method: 'S256',
        state: ctx.state
      });
      return {
        url: `https://www.canva.com/api/oauth/authorize?${params}`,
        input: { codeVerifier, clientId: ctx.clientId, redirectUri: ctx.redirectUri }
      };
    },
    handleCallback: async ctx => {
      const originalInput = ctx.input;
      const inputFingerprint = JSON.stringify(originalInput);
      const original = {
        clientId: ctx.clientId,
        clientSecret: ctx.clientSecret,
        redirectUri: ctx.redirectUri,
        code: ctx.code,
        input: { ...originalInput }
      };
      const unchanged = () => {
        if (
          ctx.clientId !== original.clientId ||
          ctx.clientSecret !== original.clientSecret ||
          ctx.redirectUri !== original.redirectUri ||
          ctx.code !== original.code ||
          ctx.input !== originalInput ||
          JSON.stringify(ctx.input) !== inputFingerprint
        )
          fail(
            'The original OAuth authorization context changed. A single-use grant may already have been consumed; reconnect and reconcile the connection instead of repeating the exchange.'
          );
      };
      if (
        !original.input.codeVerifier ||
        !/^[A-Za-z0-9._~-]{43,128}$/.test(original.input.codeVerifier)
      )
        fail('The original PKCE verifier is missing or invalid. Restart authorization.');
      if (
        (original.input.clientId !== undefined &&
          original.input.clientId !== original.clientId) ||
        (original.input.redirectUri !== undefined &&
          original.input.redirectUri !== original.redirectUri)
      )
        fail('The OAuth client or redirect URL changed. Restart authorization.');
      text(original.code, 'Authorization code');
      unchanged();
      const tokens = await exchange(
        original.clientId,
        original.clientSecret,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: original.code,
          redirect_uri: original.redirectUri,
          code_verifier: original.input.codeVerifier
        })
      ).finally(unchanged);
      const identity = await new Client(tokens)
        .getCurrentIdentity()
        .catch(() =>
          fail(
            'Canva issued tokens but the original user/team could not be confirmed. The single-use grant may already have been consumed; reconnect and reconcile the connection instead of repeating the exchange.'
          )
        )
        .finally(unchanged);
      return {
        output: {
          ...tokens,
          ...identity,
          clientId: original.clientId,
          clientCredentialFingerprint: credentialFingerprint(
            original.clientId,
            original.clientSecret
          )
        }
      };
    },
    handleTokenRefresh: async (ctx: {
      clientId: string;
      clientSecret: string;
      output: z.infer<typeof outputSchema>;
    }) => {
      const originalOutput = ctx.output;
      const outputFingerprint = JSON.stringify(originalOutput);
      const original = {
        clientId: ctx.clientId,
        clientSecret: ctx.clientSecret,
        output: { ...originalOutput }
      };
      const unchanged = () => {
        if (
          ctx.clientId !== original.clientId ||
          ctx.clientSecret !== original.clientSecret ||
          ctx.output !== originalOutput ||
          JSON.stringify(ctx.output) !== outputFingerprint
        )
          fail(
            'The original Canva renewal context changed. A rotating refresh token may already have been consumed; reconnect and reconcile the connection instead of repeating renewal.'
          );
      };
      if (
        !original.output.refreshToken ||
        !original.output.clientId ||
        !original.output.clientCredentialFingerprint ||
        !original.output.userId ||
        !original.output.teamId
      )
        fail(
          'This stored connection lacks the original renewal binding. Reconnect once to enable safe token renewal; its access token remains usable until it expires.'
        );
      if (
        original.output.clientId !== original.clientId ||
        original.output.clientCredentialFingerprint !==
          credentialFingerprint(original.clientId, original.clientSecret)
      )
        fail(
          'The OAuth client credentials changed. Reconnect instead of consuming this connection’s refresh token.'
        );
      unchanged();
      const tokens = await exchange(
        original.clientId,
        original.clientSecret,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: original.output.refreshToken
        })
      ).finally(unchanged);
      const identity = await new Client({
        ...tokens,
        userId: original.output.userId,
        teamId: original.output.teamId
      })
        .getCurrentIdentity()
        .catch(() =>
          fail(
            'Canva issued replacement tokens but the original user/team could not be confirmed. The rotating refresh token may already have been consumed; reconnect and reconcile the connection instead of repeating renewal.'
          )
        )
        .finally(unchanged);
      return { output: { ...original.output, ...tokens, ...identity } };
    },
    getProfile: async (ctx: { output: z.infer<typeof outputSchema> }) => {
      const profile = await new Client(ctx.output).getCurrentUser();
      return {
        profile: { id: profile.userId, name: profile.displayName, teamId: profile.teamId }
      };
    }
  });
