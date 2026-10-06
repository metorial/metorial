import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Statuspage API key from Avatar → API info. Its management API permissions determine accessible pages.'
        )
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.token } }),
    getProfile: async (ctx: { output: { token: string } }) => {
      const pages = await new Client({ token: ctx.output.token }).listPages();
      return {
        profile: {
          id: pages[0]?.id,
          name: pages[0]?.name ? `Statuspage: ${pages[0].name}` : 'Statuspage API key'
        }
      };
    }
  });
