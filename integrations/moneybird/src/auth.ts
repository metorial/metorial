import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Sales Invoices',
        description:
          'Access to sales invoices, recurring invoices, and external sales invoices',
        scope: 'sales_invoices'
      },
      {
        title: 'Documents',
        description: 'Access to purchase invoices, receipts, and other documents',
        scope: 'documents'
      },
      {
        title: 'Estimates',
        description: 'Access to quotes and estimates',
        scope: 'estimates'
      },
      {
        title: 'Bank',
        description: 'Access to financial accounts, statements, and mutations',
        scope: 'bank'
      },
      {
        title: 'Time Entries',
        description: 'Access to time tracking entries and projects',
        scope: 'time_entries'
      },
      {
        title: 'Settings',
        description:
          'Access to administration settings, workflows, tax rates, ledger accounts, and products',
        scope: 'settings'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `https://moneybird.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios();

      let response = await http.post('https://moneybird.com/oauth/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        grant_type: 'authorization_code'
      });

      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let http = createAxios();

      let response = await http.post('https://moneybird.com/oauth/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken,
        grant_type: 'refresh_token'
      });

      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token || ctx.output.refreshToken
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://moneybird.com/api/v2',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/administrations.json');
      let administrations = response.data;

      if (administrations.length > 0) {
        return {
          profile: {
            id: String(administrations[0].id),
            name: administrations[0].name
          }
        };
      }

      return {
        profile: {}
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal API Token',
    key: 'personal_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Personal API token generated at https://moneybird.com/user/applications/new'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://moneybird.com/api/v2',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/administrations.json');
      let administrations = response.data;

      if (administrations.length > 0) {
        return {
          profile: {
            id: String(administrations[0].id),
            name: administrations[0].name
          }
        };
      }

      return {
        profile: {}
      };
    }
  });
