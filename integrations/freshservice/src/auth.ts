import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('API key or OAuth access token'),
      refreshToken: z.string().optional().describe('OAuth refresh token'),
      expiresAt: z.string().optional().describe('Token expiration timestamp (ISO 8601)'),
      authType: z.enum(['api_key', 'oauth']).describe('Authentication method used'),
      organizationDomain: z
        .string()
        .optional()
        .describe('Freshworks organization domain for OAuth token refresh')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Your Freshservice API key (found in Profile Settings)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authType: 'api_key' as const
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',
    scopes: [
      {
        title: 'View Tickets',
        description: 'View tickets and service requests',
        scope: 'freshservice.tickets.view'
      },
      {
        title: 'Create Tickets',
        description: 'Create tickets and service requests',
        scope: 'freshservice.tickets.create'
      },
      {
        title: 'Update Tickets',
        description: 'Update tickets and service requests',
        scope: 'freshservice.tickets.update'
      },
      {
        title: 'Delete Tickets',
        description: 'Delete tickets and service requests',
        scope: 'freshservice.tickets.delete'
      },
      {
        title: 'View Problems',
        description: 'View problems',
        scope: 'freshservice.problems.view'
      },
      {
        title: 'Create Problems',
        description: 'Create problems',
        scope: 'freshservice.problems.create'
      },
      {
        title: 'Update Problems',
        description: 'Update problems',
        scope: 'freshservice.problems.update'
      },
      {
        title: 'Delete Problems',
        description: 'Delete problems',
        scope: 'freshservice.problems.delete'
      },
      {
        title: 'View Changes',
        description: 'View change requests',
        scope: 'freshservice.changes.view'
      },
      {
        title: 'Create Changes',
        description: 'Create change requests',
        scope: 'freshservice.changes.create'
      },
      {
        title: 'Update Changes',
        description: 'Update change requests',
        scope: 'freshservice.changes.update'
      },
      {
        title: 'Delete Changes',
        description: 'Delete change requests',
        scope: 'freshservice.changes.delete'
      },
      { title: 'View Assets', description: 'View assets', scope: 'freshservice.assets.view' },
      {
        title: 'Manage Assets',
        description: 'Create, update, and manage assets',
        scope: 'freshservice.assets.manage'
      },
      {
        title: 'View Solutions',
        description: 'View knowledge base articles',
        scope: 'freshservice.solutions.view'
      },
      {
        title: 'Manage Solutions',
        description: 'Manage knowledge base articles',
        scope: 'freshservice.solutions.manage'
      },
      {
        title: 'View Releases',
        description: 'View releases',
        scope: 'freshservice.releases.view'
      },
      {
        title: 'Manage Releases',
        description: 'Create and manage releases',
        scope: 'freshservice.releases.manage'
      },
      {
        title: 'View Requesters',
        description: 'View requesters',
        scope: 'freshservice.requesters.view'
      },
      {
        title: 'Manage Requesters',
        description: 'Manage requesters',
        scope: 'freshservice.requesters.manage'
      },
      { title: 'View Agents', description: 'View agents', scope: 'freshservice.agents.view' },
      {
        title: 'Manage Agents',
        description: 'Manage agents',
        scope: 'freshservice.agents.manage'
      }
    ],
    inputSchema: z.object({
      organizationDomain: z
        .string()
        .describe('Your Freshworks organization domain (e.g. "mycompany.myfreshworks.com")')
    }),
    getAuthorizationUrl: async ctx => {
      let domain = ctx.input.organizationDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });
      return {
        url: `https://${domain}/oauth/authorize?${params.toString()}`,
        input: ctx.input
      };
    },
    handleCallback: async ctx => {
      let domain = ctx.input.organizationDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      let axios = createAxios();

      let encoded = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');
      let response = await axios.post(
        `https://${domain}/oauth/token`,
        {
          code: ctx.code,
          grant_type: 'authorization_code',
          redirect_uri: ctx.redirectUri
        },
        {
          headers: {
            Authorization: `Basic ${encoded}`,
            'Content-Type': 'application/json'
          }
        }
      );
      let expiresAt = response.data.expires_in
        ? new Date(Date.now() + response.data.expires_in * 1000).toISOString()
        : undefined;
      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresAt,
          authType: 'oauth' as const,
          organizationDomain: domain
        },
        input: ctx.input
      };
    },
    handleTokenRefresh: async (ctx: any) => {
      let domain =
        ctx.output.organizationDomain ||
        ctx.input.organizationDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      let axios = createAxios();

      let encoded = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');
      let response = await axios.post(
        `https://${domain}/oauth/token`,
        {
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        },
        {
          headers: {
            Authorization: `Basic ${encoded}`,
            'Content-Type': 'application/json'
          }
        }
      );
      let expiresAt = response.data.expires_in
        ? new Date(Date.now() + response.data.expires_in * 1000).toISOString()
        : undefined;
      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          authType: 'oauth' as const,
          organizationDomain: domain
        },
        input: ctx.input
      };
    }
  });
