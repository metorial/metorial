import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Docmosis API access key')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Access Key',
    key: 'api_access_key',
    inputSchema: z.object({
      accessKey: z.string().describe('Your 62-character Docmosis Cloud API access key')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.accessKey
        }
      };
    }
  });
