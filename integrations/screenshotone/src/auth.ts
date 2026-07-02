import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('ScreenshotOne access key')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      accessKey: z.string().describe('Your ScreenshotOne access key from the access page')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.accessKey
        }
      };
    }
  });
