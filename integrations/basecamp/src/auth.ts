import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { getAuthorization } from './lib/client';

let launchpadAxios = createAuthenticatedAxios({
  baseURL: 'https://launchpad.37signals.com',
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'Basecamp OAuth',
      reason: 'basecamp_oauth_error'
    })
});

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

    scopes: [],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        type: 'web_server',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://launchpad.37signals.com/authorization/new?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await launchpadAxios.post('/authorization/token', {
        type: 'web_server',
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri,
        code: ctx.code
      });

      let data = response.data;

      return {
        output: {
          ...normalizeOAuthTokenResponse(data, {
            providerLabel: 'Basecamp',
            operation: 'token exchange',
            required: true
          })
        }
      };
    },

    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'A Basecamp refresh token is required. Reconnect your Basecamp account.'
        );
      }
      let response = await launchpadAxios.post('/authorization/token', {
        type: 'refresh',
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      let data = response.data;

      return {
        output: {
          ...normalizeOAuthTokenResponse(data, {
            providerLabel: 'Basecamp',
            operation: 'token refresh',
            previousRefreshToken: ctx.output.refreshToken,
            required: true
          })
        }
      };
    },

    getProfile: async (ctx: { output: { token: string } }) => {
      let data = await getAuthorization(ctx.output.token);
      let identity = data.identity;

      return {
        profile: {
          id: String(identity.id),
          email: identity.email_address,
          name: `${identity.first_name} ${identity.last_name}`
        }
      };
    }
  });
