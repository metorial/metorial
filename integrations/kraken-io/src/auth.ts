import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

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
      let data = await new Client(ctx.output).getUserStatus();

      return {
        profile: {
          name: data.plan_name,
          active: data.active
        }
      };
    }
  });
