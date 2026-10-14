import { createHash, randomBytes } from 'node:crypto';
import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { ahrefsApiError } from './lib/errors';

let oauthAxios = createAuthenticatedAxios({
  baseURL: 'https://ahrefs.com',
  contentType: 'application/x-www-form-urlencoded',
  errorAdapter: error => ahrefsApiError(error, 'token exchange')
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Ahrefs Connect (OAuth)',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Ahrefs Connect OAuth guide',
        url: 'https://docs.ahrefs.com/en/ahrefs-connect/docs/oauth-guide'
      }
    ],
    scopes: [
      {
        title: 'API v3 Integration',
        description: 'Full access to Ahrefs API v3 endpoints on behalf of the authorized user',
        scope: 'apiv3-integration-apps'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let codeVerifier = randomBytes(32).toString('base64url');
      let codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        scope: ctx.scopes.join(' '),
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        code_challenge: codeChallenge,
        code_challenge_method: 's256'
      });

      return {
        url: `https://app.ahrefs.com/web/oauth/authorize?${params.toString()}`,
        callbackState: { codeVerifier }
      };
    },
    handleCallback: async ctx => {
      let codeVerifier = ctx.callbackState?.codeVerifier;
      if (typeof codeVerifier !== 'string' || !codeVerifier) {
        throw createApiServiceError(
          'Ahrefs authorization state is missing. Reconnect your account.',
          {
            reason: 'ahrefs_oauth_state_missing'
          }
        );
      }
      let response = await oauthAxios.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          code_verifier: codeVerifier
        }).toString()
      );
      let tokens = normalizeOAuthTokenResponse(response.data, { providerLabel: 'Ahrefs' });
      return {
        output: { token: tokens.token, expiresAt: tokens.expiresAt }
      };
    },
    handleTokenRefresh: async () => {
      throw createApiServiceError(
        'Ahrefs does not issue refresh tokens. Reconnect your Ahrefs account after the access token expires.',
        { reason: 'ahrefs_reauthorization_required' }
      );
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Ahrefs API key (Bearer token). Create one in Account Settings > API keys.')
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('Enter a valid Ahrefs API key.', {
          reason: 'ahrefs_api_key_missing'
        });
      }
      return { output: { token: ctx.input.token } };
    }
  });
