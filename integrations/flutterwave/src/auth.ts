import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe(
          'Flutterwave Secret Key or OAuth access token used to authenticate API requests'
        )
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Secret Key',
    key: 'secret_key',
    inputSchema: z.object({
      secretKey: z
        .string()
        .describe(
          'Flutterwave Secret Key (starts with FLWSECK_TEST- for sandbox or FLWSECK- for production)'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.secretKey
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0 (API v4)',
    key: 'oauth_v4',
    scopes: [],
    getAuthorizationUrl: async ctx => {
      let http = createAxios();
      let response = await http.post(
        'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        url: `${ctx.redirectUri}?state=${ctx.state}&code=${response.data.access_token}`
      };
    },
    handleCallback: async ctx => {
      return {
        output: {
          token: ctx.code
        }
      };
    },
    handleTokenRefresh: async (ctx: any) => {
      let http = createAxios();
      let response = await http.post(
        'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: {
          token: response.data.access_token
        }
      };
    }
  });
