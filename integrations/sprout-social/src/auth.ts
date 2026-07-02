import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let identityAxios = createAxios({
  baseURL: 'https://identity.sproutsocial.com/oauth2/84e39c75-d770-45d9-90a9-7b79e3037d2c'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',

    scopes: [
      {
        title: 'OpenID',
        description: 'OpenID Connect authentication',
        scope: 'openid'
      },
      {
        title: 'Profile',
        description: 'Access to user profile information',
        scope: 'profile'
      },
      {
        title: 'Email',
        description: 'Access to user email address',
        scope: 'email'
      },
      {
        title: 'Organization',
        description: 'Access to organization data (required for API access)',
        scope: 'organization_id'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://identity.sproutsocial.com/oauth2/84e39c75-d770-45d9-90a9-7b79e3037d2c/v1/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await identityAxios.post(
        '/v1/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        }
      );

      return {
        output: {
          token: response.data.access_token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let response = await identityAxios.get('/v1/userinfo', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      return {
        profile: {
          id: response.data.sub,
          email: response.data.email,
          name:
            [response.data.given_name, response.data.family_name].filter(Boolean).join(' ') ||
            undefined
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      apiToken: z
        .string()
        .describe(
          'Your Sprout Social API token. Generate one under Settings > Global Features > API > API Token Management.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    }
  });
