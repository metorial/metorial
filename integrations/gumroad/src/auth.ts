import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { GumroadClient } from './lib/client';
import { gumroadApiError, gumroadServiceError } from './lib/errors';
import { gumroadScope } from './lib/scopes';

let getGumroadProfile = async (token: string) => {
  let client = new GumroadClient({ token });
  let user = await client.getUser();

  return {
    profile: {
      id: user.user_id || user.id,
      email: user.email,
      name: user.name || user.display_name,
      imageUrl: user.profile_picture_url
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

    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Create a Gumroad API application',
        url: 'https://gumroad.com/help/article/280-create-application-api'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'Gumroad API scopes',
        url: 'https://gumroad.com/api#api-scopes'
      }
    ],

    scopes: [
      {
        title: 'View Profile',
        description: 'Read your public profile information and products',
        scope: gumroadScope.viewProfile
      },
      {
        title: 'Edit Products',
        description:
          'Create and manage products, variants, offer codes, custom fields, and license keys',
        scope: gumroadScope.editProducts
      },
      {
        title: 'View Sales',
        description: 'Read sales, subscribers, and product sales counts',
        scope: gumroadScope.viewSales
      },
      {
        title: 'Edit Sales',
        description:
          'Refund sales, revoke or restore buyer access, and resend purchase receipts',
        scope: gumroadScope.editSales
      },
      {
        title: 'Mark Sales as Shipped',
        description: 'Mark physical product sales as shipped',
        scope: gumroadScope.markSalesAsShipped
      },
      {
        title: 'View Payouts',
        description: 'Read payout information',
        scope: gumroadScope.viewPayouts
      },
      {
        title: 'View Tax Data',
        description: 'Read the annual earnings summary',
        scope: gumroadScope.viewTaxData
      },
      {
        title: 'Edit Emails',
        description: 'Create, schedule, send, and delete audience emails',
        scope: gumroadScope.editEmails
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

      let grantedScope = response.data?.scope;

      return {
        output: {
          token
        },
        scopes:
          typeof grantedScope === 'string' && grantedScope.trim()
            ? grantedScope.trim().split(/\s+/)
            : undefined
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
        .describe(
          'Personal access token generated from a Gumroad application in Advanced Settings. It has the scopes of that application; applications created before June 2026 cannot manage audience emails.'
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
      return getGumroadProfile(ctx.output.token);
    }
  });
