import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      workspaceId: z.number()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string(),
      workspaceId: z.number()
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          workspaceId: ctx.input.workspaceId
        }
      };
    }
  });
