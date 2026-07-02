import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://user-management-service.platform.moretrees.eco'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('API Key for account-specific operations (X-API-KEY header)'),
      publicValidationKey: z
        .string()
        .describe('Public Validation Key for read-only operations (Authorization header)')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Keys',
    key: 'api_keys',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your API Key. Found under Settings > Account Settings on the More Trees platform.'
        ),
      publicValidationKey: z
        .string()
        .describe(
          'Your Public Validation Key. Found under Integration > API on the More Trees platform.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          publicValidationKey: ctx.input.publicValidationKey
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; publicValidationKey: string };
      input: { apiKey: string; publicValidationKey: string };
    }) => {
      let response = await http
        .get('/user-management-api/external/accounts/profile', {
          headers: {
            'X-API-KEY': ctx.output.token,
            Accept: 'application/json'
          }
        })
        .catch(() => null);

      return {
        profile: {
          name: response?.data?.account_name
        }
      };
    }
  });
