import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let authAxios = createAxios({
  baseURL: 'https://wakatime.com'
});

let apiAxios = createAxios({
  baseURL: 'https://api.wakatime.com/api/v1'
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
        title: 'Write Organizations',
        description: 'Modify organizations and dashboard members',
        scope: 'write_orgs'
      },
      {
        title: 'Read Private Leaderboards',
        description: 'Access private leaderboards',
        scope: 'read_private_leaderboards'
      },
      {
        title: 'Write Private Leaderboards',
        description: 'Create and modify private leaderboards',
        scope: 'write_private_leaderboards'
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

      let data = response.data;

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let response = await authAxios.post(
        '/oauth/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: '',
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: any; scopes: string[] }) => {
      let response = await apiAxios.get('/users/current', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data.data;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.display_name || user.username,
          imageUrl: user.photo
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Your WakaTime API Key (found at https://wakatime.com/api-key)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let encoded = Buffer.from(ctx.output.token).toString('base64');

      let response = await apiAxios.get('/users/current', {
        headers: {
          Authorization: `Basic ${encoded}`
        }
      });

      let user = response.data.data;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.display_name || user.username,
          imageUrl: user.photo
        }
      };
    }
  });
