import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { coinbaseApiError, coinbaseServiceError } from './lib/errors';

let coinbaseApiAxios = createAxios({
  baseURL: 'https://api.coinbase.com'
});

let coinbaseOAuthAxios = createAxios({
  baseURL: 'https://login.coinbase.com'
});

let coinbaseCommerceAxios = createAxios({
  baseURL: 'https://api.commerce.coinbase.com',
  headers: {
    'X-CC-Version': '2018-03-22'
  }
});

coinbaseApiAxios.interceptors.response.use(
  response => response,
  error => {
    throw coinbaseApiError(error, 'profile request');
  }
);

coinbaseOAuthAxios.interceptors.response.use(
  response => response,
  error => {
    throw coinbaseApiError(error, 'OAuth request');
  }
);

coinbaseCommerceAxios.interceptors.response.use(
  response => response,
  error => {
    throw coinbaseApiError(error, 'Commerce profile request');
  }
);

let expiresAtFromSeconds = (expiresIn?: number) =>
  typeof expiresIn === 'number' && Number.isFinite(expiresIn)
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : undefined;

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Coinbase OAuth access token or Commerce API key'),
      refreshToken: z.string().optional().describe('Coinbase OAuth refresh token'),
      expiresAt: z.string().optional().describe('Token expiration timestamp (ISO 8601)')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Coinbase Commerce API Key',
    key: 'commerce_api_key',
    inputSchema: z.object({
      token: z.string().min(1).describe('Coinbase Commerce API key')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      await coinbaseCommerceAxios.get('/charges?limit=1', {
        headers: {
          'X-CC-Api-Key': ctx.output.token
        }
      });

      return {
        profile: {
          name: 'Coinbase Commerce API key'
        }
      };
    }
  })
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
      },
      {
        title: 'Read Payment Methods',
        description: 'List linked payment methods for buys, sells, deposits, and withdrawals',
        scope: 'wallet:payment-methods:read'
      },
      {
        title: 'Read Trades',
        description: 'View Coinbase Advanced Trade orders and fills',
        scope: 'wallet:trades:read'
      },
      {
        title: 'Create Trades',
        description: 'Preview and create Coinbase Advanced Trade orders',
        scope: 'wallet:trades:create'
      },
      {
        title: 'Offline Access',
        description: 'Receive a refresh token so Coinbase access can be renewed',
        scope: 'offline_access'
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
      let response = await coinbaseOAuthAxios.post(
        '/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      if (!data.access_token) {
        throw coinbaseServiceError('Coinbase OAuth response did not include an access token.');
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: expiresAtFromSeconds(data.expires_in)
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw coinbaseServiceError('Coinbase OAuth refresh requires a refresh token.');
      }

      let response = await coinbaseOAuthAxios.post(
        '/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      if (!data.access_token) {
        throw coinbaseServiceError(
          'Coinbase OAuth refresh response did not include an access token.'
        );
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt: expiresAtFromSeconds(data.expires_in)
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let response = await coinbaseApiAxios.get('/v2/user', {
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
