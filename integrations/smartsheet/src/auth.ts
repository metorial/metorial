import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let api = createAxios({
  baseURL: 'https://api.smartsheet.com/2.0'
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
        title: 'Read Sheets',
        description: 'Read all sheet data, including attachments, discussions, and cell data',
        scope: 'READ_SHEETS'
      },
      {
        title: 'Write Sheets',
        description:
          'Insert and modify sheet data, including attachments, discussions, and cell data',
        scope: 'WRITE_SHEETS'
      },
      { title: 'Create Sheets', description: 'Create new sheets', scope: 'CREATE_SHEETS' },
      { title: 'Delete Sheets', description: 'Delete sheets', scope: 'DELETE_SHEETS' },
      {
        title: 'Share Sheets',
        description: 'Share sheets, including sending sheets as attachments',
        scope: 'SHARE_SHEETS'
      },
      {
        title: 'Admin Sheets',
        description: 'Modify sheet structure, including column definition and publish state',
        scope: 'ADMIN_SHEETS'
      },
      {
        title: 'Read Dashboards',
        description: 'Read all dashboard data',
        scope: 'READ_SIGHTS'
      },
      {
        title: 'Create Dashboards',
        description: 'Create new dashboards',
        scope: 'CREATE_SIGHTS'
      },
      { title: 'Delete Dashboards', description: 'Delete dashboards', scope: 'DELETE_SIGHTS' },
      { title: 'Share Dashboards', description: 'Share dashboards', scope: 'SHARE_SIGHTS' },
      {
        title: 'Admin Dashboards',
        description: 'Modify dashboard structure',
        scope: 'ADMIN_SIGHTS'
      },
      {
        title: 'Read Users',
        description: 'Retrieve users and groups for the organization account',
        scope: 'READ_USERS'
      },
      {
        title: 'Admin Users',
        description: 'Add and remove users; create groups and manage seat types',
        scope: 'ADMIN_USERS'
      },
      { title: 'Read Contacts', description: 'Retrieve contacts', scope: 'READ_CONTACTS' },
      { title: 'Read Events', description: 'Retrieve events', scope: 'READ_EVENTS' },
      {
        title: 'Admin Webhooks',
        description: 'Create, delete, and update webhooks; get all webhooks',
        scope: 'ADMIN_WEBHOOKS'
      },
      {
        title: 'Admin Workspaces',
        description: 'Create and manage workspaces and folders, and their shares',
        scope: 'ADMIN_WORKSPACES'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      return {
        url: `https://app.smartsheet.com/b/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await api.post(
        '/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri
        }).toString(),
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
      let response = await api.post(
        '/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken || '',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
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

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let response = await api.get('/users/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Access Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z.string()
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: { token: string };
    }) => {
      let response = await api.get('/users/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
        }
      };
    }
  });
