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
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'StatusCake API key. Found in your StatusCake account panel under Account Page.'
        )
    }),
    getOutput: async ctx => {
      const token = ctx.input.token.trim();
      await new Client({ token }).listUptimeTests({ limit: 1 });
      return {
        output: {
          token
        }
      };
    }
  });
