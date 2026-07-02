import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let oauthAxios = createAxios({
  baseURL: 'https://stackoverflow.com'
});

let apiAxios = createAxios({
  baseURL: 'https://api.stackexchange.com/2.3'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      key: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Read Inbox',
        description: 'Access to your global inbox across the Stack Exchange network.',
        scope: 'read_inbox'
      },
      {
        title: 'Write Access',
        description:
          'Ability to perform write operations such as posting comments and editing.',
        scope: 'write_access'
      },
      {
        title: 'Private Info',
        description: 'Access to your private information such as email address.',
        scope: 'private_info'
      },
      {
        title: 'No Expiry',
        description: 'Produces an access token that does not expire.',
        scope: 'no_expiry'
      }
    ],

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your Stack Exchange API key (application key) from stackapps.com')
    }),

    getAuthorizationUrl: async ctx => {
      let scopeStr = ctx.scopes.join(',');
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        ...(scopeStr ? { scope: scopeStr } : {})
      });

      return {
        url: `https://stackoverflow.com/oauth?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let response = await oauthAxios.post(
        '/oauth/access_token/json',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri
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
          key: ctx.input.apiKey
        },
        input: ctx.input
      };
    },

    getProfile: async (ctx: {
      output: { token: string; key: string };
      input: { apiKey: string };
      scopes: string[];
    }) => {
      let response = await apiAxios.get('/me', {
        params: {
          site: 'stackoverflow',
          access_token: ctx.output.token,
          key: ctx.output.key,
          filter: '!nNPvSNVZJS'
        }
      });

      let user = response.data.items?.[0];

      return {
        profile: {
          id: String(user?.user_id ?? ''),
          name: user?.display_name ?? '',
          imageUrl: user?.profile_image ?? ''
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your Stack Exchange API key (application key) from stackapps.com')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: '',
          key: ctx.input.apiKey
        }
      };
    }
  });
