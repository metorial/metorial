import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      clientId: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth2',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.deel.com/docs/oauth2'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.deel.com/docs/scopes-1'
      }
    ],

    scopes: [
      { title: 'Contracts Read', description: 'Read contract data', scope: 'contracts:read' },
      {
        title: 'Contracts Write',
        description: 'Create and modify contracts',
        scope: 'contracts:write'
      },
      { title: 'People Read', description: 'Read people/worker data', scope: 'people:read' },
      {
        title: 'People Write',
        description: 'Modify people/worker data',
        scope: 'people:write'
      },
      {
        title: 'Timesheets Read',
        description: 'Read timesheet data',
        scope: 'timesheets:read'
      },
      {
        title: 'Timesheets Write',
        description: 'Create and manage timesheets',
        scope: 'timesheets:write'
      },
      {
        title: 'Time Off Read',
        description: 'Read time-off requests',
        scope: 'time-off:read'
      },
      {
        title: 'Time Off Write',
        description: 'Create and manage time-off requests',
        scope: 'time-off:write'
      },
      {
        title: 'Invoice Adjustments Read',
        description: 'Read invoice adjustments',
        scope: 'invoice-adjustments:read'
      },
      {
        title: 'Invoice Adjustments Write',
        description: 'Create and manage invoice adjustments',
        scope: 'invoice-adjustments:write'
      },
      {
        title: 'Accounting Read',
        description: 'Read accounting and billing data',
        scope: 'accounting:read'
      },
      {
        title: 'Organizations Read',
        description: 'Read organization data',
        scope: 'organizations:read'
      },
      {
        title: 'Organizations Write',
        description: 'Manage organization data',
        scope: 'organizations:write'
      },
      { title: 'Workers Read', description: 'Read worker profiles', scope: 'worker:read' },
      { title: 'Workers Write', description: 'Modify worker profiles', scope: 'worker:write' }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        response_type: 'code'
      });

      return {
        url: `https://app.deel.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios({ baseURL: 'https://app.deel.com' });

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await http.post(
        '/oauth2/tokens',
        {
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        },
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json'
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
          expiresAt,
          clientId: ctx.clientId
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let http = createAxios({ baseURL: 'https://app.deel.com' });

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await http.post(
        '/oauth2/tokens',
        {
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        },
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json'
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
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          expiresAt,
          clientId: ctx.clientId
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      apiToken: z.string().describe('Deel API token (personal or organization token)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    }
  });
