import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your LeadIQ Secret Base64 API key. Found in Settings > API Keys.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let http = createAxios({
        baseURL: 'https://api.leadiq.com',
        headers: {
          'Content-Type': 'application/json',

          Authorization: `Basic ${Buffer.from(`${ctx.output.token}:`).toString('base64')}`
        }
      });

      let response = await http.post('/graphql', {
        query: `{ account { plans { name status productType } } }`
      });

      let plans = response.data?.data?.account?.plans;
      let activePlan = plans?.find((p: any) => p.status === 'Active');

      return {
        profile: {
          name: activePlan?.name ?? 'LeadIQ Account'
        }
      };
    }
  });
