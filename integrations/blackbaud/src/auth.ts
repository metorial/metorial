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
      subscriptionKey: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.blackbaud.com/skyapi/docs/authorization/auth-code-flow'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.blackbaud.com/skyapi/docs/applications/scopes'
      }
    ],

    scopes: [
      {
        title: 'Full Access',
        description:
          'Full data access across all Blackbaud solutions, including future solutions.',
        scope: 'full'
      }
    ],

    inputSchema: z.object({
      subscriptionKey: z
        .string()
        .describe(
          'Your Blackbaud SKY API subscription key (Bb-Api-Subscription-Key). Found in the developer portal under your subscription.'
        )
    }),

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://app.blackbaud.com/oauth/authorize?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let http = createAuthenticatedAxios({
        contentType: 'application/x-www-form-urlencoded',
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'Blackbaud',
            reason: 'oauth_token_exchange',
            operation: 'token exchange'
          })
      });

      let response = await http.post(
        'https://oauth2.sky.blackbaud.com/token',
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

      let tokens = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Blackbaud',
        operation: 'token exchange'
      });

      return {
        output: {
          ...tokens,
          subscriptionKey: ctx.input.subscriptionKey
        },
        input: ctx.input
      };
    },

    handleTokenRefresh: async (ctx: {
      output: {
        token: string;
        refreshToken?: string;
        expiresAt?: string;
        subscriptionKey: string;
      };
      input: { subscriptionKey: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'No Blackbaud refresh token is available. Reconnect your account.',
          { reason: 'missing_refresh_token' }
        );
      }

      let http = createAuthenticatedAxios({
        contentType: 'application/x-www-form-urlencoded',
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'Blackbaud',
            reason: 'oauth_token_refresh',
            operation: 'token refresh'
          })
      });

      let response = await http.post(
        'https://oauth2.sky.blackbaud.com/token',
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

      let tokens = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Blackbaud',
        operation: 'token refresh',
        previousRefreshToken: ctx.output.refreshToken,
        refreshTokenFallbackMode: 'falsy'
      });

      return {
        output: {
          ...tokens,
          subscriptionKey: ctx.output.subscriptionKey
        },
        input: ctx.input
      };
    }
  });
