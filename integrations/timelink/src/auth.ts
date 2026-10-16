import { SlateAuth } from 'slates';
import { z } from 'zod';
import { CurrentClient } from './lib/current-client';

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
        .describe(
          'Your Timelink API token. Create one under My Account > API Tokens in Timelink.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      const token = await new CurrentClient({ token: ctx.output.token }).getCurrentToken();

      return {
        profile: {
          id: String(token.id),
          name: `API token: ${token.name}`
        }
      };
    }
  });
