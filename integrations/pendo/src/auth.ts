import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Pendo Engage API integration key'),
      trackEventSharedSecret: z
        .string()
        .optional()
        .describe('Pendo Track Event shared secret for sending server-side track events')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Integration Key',
    key: 'integration_key',
    inputSchema: z.object({
      integrationKey: z
        .string()
        .describe('Pendo integration key from Settings > Integrations > Integration Keys'),
      trackEventSharedSecret: z
        .string()
        .optional()
        .describe(
          'Optional Track Event shared secret from the app details page; different from the integration key'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.integrationKey,
          trackEventSharedSecret: ctx.input.trackEventSharedSecret
        }
      };
    }
  });
