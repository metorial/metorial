import { SlateAuth } from 'slates';
import { z } from 'zod';
import { apiKey, Client } from './lib/client';

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
      apiKey: z
        .string()
        .describe('Your RocketReach API key. Generate one in Account Settings.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: apiKey(ctx.input.apiKey)
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let data = await new Client({ token: ctx.output.token }).getAccount();

      return {
        profile: {
          id: String(data.id),
          email: data.email ?? undefined,
          name: [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
