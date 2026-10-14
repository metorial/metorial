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
          'Callingly API key. Generate one from Settings → API Keys in the Callingly dashboard.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      let client = new Client({ token: ctx.output.token });
      await client.listTeams();

      return {
        profile: {
          name: 'Callingly account'
        }
      };
    }
  });
