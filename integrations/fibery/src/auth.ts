import { SlateAuth } from 'slates';
import { z } from 'zod';

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
      token: z
        .string()
        .describe('Fibery API token (generated from workspace Settings > API Tokens)')
    }),

    getOutput: async (ctx: { input: { token: string } }) => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
