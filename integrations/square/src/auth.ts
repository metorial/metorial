import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let squareAxios = createAxios({
  baseURL: 'https://connect.squareup.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      merchantId: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Merchant Profile Read',
        description: 'Read merchant profile information',
        scope: 'MERCHANT_PROFILE_READ'
      },
      {
        title: 'Payments Read',
        description: 'Read payment information',
        scope: 'PAYMENTS_READ'
      },
      {
        title: 'Payments Write',
        description: 'Create and manage payments',
        scope: 'PAYMENTS_WRITE'
      },
      { title: 'Orders Read', description: 'Read order information', scope: 'ORDERS_READ' },
      {
        title: 'Orders Write',
        description: 'Create and manage orders',
        scope: 'ORDERS_WRITE'
      },
      {
        title: 'Customers Read',
        description: 'Read customer profiles',
        scope: 'CUSTOMERS_READ'
      },
      {
        title: 'Customers Write',
        description: 'Create and manage customer profiles',
        scope: 'CUSTOMERS_WRITE'
      },
      { title: 'Items Read', description: 'Read catalog items', scope: 'ITEMS_READ' },
      {
        title: 'Items Write',
        description: 'Create and manage catalog items',
        scope: 'ITEMS_WRITE'
      },
      {
        title: 'Inventory Read',
        description: 'Read inventory counts',
        scope: 'INVENTORY_READ'
      },
      {
        title: 'Inventory Write',
        description: 'Manage inventory counts',
        scope: 'INVENTORY_WRITE'
      },
      { title: 'Invoices Read', description: 'Read invoices', scope: 'INVOICES_READ' },
      {
        title: 'Invoices Write',
        description: 'Create and manage invoices',
        scope: 'INVOICES_WRITE'
      },
      {
        title: 'Appointments Read',
        description: 'Read bookings and appointments',
        scope: 'APPOINTMENTS_READ'
      },
      {
        title: 'Appointments Write',
        description: 'Create and manage bookings',
        scope: 'APPOINTMENTS_WRITE'
      },
      {
        title: 'Employees Read',
        description: 'Read team member information',
        scope: 'EMPLOYEES_READ'
      },
      {
        title: 'Employees Write',
        description: 'Manage team members',
        scope: 'EMPLOYEES_WRITE'
      },
      { title: 'Timecards Read', description: 'Read timecards', scope: 'TIMECARDS_READ' },
      { title: 'Timecards Write', description: 'Manage timecards', scope: 'TIMECARDS_WRITE' },
      {
        title: 'Bank Accounts Read',
        description: 'Read bank account information',
        scope: 'BANK_ACCOUNTS_READ'
      },
      {
        title: 'Loyalty Read',
        description: 'Read loyalty programs and accounts',
        scope: 'LOYALTY_READ'
      },
      {
        title: 'Loyalty Write',
        description: 'Manage loyalty programs and accounts',
        scope: 'LOYALTY_WRITE'
      },
      {
        title: 'Gift Cards Read',
        description: 'Read gift card information',
        scope: 'GIFTCARDS_READ'
      },
      {
        title: 'Gift Cards Write',
        description: 'Manage gift cards',
        scope: 'GIFTCARDS_WRITE'
      },
      {
        title: 'Subscriptions Read',
        description: 'Read subscriptions',
        scope: 'SUBSCRIPTIONS_READ'
      },
      {
        title: 'Subscriptions Write',
        description: 'Manage subscriptions',
        scope: 'SUBSCRIPTIONS_WRITE'
      },
      {
        title: 'Disputes Read',
        description: 'Read dispute information',
        scope: 'DISPUTES_READ'
      },
      { title: 'Disputes Write', description: 'Manage disputes', scope: 'DISPUTES_WRITE' },
      {
        title: 'Device Credential Management',
        description: 'Manage device credentials',
        scope: 'DEVICE_CREDENTIAL_MANAGEMENT'
      },
      { title: 'Payouts Read', description: 'Read payout information', scope: 'PAYOUTS_READ' },
      {
        title: 'Online Store Site Read',
        description: 'Read Square Online site details',
        scope: 'ONLINE_STORE_SITE_READ'
      },
      {
        title: 'Online Store Snippets Read',
        description: 'Read Square Online snippets',
        scope: 'ONLINE_STORE_SNIPPETS_READ'
      },
      {
        title: 'Online Store Snippets Write',
        description: 'Manage Square Online snippets',
        scope: 'ONLINE_STORE_SNIPPETS_WRITE'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        scope: ctx.scopes.join(' '),
        session: 'false',
        state: ctx.state
      });

      return {
        url: `https://connect.squareup.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await squareAxios.post('/oauth2/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        grant_type: 'authorization_code'
      });

      let data = response.data;
      let expiresAt = data.expires_at ? new Date(data.expires_at).toISOString() : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          merchantId: data.merchant_id
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let response = await squareAxios.post('/oauth2/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken,
        grant_type: 'refresh_token'
      });

      let data = response.data;
      let expiresAt = data.expires_at ? new Date(data.expires_at).toISOString() : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          merchantId: data.merchant_id || ctx.output.merchantId
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: any; scopes: string[] }) => {
      let response = await squareAxios.get('/v2/merchants/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let merchant = response.data.merchant;
      return {
        profile: {
          id: merchant.id,
          name: merchant.business_name,
          country: merchant.country,
          languageCode: merchant.language_code,
          currency: merchant.currency,
          status: merchant.status
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',

    inputSchema: z.object({
      token: z.string().describe('Personal access token from the Square Developer Console')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token?: string }; input: { token: string } }) => {
      let token = ctx.output.token || ctx.input.token;
      let response = await squareAxios.get('/v2/merchants/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      let merchant = response.data.merchant;
      return {
        profile: {
          id: merchant.id,
          name: merchant.business_name,
          country: merchant.country,
          languageCode: merchant.language_code,
          currency: merchant.currency,
          status: merchant.status
        }
      };
    }
  });
