import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let loginAxios = createAxios({
  baseURL: 'https://login.bigcommerce.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'The X-Auth-Token access token generated from your BigCommerce store control panel under Settings > Store-level API accounts.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Products (Read-Only)',
        description: 'View products, variants, brands, and categories',
        scope: 'store_v2_products_read_only'
      },
      {
        title: 'Products',
        description: 'Read and modify products, variants, brands, and categories',
        scope: 'store_v2_products'
      },
      {
        title: 'Orders (Read-Only)',
        description: 'View orders, shipments, and transactions',
        scope: 'store_v2_orders_read_only'
      },
      {
        title: 'Orders',
        description: 'Read and modify orders, shipments, and transactions',
        scope: 'store_v2_orders'
      },
      {
        title: 'Customers (Read-Only)',
        description: 'View customer data and groups',
        scope: 'store_v2_customers_read_only'
      },
      {
        title: 'Customers',
        description: 'Read and modify customer data and groups',
        scope: 'store_v2_customers'
      },
      {
        title: 'Content (Read-Only)',
        description: 'View pages, blog posts, and widgets',
        scope: 'store_v2_content_read_only'
      },
      {
        title: 'Content',
        description: 'Read and modify pages, blog posts, and widgets',
        scope: 'store_v2_content'
      },
      {
        title: 'Marketing (Read-Only)',
        description: 'View coupons, gift certificates, and promotions',
        scope: 'store_v2_marketing_read_only'
      },
      {
        title: 'Marketing',
        description: 'Read and modify coupons, gift certificates, and promotions',
        scope: 'store_v2_marketing'
      },
      {
        title: 'Carts (Read-Only)',
        description: 'View cart data',
        scope: 'store_cart_read_only'
      },
      { title: 'Carts', description: 'Read and modify cart data', scope: 'store_cart' },
      {
        title: 'Checkouts (Read-Only)',
        description: 'View checkout data',
        scope: 'store_checkout_read_only'
      },
      {
        title: 'Checkouts',
        description: 'Read and modify checkout data',
        scope: 'store_checkout'
      },
      {
        title: 'Channel Listings (Read-Only)',
        description: 'View channel and listing data',
        scope: 'store_channel_listings_read_only'
      },
      {
        title: 'Channel Listings',
        description: 'Read and modify channel and listing data',
        scope: 'store_channel_listings'
      },
      {
        title: 'Store Information (Read-Only)',
        description: 'View store profile and settings',
        scope: 'store_v2_information_read_only'
      },
      {
        title: 'Store Information',
        description: 'Read and modify store profile and settings',
        scope: 'store_v2_information'
      },
      {
        title: 'Storefront API Tokens',
        description: 'Manage storefront API tokens',
        scope: 'store_storefront_api'
      },
      {
        title: 'Channel Settings',
        description: 'Read and modify channel settings',
        scope: 'store_channel_settings'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        context: ctx.state
      });

      return {
        url: `https://login.bigcommerce.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await loginAxios.post('/oauth2/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        scope: ctx.scopes.join(' '),
        grant_type: 'authorization_code',
        redirect_uri: ctx.redirectUri,
        context: ctx.state
      });

      return {
        output: {
          token: response.data.access_token
        }
      };
    }
  });
