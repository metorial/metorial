import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('IAM token or API key used for authorization'),
      authType: z.enum(['iam_token', 'api_key']).describe('Type of authentication being used')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'IAM Token (OAuth)',
    key: 'iam_token_oauth',

    inputSchema: z.object({
      oauthToken: z.string().describe('OAuth token from Yandex ID used to obtain an IAM token')
    }),

    getOutput: async ctx => {
      let axios = createAxios({
        baseURL: 'https://iam.api.cloud.yandex.net'
      });

      let response = await axios.post('/iam/v1/tokens', {
        yandexPassportOauthToken: ctx.input.oauthToken
      });

      return {
        output: {
          token: response.data.iamToken,
          authType: 'iam_token' as const
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
        .describe(
          'Yandex Cloud API key for a service account. Does not expire but is less secure than IAM tokens.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authType: 'api_key' as const
        }
      };
    }
  });
