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
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Account Read',
        description: 'Authenticate your HelpDesk account',
        scope: 'accounts--my:ro'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(','));
      }

      return {
        url: `https://accounts.livechat.com/?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAuthenticatedAxios({
        baseURL: 'https://accounts.livechat.com',
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'HelpDesk',
            reason: 'helpdesk_oauth_error'
          })
      });

      let response = await http.post('/v2/token', {
        grant_type: 'authorization_code',
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri
      });

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'HelpDesk',
          operation: 'OAuth token exchange'
        })
      };
    },

    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'No refresh token is available. Reconnect your HelpDesk account.'
        );
      }

      let http = createAuthenticatedAxios({
        baseURL: 'https://accounts.livechat.com',
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'HelpDesk',
            reason: 'helpdesk_oauth_error'
          })
      });

      let response = await http.post('/v2/token', {
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'HelpDesk',
          operation: 'OAuth token refresh',
          previousRefreshToken: ctx.output.refreshToken
        })
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Personal Access Token',
    key: 'pat',

    inputSchema: z.object({
      accountId: z.string().describe('Your account ID from the LiveChat Developers Console'),
      token: z
        .string()
        .describe('Your Personal Access Token generated in the Developers Console')
    }),

    getOutput: async ctx => {
      let encoded = btoa(`${ctx.input.accountId}:${ctx.input.token}`);
      return {
        output: {
          token: `Basic ${encoded}`
        }
      };
    }
  });
