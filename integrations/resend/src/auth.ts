import { createHash, randomBytes } from 'node:crypto';
import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { resendApiError } from './lib/errors';

let oauthClient = createAuthenticatedAxios({
  baseURL: 'https://api.resend.com',
  contentType: 'application/x-www-form-urlencoded',
  maxRedirects: 0,
  errorAdapter: resendApiError
});

let tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().int().positive(),
  scope: z.string().optional()
});

let exchangeTokens = async (
  clientId: string,
  clientSecret: string,
  params: Record<string, string>,
  previousRefreshToken?: string
) => {
  if (!clientId || !clientSecret) {
    throw createApiServiceError(
      'Resend OAuth requires a registered client ID and client secret.'
    );
  }
  let encodeCredential = (value: string) =>
    new URLSearchParams({ value }).toString().slice('value='.length);
  let basic = Buffer.from(
    `${encodeCredential(clientId)}:${encodeCredential(clientSecret)}`
  ).toString('base64');
  let response = await oauthClient.post(
    '/oauth/token',
    new URLSearchParams(params).toString(),
    {
      headers: { Authorization: `Basic ${basic}` }
    }
  );
  let parsed = tokenResponseSchema.safeParse(response.data);
  if (!parsed.success) {
    throw createApiServiceError(
      'Resend returned an invalid OAuth token response. Reconnect your account.'
    );
  }
  let data = parsed.data;
  if (data.scope !== undefined && !data.scope.split(/\s+/).includes('full_access')) {
    throw createApiServiceError(
      'Resend did not grant full_access. Reconnect with full access to use these tools.'
    );
  }
  let output = normalizeOAuthTokenResponse(data, {
    providerLabel: 'Resend',
    required: true,
    expiresInType: 'number',
    previousRefreshToken
  });
  if (!output.refreshToken) {
    throw createApiServiceError(
      'Resend did not return a refresh token. Reconnect your account.'
    );
  }
  return output;
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Resend OAuth setup',
        url: 'https://resend.com/docs/guides/building-a-resend-oauth-client'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'Resend OAuth scopes',
        url: 'https://resend.com/docs/guides/building-a-resend-oauth-client#scopes'
      }
    ],
    scopes: [
      {
        scope: 'full_access',
        title: 'Full access',
        description:
          'Send emails and manage emails, domains, contacts, campaigns, templates, and webhooks.'
      }
    ],
    getAuthorizationUrl: async ctx => {
      if (!ctx.clientId || !ctx.clientSecret || !ctx.state) {
        throw createApiServiceError(
          'Configure the Resend OAuth client ID and secret, then restart authorization.'
        );
      }
      let codeVerifier = randomBytes(64).toString('base64url');
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: 'full_access',
        state: ctx.state,
        code_challenge: createHash('sha256').update(codeVerifier).digest('base64url'),
        code_challenge_method: 'S256'
      });
      return {
        url: `https://api.resend.com/oauth/authorize?${params}`,
        callbackState: {
          codeVerifier,
          state: ctx.state,
          clientId: ctx.clientId,
          redirectUri: ctx.redirectUri
        }
      };
    },
    handleCallback: async ctx => {
      let saved = z
        .object({
          codeVerifier: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
          state: z.string().min(1),
          clientId: z.string().min(1),
          redirectUri: z.string().min(1)
        })
        .safeParse(ctx.callbackState);
      if (
        !saved.success ||
        saved.data.state !== ctx.state ||
        saved.data.clientId !== ctx.clientId ||
        saved.data.redirectUri !== ctx.redirectUri ||
        !ctx.code ||
        ctx.callbackParams?.error
      ) {
        throw createApiServiceError(
          'Resend OAuth callback is invalid or expired. Restart authorization.'
        );
      }
      return {
        output: await exchangeTokens(ctx.clientId, ctx.clientSecret, {
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          code_verifier: saved.data.codeVerifier
        }),
        scopes: ['full_access']
      };
    },
    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError('Resend refresh token is missing. Reconnect using OAuth.');
      }
      return {
        output: await exchangeTokens(
          ctx.clientId,
          ctx.clientSecret,
          {
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken
          },
          ctx.output.refreshToken
        )
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Resend API key (starts with re_)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
