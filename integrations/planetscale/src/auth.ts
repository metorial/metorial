import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { planetscaleApiError, planetscaleServiceError } from './lib/errors';

let authAxios = createAxios({
  baseURL: 'https://auth.planetscale.com'
});

let apiAxios = createAxios({
  baseURL: 'https://api.planetscale.com/v1'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authType: z
        .enum(['oauth', 'service_token'])
        .describe('Type of authentication being used')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      { title: 'Read User', description: 'Read user profile information', scope: 'read_user' },
      {
        title: 'Write User',
        description: 'Update user profile information',
        scope: 'write_user'
      },
      {
        title: 'Read Organizations',
        description: 'List and read organizations',
        scope: 'read_organizations'
      },
      {
        title: 'Read Databases',
        description: 'List and read databases',
        scope: 'read_databases'
      },
      {
        title: 'Create Databases',
        description: 'Create new databases',
        scope: 'create_databases'
      },
      {
        title: 'Write Databases',
        description: 'Update database settings',
        scope: 'write_databases'
      },
      {
        title: 'Delete Databases',
        description: 'Delete databases',
        scope: 'delete_databases'
      },
      {
        title: 'Read Branches',
        description: 'List and read branches',
        scope: 'read_branches'
      },
      {
        title: 'Write Branches',
        description: 'Create and update branches',
        scope: 'write_branches'
      },
      { title: 'Delete Branches', description: 'Delete branches', scope: 'delete_branches' },
      {
        title: 'Promote Branches',
        description: 'Promote branches to production',
        scope: 'promote_branches'
      },
      {
        title: 'Delete Production Branches',
        description: 'Delete production branches',
        scope: 'delete_production_branches'
      },
      {
        title: 'Read Deploy Requests',
        description: 'List and read deploy requests',
        scope: 'read_deploy_requests'
      },
      {
        title: 'Write Deploy Requests',
        description: 'Create and update deploy requests',
        scope: 'write_deploy_requests'
      },
      {
        title: 'Deploy Deploy Requests',
        description: 'Queue deploy requests for deployment',
        scope: 'deploy_deploy_requests'
      },
      {
        title: 'Approve Deploy Requests',
        description: 'Approve deploy requests',
        scope: 'approve_deploy_requests'
      },
      {
        title: 'Manage Passwords',
        description: 'Create, read, update, and delete branch passwords',
        scope: 'manage_passwords'
      },
      {
        title: 'Manage Production Branch Passwords',
        description: 'Manage passwords on production branches',
        scope: 'manage_production_branch_passwords'
      },
      { title: 'Read Backups', description: 'List and read backups', scope: 'read_backups' },
      { title: 'Write Backups', description: 'Create backups', scope: 'write_backups' },
      { title: 'Delete Backups', description: 'Delete backups', scope: 'delete_backups' },
      {
        title: 'Restore Backups',
        description: 'Restore backups to new branches',
        scope: 'restore_backups'
      },
      {
        title: 'Read Members',
        description: 'List and read organization members',
        scope: 'read_members'
      },
      {
        title: 'Write Members',
        description: 'Update organization members',
        scope: 'write_members'
      },
      {
        title: 'Delete Members',
        description: 'Remove organization members',
        scope: 'delete_members'
      },
      {
        title: 'Read Comments',
        description: 'Read deploy request comments',
        scope: 'read_comments'
      },
      {
        title: 'Write Comments',
        description: 'Create and update deploy request comments',
        scope: 'write_comments'
      },
      { title: 'Read Invoices', description: 'List and read invoices', scope: 'read_invoices' }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' '),
        response_type: 'code'
      });

      return {
        url: `https://app.planetscale.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response: any;
      try {
        response = await authAxios.post(
          '/oauth/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: ctx.code,
            redirect_uri: ctx.redirectUri,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json'
            }
          }
        );
      } catch (error) {
        throw planetscaleApiError(error, 'OAuth callback');
      }

      let data = response.data;
      if (!data.access_token) {
        throw planetscaleServiceError(
          'PlanetScale OAuth callback did not return an access token.'
        );
      }

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          authType: 'oauth' as const
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw planetscaleServiceError('No PlanetScale OAuth refresh token is available.');
      }

      let response: any;
      try {
        response = await authAxios.post(
          '/oauth/token',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json'
            }
          }
        );
      } catch (error) {
        throw planetscaleApiError(error, 'OAuth token refresh');
      }

      let data = response.data;
      if (!data.access_token) {
        throw planetscaleServiceError(
          'PlanetScale OAuth refresh did not return an access token.'
        );
      }

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          authType: 'oauth' as const
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: any; scopes: string[] }) => {
      let response: any;
      try {
        response = await apiAxios.get('/user', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`,
            Accept: 'application/json'
          }
        });
      } catch (error) {
        throw planetscaleApiError(error, 'get OAuth profile');
      }

      let user = response.data;
      if (!user.id) {
        throw planetscaleServiceError(
          'PlanetScale profile response did not include a user id.'
        );
      }

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.display_name || user.name,
          imageUrl: user.avatar_url
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Service Token',
    key: 'service_token',

    inputSchema: z.object({
      serviceTokenId: z.string().describe('Service token ID from PlanetScale dashboard'),
      serviceToken: z.string().describe('Service token value from PlanetScale dashboard')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: `${ctx.input.serviceTokenId}:${ctx.input.serviceToken}`,
          authType: 'service_token' as const
        }
      };
    }
  });
