import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      subdomain: z.string().optional(),
      redirectUri: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',

    scopes: [
      {
        title: 'CRM',
        description:
          'Access to leads, contacts, companies, pipelines, tasks, and other CRM data',
        scope: 'crm'
      },
      {
        title: 'Notifications',
        description: 'Access to manage webhooks and notifications',
        scope: 'notifications'
      }
    ],

    inputSchema: z.object({
      subdomain: z
        .string()
        .describe('Your Kommo account subdomain (e.g., "mycompany" from mycompany.kommo.com)')
    }),

    getAuthorizationUrl: async ctx => {
      let url = `https://www.kommo.com/oauth?client_id=${ctx.clientId}&state=${ctx.state}&mode=popup`;
      return { url };
    },

    handleCallback: async ctx => {
      let http = createAuthenticatedAxios({
        baseURL: `https://${ctx.input.subdomain}.kommo.com`,
        errorAdapter: error =>
          buildApiServiceError(error, { providerLabel: 'Kommo', reason: 'kommo_api_error' })
      });

      let response = await http.post('/oauth2/access_token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      });

      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, { providerLabel: 'Kommo' }),
          subdomain: ctx.input.subdomain,
          redirectUri: ctx.redirectUri
        }
      };
    },

    handleTokenRefresh: async (ctx: {
      output: {
        token: string;
        refreshToken?: string;
        expiresAt?: string;
        subdomain?: string;
        redirectUri?: string;
      };
      input: { subdomain: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError('Kommo refresh token is missing. Reconnect your account.');
      }
      if (!ctx.output.redirectUri) {
        throw createApiServiceError(
          'Kommo redirect URI is missing. Reconnect your account to enable token refresh.'
        );
      }
      let subdomain = ctx.output.subdomain || ctx.input.subdomain;
      let http = createAuthenticatedAxios({
        baseURL: `https://${subdomain}.kommo.com`,
        errorAdapter: error =>
          buildApiServiceError(error, { providerLabel: 'Kommo', reason: 'kommo_api_error' })
      });

      let response = await http.post('/oauth2/access_token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        redirect_uri: ctx.output.redirectUri
      });

      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Kommo',
            previousRefreshToken: ctx.output.refreshToken
          }),
          subdomain,
          redirectUri: ctx.output.redirectUri
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string; subdomain?: string };
      input: { subdomain: string };
      scopes: string[];
    }) => {
      let subdomain = ctx.output.subdomain || ctx.input.subdomain;
      let http = createAuthenticatedAxios({
        baseURL: `https://${subdomain}.kommo.com/api/v4`,
        authHeader: { value: `Bearer ${ctx.output.token}` },
        errorAdapter: error =>
          buildApiServiceError(error, { providerLabel: 'Kommo', reason: 'kommo_api_error' })
      });

      let accountRes = await http.get('/account');
      let currentUserId = accountRes.data.current_user_id;

      let userRes = await http.get(`/users/${currentUserId}`);
      let user = userRes.data;

      return {
        profile: {
          id: String(user.id),
          name: user.name,
          email: user.email,
          subdomain
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Long-lived Token',
    key: 'long_lived_token',

    inputSchema: z.object({
      token: z.string().describe('Your Kommo long-lived API token'),
      subdomain: z
        .string()
        .describe('Your Kommo account subdomain (e.g., "mycompany" from mycompany.kommo.com)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          subdomain: ctx.input.subdomain
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string; subdomain?: string };
      input: { token: string; subdomain: string };
    }) => {
      let http = createAuthenticatedAxios({
        baseURL: `https://${ctx.input.subdomain}.kommo.com/api/v4`,
        authHeader: { value: `Bearer ${ctx.output.token}` },
        errorAdapter: error =>
          buildApiServiceError(error, { providerLabel: 'Kommo', reason: 'kommo_api_error' })
      });

      let accountRes = await http.get('/account');
      let currentUserId = accountRes.data.current_user_id;

      let userRes = await http.get(`/users/${currentUserId}`);
      let user = userRes.data;

      return {
        profile: {
          id: String(user.id),
          name: user.name,
          email: user.email,
          subdomain: ctx.input.subdomain
        }
      };
    }
  });
