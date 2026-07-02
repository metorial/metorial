import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let api = createAxios({
  baseURL: 'https://api.getgist.com'
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
        title: 'Read Contact',
        description: 'List and view a single contact',
        scope: 'read_contact'
      },
      {
        title: 'Write Contact',
        description: 'Create or update a single contact',
        scope: 'write_contact'
      },
      {
        title: 'Read Bulk Contacts',
        description: 'List and view all contacts',
        scope: 'read_bulk_contacts'
      },
      {
        title: 'Write Bulk Contacts',
        description: 'Create or update batch of contacts',
        scope: 'write_bulk_contacts'
      },
      {
        title: 'Read Conversations',
        description: 'List and view conversation details',
        scope: 'read_conversations'
      },
      {
        title: 'Write Conversations',
        description: 'Create or update conversation details',
        scope: 'write_conversations'
      },
      { title: 'Read Events', description: 'List and view events', scope: 'read_events' },
      { title: 'Read Tags', description: 'List and view tags', scope: 'read_tags' },
      { title: 'Write Tags', description: 'Create or update tags', scope: 'write_tags' },
      { title: 'Read Teams', description: 'List and view teams', scope: 'read_teams' },
      {
        title: 'Read Teammates',
        description: 'List and view teammates',
        scope: 'read_teammates'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let scopes = ctx.scopes.join(' ');
      let url = `https://app.getgist.com/oauth/authorize?response_type=code&client_id=${encodeURIComponent(ctx.clientId)}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(ctx.redirectUri)}&state=${encodeURIComponent(ctx.state)}`;
      return { url };
    },

    handleCallback: async ctx => {
      let response = await api.post('/oauth/token', {
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri,
        code: ctx.code
      });

      return {
        output: {
          token: response.data.access_token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let response = await api.get('/token', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data;
      return {
        profile: {
          id: data.workspace_id ? String(data.workspace_id) : undefined,
          name: data.workspace_name || undefined
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z.string().describe('Your Gist API key from Settings > API > API Key')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let response = await api.get('/token', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data;
      return {
        profile: {
          id: data.workspace_id ? String(data.workspace_id) : undefined,
          name: data.workspace_name || undefined
        }
      };
    }
  });
