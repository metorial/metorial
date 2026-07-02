import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { withHelpScoutErrorHandling } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      docsApiKey: z.string().optional()
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
        url: 'https://developer.helpscout.com/mailbox-api/overview/authentication/'
      }
    ],

    scopes: [
      {
        title: 'Full Access',
        description:
          'Full access to Help Scout Inbox API (scopes are determined by user role)',
        scope: 'full'
      }
    ],

    inputSchema: z.object({
      docsApiKey: z
        .string()
        .optional()
        .describe(
          'Help Scout Docs API key (optional, for knowledge base access). Found under Your Profile > Authentication > API Keys.'
        )
    }),

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        state: ctx.state
      });

      return {
        url: `https://secure.helpscout.net/authentication/authorizeClientApplication?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let http = withHelpScoutErrorHandling(createAxios(), 'OAuth token exchange');

      let response = await http.post(
        'https://api.helpscout.net/v2/oauth2/token',
        {
          grant_type: 'authorization_code',
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      let token = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Help Scout',
        operation: 'token exchange'
      });

      return {
        output: {
          token: token.token,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          docsApiKey: ctx.input.docsApiKey || undefined
        },
        input: ctx.input
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'Cannot refresh Help Scout OAuth token because no refresh token was saved.'
        );
      }

      let http = withHelpScoutErrorHandling(createAxios(), 'OAuth token refresh');

      let response = await http.post(
        'https://api.helpscout.net/v2/oauth2/token',
        {
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      let token = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Help Scout',
        operation: 'token refresh',
        previousRefreshToken: ctx.output.refreshToken
      });

      return {
        output: {
          token: token.token,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          docsApiKey: ctx.output.docsApiKey
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = withHelpScoutErrorHandling(
        createAxios({
          baseURL: 'https://api.helpscout.net/v2',
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        }),
        'profile request'
      );

      let response = await http.get('/users/me');
      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email ?? undefined,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
          imageUrl: user.photoUrl ?? undefined
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials',
    key: 'client_credentials',

    inputSchema: z.object({
      clientId: z.string().describe('Help Scout OAuth2 Application Client ID'),
      clientSecret: z.string().describe('Help Scout OAuth2 Application Client Secret'),
      docsApiKey: z
        .string()
        .optional()
        .describe('Help Scout Docs API key (optional, for knowledge base access)')
    }),

    getOutput: async ctx => {
      let http = withHelpScoutErrorHandling(createAxios(), 'client credentials token request');

      let response = await http.post(
        'https://api.helpscout.net/v2/oauth2/token',
        {
          grant_type: 'client_credentials',
          client_id: ctx.input.clientId,
          client_secret: ctx.input.clientSecret
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      let token = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Help Scout',
        operation: 'client credentials token request'
      });

      return {
        output: {
          token: token.token,
          refreshToken: undefined,
          expiresAt: token.expiresAt,
          docsApiKey: ctx.input.docsApiKey || undefined
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = withHelpScoutErrorHandling(
        createAxios({
          baseURL: 'https://api.helpscout.net/v2',
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        }),
        'profile request'
      );

      let response = await http.get('/users/me');
      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email ?? undefined,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
          imageUrl: user.photoUrl ?? undefined
        }
      };
    }
  });
