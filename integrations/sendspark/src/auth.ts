import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      apiKey: z.string().describe('Sendspark API Key (x-api-key)'),
      apiSecret: z.string().describe('Sendspark API Secret (x-api-secret)')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Credentials',
    key: 'api_credentials',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your Sendspark API Key, found in the API Credentials tab at https://sendspark.com/settings/api-credentials'
        ),
      apiSecret: z
        .string()
        .describe(
          'Your Sendspark API Secret, found in the API Credentials tab at https://sendspark.com/settings/api-credentials'
        )
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
      let client = createAxios({
        baseURL: 'https://api-gw.sendspark.com/v1',
        headers: {
          'x-api-key': ctx.output.apiKey,
          'x-api-secret': ctx.output.apiSecret,
          Accept: 'application/json'
        }
      });

      let response = await client.get('/auth/health');

      return {
        profile: {
          status: response.data?.message || 'connected'
        }
      };
    }
  });
