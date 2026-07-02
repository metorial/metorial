import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { atlasApiError, atlasServiceError } from './lib/errors';

let atlasOAuthAxios = createAxios({
  baseURL: 'https://cloud.mongodb.com'
});

let requestServiceAccountToken = async (clientId: string, clientSecret: string) => {
  try {
    let params = new URLSearchParams({
      grant_type: 'client_credentials'
    });

    let credentials = btoa(`${clientId}:${clientSecret}`);

    let response = await atlasOAuthAxios.post('/api/oauth/token', params.toString(), {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      }
    });

    let tokenData = response.data;
    if (!tokenData?.access_token || typeof tokenData.expires_in !== 'number') {
      throw atlasServiceError(
        'MongoDB Atlas OAuth token response did not include access_token and expires_in.'
      );
    }

    return {
      accessToken: tokenData.access_token as string,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    };
  } catch (error) {
    throw atlasApiError(error, 'OAuth token exchange');
  }
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('OAuth 2.0 access token or API public key'),
      authMethod: z.enum(['oauth', 'digest']).describe('Authentication method being used'),
      publicKey: z.string().optional().describe('API public key (for Digest auth)'),
      privateKey: z.string().optional().describe('API private key (for Digest auth)'),
      expiresAt: z.string().optional().describe('Token expiration time (ISO 8601)')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Service Account (OAuth 2.0)',
    key: 'service_account_oauth',

    scopes: [
      {
        title: 'Full Access',
        description:
          'Full access to Atlas Administration API resources scoped to the service account roles',
        scope: 'openid'
      }
    ],

    getAuthorizationUrl: async ctx => {
      // MongoDB Atlas Service Accounts use Client Credentials flow (no user redirect).
      // We exchange client credentials directly for an access token.
      // The "authorization URL" step is not applicable for client_credentials,
      // but the framework requires it. We use a special redirect to signal direct token exchange.
      let { accessToken, expiresAt } = await requestServiceAccountToken(
        ctx.clientId,
        ctx.clientSecret
      );

      // For client_credentials, we redirect to the callback with the token encoded
      let callbackUrl = new URL(ctx.redirectUri);
      callbackUrl.searchParams.set('code', 'client_credentials_exchange');
      callbackUrl.searchParams.set('state', ctx.state);

      return {
        url: callbackUrl.toString(),
        callbackState: {
          accessToken,
          expiresAt
        }
      };
    },

    handleCallback: async ctx => {
      let accessToken = ctx.callbackState?.accessToken as string;
      let expiresAt = ctx.callbackState?.expiresAt as string;
      if (!accessToken || !expiresAt) {
        throw atlasServiceError(
          'MongoDB Atlas OAuth callback state did not include an access token.'
        );
      }

      return {
        output: {
          token: accessToken,
          authMethod: 'oauth' as const,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let { accessToken, expiresAt } = await requestServiceAccountToken(
        ctx.clientId,
        ctx.clientSecret
      );

      return {
        output: {
          token: accessToken,
          authMethod: 'oauth' as const,
          expiresAt
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key (Digest Auth)',
    key: 'api_key_digest',

    inputSchema: z.object({
      publicKey: z.string().describe('Atlas API public key (username)'),
      privateKey: z.string().describe('Atlas API private key (password)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.publicKey,
          authMethod: 'digest' as const,
          publicKey: ctx.input.publicKey,
          privateKey: ctx.input.privateKey
        }
      };
    },

    getProfile: async (ctx: any) => {
      let publicKey = ctx.output?.publicKey || ctx.input?.publicKey || '';
      return {
        profile: {
          id: publicKey,
          name: publicKey ? `API Key: ${publicKey.substring(0, 8)}...` : 'Unknown'
        }
      };
    }
  });
