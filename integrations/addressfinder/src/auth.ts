import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  requestAxiosData,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { addressfinderError } from './lib/client';

let requestAccessToken = async (clientId: string, clientSecret: string, scopes: string[]) => {
  if (!clientId.trim() || !clientSecret.trim()) {
    throw createApiServiceError('Enter your Addressfinder OAuth client ID and secret.', {
      reason: 'addressfinder_missing_auth'
    });
  }
  let axios = createAuthenticatedAxios({
    baseURL: 'https://api.addressfinder.io',
    contentType: 'application/x-www-form-urlencoded'
  });
  let params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    expires_in: '3600'
  });
  if (scopes.length > 0) params.set('scope', scopes.join(' '));
  let data = await requestAxiosData(
    'token exchange',
    () => axios.post('/oauth/token', params.toString()),
    addressfinderError
  );
  let token = normalizeOAuthTokenResponse(data, {
    providerLabel: 'Addressfinder',
    required: true
  });
  let expiry = Date.parse(token.expiresAt!);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) {
    throw createApiServiceError('Addressfinder returned an invalid token lifetime.', {
      reason: 'oauth_token_response'
    });
  }
  return {
    token: token.token,
    authMethod: 'oauth2' as const,
    expiresAt: new Date(expiry - Math.min(60_000, (expiry - Date.now()) / 2)).toISOString()
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      secret: z.string().optional(),
      authMethod: z.enum(['api_key', 'oauth2']),
      expiresAt: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key + Secret',
    key: 'api_key_secret',
    inputSchema: z.object({
      apiKey: z.string().describe('Your Addressfinder API Key (found in Portal credentials)'),
      apiSecret: z
        .string()
        .describe('Your Addressfinder API Secret (found in Portal credentials)')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim() || !ctx.input.apiSecret.trim()) {
        throw createApiServiceError('Enter your Addressfinder API key and secret.', {
          reason: 'addressfinder_missing_auth'
        });
      }
      return {
        output: {
          token: ctx.input.apiKey,
          secret: ctx.input.apiSecret,
          authMethod: 'api_key' as const
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'OAuth2 Client Credentials',
    key: 'client_credentials',
    inputSchema: z.object({
      clientId: z.string().describe('OAuth client ID from the Addressfinder Portal.'),
      clientSecret: z.string().describe('OAuth client secret from the Addressfinder Portal.'),
      scopes: z
        .array(z.enum(['address', 'email', 'phone']))
        .optional()
        .describe('Requested service scopes. Omit to use all scopes permitted by your client.')
    }),
    getOutput: async ctx => ({
      output: await requestAccessToken(
        ctx.input.clientId,
        ctx.input.clientSecret,
        ctx.input.scopes ?? []
      )
    }),
    handleTokenRefresh: async (ctx: {
      input: { clientId: string; clientSecret: string; scopes?: string[] };
    }) => ({
      output: await requestAccessToken(
        ctx.input.clientId,
        ctx.input.clientSecret,
        ctx.input.scopes ?? []
      )
    })
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth2 (Legacy Connection)',
    key: 'oauth2',
    scopes: [
      {
        title: 'Address',
        description:
          'Access to address autocomplete, verification, metadata, location, and geocoding APIs',
        scope: 'address'
      },
      { title: 'Email', description: 'Access to email verification API', scope: 'email' },
      { title: 'Phone', description: 'Access to phone verification API', scope: 'phone' }
    ],
    getAuthorizationUrl: async () => {
      throw createApiServiceError(
        'Addressfinder uses a client credentials flow without a browser redirect. Select OAuth2 Client Credentials or API Key + Secret to connect.',
        {
          reason: 'addressfinder_client_credentials_required'
        }
      );
    },
    handleCallback: async ctx => ({
      output: await requestAccessToken(ctx.clientId, ctx.clientSecret, ctx.scopes)
    }),
    handleTokenRefresh: async (ctx: {
      clientId: string;
      clientSecret: string;
      scopes: string[];
    }) => ({
      output: await requestAccessToken(ctx.clientId, ctx.clientSecret, ctx.scopes)
    })
  });
