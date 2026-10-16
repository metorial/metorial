import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .describe('API token from your ExpoFP account (Account → Profile → API Token)')
    }),
    getOutput: async ctx => {
      let token = ctx.input.apiToken.trim();
      new Client(token);
      return {
        output: {
          token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiToken: string } }) => {
      let count = await new Client(ctx.output.token).getEventCount();
      return {
        profile: {
          name: `ExpoFP Account (${count} events)`
        }
      };
    }
  });
