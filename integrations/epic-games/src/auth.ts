import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      accountId: z.string().optional(),
      clientId: z.string().optional(),
      authType: z.enum(['oauth', 'client_credentials']).optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Epic Account OAuth',
    key: 'epic_oauth',

    scopes: [
      {
        title: 'Basic Profile',
        description: 'Access to basic account information such as display name',
        scope: 'basic_profile'
      },
      {
        title: 'Friends List',
        description: "Access to the user's friends list and block list",
        scope: 'friends_list'
      },
      {
        title: 'Presence',
        description: 'Access to user presence information (online status, current activity)',
        scope: 'presence'
      },
      {
        title: 'Offline Access',
        description: 'Allows refresh tokens for persistent access without re-authentication',
        scope: 'offline_access'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://www.epicgames.com/id/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios({ baseURL: 'https://api.epicgames.dev' });

      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let response = await http.post(
        '/epic/oauth/v2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        }
      );

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_at,
          accountId: data.account_id,
          clientId: ctx.clientId,
          authType: 'oauth' as const
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let http = createAxios({ baseURL: 'https://api.epicgames.dev' });
      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let response = await http.post(
        '/epic/oauth/v2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        }
      );

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          expiresAt: data.expires_at,
          accountId: data.account_id ?? ctx.output.accountId,
          clientId: ctx.clientId,
          authType: 'oauth' as const
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; accountId?: string };
      input: {};
      scopes: string[];
    }) => {
      if (!ctx.output.accountId) {
        return { profile: {} };
      }

      let http = createAxios({ baseURL: 'https://api.epicgames.dev' });

      let response = await http.get('/epic/id/v2/accounts', {
        params: { accountId: ctx.output.accountId },
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let accounts = response.data;
      let account = Array.isArray(accounts) ? accounts[0] : accounts;

      return {
        profile: {
          id: account?.accountId,
          name: account?.displayName,
          email: account?.email
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials',
    key: 'client_credentials',

    inputSchema: z.object({
      clientId: z.string().describe('EOS Client ID from the Developer Portal'),
      clientSecret: z.string().describe('EOS Client Secret from the Developer Portal')
    }),

    getOutput: async ctx => {
      let http = createAxios({ baseURL: 'https://api.epicgames.dev' });
      let credentials = Buffer.from(
        `${ctx.input.clientId}:${ctx.input.clientSecret}`
      ).toString('base64');

      let response = await http.post(
        '/auth/v1/oauth/token',
        new URLSearchParams({
          grant_type: 'client_credentials'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        }
      );

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          expiresAt: data.expires_at,
          clientId: ctx.input.clientId,
          authType: 'client_credentials' as const
        }
      };
    }
  });
