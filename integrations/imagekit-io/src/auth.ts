import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('ImageKit private API key used for authentication')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Private API Key',
    key: 'private_api_key',
    inputSchema: z.object({
      token: z.string().describe('Your ImageKit private API key (starts with private_)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
