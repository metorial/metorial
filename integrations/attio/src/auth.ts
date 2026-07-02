import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

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
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://docs.attio.com/rest-api/tutorials/connect-an-app-through-oauth'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://docs.attio.com/rest-api/guides/authentication#scopes'
      }
    ],

    scopes: [
      {
        title: 'Object Configuration (Read)',
        description: 'Read object and attribute definitions',
        scope: 'object_configuration:read'
      },
      {
        title: 'Record Permission (Read)',
        description: 'Read record-level permissions',
        scope: 'record_permission:read'
      },
      {
        title: 'Record Permission (Read/Write)',
        description: 'Create, update, and delete records',
        scope: 'record_permission:read-write'
      },
      {
        title: 'Tasks (Read)',
        description: 'Read tasks',
        scope: 'task:read'
      },
      {
        title: 'Tasks (Read/Write)',
        description: 'Create, update, and delete tasks',
        scope: 'task:read-write'
      },
      {
        title: 'User Management (Read)',
        description: 'Read workspace member information',
        scope: 'user_management:read'
      },
      {
        title: 'Notes (Read)',
        description: 'Read notes',
        scope: 'note:read'
      },
      {
        title: 'Notes (Read/Write)',
        description: 'Create and delete notes',
        scope: 'note:read-write'
      },
      {
        title: 'Webhooks (Read)',
        description: 'Read webhook subscriptions',
        scope: 'webhook:read'
      },
      {
        title: 'Webhooks (Read/Write)',
        description: 'Create, update, and delete webhook subscriptions',
        scope: 'webhook:read-write'
      },
      {
        title: 'List Configuration (Read)',
        description: 'Read list definitions and configuration',
        scope: 'list_configuration:read'
      },
      {
        title: 'List Configuration (Read/Write)',
        description: 'Create, update, and delete list definitions',
        scope: 'list_configuration:read-write'
      },
      {
        title: 'List Entries (Read)',
        description: 'Read list entries',
        scope: 'list_entry:read'
      },
      {
        title: 'List Entries (Read/Write)',
        description: 'Create, update, and delete list entries',
        scope: 'list_entry:read-write'
      },
      {
        title: 'Comments (Read)',
        description: 'Read comments and threads',
        scope: 'comment:read'
      },
      {
        title: 'Comments (Read/Write)',
        description: 'Create and delete comments',
        scope: 'comment:read-write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });

      return {
        url: `https://app.attio.com/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();

      let response = await axios.post(
        'https://app.attio.com/oauth/token',
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
        output: {
          token: response.data.access_token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let axios = createAxios({
        baseURL: 'https://api.attio.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/v2/self');

      return {
        profile: {
          id: response.data.data?.id?.workspace_id,
          name: response.data.data?.workspace?.name
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',

    inputSchema: z.object({
      token: z.string().describe('Attio API access token')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let axios = createAxios({
        baseURL: 'https://api.attio.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/v2/self');

      return {
        profile: {
          id: response.data.data?.id?.workspace_id,
          name: response.data.data?.workspace?.name
        }
      };
    }
  });
