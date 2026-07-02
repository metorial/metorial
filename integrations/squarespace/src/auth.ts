import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let loginAxios = createAxios({
  baseURL: 'https://login.squarespace.com/api/1/login/oauth/provider'
});

let apiAxios = createAxios({
  baseURL: 'https://api.squarespace.com/1.0'
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
        title: 'Orders (Read/Write)',
        description: 'Send order data and mark orders as fulfilled',
        scope: 'website.orders'
      },
      {
        title: 'Orders (Read)',
        description: 'View order and fulfillment information',
        scope: 'website.orders.read'
      },
      {
        title: 'Transactions (Read)',
        description: 'Access transactional order and donation data',
        scope: 'website.transactions.read'
      },
      {
        title: 'Inventory (Read/Write)',
        description: 'View and update inventory stock levels',
        scope: 'website.inventory'
      },
      {
        title: 'Inventory (Read)',
        description: 'View inventory stock levels',
        scope: 'website.inventory.read'
      },
      {
        title: 'Products (Read/Write)',
        description: 'View and modify product information',
        scope: 'website.products'
      },
      {
        title: 'Products (Read)',
        description: 'View product information',
        scope: 'website.products.read'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(','),
        state: ctx.state,
        access_type: 'offline'
      });

      return {
        url: `https://login.squarespace.com/api/1/login/oauth/provider/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await loginAxios.post(
        '/tokens',
        {
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        },
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let data = response.data;
      let expiresAt = new Date(Date.now() + (data.expires_in || 1800) * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await loginAxios.post(
        '/tokens',
        {
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        },
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let data = response.data;
      let expiresAt = new Date(Date.now() + (data.expires_in || 1800) * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await apiAxios.get('/authorization/website', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'User-Agent': 'Slates-Squarespace-Integration/1.0'
        }
      });

      let site = response.data;

      return {
        profile: {
          id: site.id,
          name: site.title,
          siteUrl: site.url
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('Squarespace API key generated from your site settings')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await apiAxios.get('/authorization/website', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'User-Agent': 'Slates-Squarespace-Integration/1.0'
        }
      });

      let site = response.data;

      return {
        profile: {
          id: site.id,
          name: site.title,
          siteUrl: site.url
        }
      };
    }
  });
