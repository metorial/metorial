import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let accountsAxios = createAxios({
  baseURL: 'https://accounts.salesloft.com'
});

let apiAxios = createAxios({
  baseURL: 'https://api.salesloft.com/v2'
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
        url: 'https://developers.salesloft.com/docs/platform/api-basics/oauth-authentication/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.salesloft.com/docs/platform/api-basics/scopes/'
      }
    ],

    scopes: [
      {
        title: 'People Read',
        description: 'Read people/contacts information',
        scope: 'people:read'
      },
      {
        title: 'People Write',
        description: 'Create and update people/contacts',
        scope: 'people:write'
      },
      {
        title: 'Accounts Read',
        description: 'Read account/company data',
        scope: 'accounts:read'
      },
      {
        title: 'Accounts Write',
        description: 'Create and update accounts',
        scope: 'accounts:write'
      },
      { title: 'Cadences Read', description: 'Read cadence data', scope: 'cadences:read' },
      {
        title: 'Cadences Write',
        description: 'Create and manage cadences',
        scope: 'cadences:write'
      },
      { title: 'Calls Read', description: 'Read call activity data', scope: 'calls:read' },
      {
        title: 'Calls Write',
        description: 'Create and update call records',
        scope: 'calls:write'
      },
      { title: 'Emails Read', description: 'Read email activity data', scope: 'emails:read' },
      { title: 'Emails Write', description: 'Create and send emails', scope: 'emails:write' },
      { title: 'Tasks Read', description: 'Read task data', scope: 'tasks:read' },
      { title: 'Tasks Write', description: 'Create and manage tasks', scope: 'tasks:write' },
      { title: 'Notes Read', description: 'Read note data', scope: 'notes:read' },
      { title: 'Notes Write', description: 'Create and manage notes', scope: 'notes:write' },
      { title: 'Meetings Read', description: 'Read meeting data', scope: 'meetings:read' },
      {
        title: 'Conversations Read',
        description: 'Read conversation data',
        scope: 'conversations:read'
      },
      { title: 'Team Read', description: 'Read team and user data', scope: 'team:read' },
      {
        title: 'Email Contents Read',
        description: 'Read email bodies and subjects (privileged)',
        scope: 'email_contents:read'
      },
      {
        title: 'CRM ID Person Write',
        description: 'Write to CRM ID field of Person (privileged)',
        scope: 'crm_id_person:write'
      },
      {
        title: 'CRM ID Account Write',
        description: 'Write to CRM ID field of Account (privileged)',
        scope: 'crm_id_account:write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `https://accounts.salesloft.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await accountsAxios.post('/oauth/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        grant_type: 'authorization_code',
        redirect_uri: ctx.redirectUri
      });

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
      let response = await accountsAxios.post('/oauth/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken
      });

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
      let response = await apiAxios.get('/me.json', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: user.name,
          firstName: user.first_name,
          lastName: user.last_name
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('SalesLoft API Key (starts with "ak_")')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await apiAxios.get('/me.json', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: user.name,
          firstName: user.first_name,
          lastName: user.last_name
        }
      };
    }
  });
