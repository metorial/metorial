import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { freshserviceApiError, freshserviceServiceError } from './lib/errors';

let normalizeFreshworksDomain = (domain: string) => {
  let normalized = domain
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  if (!normalized || !/^[a-z0-9][a-z0-9.-]*$/i.test(normalized)) {
    throw freshserviceServiceError(
      'Freshworks organization domain must be a host such as "mycompany.myfreshworks.com".'
    );
  }
  return normalized;
};

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
        scope: 'freshservice.tickets.edit'
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
        scope: 'freshservice.problems.edit'
      },
      {
        title: 'Delete Problems',
        description: 'Delete problems',
        scope: 'freshservice.problems.delete'
      },
      {
        title: 'View Problem Fields',
        description: 'View problem form field metadata',
        scope: 'freshservice.problems.fields.view'
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
        scope: 'freshservice.changes.edit'
      },
      {
        title: 'Delete Changes',
        description: 'Delete change requests',
        scope: 'freshservice.changes.delete'
      },
      {
        title: 'View Ticket Conversations',
        description: 'View ticket replies and notes',
        scope: 'freshservice.tickets.conversations.view'
      },
      {
        title: 'Create Ticket Conversations',
        description: 'Create ticket replies and notes',
        scope: 'freshservice.tickets.conversations.create'
      },
      {
        title: 'Edit Ticket Conversations',
        description: 'Update ticket conversation bodies',
        scope: 'freshservice.tickets.conversations.edit'
      },
      {
        title: 'Delete Ticket Conversations',
        description: 'Delete ticket conversations',
        scope: 'freshservice.tickets.conversations.delete'
      },
      {
        title: 'Manage Ticket Fields',
        description: 'View ticket form field metadata',
        scope: 'freshservice.tickets.fields.manage'
      },
      { title: 'View Assets', description: 'View assets', scope: 'freshservice.assets.view' },
      {
        title: 'Manage Assets',
        description: 'Create, update, and manage assets',
        scope: 'freshservice.assets.manage'
      },
      {
        title: 'Delete Assets',
        description: 'Delete or restore assets',
        scope: 'freshservice.assets.delete'
      },
      {
        title: 'View Solutions',
        description: 'View knowledge base articles',
        scope: 'freshservice.solutions.view'
      },
      {
        title: 'Publish Solutions',
        description: 'Create and update knowledge base articles',
        scope: 'freshservice.solutions.publish'
      },
      {
        title: 'Delete Solutions',
        description: 'Delete or restore knowledge base articles',
        scope: 'freshservice.solutions.delete'
      },
      {
        title: 'View Releases',
        description: 'View releases',
        scope: 'freshservice.releases.view'
      },
      {
        title: 'Create Releases',
        description: 'Create releases',
        scope: 'freshservice.releases.create'
      },
      {
        title: 'Edit Releases',
        description: 'Update releases',
        scope: 'freshservice.releases.edit'
      },
      {
        title: 'Delete Releases',
        description: 'Delete or restore releases',
        scope: 'freshservice.releases.delete'
      },
      {
        title: 'View Requesters',
        description: 'View requesters',
        scope: 'freshservice.requesters.view'
      },
      {
        title: 'Create Requesters',
        description: 'Create requesters',
        scope: 'freshservice.requesters.create'
      },
      {
        title: 'Edit Requesters',
        description: 'Update requesters',
        scope: 'freshservice.requesters.edit'
      },
      {
        title: 'Delete Requesters',
        description: 'Deactivate or reactivate requesters',
        scope: 'freshservice.requesters.delete'
      },
      {
        title: 'Manage Agents',
        description: 'View agent records',
        scope: 'freshservice.agents.manage'
      },
      {
        title: 'View Departments',
        description: 'View departments and department fields',
        scope: 'freshservice.departments.view'
      },
      {
        title: 'View Department Fields',
        description: 'View department field metadata',
        scope: 'freshservice.departments.fields.view'
      },
      {
        title: 'View Agent Fields',
        description: 'View agent field metadata',
        scope: 'freshservice.agents.fields.view'
      },
      {
        title: 'View Requester Fields',
        description: 'View requester field metadata',
        scope: 'freshservice.requesters.fields.view'
      },
      {
        title: 'Manage Agent Groups',
        description: 'View agent group records',
        scope: 'freshservice.agentgroups.manage'
      },
      {
        title: 'View Locations',
        description: 'View locations',
        scope: 'freshservice.locations.view'
      },
      {
        title: 'View Vendors',
        description: 'View vendors',
        scope: 'freshservice.vendors.view'
      },
      {
        title: 'View Service Catalog',
        description: 'View service catalog items',
        scope: 'freshservice.service_catalog.view'
      },
      {
        title: 'Edit Service Catalog',
        description: 'View service catalog item details and metadata',
        scope: 'freshservice.service_catalog.edit'
      }
    ],
    inputSchema: z.object({
      organizationDomain: z
        .string()
        .describe('Your Freshworks organization domain (e.g. "mycompany.myfreshworks.com")')
    }),
    getAuthorizationUrl: async ctx => {
      let domain = normalizeFreshworksDomain(ctx.input.organizationDomain);
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
      let domain = normalizeFreshworksDomain(ctx.input.organizationDomain);
      let axios = createAxios();

      let encoded = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');
      let response: any;
      try {
        response = await axios.post(
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
      } catch (error) {
        throw freshserviceApiError(error, 'exchange OAuth authorization code');
      }
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
        normalizeFreshworksDomain(ctx.input.organizationDomain);
      if (!ctx.output.refreshToken) {
        throw freshserviceServiceError(
          'Freshservice OAuth refresh token is missing. Reconnect the Freshservice authentication profile.'
        );
      }
      let axios = createAxios();

      let encoded = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');
      let response: any;
      try {
        response = await axios.post(
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
      } catch (error) {
        throw freshserviceApiError(error, 'refresh OAuth token');
      }
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
