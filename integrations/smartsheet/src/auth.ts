import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let api = createAuthenticatedAxios({
  baseURL: 'https://api.smartsheet.com/2.0',
  contentType: false,
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'Smartsheet',
      reason: 'smartsheet_auth_error'
    })
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
        title: 'Read Users',
        description: 'Retrieve users and groups for the organization account',
        scope: 'READ_USERS'
      },
      {
        title: 'Admin Users',
        description: 'Add and remove users; create groups and manage seat types',
        scope: 'ADMIN_USERS'
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

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Smartsheet',
          operation: 'token exchange'
        })
      };
    },

    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'Smartsheet refresh token is missing. Reconnect the account.'
        );
      }
      let response = await api.post(
        '/token',
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

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Smartsheet',
          operation: 'token refresh',
          previousRefreshToken: ctx.output.refreshToken,
          refreshTokenFallbackMode: 'falsy'
        })
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
