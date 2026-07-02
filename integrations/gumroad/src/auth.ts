import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

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
        title: 'Edit Products',
        description: 'Create and manage products, offer codes, variants, and custom fields',
        scope: 'edit_products'
      },
      {
        title: 'View Sales',
        description: 'View sales data, subscribers, and transaction information',
        scope: 'view_sales'
      },
      {
        title: 'Mark Sales as Shipped',
        description: 'Mark sales as shipped with tracking information',
        scope: 'mark_sales_as_shipped'
      },
      {
        title: 'Revenue Share',
        description: 'Revenue sharing access',
        scope: 'revenue_share'
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

      let response = await axios.post('https://gumroad.com/oauth/token', {
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri,
        grant_type: 'authorization_code'
      });

      return {
        output: {
          token: response.data.access_token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let axios = createAxios({
        baseURL: 'https://api.gumroad.com/v2',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/user');
      let user = response.data.user;

      return {
        profile: {
          id: user.user_id,
          email: user.email,
          name: user.name || user.display_name,
          imageUrl: user.profile_url
        }
      };
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
      let axios = createAxios({
        baseURL: 'https://api.gumroad.com/v2',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/user');
      let user = response.data.user;

      return {
        profile: {
          id: user.user_id,
          email: user.email,
          name: user.name || user.display_name,
          imageUrl: user.profile_url
        }
      };
    }
  });
