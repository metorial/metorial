import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      projectId: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe('API key from Gleap dashboard (Project > Settings > Security)'),
      projectId: z
        .string()
        .describe('Project ID from Gleap dashboard (Project > Settings > Security)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          projectId: ctx.input.projectId
        }
      };
    }
  });
