import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { loyverseApiError } from './lib/errors';

let oauthAxios = createAuthenticatedAxios({
  baseURL: 'https://api.loyverse.com',
  timeout: 30_000,
  errorAdapter: loyverseApiError
});

let getMerchantProfile = async (token: string) => {
  let merchant = await new Client({ token }).getMerchant();

  return {
    profile: {
      id: merchant.id,
      name: merchant.business_name ?? merchant.name,
      email: merchant.email
    }
  };
};

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
        description: 'Read items, variants, categories, discounts, and modifiers',
        scope: 'ITEMS_READ'
      },
      {
        title: 'Items Write',
        description:
          'Create, update, and delete items, variants, categories, discounts, and modifiers',
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
        url: `https://api.loyverse.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await oauthAxios.post(
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

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Loyverse',
          operation: 'token exchange'
        })
      };
    },

    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'Loyverse refresh token is missing. Reconnect your Loyverse account.',
          { reason: 'oauth_refresh_token_missing' }
        );
      }

      let response = await oauthAxios.post(
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

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Loyverse',
          operation: 'token refresh',
          previousRefreshToken: ctx.output.refreshToken
        })
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) =>
      getMerchantProfile(ctx.output.token)
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
      let token = ctx.input.token.trim();
      if (!token) {
        throw createApiServiceError('A Loyverse personal access token is required.', {
          reason: 'loyverse_missing_token'
        });
      }
      return {
        output: {
          token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) =>
      getMerchantProfile(ctx.output.token)
  });
