import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Contacts Read',
        description: 'Read access to contacts',
        scope: 'contacts.read'
      },
      {
        title: 'Contacts Write',
        description: 'Write access to contacts',
        scope: 'contacts.write'
      },
      {
        title: 'Events Write',
        description: 'Send events (orders, carts, custom events)',
        scope: 'events.write'
      },
      {
        title: 'Products Read',
        description: 'Read access to products',
        scope: 'products.read'
      },
      {
        title: 'Products Write',
        description: 'Write access to products',
        scope: 'products.write'
      },
      {
        title: 'Campaigns Read',
        description: 'Read access to campaigns',
        scope: 'campaigns.read'
      },
      {
        title: 'Automations Read',
        description: 'Read access to automations',
        scope: 'automations.read'
      },
      {
        title: 'Brands Read',
        description: 'Read access to brand information',
        scope: 'brands.read'
      },
      {
        title: 'Batches Write',
        description: 'Create batch operations',
        scope: 'batches.write'
      },
      {
        title: 'Batches Read',
        description: 'Read batch operations',
        scope: 'batches.read'
      },
      {
        title: 'Categories Read',
        description: 'Read product categories',
        scope: 'categories.read'
      },
      {
        title: 'Categories Write',
        description: 'Write product categories',
        scope: 'categories.write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      return {
        url: `https://app.omnisend.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let httpClient = createAxios({ baseURL: 'https://app.omnisend.com' });

      let response = await httpClient.post(
        '/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          code: ctx.code
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let httpClient = createAxios({ baseURL: 'https://app.omnisend.com' });

      let response = await httpClient.post(
        '/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken || ''
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Omnisend API key. Generate one from Store Settings → API keys → Create API key.'
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
      let httpClient = createAxios({ baseURL: 'https://api.omnisend.com/v5' });

      let response = await httpClient.get('/brands', {
        headers: { 'X-API-KEY': ctx.output.token }
      });

      let brand = response.data;

      return {
        profile: {
          id: brand.brandID ?? brand.id,
          name: brand.name ?? brand.brandName ?? 'Omnisend Store'
        }
      };
    }
  });
