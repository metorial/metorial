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
        title: 'Account Read',
        description: 'Read permission for your account',
        scope: 'accounts--my:ro'
      },
      {
        title: 'Account Read/Write',
        description: 'Read and modify permission for your account',
        scope: 'accounts--my:rw'
      },
      {
        title: 'All Accounts Read',
        description: 'Read permission for all accounts in the organization',
        scope: 'accounts--all:ro'
      },
      {
        title: 'All Accounts Read/Write',
        description: 'Read and modify permission for all accounts',
        scope: 'accounts--all:rw'
      },
      {
        title: 'Webhooks Read/Write',
        description: 'Read and write permission for all webhooks in the license',
        scope: 'webhooks--all:rw'
      },
      {
        title: 'Webhooks Read',
        description: 'Read permission for all webhooks in the license',
        scope: 'webhooks--all:ro'
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
        params.set('scope', ctx.scopes.join(','));
      }

      return {
        url: `https://accounts.livechat.com/?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios({
        baseURL: 'https://accounts.livechat.com'
      });

      let response = await http.post('/v2/token', {
        grant_type: 'authorization_code',
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri
      });

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type: string;
      };

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

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
        throw new Error('No refresh token available');
      }

      let http = createAxios({
        baseURL: 'https://accounts.livechat.com'
      });

      let response = await http.post('/v2/token', {
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          expiresAt
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Personal Access Token',
    key: 'pat',

    inputSchema: z.object({
      accountId: z.string().describe('Your account ID from the LiveChat Developers Console'),
      token: z
        .string()
        .describe('Your Personal Access Token generated in the Developers Console')
    }),

    getOutput: async ctx => {
      let encoded = btoa(`${ctx.input.accountId}:${ctx.input.token}`);
      return {
        output: {
          token: `Basic ${encoded}`
        }
      };
    }
  });
