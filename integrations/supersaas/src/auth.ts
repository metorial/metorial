import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      accountName: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      accountName: z.string().describe('Your SuperSaaS account name (not your email address)'),
      apiKey: z
        .string()
        .describe('API key generated from the Account Info page in your SuperSaaS dashboard')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          accountName: ctx.input.accountName
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; accountName: string };
      input: { accountName: string; apiKey: string };
    }) => {
      let axiosInstance = createAxios({
        baseURL: 'https://www.supersaas.com'
      });

      await axiosInstance.get('/api/users.json', {
        params: {
          account: ctx.output.accountName,
          api_key: ctx.output.token,
          limit: 1
        }
      });

      return {
        profile: {
          name: ctx.output.accountName
        }
      };
    }
  });
