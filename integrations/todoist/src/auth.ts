import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let authAxios = createAxios({
  baseURL: 'https://api.todoist.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Add Tasks',
        description: 'Add new tasks only',
        scope: 'task:add'
      },
      {
        title: 'Read Data',
        description: 'Read-only access to tasks, projects, labels, and filters',
        scope: 'data:read'
      },
      {
        title: 'Read & Write Data',
        description:
          'Read and write access to tasks, projects, labels, and filters (includes task:add and data:read)',
        scope: 'data:read_write'
      },
      {
        title: 'Delete Data',
        description: 'Delete tasks, labels, and filters',
        scope: 'data:delete'
      },
      {
        title: 'Delete Projects',
        description: 'Delete projects',
        scope: 'project:delete'
      },
      {
        title: 'Read Backups',
        description: 'List backups bypassing MFA requirements',
        scope: 'backups:read'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        scope: ctx.scopes.join(','),
        state: ctx.state
      });

      return {
        url: `https://app.todoist.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await authAxios.post('/oauth/access_token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code
      });

      return {
        output: {
          token: response.data.access_token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: any; scopes: string[] }) => {
      let response = await authAxios.get('/api/v1/user', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.name,
          imageUrl: user.image_url || user.avatar_big || user.avatar_medium
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      apiToken: z.string()
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiToken: string } }) => {
      let response = await authAxios.get('/api/v1/user', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.name,
          imageUrl: user.image_url || user.avatar_big || user.avatar_medium
        }
      };
    }
  });
