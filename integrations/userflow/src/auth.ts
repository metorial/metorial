import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Userflow environment API key')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Userflow environment API key from Settings > API for users, groups, events, content, attribute definitions, and webhook operations.'
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
