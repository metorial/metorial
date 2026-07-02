import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { apolloApiError, apolloOAuthError, apolloServiceError } from './lib/errors';

type ApolloAuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  authType: 'api_key' | 'oauth';
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authType: z.enum(['api_key', 'oauth'])
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Apollo.io API key. Create one in Settings > Integrations > API Keys.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authType: 'api_key' as const
        }
      };
    },

    getProfile: async (ctx: { output: ApolloAuthOutput; input: { apiKey: string } }) => {
      let client = createAxios({
        baseURL: 'https://api.apollo.io/api/v1'
      });

      let response: any;
      try {
        response = await client.get('/users/api_profile', {
          headers: {
            'x-api-key': ctx.output.token
          }
        });
      } catch (error) {
        throw apolloApiError(error, 'get API key profile');
      }

      let user = response.data;
      return {
        profile: {
          id: user.id,
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
          imageUrl: user.image_url || undefined
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://docs.apollo.io/docs/use-oauth-20-authorization-flow-to-access-apollo-user-information-partners'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://docs.apollo.io/docs/use-oauth-20-authorization-flow-to-access-apollo-user-information-partners'
      }
    ],

    scopes: [
      {
        title: 'App Scopes',
        description: 'Authorize the Apollo app scopes selected for this OAuth application',
        scope: 'app_scopes'
      },
      {
        title: 'Read User Profile',
        description: 'Read basic user profile information',
        scope: 'read_user_profile'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let scopeString = ctx.scopes.join(' ');
      let url = `https://app.apollo.io/#/oauth/authorize?client_id=${encodeURIComponent(ctx.clientId)}&redirect_uri=${encodeURIComponent(ctx.redirectUri)}&response_type=code&scope=${encodeURIComponent(scopeString)}&state=${encodeURIComponent(ctx.state)}`;

      return { url };
    },

    handleCallback: async ctx => {
      let client = createAxios({
        baseURL: 'https://app.apollo.io/api/v1'
      });

      let response: any;
      try {
        response = await client.post('/oauth/token', {
          grant_type: 'authorization_code',
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri
        });
      } catch (error) {
        throw apolloOAuthError('token exchange', error);
      }

      let data = response.data;
      if (!data.access_token) {
        throw apolloServiceError(
          'Apollo OAuth token response did not include an access token.'
        );
      }

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          authType: 'oauth' as const
        }
      };
    },

    handleTokenRefresh: async (ctx: {
      output: ApolloAuthOutput;
      input: {};
      clientId: string;
      clientSecret: string;
      scopes: string[];
    }) => {
      if (!ctx.output.refreshToken) {
        throw apolloServiceError('No refresh token available for Apollo OAuth refresh.');
      }

      let client = createAxios({
        baseURL: 'https://app.apollo.io/api/v1'
      });

      let response: any;
      try {
        response = await client.post('/oauth/token', {
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        });
      } catch (error) {
        throw apolloOAuthError('token refresh', error);
      }

      let data = response.data;
      if (!data.access_token) {
        throw apolloServiceError(
          'Apollo OAuth refresh response did not include an access token.'
        );
      }

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          authType: 'oauth' as const
        }
      };
    },

    getProfile: async (ctx: { output: ApolloAuthOutput; input: {}; scopes: string[] }) => {
      let client = createAxios({
        baseURL: 'https://api.apollo.io/api/v1'
      });

      let response: any;
      try {
        response = await client.get('/users/api_profile', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });
      } catch (error) {
        throw apolloApiError(error, 'get OAuth profile');
      }

      let user = response.data;
      return {
        profile: {
          id: user.id,
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
          imageUrl: user.image_url || undefined
        }
      };
    }
  });
