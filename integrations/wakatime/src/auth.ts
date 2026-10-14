import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let authAxios = createAuthenticatedAxios({
  baseURL: 'https://wakatime.com',
  timeout: 30_000,
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'WakaTime',
      reason: 'wakatime_oauth_failed',
      operation: 'OAuth token request'
    })
});

let apiAxios = createAuthenticatedAxios({
  baseURL: 'https://wakatime.com/api/v1',
  timeout: 30_000,
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'WakaTime',
      reason: 'wakatime_profile_failed',
      operation: 'profile request'
    })
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authType: z.enum(['oauth', 'api_key']).optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Read Summaries',
        description:
          'Access coding activity summaries (categories, dependencies, editors, languages, machines, operating systems, projects)',
        scope: 'read_summaries'
      },
      {
        title: 'Read Stats',
        description: 'Access aggregated coding statistics',
        scope: 'read_stats'
      },
      {
        title: 'Read Goals',
        description: 'Access coding goals',
        scope: 'read_goals'
      },
      {
        title: 'Read Organizations',
        description: 'Read organization and dashboard member data',
        scope: 'read_orgs'
      },
      {
        title: 'Read Private Leaderboards',
        description: 'Access private leaderboards',
        scope: 'read_private_leaderboards'
      },
      {
        title: 'Read Heartbeats',
        description: 'Access coding activity, projects, files, durations, and heartbeats',
        scope: 'read_heartbeats'
      },
      {
        title: 'Write Heartbeats',
        description: 'Create, edit, and delete heartbeats and external durations',
        scope: 'write_heartbeats'
      },
      {
        title: 'Email',
        description: "Access user's private email address",
        scope: 'email'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(',')
      });

      return {
        url: `https://wakatime.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await authAxios.post(
        '/oauth/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code',
          code: ctx.code
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'WakaTime',
            operation: 'authorization code exchange'
          }),
          authType: 'oauth' as const
        }
      };
    },

    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError('No refresh token is available. Reconnect with OAuth.');
      }

      let response = await authAxios.post(
        '/oauth/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'WakaTime',
            operation: 'token refresh',
            previousRefreshToken: ctx.output.refreshToken,
            refreshTokenFallbackMode: 'falsy'
          }),
          authType: 'oauth' as const
        }
      };
    },

    getProfile: async (ctx: { output: { token: string } }) => {
      let response = await apiAxios.get('/users/current', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data.data;

      return {
        profile: {
          id: user.id,
          email: user.email ?? undefined,
          name: user.display_name || user.username,
          imageUrl: user.photo ?? undefined
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key (Heartbeats Only)',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your write-only WakaTime API key from https://wakatime.com/api-key. Use OAuth to read activity or manage external durations.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authType: 'api_key' as const
        }
      };
    },

    getProfile: async () => {
      return {
        profile: {
          id: 'wakatime-api-key',
          name: 'WakaTime heartbeat API key'
        }
      };
    }
  });
