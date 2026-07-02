import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { driftApiError, driftServiceError } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      orgId: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Contact Read',
        description: 'Listen to changes to contacts and query contacts',
        scope: 'contact_read'
      },
      {
        title: 'All Contact Read',
        description: 'Read contact metadata such as custom attributes',
        scope: 'all_contact_read'
      },
      {
        title: 'Contact Write',
        description: 'Create and update contacts',
        scope: 'contact_write'
      },
      {
        title: 'Conversation Read',
        description: 'Query conversations and messages',
        scope: 'conversation_read'
      },
      {
        title: 'Conversation Write',
        description: 'Create messages via a bot',
        scope: 'conversation_write'
      },
      {
        title: 'User Read',
        description: 'Read user data',
        scope: 'user_read'
      },
      {
        title: 'User Write',
        description: 'Modify user data',
        scope: 'user_write'
      },
      {
        title: 'GDPR Read',
        description: 'Perform data retrieval requests',
        scope: 'gdpr_read'
      },
      {
        title: 'GDPR Write',
        description: 'Perform data deletion requests',
        scope: 'gdpr_write'
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
        url: `https://dev.drift.com/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios({ baseURL: 'https://driftapi.com' });

      let response: any;
      try {
        response = await axios.post(
          '/oauth2/token',
          new URLSearchParams({
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            code: ctx.code,
            grant_type: 'authorization_code'
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
      } catch (error) {
        throw driftApiError(error, 'exchange OAuth code');
      }

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined,
          orgId: data.orgId ? String(data.orgId) : undefined
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw driftServiceError('Cannot refresh Drift OAuth token without a refresh token.');
      }

      let axios = createAxios({ baseURL: 'https://driftapi.com' });

      let response: any;
      try {
        response = await axios.post(
          '/oauth2/token',
          new URLSearchParams({
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            refresh_token: ctx.output.refreshToken,
            grant_type: 'refresh_token'
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
      } catch (error) {
        throw driftApiError(error, 'refresh OAuth token');
      }

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined,
          orgId: data.orgId ? String(data.orgId) : ctx.output.orgId
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let axios = createAxios({ baseURL: 'https://driftapi.com' });

      let response: any;
      try {
        response = await axios.post('/app/token_info', {
          access_token: ctx.output.token
        });
      } catch (error) {
        throw driftApiError(error, 'get OAuth profile');
      }

      let tokenInfo = response.data;
      let orgId =
        typeof tokenInfo.authenticated_userid === 'string'
          ? tokenInfo.authenticated_userid.replace(/^orgId:/, '')
          : undefined;

      return {
        profile: {
          id: orgId,
          name: tokenInfo.credential_id
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_token',

    inputSchema: z.object({
      token: z.string().describe('Personal access token from Drift')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let axios = createAxios({ baseURL: 'https://driftapi.com' });

      let response: any;
      try {
        response = await axios.post('/app/token_info', {
          access_token: ctx.output.token
        });
      } catch (error) {
        throw driftApiError(error, 'get token profile');
      }

      let tokenInfo = response.data;
      let orgId =
        typeof tokenInfo.authenticated_userid === 'string'
          ? tokenInfo.authenticated_userid.replace(/^orgId:/, '')
          : undefined;

      return {
        profile: {
          id: orgId,
          name: tokenInfo.credential_id
        }
      };
    }
  });
