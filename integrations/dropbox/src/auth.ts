import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { dropboxApiError, dropboxServiceError } from './lib/errors';

let apiAxios = createAxios({
  baseURL: 'https://api.dropboxapi.com'
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
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.dropbox.com/oauth-guide'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.dropbox.com/oauth-guide'
      }
    ],

    scopes: [
      {
        title: 'Account Info',
        description: 'Read account information',
        scope: 'account_info.read'
      },
      {
        title: 'Files Metadata Read',
        description: 'Read file and folder metadata',
        scope: 'files.metadata.read'
      },
      {
        title: 'Files Metadata Write',
        description: 'Write file and folder metadata',
        scope: 'files.metadata.write'
      },
      {
        title: 'Files Content Read',
        description: 'Read file content',
        scope: 'files.content.read'
      },
      {
        title: 'Files Content Write',
        description: 'Write file content',
        scope: 'files.content.write'
      },
      {
        title: 'Sharing Read',
        description: 'Read sharing settings and shared content',
        scope: 'sharing.read'
      },
      {
        title: 'Sharing Write',
        description: 'Manage sharing settings and shared content',
        scope: 'sharing.write'
      },
      {
        title: 'File Requests Read',
        description: 'Read file requests',
        scope: 'file_requests.read'
      },
      {
        title: 'File Requests Write',
        description: 'Manage file requests',
        scope: 'file_requests.write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        token_access_type: 'offline'
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `https://www.dropbox.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response: any;
      try {
        let params = new URLSearchParams({
          code: ctx.code,
          grant_type: 'authorization_code',
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        });

        response = await apiAxios.post('/oauth2/token', params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
      } catch (error) {
        throw dropboxApiError(error, 'exchange OAuth code');
      }

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
        throw dropboxServiceError(
          'Dropbox refresh token is missing. Reconnect the account to restore offline access.'
        );
      }

      let response: any;
      try {
        let params = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        });

        response = await apiAxios.post('/oauth2/token', params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
      } catch (error) {
        throw dropboxApiError(error, 'refresh OAuth token');
      }

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let response: any;
      try {
        response = await apiAxios.post('/2/users/get_current_account', null, {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });
      } catch (error) {
        throw dropboxApiError(error, 'load OAuth profile');
      }

      let account = response.data;

      return {
        profile: {
          id: account.account_id,
          email: account.email,
          name: account.name?.display_name,
          imageUrl: account.profile_photo_url
        }
      };
    }
  });
