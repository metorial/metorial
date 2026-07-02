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
      appId: z
        .string()
        .describe(
          'Your OpenGraph.io App ID (API key). Found in your OpenGraph.io account under API Keys.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.appId
        }
      };
    }
  });
