import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiKey: z.string().optional(),
      apiSecret: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .describe(
          'API Token generated from the Mocean Dashboard (API Account > Generate Token)'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & Secret',
    key: 'api_key_secret',
    inputSchema: z.object({
      apiKey: z.string().describe('Mocean API Key from the Dashboard'),
      apiSecret: z.string().describe('Mocean API Secret from the Dashboard')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: '',
          apiKey: ctx.input.apiKey,
          apiSecret: ctx.input.apiSecret
        }
      };
    }
  });
