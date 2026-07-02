import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let coinbaseAxios = createAxios({
  baseURL: 'https://api.coinbase.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Coinbase OAuth access token'),
      refreshToken: z.string().optional().describe('Coinbase OAuth refresh token'),
      expiresAt: z.string().optional().describe('Token expiration timestamp (ISO 8601)')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth (Sign in with Coinbase)',
    key: 'oauth',

    scopes: [
      {
        title: 'Read User Profile',
        description: "Read the current user's public profile information",
        scope: 'wallet:user:read'
      },
      {
        title: 'Read User Email',
        description: "Read the current user's email address",
        scope: 'wallet:user:email'
      },
      {
        title: 'Read Accounts',
        description: 'List and view cryptocurrency accounts and balances',
        scope: 'wallet:accounts:read'
      },
      {
        title: 'Create Accounts',
        description: 'Create new cryptocurrency wallets',
        scope: 'wallet:accounts:create'
      },
      {
        title: 'Update Accounts',
        description: 'Update account properties such as name',
        scope: 'wallet:accounts:update'
      },
      {
        title: 'Delete Accounts',
        description: 'Delete cryptocurrency wallets',
        scope: 'wallet:accounts:delete'
      },
      {
        title: 'Read Transactions',
        description: 'View transaction history including sends, receives, buys, sells',
        scope: 'wallet:transactions:read'
      },
      {
        title: 'Send Transactions',
        description: 'Send cryptocurrency to external addresses or Coinbase users',
        scope: 'wallet:transactions:send'
      },
      {
        title: 'Read Buys',
        description: 'View buy history',
        scope: 'wallet:buys:read'
      },
      {
        title: 'Create Buys',
        description: 'Buy cryptocurrency using a linked payment method',
        scope: 'wallet:buys:create'
      },
      {
        title: 'Read Sells',
        description: 'View sell history',
        scope: 'wallet:sells:read'
      },
      {
        title: 'Create Sells',
        description: 'Sell cryptocurrency using a linked payment method',
        scope: 'wallet:sells:create'
      },
      {
        title: 'Read Deposits',
        description: 'View deposit history',
        scope: 'wallet:deposits:read'
      },
      {
        title: 'Create Deposits',
        description: 'Deposit fiat from a bank account',
        scope: 'wallet:deposits:create'
      },
      {
        title: 'Read Withdrawals',
        description: 'View withdrawal history',
        scope: 'wallet:withdrawals:read'
      },
      {
        title: 'Create Withdrawals',
        description: 'Withdraw fiat to a bank account',
        scope: 'wallet:withdrawals:create'
      },
      {
        title: 'Read Addresses',
        description: 'List cryptocurrency addresses for an account',
        scope: 'wallet:addresses:read'
      },
      {
        title: 'Create Addresses',
        description: 'Create new cryptocurrency receive addresses',
        scope: 'wallet:addresses:create'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(',')
      });

      return {
        url: `https://login.coinbase.com/oauth2/auth?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await coinbaseAxios.post('/oauth/token', {
        grant_type: 'authorization_code',
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri
      });

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
      let response = await coinbaseAxios.post('/oauth/token', {
        grant_type: 'refresh_token',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken
      });

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

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let response = await coinbaseAxios.get('/v2/user', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data.data;

      return {
        profile: {
          id: user.id,
          email: user.email || undefined,
          name: user.name || undefined,
          imageUrl: user.avatar_url || undefined
        }
      };
    }
  });
