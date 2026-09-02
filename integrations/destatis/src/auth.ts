import { SlateAuth } from 'slates';
import { z } from 'zod';
import { GenesisClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    key: 'api_token',
    name: 'API Token',
    inputSchema: z.object({
      token: z
        .string()
        .trim()
        .min(1)
        .describe('Personal token from the GENESIS-Online API profile.')
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.token } }),
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let result = await new GenesisClient({ token: ctx.output.token }).loginCheck('en');
      let username = result.username.trim();
      return {
        profile: {
          name: username && username !== ctx.input.token ? username : 'Destatis GENESIS-Online'
        }
      };
    }
  });
