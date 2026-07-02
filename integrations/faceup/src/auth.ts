import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      region: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z.string().describe('API key from FaceUp admin: Integrations > API Keys'),
      region: z
        .string()
        .describe(
          'Data hosting region from FaceUp admin: Settings > Data hosting region (e.g., "eu", "us")'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          region: ctx.input.region
        }
      };
    }
  });
