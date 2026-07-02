import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Kontent.ai Management API key')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Management API Key',
    key: 'management_api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Management API key from Kontent.ai > Project settings > API keys')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
