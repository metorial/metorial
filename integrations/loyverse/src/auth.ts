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
        title: 'Customers Read',
        description: 'Read customer records',
        scope: 'CUSTOMERS_READ'
      },
      {
        title: 'Customers Write',
        description: 'Create, update, and delete customer records',
        scope: 'CUSTOMERS_WRITE'
      },
      {
        title: 'Employees Read',
        description: 'Read employee information',
        scope: 'EMPLOYEES_READ'
      },
      {
        title: 'Items Read',
        description: 'Read items, categories, modifiers, and variants',
        scope: 'ITEMS_READ'
      },
      {
        title: 'Items Write',
        description: 'Create, update, and delete items, categories, modifiers, and variants',
        scope: 'ITEMS_WRITE'
      },
      {
        title: 'Inventory Read',
        description: 'Read inventory levels',
        scope: 'INVENTORY_READ'
      },
      {
        title: 'Inventory Write',
        description: 'Update inventory levels',
        scope: 'INVENTORY_WRITE'
      },
      {
        title: 'Merchant Read',
        description: 'Read merchant account information',
        scope: 'MERCHANT_READ'
      },
      {
        title: 'Payment Types Read',
        description: 'Read payment type configurations',
        scope: 'PAYMENT_TYPES_READ'
      },
      {
        title: 'POS Devices Read',
        description: 'Read POS device configurations',
        scope: 'POS_DEVICES_READ'
      },
      {
        title: 'POS Devices Write',
        description: 'Create, update, and delete POS devices',
        scope: 'POS_DEVICES_WRITE'
      },
      { title: 'Receipts Read', description: 'Read sales receipts', scope: 'RECEIPTS_READ' },
      {
        title: 'Receipts Write',
        description: 'Create sales receipts and refunds',
        scope: 'RECEIPTS_WRITE'
      },
      { title: 'Shifts Read', description: 'Read shift data', scope: 'SHIFTS_READ' },
      { title: 'Stores Read', description: 'Read store information', scope: 'STORES_READ' },
      {
        title: 'Suppliers Read',
        description: 'Read supplier records',
        scope: 'SUPPLIERS_READ'
      },
      {
        title: 'Suppliers Write',
        description: 'Create, update, and delete supplier records',
        scope: 'SUPPLIERS_WRITE'
      },
      { title: 'Taxes Read', description: 'Read tax configurations', scope: 'TAXES_READ' },
      {
        title: 'Taxes Write',
        description: 'Create, update, and delete tax configurations',
        scope: 'TAXES_WRITE'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://cloud.loyverse.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios({ baseURL: 'https://api.loyverse.com' });

      let response = await axios.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
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
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let axios = createAxios({ baseURL: 'https://api.loyverse.com' });

      let response = await axios.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let axios = createAxios({ baseURL: 'https://api.loyverse.com' });

      let response = await axios.get('/v1.0/merchant/', {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });

      let merchant = response.data;

      return {
        profile: {
          id: merchant.id,
          name: merchant.business_name ?? merchant.name,
          email: merchant.email
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Loyverse Personal Access Token created in the Back Office under Access Tokens'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let axios = createAxios({ baseURL: 'https://api.loyverse.com' });

      let response = await axios.get('/v1.0/merchant/', {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });

      let merchant = response.data;

      return {
        profile: {
          id: merchant.id,
          name: merchant.business_name ?? merchant.name,
          email: merchant.email
        }
      };
    }
  });
