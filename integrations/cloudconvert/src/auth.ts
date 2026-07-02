import { createAxios, SlateAuth } from 'slates';
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
        title: 'Read Account',
        description: 'Read account data, remaining credits, and usage charts',
        scope: 'user.read'
      },
      {
        title: 'Write Account',
        description: 'Update account data',
        scope: 'user.write'
      },
      {
        title: 'Read Tasks',
        description: 'Read tasks and jobs',
        scope: 'task.read'
      },
      {
        title: 'Write Tasks',
        description: 'Create, update, and delete tasks and jobs',
        scope: 'task.write'
      },
      {
        title: 'Read Webhooks',
        description: 'Read webhook settings',
        scope: 'webhook.read'
      },
      {
        title: 'Write Webhooks',
        description: 'Update webhook settings',
        scope: 'webhook.write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://cloudconvert.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();

      let response = await axios.post('https://cloudconvert.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri,
        code: ctx.code
      });

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let axios = createAxios();

      let response = await axios.post('https://cloudconvert.com/oauth/token', {
        grant_type: 'refresh_token',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken
      });

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: any; scopes: string[] }) => {
      let axios = createAxios({
        baseURL: 'https://api.cloudconvert.com/v2',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/users/me');
      let user = response.data.data;

      return {
        profile: {
          id: String(user.id),
          name: user.username,
          email: user.email
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z.string().describe('CloudConvert API key from the dashboard')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let axios = createAxios({
        baseURL: 'https://api.cloudconvert.com/v2',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/users/me');
      let user = response.data.data;

      return {
        profile: {
          id: String(user.id),
          name: user.username,
          email: user.email
        }
      };
    }
  });
