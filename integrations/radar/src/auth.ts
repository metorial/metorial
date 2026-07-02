import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe(
          'Radar API secret key (server-side). Prefixed with prj_live_sk_ or prj_test_sk_.'
        )
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Secret Key',
    key: 'api_secret_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Radar secret API key found on the Settings page of the Radar dashboard. Must be a secret key (sk), not a publishable key (pk).'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
