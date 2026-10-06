import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { tokenValue } from './lib/http';
export let auth = SlateAuth.create()
  .output(z.object({ token: z.string().min(1) }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .min(1)
        .describe(
          'Personal or Enterprise service-account API key from Settings > API; read-only keys cannot change content.'
        )
    }),
    getOutput: async ctx => ({ output: { token: tokenValue(ctx.input.token) } }),
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let me = await new Client(ctx.output.token).getMe();
      return {
        profile: {
          email: me.email,
          name: me.displayName,
          organizationName: me.organizationName,
          organizationDomain: me.organizationDomain
        }
      };
    }
  });
