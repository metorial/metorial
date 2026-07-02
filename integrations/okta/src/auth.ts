import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { applyOktaErrorInterceptor, oktaServiceError } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authMethod: z.enum(['api_token', 'oauth']).optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth2',

    scopes: [
      {
        title: 'Read Users',
        description: 'Read user profiles and attributes',
        scope: 'okta.users.read'
      },
      {
        title: 'Manage Users',
        description: 'Create, update, and delete users',
        scope: 'okta.users.manage'
      },
      {
        title: 'Read Groups',
        description: 'Read groups and memberships',
        scope: 'okta.groups.read'
      },
      {
        title: 'Manage Groups',
        description: 'Create, update, and delete groups',
        scope: 'okta.groups.manage'
      },
      {
        title: 'Read Apps',
        description: 'Read application configurations',
        scope: 'okta.apps.read'
      },
      {
        title: 'Manage Apps',
        description: 'Create, update, and delete applications',
        scope: 'okta.apps.manage'
      },
      {
        title: 'Read Policies',
        description: 'Read authentication and access policies',
        scope: 'okta.policies.read'
      },
      {
        title: 'Manage Policies',
        description: 'Create, update, and delete policies',
        scope: 'okta.policies.manage'
      },
      { title: 'Read Logs', description: 'Read system log events', scope: 'okta.logs.read' },
      {
        title: 'Read Event Hooks',
        description: 'Read event hook configurations',
        scope: 'okta.eventHooks.read'
      },
      {
        title: 'Manage Event Hooks',
        description: 'Create, update, and delete event hooks',
        scope: 'okta.eventHooks.manage'
      },
      {
        title: 'Read Factors',
        description: 'Read user factor enrollments',
        scope: 'okta.factors.read'
      },
      {
        title: 'Manage Factors',
        description: 'Enroll and manage user factors',
        scope: 'okta.factors.manage'
      },
      {
        title: 'Read Sessions',
        description: 'Read user sessions',
        scope: 'okta.sessions.read'
      },
      {
        title: 'Manage Sessions',
        description: 'Create and revoke user sessions',
        scope: 'okta.sessions.manage'
      },
      {
        title: 'OpenID Profile',
        description: 'Access user profile via OpenID Connect',
        scope: 'openid'
      },
      { title: 'Profile', description: 'Access user profile information', scope: 'profile' },
      {
        title: 'Offline Access',
        description: 'Allow refreshing OAuth access tokens without reconnecting',
        scope: 'offline_access'
      }
    ],

    inputSchema: z.object({
      domain: z
        .string()
        .describe('Your Okta organization domain, e.g. https://dev-123456.okta.com')
    }),

    getAuthorizationUrl: async ctx => {
      let domain = ctx.input.domain.replace(/\/+$/, '');
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `${domain}/oauth2/v1/authorize?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let domain = ctx.input.domain.replace(/\/+$/, '');
      let http = createAxios({ baseURL: domain });
      applyOktaErrorInterceptor(http);

      let response = await http.post(
        '/oauth2/v1/token',
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

      let expiresAt = response.data.expires_in
        ? new Date(Date.now() + response.data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: response.data.access_token,
          authMethod: 'oauth' as const,
          refreshToken: response.data.refresh_token,
          expiresAt
        },
        input: ctx.input
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw oktaServiceError(
          'Okta OAuth token cannot be refreshed because no refresh token was returned. Reconnect with offline_access enabled.'
        );
      }

      let domain = ctx.input.domain.replace(/\/+$/, '');
      let http = createAxios({ baseURL: domain });
      applyOktaErrorInterceptor(http);

      let response = await http.post(
        '/oauth2/v1/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          scope: ctx.scopes.join(' ')
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let expiresAt = response.data.expires_in
        ? new Date(Date.now() + response.data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: response.data.access_token,
          authMethod: 'oauth' as const,
          refreshToken: response.data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let domain = ctx.input.domain.replace(/\/+$/, '');
      let http = createAxios({ baseURL: domain });
      applyOktaErrorInterceptor(http);

      let response = await http.get('/oauth2/v1/userinfo', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      return {
        profile: {
          id: response.data.sub,
          email: response.data.email,
          name:
            response.data.name ||
            `${response.data.given_name || ''} ${response.data.family_name || ''}`.trim()
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'SSWS API Token',
    key: 'ssws_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Okta API token generated in the Admin Console under Security > API > Tokens'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authMethod: 'api_token' as const
        }
      };
    },

    getProfile: async (_ctx: any) => {
      return {
        profile: {
          name: 'API Token User'
        }
      };
    }
  });
