import { createApiServiceError, SlateAuth } from 'slates';
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
      token: z
        .string()
        .describe(
          'Pdfless API key. Found in Workspace settings > API credentials at https://app.pdfless.com'
        )
    }),
    getOutput: async ctx => {
      let token = ctx.input.token.trim();
      if (!token || /[\r\n]/.test(token)) {
        throw createApiServiceError('Enter a valid Pdfless workspace API key.');
      }
      return {
        output: {
          token
        }
      };
    }
  });
