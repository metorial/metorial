import { SlateAuth } from 'slates';
import { z } from 'zod';

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
        .describe(
          'Truvera API key. Generate one in the API Keys section of Truvera Workspace.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
