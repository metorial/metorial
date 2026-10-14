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
    name: 'Personal API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Dovetail personal API token (starts with "api."). Generate one at Settings → Account → Personal API keys.'
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
      let data = await new Client({ token: ctx.output.token }).getTokenInfo();

      return {
        profile: {
          id: data.id,
          subdomain: data.subdomain
        }
      };
    }
  });
