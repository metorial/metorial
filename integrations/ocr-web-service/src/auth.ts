import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      username: z.string(),
      licenseCode: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Basic Auth',
    key: 'basic_auth',

    inputSchema: z.object({
      username: z.string().describe('Your OCR Web Service account username'),
      licenseCode: z.string().describe('Your OCR Web Service license API key/password')
    }),

    getOutput: async ctx => {
      return {
        output: {
          username: ctx.input.username,
          licenseCode: ctx.input.licenseCode
        }
      };
    }
  });
