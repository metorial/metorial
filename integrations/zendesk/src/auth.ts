import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { zendeskApiError, zendeskServiceError } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      tokenType: z.enum(['bearer', 'basic']).optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',

    scopes: [
      { title: 'Read', description: 'Read access to all resources', scope: 'read' },
      { title: 'Write', description: 'Write access to all resources', scope: 'write' },
      { title: 'Tickets Read', description: 'Read access to tickets', scope: 'tickets:read' },
      {
        title: 'Tickets Write',
        description: 'Write access to tickets',
        scope: 'tickets:write'
      },
      { title: 'Users Read', description: 'Read access to users', scope: 'users:read' },
      { title: 'Users Write', description: 'Write access to users', scope: 'users:write' },
      {
        title: 'Organizations Read',
        description: 'Read access to organizations',
        scope: 'organizations:read'
      },
      {
        title: 'Organizations Write',
        description: 'Write access to organizations',
        scope: 'organizations:write'
      },
      {
        title: 'Impersonate',
        description: 'Make requests on behalf of end users',
        scope: 'impersonate'
      }
    ],

    inputSchema: z.object({
      subdomain: z.string().describe('Zendesk account subdomain')
    }),

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        client_id: ctx.clientId,
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      return {
        url: `https://${ctx.input.subdomain}.zendesk.com/oauth/authorizations/new?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let data: any;

      try {
        let http = createAxios();

        let response = await http.post(
          `https://${ctx.input.subdomain}.zendesk.com/oauth/tokens`,
          {
            grant_type: 'authorization_code',
            code: ctx.code,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            redirect_uri: ctx.redirectUri,
            scope: ctx.scopes.join(' ')
          },
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );

        data = response.data;
      } catch (error) {
        throw zendeskApiError(error, 'OAuth authorization code exchange');
      }

      if (typeof data.access_token !== 'string' || !data.access_token) {
        throw zendeskServiceError(
          'Zendesk OAuth token response did not include an access token.'
        );
      }

      return {
        output: {
          token: data.access_token,
          tokenType: 'bearer' as const,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        },
        input: ctx.input
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let data: any;

      try {
        let http = createAxios();

        let response = await http.post(
          `https://${ctx.input.subdomain}.zendesk.com/oauth/tokens`,
          {
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            scope: ctx.scopes.join(' ')
          },
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );

        data = response.data;
      } catch (error) {
        throw zendeskApiError(error, 'OAuth token refresh');
      }

      if (typeof data.access_token !== 'string' || !data.access_token) {
        throw zendeskServiceError(
          'Zendesk OAuth refresh response did not include an access token.'
        );
      }

      return {
        output: {
          token: data.access_token,
          tokenType: 'bearer' as const,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        },
        input: ctx.input
      };
    },

    getProfile: async (ctx: any) => {
      let user: any;

      try {
        let http = createAxios({
          baseURL: `https://${ctx.input.subdomain}.zendesk.com/api/v2`,
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });

        let response = await http.get('/users/me.json');
        user = response.data.user;
      } catch (error) {
        throw zendeskApiError(error, 'OAuth profile fetch');
      }

      if (!user) {
        throw zendeskServiceError('Zendesk profile response did not include a user.');
      }

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: user.name,
          imageUrl: user.photo?.content_url,
          role: user.role
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      subdomain: z.string().describe('Zendesk account subdomain'),
      email: z.string().describe('Email address of a verified Zendesk user'),
      token: z.string().describe('API token generated from Zendesk Admin Center')
    }),

    getOutput: async ctx => {
      let credentials = `${ctx.input.email}/token:${ctx.input.token}`;
      let encodedToken = btoa(credentials);

      return {
        output: {
          token: encodedToken,
          tokenType: 'basic' as const
        }
      };
    },

    getProfile: async (ctx: any) => {
      let user: any;

      try {
        let http = createAxios({
          baseURL: `https://${ctx.input.subdomain}.zendesk.com/api/v2`,
          headers: {
            Authorization: `Basic ${ctx.output.token}`
          }
        });

        let response = await http.get('/users/me.json');
        user = response.data.user;
      } catch (error) {
        throw zendeskApiError(error, 'API token profile fetch');
      }

      if (!user) {
        throw zendeskServiceError('Zendesk profile response did not include a user.');
      }

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: user.name,
          imageUrl: user.photo?.content_url,
          role: user.role
        }
      };
    }
  });
