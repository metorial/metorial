import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { boxApiError, boxServiceError } from './lib/errors';

let authAxios = createAxios({
  baseURL: 'https://api.box.com'
});

authAxios.interceptors.response.use(
  response => response,
  error => Promise.reject(boxApiError(error, 'authentication request'))
);

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
    name: 'OAuth 2.0',
    key: 'oauth2',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.box.com/guides/authentication/oauth2/oauth2-setup/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.box.com/guides/api-calls/permissions-and-errors/scopes/'
      }
    ],

    scopes: [
      {
        title: 'Read All Content',
        description: 'Read access to all files and folders stored in Box',
        scope: 'root_readonly'
      },
      {
        title: 'Read/Write All Content',
        description: 'Full read and write access to all files and folders stored in Box',
        scope: 'root_readwrite'
      },
      {
        title: 'Manage Users',
        description: 'Manage managed users, reset passwords, and change roles',
        scope: 'manage_managed_users'
      },
      {
        title: 'Manage Groups',
        description: 'Create, update, and delete enterprise groups',
        scope: 'manage_groups'
      },
      {
        title: 'Manage Webhooks',
        description: 'Create, update, and delete webhooks',
        scope: 'manage_webhook'
      },
      {
        title: 'Manage Sign Requests',
        description: 'Create and manage e-signature requests with Box Sign',
        scope: 'sign_requests.readwrite'
      },
      {
        title: 'Manage Enterprise Properties',
        description: 'Manage enterprise-level settings and properties',
        scope: 'manage_enterprise_properties'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `https://account.box.com/api/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await authAxios.post(
        '/oauth2/token',
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
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

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
        throw boxServiceError('No refresh token available');
      }

      let response = await authAxios.post(
        '/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
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
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await authAxios.get('/2.0/users/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.login,
          name: user.name,
          imageUrl: user.avatar_url
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Developer Token',
    key: 'developer_token',

    inputSchema: z.object({
      token: z.string().describe('Box Developer Token or App Token')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await authAxios.get('/2.0/users/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.login,
          name: user.name,
          imageUrl: user.avatar_url
        }
      };
    }
  });
