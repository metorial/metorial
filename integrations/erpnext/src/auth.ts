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
    name: 'OAuth 2.0',
    key: 'oauth',

    scopes: [
      {
        title: 'All',
        description: 'Full access to all ERPNext resources',
        scope: 'all'
      },
      {
        title: 'OpenID',
        description: 'OpenID Connect profile information',
        scope: 'openid'
      }
    ],

    inputSchema: z.object({
      siteUrl: z
        .string()
        .describe('Full ERPNext site URL (e.g., https://yoursite.erpnext.com)')
    }),

    getAuthorizationUrl: async ctx => {
      let baseUrl = ctx.input.siteUrl.replace(/\/+$/, '');
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      return {
        url: `${baseUrl}/api/method/frappe.integrations.oauth2.authorize?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let baseUrl = ctx.input.siteUrl.replace(/\/+$/, '');
      let http = createAxios({ baseURL: baseUrl });

      let response = await http.post(
        '/api/method/frappe.integrations.oauth2.get_token',
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

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        },
        input: ctx.input
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let baseUrl = ctx.input.siteUrl.replace(/\/+$/, '');
      let http = createAxios({ baseURL: baseUrl });

      let response = await http.post(
        '/api/method/frappe.integrations.oauth2.get_token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken || '',
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
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        },
        input: ctx.input
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: { siteUrl: string };
      scopes: string[];
    }) => {
      let baseUrl = ctx.input.siteUrl.replace(/\/+$/, '');
      let http = createAxios({ baseURL: baseUrl });

      let response = await http.get('/api/method/frappe.auth.get_logged_user', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let email = response.data.message;

      return {
        profile: {
          email,
          name: email
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key + Secret',
    key: 'api_token',

    inputSchema: z.object({
      apiKey: z.string().describe('ERPNext API Key'),
      apiSecret: z.string().describe('ERPNext API Secret')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: `${ctx.input.apiKey}:${ctx.input.apiSecret}`
        }
      };
    },

    getProfile: async (_ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: { apiKey: string; apiSecret: string };
    }) => {
      return {
        profile: {
          name: 'API Token User'
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Username & Password',
    key: 'password',

    inputSchema: z.object({
      siteUrl: z
        .string()
        .describe('Full ERPNext site URL (e.g., https://yoursite.erpnext.com)'),
      username: z.string().describe('ERPNext username/email'),
      password: z.string().describe('ERPNext password')
    }),

    getOutput: async ctx => {
      let baseUrl = ctx.input.siteUrl.replace(/\/+$/, '');
      let http = createAxios({ baseURL: baseUrl });

      let response = await http.post('/api/method/login', {
        usr: ctx.input.username,
        pwd: ctx.input.password
      });

      let cookies = response.headers['set-cookie'];
      let sidCookie = '';
      if (cookies) {
        let cookieArray = Array.isArray(cookies) ? cookies : [cookies];
        for (let cookie of cookieArray) {
          let match = cookie.match(/sid=([^;]+)/);
          if (match) {
            sidCookie = match[1]!;
            break;
          }
        }
      }

      return {
        output: {
          token: sidCookie || ''
        }
      };
    },

    getProfile: async (_ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: { siteUrl: string; username: string; password: string };
    }) => {
      return {
        profile: {
          name: 'Session User'
        }
      };
    }
  });
