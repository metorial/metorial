import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { piggyApiError } from './lib/client';

let getAccessToken = async (clientId: string, clientSecret: string) => {
  if (!clientId.trim() || !clientSecret.trim())
    throw createApiServiceError('Enter your Piggy OAuth client ID and secret.', {
      reason: 'piggy_missing_auth'
    });
  let api = createAuthenticatedAxios({
    baseURL: 'https://api.piggy.eu',
    errorAdapter: piggyApiError
  });
  let response = await api.post('/oauth/token', {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  });
  let token = normalizeOAuthTokenResponse(response.data, {
    providerLabel: 'Piggy',
    required: true
  });
  if (Date.parse(token.expiresAt!) <= Date.now())
    throw createApiServiceError('Piggy returned an expired access token.', {
      reason: 'oauth_token_response'
    });
  return { token: token.token, expiresAt: token.expiresAt };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Bearer token for API authentication'),
      expiresAt: z.string().optional().describe('Access token expiration timestamp')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth (Client Credentials)',
    key: 'oauth_client_credentials',

    scopes: [],

    inputSchema: z.object({
      clientId: z.string().describe('OAuth Client ID'),
      clientSecret: z.string().describe('OAuth Client Secret')
    }),

    getAuthorizationUrl: async ctx => {
      // Client credentials flow does not have a user-facing authorization URL.
      // We handle token acquisition in handleCallback directly.
      // Return a redirect back to our own callback URL with the state.
      let url = new URL(ctx.redirectUri);
      url.searchParams.set('code', 'client_credentials');
      url.searchParams.set('state', ctx.state);
      return { url: url.toString() };
    },

    handleCallback: async ctx => {
      return { output: await getAccessToken(ctx.input.clientId, ctx.input.clientSecret) };
    },

    handleTokenRefresh: async (ctx: { input: { clientId: string; clientSecret: string } }) => {
      return { output: await getAccessToken(ctx.input.clientId, ctx.input.clientSecret) };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Personal Access Token from a Private App in the business dashboard')
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('Enter your Piggy API token.', {
          reason: 'piggy_missing_auth'
        });
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
