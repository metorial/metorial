import { SlateAuth } from 'slates';
import { z } from 'zod';
import { BugherdClient } from './lib/client';

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
        .min(1)
        .describe('BugHerd API key found under Settings > General Settings')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let org = await new BugherdClient(ctx.output.token).getOrganization();

      return {
        profile: {
          id: String(org.id),
          name: org.name
        }
      };
    }
  });
