import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let linearApi = createAxios({
  baseURL: 'https://api.linear.app'
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
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://linear.app/developers/oauth-2-0-authentication'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://linear.app/developers/oauth-2-0-authentication'
      }
    ],

    scopes: [
      {
        title: 'Read',
        description: "Read access for the user's account.",
        scope: 'read'
      },
      {
        title: 'Write',
        description: "Write access for the user's account.",
        scope: 'write'
      },
      {
        title: 'Create Issues',
        description: 'Allows creating new issues and their attachments only.',
        scope: 'issues:create'
      },
      {
        title: 'Create Comments',
        description: 'Allows creating new issue comments only.',
        scope: 'comments:create'
      },
      {
        title: 'Time Schedule',
        description: 'Allows creating and modifying time schedules.',
        scope: 'timeSchedule:write'
      },
      {
        title: 'Admin',
        description: 'Full access to admin-level endpoints.',
        scope: 'admin'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(','),
        state: ctx.state,
        prompt: 'consent'
      });

      return {
        url: `https://linear.app/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await linearApi.post(
        '/oauth/token',
        {
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code'
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

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
        return { output: ctx.output };
      }

      let response = await linearApi.post(
        '/oauth/token',
        {
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token'
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await linearApi.post(
        '/graphql',
        {
          query: `query { viewer { id name email displayName avatarUrl } }`
        },
        {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let viewer = response.data?.data?.viewer;

      return {
        profile: {
          id: viewer?.id,
          email: viewer?.email,
          name: viewer?.displayName || viewer?.name,
          imageUrl: viewer?.avatarUrl
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
        .describe('Personal API key from Linear Settings > Account > Security & Access')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await linearApi.post(
        '/graphql',
        {
          query: `query { viewer { id name email displayName avatarUrl } }`
        },
        {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let viewer = response.data?.data?.viewer;

      return {
        profile: {
          id: viewer?.id,
          email: viewer?.email,
          name: viewer?.displayName || viewer?.name,
          imageUrl: viewer?.avatarUrl
        }
      };
    }
  });
