import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let apiAxios = createAxios({
  baseURL: 'https://api.kraken.io'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      apiKey: z.string(),
      apiSecret: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Credentials',
    key: 'api_credentials',

    inputSchema: z.object({
      apiKey: z.string().describe('Your Kraken.io API Key'),
      apiSecret: z.string().describe('Your Kraken.io API Secret')
    }),

    getOutput: async ctx => {
      return {
        output: {
          apiKey: ctx.input.apiKey,
          apiSecret: ctx.input.apiSecret
        }
      };
    },

    getProfile: async (ctx: {
      output: { apiKey: string; apiSecret: string };
      input: { apiKey: string; apiSecret: string };
    }) => {
      let response = await apiAxios.post('/user_status', {
        auth: {
          api_key: ctx.output.apiKey,
          api_secret: ctx.output.apiSecret
        }
      });

      let data = response.data as {
        success: boolean;
        active: boolean;
        plan_name: string;
        quota_total: number;
        quota_used: number;
        quota_remaining: number;
      };

      return {
        profile: {
          name: data.plan_name,
          active: data.active
        }
      };
    }
  });
