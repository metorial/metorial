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
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.brex.com/guides/partner_authentication'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.brex.com/guides/roles_permissions_scopes'
      }
    ],

    scopes: [
      { title: 'OpenID', description: 'Required for OAuth authentication', scope: 'openid' },
      {
        title: 'Offline Access',
        description: 'Required for refresh tokens and webhook registration',
        scope: 'offline_access'
      },
      {
        title: 'Users',
        description: 'Full read and write access to user management',
        scope: 'users'
      },
      {
        title: 'Users (Read)',
        description: 'Read-only access to user data',
        scope: 'users.readonly'
      },
      {
        title: 'Cards',
        description: 'Full read and write access to card management',
        scope: 'cards'
      },
      {
        title: 'Cards (Read)',
        description: 'Read-only access to card data',
        scope: 'cards.readonly'
      },
      { title: 'Locations', description: 'Manage company locations', scope: 'locations' },
      {
        title: 'Departments',
        description: 'Manage company departments',
        scope: 'departments'
      },
      { title: 'Vendors', description: 'Manage vendors', scope: 'vendors' },
      {
        title: 'Transfers',
        description: 'Initiate and manage payment transfers',
        scope: 'transfers'
      },
      {
        title: 'Card Transactions',
        description: 'Read-only access to card transaction data',
        scope: 'transactions.card.readonly'
      },
      {
        title: 'Cash Transactions',
        description: 'Read-only access to cash transaction data',
        scope: 'transactions.cash.readonly'
      },
      {
        title: 'Cash Accounts',
        description: 'Read-only access to cash account data',
        scope: 'accounts.cash.readonly'
      },
      { title: 'Budgets', description: 'Manage budgets and spend limits', scope: 'budgets' },
      {
        title: 'Expenses',
        description: 'Full read and write access to card expenses',
        scope: 'expenses.card'
      },
      {
        title: 'Expenses (Read)',
        description: 'Read-only access to card expense data',
        scope: 'expenses.card.readonly'
      },
      {
        title: 'Referrals',
        description: 'Create and manage referrals',
        scope: 'https://onboarding.brexapis.com/referrals'
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
        url: `https://accounts-api.brex.com/oauth2/default/v1/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();

      let response = await axios.post(
        'https://accounts-api.brex.com/oauth2/default/v1/token',
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

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let axios = createAxios();

      let response = await axios.post(
        'https://accounts-api.brex.com/oauth2/default/v1/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
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

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Brex API token generated from the Developer page in your Brex account dashboard'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
