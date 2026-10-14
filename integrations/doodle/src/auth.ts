import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

let http = createAuthenticatedAxios({
  baseURL: 'https://doodle.com',
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'Doodle',
      operation: 'OAuth request',
      reason: 'doodle_oauth_error'
    })
});

type DoodleOAuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
};

type DoodleAuthorizationContext = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes: string[];
};

type DoodleCallbackContext = DoodleAuthorizationContext & {
  clientSecret: string;
  code: string;
};

type DoodleTokenRefreshContext = {
  clientId: string;
  clientSecret: string;
  output: DoodleOAuthOutput;
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

    scopes: [
      {
        title: 'Name',
        description: 'Access to your name',
        scope: 'name'
      },
      {
        title: 'Email Address',
        description: 'Access to your email address',
        scope: 'eMailAddress'
      },
      {
        title: 'Initiated Polls',
        description: 'Access to polls you have created',
        scope: 'initiatedPolls'
      },
      {
        title: 'Participated Polls',
        description: 'Access to polls you have participated in',
        scope: 'participatedPolls'
      }
    ],

    getAuthorizationUrl: async (ctx: DoodleAuthorizationContext) => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://doodle.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async (ctx: DoodleCallbackContext) => {
      let response = await http.post(
        '/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Doodle',
          operation: 'token exchange'
        })
      };
    },

    handleTokenRefresh: async (ctx: DoodleTokenRefreshContext) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'No Doodle refresh token is available. Reconnect your Doodle account.'
        );
      }

      let response = await http.post(
        '/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Doodle',
          operation: 'token refresh',
          previousRefreshToken: ctx.output.refreshToken,
          refreshTokenFallbackMode: 'falsy'
        })
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let user = await new Client({ token: ctx.output.token }).getCurrentUser();

      return {
        profile: {
          id: user.id,
          email: user.emailAddress,
          name: user.name
        }
      };
    }
  });
