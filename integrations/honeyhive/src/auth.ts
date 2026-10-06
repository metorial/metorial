import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().min(1)
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
        .describe(
          'Project-scoped HoneyHive data-plane API key. Obtain it from the target project API key settings. Classic keys must be replaced; control-plane and ingestion-only keys cannot manage project resources.'
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
