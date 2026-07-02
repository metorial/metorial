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
        title: 'Scenarios Read',
        description: 'List and view scenarios',
        scope: 'scenarios:read'
      },
      {
        title: 'Scenarios Write',
        description: 'Create, update, and delete scenarios',
        scope: 'scenarios:write'
      },
      {
        title: 'Scenarios Run',
        description: 'Execute scenarios on demand',
        scope: 'scenarios:run'
      },
      {
        title: 'Connections Read',
        description: 'List and view connections',
        scope: 'connections:read'
      },
      {
        title: 'Connections Write',
        description: 'Create, update, and delete connections',
        scope: 'connections:write'
      },
      { title: 'Hooks Read', description: 'List and view webhooks', scope: 'hooks:read' },
      {
        title: 'Hooks Write',
        description: 'Create, update, and delete webhooks',
        scope: 'hooks:write'
      },
      {
        title: 'Data Stores Read',
        description: 'List and view data stores and records',
        scope: 'datastores:read'
      },
      {
        title: 'Data Stores Write',
        description: 'Create, update, and delete data stores and records',
        scope: 'datastores:write'
      },
      { title: 'Teams Read', description: 'List and view teams', scope: 'teams:read' },
      {
        title: 'Teams Write',
        description: 'Create, update, and delete teams',
        scope: 'teams:write'
      },
      {
        title: 'Organizations Read',
        description: 'List and view organizations',
        scope: 'organizations:read'
      },
      {
        title: 'Organizations Write',
        description: 'Create, update, and delete organizations',
        scope: 'organizations:write'
      },
      {
        title: 'User Read',
        description: 'View user profiles and information',
        scope: 'user:read'
      },
      { title: 'User Write', description: 'Update user profiles', scope: 'user:write' },
      {
        title: 'SDK Apps Read',
        description: 'List and view custom apps',
        scope: 'sdk-apps:read'
      },
      {
        title: 'SDK Apps Write',
        description: 'Create and manage custom apps',
        scope: 'sdk-apps:write'
      },
      {
        title: 'Notifications Read',
        description: 'View notifications',
        scope: 'notifications:read'
      },
      {
        title: 'Notifications Write',
        description: 'Manage notifications',
        scope: 'notifications:write'
      },
      { title: 'Analytics Read', description: 'View analytics data', scope: 'analytics:read' },
      { title: 'Keys Read', description: 'List and view encryption keys', scope: 'keys:read' },
      {
        title: 'Keys Write',
        description: 'Create and manage encryption keys',
        scope: 'keys:write'
      },
      { title: 'Devices Read', description: 'List and view devices', scope: 'devices:read' },
      {
        title: 'Devices Write',
        description: 'Create and manage devices',
        scope: 'devices:write'
      },
      { title: 'DLQs Read', description: 'View incomplete executions', scope: 'dlqs:read' },
      {
        title: 'DLQs Write',
        description: 'Manage incomplete executions',
        scope: 'dlqs:write'
      },
      {
        title: 'Templates Read',
        description: 'List and view templates',
        scope: 'templates:read'
      },
      {
        title: 'Templates Write',
        description: 'Create and manage templates',
        scope: 'templates:write'
      },
      {
        title: 'Team Variables Read',
        description: 'View team variables',
        scope: 'teams-variables:read'
      },
      {
        title: 'Team Variables Write',
        description: 'Manage team variables',
        scope: 'team-variables:write'
      },
      {
        title: 'Org Variables Read',
        description: 'View organization variables',
        scope: 'organizations-variables:read'
      },
      {
        title: 'Org Variables Write',
        description: 'Manage organization variables',
        scope: 'organizations-variables:write'
      },
      {
        title: 'Functions Read',
        description: 'View custom functions',
        scope: 'functions:read'
      },
      {
        title: 'Functions Write',
        description: 'Manage custom functions',
        scope: 'functions:write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://www.make.com/oauth/v2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios();

      let response = await http.post(
        'https://www.make.com/oauth/v2/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          code: ctx.code,
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
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let http = createAxios();

      let response = await http.post(
        'https://www.make.com/oauth/v2/token',
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

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          expiresAt
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Make API token. Generate from Profile > API tab in your Make account.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
