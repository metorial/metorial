import { SlateAuth } from 'slates';
import { z } from 'zod';
import { L2sClient } from './lib/client';

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
        .describe('L2S API key. Generate one at https://app.l2s.is/integrations')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = new L2sClient({ token: ctx.output.token });
      let settings = await client.getUserSettings();
      return {
        profile: {
          ...settings
        }
      };
    }
  });
