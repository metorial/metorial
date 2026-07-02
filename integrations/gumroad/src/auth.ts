import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { GumroadClient } from './lib/client';
import { gumroadApiError, gumroadServiceError } from './lib/errors';

let getGumroadProfile = async (token: string) => {
  let client = new GumroadClient({ token });
  let user = await client.getUser();

  return {
    profile: {
      id: user.user_id || user.id,
      email: user.email,
      name: user.name || user.display_name,
      imageUrl: user.profile_url
    }
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'View Profile',
        description: 'Read public profile and product information',
        scope: 'view_profile'
      },
      {
        title: 'Edit Products',
        description:
          'Create and manage products, offer codes, variants, custom fields, and files',
        scope: 'edit_products'
      },
      {
        title: 'View Sales',
        description: 'View sales data, subscribers, and transaction information',
        scope: 'view_sales'
      },
      {
        title: 'Edit Sales',
        description: 'Refund sales and resend purchase receipts',
        scope: 'edit_sales'
      },
      {
        title: 'Mark Sales as Shipped',
        description: 'Mark sales as shipped with tracking information',
        scope: 'mark_sales_as_shipped'
      },
      {
        title: 'View Payouts',
        description: 'View payout information',
        scope: 'view_payouts'
      },
      {
        title: 'View Tax Data',
        description: 'View annual earnings and tax data',
        scope: 'view_tax_data'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        response_type: 'code',
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://gumroad.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();

      let response: any;
      try {
        response = await axios.post('https://gumroad.com/oauth/token', {
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        });
      } catch (error) {
        throw gumroadApiError(error, 'exchange OAuth code');
      }

      let token = response.data?.access_token;
      if (!token) {
        throw gumroadServiceError('Gumroad OAuth did not return an access token.');
      }

      return {
        output: {
          token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      return getGumroadProfile(ctx.output.token);
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Personal access token generated from Gumroad Advanced Settings')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      return getGumroadProfile(ctx.output.token);
    }
  });
