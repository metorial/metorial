import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Pendo Engage API integration key')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Integration Key',
    key: 'integration_key',
    inputSchema: z.object({
      integrationKey: z
        .string()
        .describe('Pendo integration key from Settings > Integrations > Integration Keys')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.integrationKey
        }
      };
    }
  });
